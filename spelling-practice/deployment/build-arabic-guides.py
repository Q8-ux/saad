"""Build font-shaped, joined Arabic tracing guides. Generated JS needs no font runtime."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import label, find_objects

WORDS=['دَرَسَ','صَعَدَ','خَطَرَ','عَطَسَ','شَعَرَ','سَطَعَ','خَدَعَ','زَرَعَ']

def thin(mask):
    a=np.pad(mask.astype(bool),1)
    for _ in range(200):
        changed=False
        for step in (0,1):
            p=[a[:-2,1:-1],a[:-2,2:],a[1:-1,2:],a[2:,2:],a[2:,1:-1],a[2:,:-2],a[1:-1,:-2],a[:-2,:-2]]
            count=np.stack(p).sum(axis=0)
            transitions=sum((~p[i])&p[(i+1)%8] for i in range(8))
            remove=a[1:-1,1:-1]&(count>=2)&(count<=6)&(transitions==1)
            if step==0:remove&=~(p[0]&p[2]&p[4])&~(p[2]&p[4]&p[6])
            else:remove&=~(p[0]&p[2]&p[6])&~(p[0]&p[4]&p[6])
            if remove.any():a[1:-1,1:-1][remove]=False;changed=True
        if not changed:break
    return a[1:-1,1:-1]

def build(font_path,output):
    font=ImageFont.truetype(str(font_path),170)
    boxes={w:font.getbbox(w,anchor='ls',direction='rtl',language='ar') for w in WORDS}
    factor=90/max(-b[1] for b in boxes.values())
    guides={}
    for word in WORDS:
        x0,y0,x1,y1=boxes[word];pad=12;baseline=pad-y0
        im=Image.new('L',(x1-x0+pad*2,y1-y0+pad*2))
        ImageDraw.Draw(im).text((pad-x0,baseline),word,font=font,fill=255,anchor='ls',direction='rtl',language='ar')
        mask=np.asarray(im)>96
        labels,total=label(mask,structure=np.ones((3,3)))
        bodies=np.zeros_like(mask);marks=np.zeros_like(mask);fathas=[]
        for i,box in enumerate(find_objects(labels),1):
            if box is None:continue
            component=labels==i
            height=box[0].stop-box[0].start;width=box[1].stop-box[1].start
            if height<34 and width>=height*3 and width>20:
                # Cairo's flat fatha is replaced by the clear rising stroke in the reference.
                left=(box[1].start-pad)*factor
                right=(box[1].stop-pad)*factor
                center=100+((box[0].start+box[0].stop)/2-baseline)*factor
                rise=(right-left)*.28
                fathas.append(f'<path data-diacritic="fatha" d="M{left:.2f} {center+rise/2:.2f}L{right:.2f} {center-rise/2:.2f}" fill="none" stroke="#385e57" stroke-width="2.8" stroke-linecap="round"/>')
            elif height<34:marks|=component
            else:bodies|=component
        if len(fathas)!=word.count('َ'):
            raise ValueError(f'Expected three clear fathas for {word}; found {len(fathas)}')
        skeleton=thin(bodies)
        spacing=5.5/factor;grid={};points=[]
        for y,x in np.argwhere(skeleton):
            gx,gy=int(x//spacing),int(y//spacing)
            nearby=[p for a in range(gx-1,gx+2) for b in range(gy-1,gy+2) for p in grid.get((a,b),[])]
            if any((x-px)**2+(y-py)**2<spacing**2 for px,py in nearby):continue
            grid.setdefault((gx,gy),[]).append((int(x),int(y)))
            points.append((round((x-pad)*factor,2),round(100+(y-baseline)*factor,2)))
        dots=' '.join(f'M{x} {y}h0.01' for x,y in points)
        runs=[]
        for y,row in enumerate(marks):
            xs=np.flatnonzero(row)
            if not len(xs):continue
            for run in np.split(xs,np.flatnonzero(np.diff(xs)>1)+1):
                x=round((int(run[0])-pad)*factor,2);yy=round(100+(y-baseline)*factor,2);width=round(len(run)*factor,2)
                runs.append(f'M{x} {yy}h{width}v{factor}h-{width}z')
        markup=f'<path d="{dots}" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="{" ".join(runs)}" fill="currentColor"/>'+''.join(fathas)
        guides[word]={'width':round((x1-x0)*factor,2),'markup':markup,'points':len(points),'fathas':len(fathas)}
    source='(function(root){const guides='+json.dumps(guides,ensure_ascii=False,separators=(',',':'))+';if(typeof module==="object"&&module.exports)module.exports=guides;else root.SpellingArabicGuides=guides;})(typeof globalThis!=="undefined"?globalThis:this);\n'
    output.write_text(source)
    print(json.dumps({w:{'width':g['width'],'points':g['points']} for w,g in guides.items()},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--font',required=True,type=Path);parser.add_argument('--output',required=True,type=Path);args=parser.parse_args();build(args.font,args.output)
