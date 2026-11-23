import json,math,subprocess,bisect,os
from pathlib import Path
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont
import numpy as np

R=Path(os.environ.get('KHAWARIZMIAT_PROJECT_ROOT',str(Path(__file__).resolve().parent)))
E=json.loads((R/'episode.json' if (R/'episode.json').exists() else R/'assets/episode.json').read_text())
T=json.loads((R/'assets/timeline.json').read_text())
STARTS=[x['start'] for x in T]
W,H=720,1280
Y='#fffc00';BG='#101112';PANEL='#202225';WHITE='#f9f9f4';MUTED='#a5a8ae';GREEN='#82e3b3'
FONTPATH=R/'assets/Cairo.ttf'

@lru_cache(maxsize=80)
def font(size,bold=False):
    f=ImageFont.truetype(str(FONTPATH),size)
    try:
        axes=f.get_variation_axes()
        vals=[(700 if bold else 500) if a['name']==b'Weight' else a['default'] for a in axes]
        f.set_variation_by_axes(vals)
    except (OSError,AttributeError):pass
    return f

def tx(d,text,x,y,size=34,fill=WHITE,bold=False,anchor='ra'):
    d.text((x,y),text,font=font(size,bold),fill=fill,anchor=anchor,direction='rtl' if anchor in ['ra','ma','la'] else 'ltr',language='ar')

def wrap(text,size,width,bold=False):
    words=text.split();lines=[];line=''
    for word in words:
        trial=(line+' '+word).strip()
        if font(size,bold).getlength(trial)>width and line:lines.append(line);line=word
        else:line=trial
    if line:lines.append(line)
    return lines

def para(d,text,x,y,size=36,width=590,fill=WHITE,bold=False,gap=None):
    lines=wrap(text,size,width,bold)
    for line in lines:
        tx(d,line,x,y,size,fill,bold);y+=gap or int(size*1.7)
    return y

def box(d,xy,fill=PANEL,outline=None,radius=26,width=2):
    d.rounded_rectangle(xy,radius=radius,fill=fill,outline=outline,width=width)

def badge(d,text,xy,fill=Y,ink=BG,size=25):
    x,y,w,h=xy;box(d,(x,y,x+w,y+h),fill,radius=h//2)
    tx(d,text,x+w/2,y+6,size,ink,True,'ma')

def phone_header(d,scene):
    d.rectangle((0,0,W,128),fill=Y)
    tx(d,'خوارزميات',W-35,21,47,BG,True)
    tx(d,'قبل لا تنشر',35,37,24,BG,False,'la')
    d.ellipse((W-82,185,W-26,241),fill=Y)
    tx(d,'خ',W-54,185,30,BG,True,'ma')
    tx(d,scene['title'],W-105,177,32,WHITE,True)
    tx(d,'داخل أحداث المسلسل',W-105,224,22,MUTED)
    d.line((30,267,W-30,267),fill='#33363a',width=2)

def waveform(d,y,phase,color=Y,width=570,scale=1):
    for j in range(58):
        amp=(8+35*abs(math.sin(j*1.81+phase*4)*math.sin(j*.35+phase)))*scale
        x=75+j*width/58
        d.rounded_rectangle((x,y-amp,x+4,y+amp),radius=2,fill=color)

def door(d,xy,reveal=False,home=False):
    x,y,w,h=xy
    box(d,(x,y,x+w,y+h),'#171d22',r=0) if False else None
    d.rectangle((x,y,x+w,y+h),fill='#1d272d')
    for j in range(8):
        col=(29+j*2,34+j*2,36+j*2)
        d.rectangle((x+j*3,y+j*3,x+w-j*3,y+h-j*3),outline=col,width=2)
    d.rectangle((x+65,y+25,x+w-65,y+h),fill='#323032' if home else '#2b353a')
    d.rectangle((x+73,y+34,x+w-73,y+h-6),outline='#55524a',width=3)
    d.rectangle((x+w-83,y+38,x+w-79,y+h-6),fill='#d4b44a' if home else '#8b9192')
    d.ellipse((x+w-100,y+h*.58,x+w-84,y+h*.58+16),fill='#bfb7a0')
    # Same three marks in the first cropped clip and full recording.
    for j in range(3):d.line((x+87+j*10,y+h-65,x+87+j*10,y+h-51),fill='#9e9d87',width=3)
    if reveal:
        box(d,(x+10,y+h-45,x+w-10,y+h-3),'#070a0c',radius=8)
        tx(d,'تصوير 21:02',x+w-25,y+h-43,27,Y,True)

@lru_cache(maxsize=70)
def background(scene_id,stage):
    s=next(s for s in E['scenes'] if s['id']==scene_id)
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    phone_header(d,s)
    mode=s['mode']
    if mode=='voice':
        badge(d,'٢١:١٣',(55,300,135,46),PANEL,WHITE)
        tx(d,'ريم',W-65,317,66,WHITE,True)
        tx(d,'رسالة صوتية',W-65,420,32,MUTED)
        box(d,(42,510,678,735),'#292b20',outline='#5a5e22')
        tx(d,'اضغطي لتسمعي الرسالة كاملة',W-70,548,28,Y)
        tx(d,'آخر ظهور قبل نشر المقطع',W-65,792,29,MUTED)
    elif mode=='story':
        door(d,(42,294,636,478))
        badge(d,'الواجهة',(65,312,174,47))
        box(d,(78,632,640,744),Y,radius=16)
        tx(d,'حبستها!',606,643,64,BG,True)
        tx(d,'#وين_ريم',W-55,807,42,Y,True)
        tx(d,'نشر 21:17  •  مقطع مقتطع',W-55,876,26,MUTED)
    elif mode=='call':
        d.ellipse((245,310,475,540),fill='#343845',outline='#5d6274',width=3)
        tx(d,'س',360,325,116,Y,True,'ma')
        tx(d,'سالم',360,567,47,WHITE,True,'ma')
        badge(d,'المكالمة مستمرة',(205,657,310,53),PANEL,WHITE)
        if stage:
            box(d,(48,756,672,877),'#eff0e5')
            tx(d,'الملف الأصلي وصل',W-75,766,37,BG,True)
            tx(d,'ملف المشروع + نسخة التصوير',W-75,824,26,'#55584e')
    elif mode=='choice':
        tx(d,'شنو تسوي بالمقطع؟',W-60,315,43,WHITE,True)
        para(d,'قبل ما يوصلك الأصل عندك قرار',W-60,402,30,590,MUTED)
        for y,t,sel in [(505,'أشارك الاتهام',False),(640,'أطلب السياق',stage>0)]:
            box(d,(48,y,672,y+106),Y if sel else PANEL,outline=Y if sel else '#494c4d')
            tx(d,t,W/2,y+22,38,BG if sel else WHITE,True,'ma')
        tx(d,'الحقيقة ثابتة وترتيب ما تراه يتغير',W-60,826,27,MUTED)
    elif mode=='lens':
        badge(d,'ورى الكادر',(55,293,220,50))
        door(d,(45,374,630,403),reveal=stage>0)
        if not stage:
            d.rectangle((45,717,675,777),fill=BG)
        box(d,(48,805,672,891),'#eff0e5')
        tx(d,'تصوير 21:02     نشر 21:17',W-72,819,32,BG,True)
    elif mode=='puzzle':
        tx(d,'رتب اللي صار',W-60,310,48,WHITE,True)
        tx(d,'من الأقدم إلى الأحدث',W-60,394,30,MUTED)
        cards=[('نشر','21:17'),('تصوير','21:02'),('قص','21:09')]
        if stage>0:cards=[cards[1],cards[2],cards[0]]
        for j,(name,clock) in enumerate(cards):
            y=473+j*119
            box(d,(48,y,672,y+96),'#34382a' if stage else PANEL,outline=GREEN if stage else '#46494e')
            tx(d,name,W-82,y+16,35,WHITE,True)
            tx(d,clock,90,y+16,33,Y,True,'la')
        if stage:tx(d,'النشر المجدول مفعّل',W-65,861,29,GREEN,True)
    elif mode=='original':
        badge(d,'الملف الأصلي',(55,290,250,50),GREEN,BG)
        door(d,(45,366,630,423),reveal=True)
        tx(d,'الصوت متصل من غير اقتطاع',W-62,806,32,GREEN,True)
    elif mode=='correction':
        tx(d,'شنو حذفت من القصة؟',W-60,304,43,WHITE,True)
        box(d,(48,417,672,558),'#3b2725',outline='#c87964')
        tx(d,'المقطع المبتور',W-75,429,28,'#f7b7a2')
        tx(d,'حبستها',W-75,477,44,WHITE,True)
        box(d,(48,585,672,741),'#243b30',outline=GREEN)
        tx(d,'الملف الأصلي',W-75,596,28,GREEN)
        tx(d,'كانت تحميها',W-75,650,43,WHITE,True)
        badge(d,'نشر التصحيح',(145,802,430,65),Y,BG,32)
    elif mode=='incoming':
        tx(d,'ريم',W-60,302,52,WHITE,True)
        box(d,(75,417,674,553),'#f6f7e9')
        tx(d,'تعالي بروحج',W-76,435,40,BG,True)
        tx(d,'أرسلت لج موقعي',W-76,494,30,'#4f5449')
        box(d,(75,580,674,730),'#343839')
        for j in range(5):d.line((95,600+j*22,650,600+j*22),fill='#535952',width=1)
        d.ellipse((345,620,390,665),fill=Y)
        tx(d,'موقع داخل أحداث المسلسل',W-80,745,25,MUTED)
        if stage:badge(d,'اتصال من رقم غير محفوظ',(70,819,580,62),GREEN,BG,28)
    elif mode=='door':
        door(d,(45,310,630,548),home=True)
        box(d,(75,351,650,452),Y,radius=18)
        tx(d,'افتحي أنا عند الباب',W/2,371,35,BG,True,'ma')
        if stage:tx(d,'لا تفتحين',W/2,786,61,Y,True,'ma')
    return im

@lru_cache(maxsize=100)
def caption_overlay(idx):
    a=Image.new('RGBA',(W,300),(0,0,0,0));d=ImageDraw.Draw(a)
    c=T[idx]
    box(d,(28,15,W-28,264),'#191c1f',outline='#3b3f42',radius=24)
    tx(d,c['speaker'],W-53,26,28,Y,True)
    lines=wrap(c['text'],43,610,True)
    for j,line in enumerate(lines):tx(d,line,W-54,81+j*66,43,WHITE,True)
    assert len(lines)<=3,(c,lines)
    return a

def make_frame(t):
    if t<1.6 or t>=294:
        im=Image.new('RGB',(W,H),Y);d=ImageDraw.Draw(im)
        tx(d,'خوارزميات',W/2,410,89,BG,True,'ma')
        tx(d,'قبل لا تنشر',W/2,570,49,BG,True,'ma')
        tx(d,'سعد روضان',W/2,703,32,BG,False,'ma')
        if t>=294:tx(d,'ثلاث دقات تكفي لتغيّر المعنى',W/2,893,31,BG,False,'ma')
        return im
    s=next(s for s in E['scenes'] if s['start']<=t<s['end']);p=t-s['start']
    thresholds={'call':17,'choice':8,'lens':5,'puzzle':16,'incoming':5,'door':12}
    stage=int(p>=thresholds.get(s['mode'],999))
    im=background(s['id'],stage).copy();d=ImageDraw.Draw(im)
    # Story progress, and a subtle light sweep, remain in continuous motion.
    for j,scene in enumerate(E['scenes']):
        x=24+j*68
        d.rounded_rectangle((x,144,x+58,150),radius=3,fill='#424444')
        q=max(0,min(1,(t-scene['start'])/(scene['end']-scene['start'])))
        if q:d.rounded_rectangle((x,144,x+max(1,int(58*q)),150),radius=3,fill=Y)
    if s['mode'] in ['voice','call','original']:waveform(d,681 if s['mode']=='voice' else 885,t, GREEN if s['mode']=='original' else Y,560,.48 if s['mode']=='original' else 1)
    if s['mode']=='lens':
        q=min(1,p/8)
        d.line((75,898,645,898),fill='#72756b',width=5)
        d.ellipse((70+570*q,887,92+570*q,909),fill=Y)
    idx=bisect.bisect_right(STARTS,t)-1
    if idx>=0 and T[idx]['start']<=t<T[idx]['end']:
        im.paste(caption_overlay(idx),(0,918),caption_overlay(idx))
    else:
        labels={
            's1':'رسالة قديمة وقلق جديد','s2':'العنوان سبق الحقيقة','s3':'الملف الأصلي على الطريق',
            's4':'اختيارك يغيّر ما يظهر لك أولا','s5':'وقت التصوير غير وقت النشر',
            's6':'تصوير ثم قص ثم نشر','s7':'راقب الإشارة عند حافة الباب',
            's8':'التصحيح يبقى مع الأصل','s9':'هل تعرف من يكتب باسمها؟','s10':'المكالمة مستمرة والباب مغلق'}
        para(d,labels[s['id']],W-55,989,36,610,MUTED,True)
    d.line((32,1232,W-32,1232),fill='#434544',width=3)
    d.line((32,1232,32+int(656*t/300),1232),fill=Y,width=3)
    d.text((W-35,1239),f'{int(t)//60:02}:{int(t)%60:02} / 05:00',font=font(20),fill=MUTED,anchor='ra',direction='ltr')
    return im

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--samples',action='store_true');args=parser.parse_args()
    if args.samples:
        out=R/'work'/'video-qa';out.mkdir(exist_ok=True)
        for t in [4,26,60,91,117,150,177,218,251,279,287,296]:make_frame(t).save(out/f'{t:03}.png')
        print('sample frames ready')
    else:
        out=R/'deliverables'/'khawarizmiat-episode-01.mp4'
        log=(R/'work'/'video-encode.log').open('w')
        cmd=['ffmpeg','-y','-v','warning','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','12','-i','pipe:0','-i',str(R/'work'/'episode.wav'),'-c:v','libx264','-preset','veryfast','-crf','23','-r','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-t','300','-movflags','+faststart',str(out)]
        process=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        try:
            for frame in range(3600):
                process.stdin.write(make_frame(frame/12).tobytes())
                if frame%600==0:print(f'rendered {frame//12}/300 seconds',flush=True)
            process.stdin.close()
            if process.wait()!=0:raise RuntimeError('video encoder failed')
        finally:log.close()
        print(out,flush=True)
