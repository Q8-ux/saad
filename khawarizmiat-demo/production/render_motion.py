"""A 24 fps screenlife edit using the existing approved illustrations and audio."""
import argparse
import bisect
import json
import math
import os
import subprocess
import wave
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import render_video as art

R = Path(os.environ.get('KHAWARIZMIAT_PROJECT_ROOT',str(Path(__file__).resolve().parent)))
P = R / 'work' / 'production'
P.mkdir(parents=True,exist_ok=True)
if not (P/'episode-recorded.json').exists():
    import shutil
    for source,dest in [('episode.json','episode-recorded.json'),('timeline.json','timeline.json'),('word-timeline.json','words.json')]:
        shutil.copyfile(R/'assets'/source,P/dest)
if not (P/'mix-master.wav').exists():
    subprocess.run(['ffmpeg','-nostdin','-y','-v','error','-i',str(R/'assets/episode.mp3'),
                    '-ar','48000','-ac','1','-c:a','pcm_s16le',str(P/'mix-master.wav')],check=True)
E = json.loads((P / 'episode-recorded.json').read_text())
T = json.loads((P / 'timeline.json').read_text())
WORDS = json.loads((P / 'words.json').read_text())
art.E = E
W, H, FPS = 720, 1280, 24
BG, INK, Y, WHITE, GREY, GREEN = '#0c0e10', '#101214', '#fffc00', '#f5f5ef', '#a4a9ae', '#85e6b9'
RED = '#f5a58b'
STARTS = [c['start'] for c in T]
tx, para, box, font = art.tx, art.para, art.box, art.font

with wave.open(str(P / 'mix-master.wav')) as f:
    RATE = f.getframerate()
    AUDIO = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
    assert abs(len(AUDIO)/RATE - 300) < .0001

# Real measured amplitude, shared by all voice-note graphics.
STEP = int(RATE / 50)
ENVELOPE = np.sqrt(np.mean(AUDIO[:len(AUDIO)//STEP*STEP].reshape(-1, STEP)**2, axis=1))

def ease(v):
    v = max(0., min(1., v))
    return v*v*(3-2*v)

def cue(line, token, fallback):
    return next((w['start'] for w in WORDS if w['sourceId'] == line and token in w['text']), fallback)

REVEAL = cue('d07', 'ودقيقتين', 118)
PUBLISH = cue('d07', 'ناشرها', 120)
TRUTH = cue('d10', 'تحميها', 187)
REAL_CALL = cue('r04', 'تلفون', 253)
DENIAL = cue('r06', 'مو', 286)

def tag(d, text, x, y, width, color=Y, ink=INK, size=24):
    box(d, (x,y,x+width,y+49), color, radius=13)
    tx(d,text,x+width/2,y+5,size,ink,True,'ma')

def top(d, who, sub, color=Y):
    d.ellipse((602,89,660,147), fill=color)
    tx(d,who[0],631,91,31,INK,True,'ma')
    tx(d,who,578,81,37,WHITE,True)
    tx(d,sub,578,139,23,GREY)
    tx(d,'خوارزميات',58,99,25,Y,True,'la')

@lru_cache(maxsize=4)
def retained_door(home=False, reveal=False):
    # Reuse the existing pilot's accepted illustration, without creating a new figurative asset.
    im=Image.new('RGB',(630,548),BG)
    art.door(ImageDraw.Draw(im),(0,0,630,548),reveal=reveal,home=home)
    return im

def actual_wave(d, t, y, color=Y, x=66, width=588, height=45):
    middle=int(t*50)
    for j in range(58):
        index=max(0,min(len(ENVELOPE)-1,middle+j-29))
        amplitude=min(height, 2 + ENVELOPE[index]*210)
        xx=x+j*width/58
        d.rounded_rectangle((xx,y-amplitude,xx+4,y+amplitude),radius=2,fill=color)

@lru_cache(maxsize=100)
def state(scene_id, stage):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    if scene_id=='s1':
        top(d,'ريم','رسالة صوتية · ٢١:١٣')
        tx(d,'رسالة قبل الترند',654,273,44,WHITE,True)
        tx(d,'خمس دقايق قبل انتشار المقطع',654,346,27,GREY)
        box(d,(48,461,672,680),'#22261f',outline='#535835',radius=30)
        tag(d,'رسالة صوتية',464,489,176)
        tx(d,'دانا',650,740,34,WHITE,True)
        tx(d,'الاتصال بريم',650,805,29,GREY)
        if stage:
            tag(d,'لا يوجد رد',56,794,210,'#3b2726',RED,27)
    elif scene_id=='s2':
        top(d,'الواجهة','قصة منشورة · ٢١:١٧')
        im.paste(retained_door().resize((648,505)),(36,258))
        d=ImageDraw.Draw(im)
        tag(d,'مقطع مقتطع',56,279,212)
        box(d,(70,585,650,718),Y,radius=20)
        tx(d,'حبستها!',606,589,72,INK,True)
        tx(d,'#وين_ريم',652,790,45,Y,True)
        tx(d,'الترند داخل أحداث المسلسل',652,863,24,GREY)
    elif scene_id=='s3':
        top(d,'سالم','المكالمة مستمرة')
        d.ellipse((252,280,468,496),fill='#29313b',outline='#4d5865',width=2)
        tx(d,'س',360,295,112,Y,True,'ma')
        tx(d,'سالم',360,540,50,WHITE,True,'ma')
        tx(d,'الواجهة',360,621,27,GREY,False,'ma')
        if stage:
            box(d,(48,720,672,887),'#ecefe1',radius=23)
            tx(d,'الملف الأصلي وصل',642,730,39,INK,True)
            tx(d,'نسخة التصوير وملف المشروع',642,797,28,'#50564e')
            tag(d,'مستلم',69,831,151,GREEN,INK,23)
    elif scene_id=='s4':
        top(d,'دانا','المقطع وصل قروب العايلة')
        tx(d,'شنو تسوي؟',655,270,58,WHITE,True)
        tx(d,'العنوان قدامك والأصل للحين ما وصل',655,366,28,GREY)
        for y,text,color in [(491,'أشارك الاتهام',RED),(647,'أطلب السياق',GREEN)]:
            box(d,(48,y,672,y+121),'#1c2021',outline=color,radius=25,width=2)
            tx(d,text,360,y+25,42,WHITE,True,'ma')
        tx(d,'اختيارك يغير ترتيب اللي يظهر لك',360,811,28,Y,True,'ma')
        tx(d,'الاختيار متاح في النسخة التفاعلية',360,867,22,GREY,False,'ma')
    elif scene_id=='s5':
        top(d,'دانا','ورى الكادر · الملف الأصلي')
        tx(d,'شنو انقص من الصورة؟',655,271,45,WHITE,True)
        im.paste(retained_door(reveal=bool(stage)).resize((648,450)),(36,357));d=ImageDraw.Draw(im)
        if stage:
            tag(d,'تصوير 21:02',379,808,285,GREEN,INK,29)
        if stage>1:
            tag(d,'نشر 21:17',54,808,285,Y,INK,29)
    elif scene_id=='s6':
        top(d,'سالم','سجل المشروع')
        tx(d,'رتب اللي صار',655,269,52,WHITE,True)
        tx(d,'فكر بالترتيب قبل ما تشوف الحل',655,358,28,GREY)
        tx(d,'اللعبة متاحة في النسخة التفاعلية',360,891,22,GREY,False,'ma')
    elif scene_id=='s7':
        top(d,'ريم','التسجيل الأصلي · ٢١:٠٢',GREEN)
        im.paste(retained_door(reveal=True).resize((648,472)),(36,285));d=ImageDraw.Draw(im)
        tag(d,'الجملة كاملة',397,298,257,GREEN,INK,28)
        if stage:
            tx(d,'كانت تحميها',360,767,50,GREEN,True,'ma')
        else:
            tx(d,'اسمع التسجيل إلى نهايته',360,775,31,GREEN,True,'ma')
    elif scene_id=='s8':
        top(d,'دانا','نفس الكلمات ومعنى ثاني')
        tx(d,'شنو حذفت من القصة؟',656,265,46,WHITE,True)
        tx(d,'المقطع المبتور',656,387,27,RED)
        tx(d,'حبستها',656,437,61,WHITE,True)
        d.line((61,553,659,553),fill='#494541',width=2)
        tx(d,'الملف الأصلي',656,594,27,GREEN)
        tx(d,'كانت تحميها',656,644,57,GREEN,True)
        tag(d,'نشر التصحيح' if stage else 'أرجع للملف كامل',124,800,472,Y,INK,32)
    elif scene_id=='s9':
        top(d,'ريم','رسالة من حسابها')
        box(d,(65,298,658,479),'#edf1e3',radius=23)
        tx(d,'تعالي بروحج',630,321,47,INK,True)
        tx(d,'أرسلت لج موقعي',630,401,33,'#4d574a')
        tx(d,'وصلت من حساب ريم',633,502,24,GREY)
        box(d,(48,595,672,831),'#21362c',outline='#3c6751',radius=30)
        tx(d,'ريم' if stage>1 else 'رقم غير محفوظ',360,621,44,GREEN,True,'ma')
        tx(d,'من تلفون البنت' if stage>1 else 'اتصال وارد',360,698,29,WHITE,False,'ma')
        tx(d,'على الخط',360,758,24,GREY,False,'ma')
    elif scene_id=='s10':
        top(d,'دانا','باب الشقة')
        im.paste(retained_door(home=True).resize((648,610)),(36,255));d=ImageDraw.Draw(im)
        tag(d,'ريم: افتحي أنا عند الباب',61,305,598,Y,INK,31)
        if stage:
            tag(d,'المكالمة مستمرة',185,774,350,GREEN,INK,28)
    return im

@lru_cache(maxsize=150)
def caption(idx):
    c=T[idx];im=Image.new('RGBA',(W,221),(0,0,0,0));d=ImageDraw.Draw(im)
    # Stable two-line phrases, comfortably above the player's controls.
    box(d,(35,5,685,212),'#171b1f',outline='#343b41',radius=24)
    color=GREEN if c['scene']=='s7' else Y
    d.rounded_rectangle((648,27,654,55),radius=3,fill=color)
    tx(d,c['speaker'],632,20,24,color,True)
    size=41
    lines=art.wrap(c['text'],size,586,True)
    if len(lines)>2:
        size=38;lines=art.wrap(c['text'],size,586,True)
    assert len(lines)<=2,(idx,c,lines)
    for i,line in enumerate(lines):tx(d,line,650,75+i*59,size,WHITE,True)
    return im

@lru_cache(maxsize=1)
def ending():
    im=Image.new('RGB',(W,H),Y);d=ImageDraw.Draw(im)
    tx(d,'خوارزميات',360,306,90,INK,True,'ma')
    tx(d,'قبل لا تنشر',360,463,49,INK,True,'ma')
    tx(d,'سعد روضان',360,571,34,INK,False,'ma')
    tx(d,'منو اللي عند الباب؟',360,735,46,INK,True,'ma')
    tx(d,'أعد المشاهدة وراقب الإشارة',360,829,31,INK,False,'ma')
    box(d,(85,1007,635,1095),INK,radius=22)
    tx(d,'جرّب اختيارك في النسخة التفاعلية',360,1025,29,Y,True,'ma')
    d.text((360,1155),'q8-ux.github.io/saad/khawarizmiat-demo/',font=font(20),fill=INK,anchor='ma',direction='ltr')
    return im

def frame(t):
    if t>=294:return ending().copy()
    s=next(s for s in E['scenes'] if s['start']<=t<s['end']);p=t-s['start'];sid=s['id']
    if sid=='s1':stage=int(t>=17.4)
    elif sid=='s3':stage=int(t>=70.5)
    elif sid=='s5':stage=int(t>=REVEAL)+int(t>=PUBLISH)
    elif sid=='s7':stage=int(t>=TRUTH)
    elif sid=='s8':stage=int(t>=234.3)
    elif sid=='s9':stage=1+int(t>=REAL_CALL)
    elif sid=='s10':stage=int(t>=DENIAL)
    else:stage=0
    im=state(sid,stage).copy();d=ImageDraw.Draw(im)
    for i,scene in enumerate(E['scenes']):
        x=35+i*66
        d.rounded_rectangle((x,39,x+57,43),radius=2,fill='#394047')
        q=max(0,min(1,(t-scene['start'])/(scene['end']-scene['start'])))
        if q:d.rounded_rectangle((x,39,x+max(1,round(57*q)),43),radius=2,fill=Y)
    if sid=='s1':
        actual_wave(d,t,601)
        a=ease((t-3)/6.65)
        d.rounded_rectangle((73,649,647,653),radius=2,fill='#444b35')
        d.rounded_rectangle((73,649,73+max(1,round(a*574)),653),radius=2,fill=Y)
    elif sid=='s2':
        # A story-playhead, not a fabricated public analytics counter.
        q=min(1,max(0,(t-25)/2.47));d.line((56,745,56+round(q*602),745),fill=Y,width=4)
    elif sid=='s3':actual_wave(d,t,666,width=580,height=20)
    elif sid=='s4':
        # Both paths are previews; the MP4 does not claim to receive viewer input.
        target=491 if p<10 else 647
        q=ease((p%10)/.35)
        d.rounded_rectangle((48,target,672,target+121),radius=25,outline=Y,width=2+round(q))
    elif sid=='s5' and stage==0:
        y=357+round(450*ease(p/8))
        d.line((38,y,682,y),fill=Y,width=3)
    elif sid=='s6':
        # The existing story's shuffled cards move into their factual chronology.
        entries=[('تصوير','21:02',1,0),('قص','21:09',2,1),('نشر','21:17',0,2)]
        for name,clock,old,new in entries:
            if p<8.3:
                alpha=1-ease((p-8)/.3);slot=old;shift=0
            else:
                alpha=ease((p-8.4-new*.13)/.3);slot=new;shift=round(16*(1-alpha))
            y=468+slot*117+shift
            card=Image.new('RGBA',(W,116),(0,0,0,0));cd=ImageDraw.Draw(card)
            color=GREEN if p>=8.3 else '#4a5157'
            box(cd,(48,0,672,94),'#1d2426',outline=color,radius=20)
            tx(cd,name,640,12,35,WHITE,True)
            cd.text((84,16),clock,font=font(33,True),fill=Y,anchor='la',direction='ltr')
            if alpha<1:card.putalpha(card.getchannel('A').point(lambda a:round(a*alpha)))
            im.paste(card,(0,y),card)
        d=ImageDraw.Draw(im)
        if p>=12:tag(d,'نشر مجدول مفعّل',152,814,416,GREEN,INK,25)
    elif sid=='s7':
        actual_wave(d,t,861,GREEN,height=24)
        if t>=199.4:
            # Three existing marks, now highlighted for the rewatch clue.
            for i in range(3):
                x=126+i*10;d.ellipse((x-8,695,x+10,718),outline=Y,width=2)
    elif sid=='s9':actual_wave(d,t,844,GREEN,height=15)
    elif sid=='s10':
        for knock in [274.8,275.85,276.9]:
            if 0<=t-knock<.65:
                q=(t-knock)/.65;r=15+q*150
                d.ellipse((363-r,587-r,363+r,587+r),outline=Y,width=max(1,round(3*(1-q))))
        if t>=DENIAL:
            tx(d,'ريم مو عند الباب',360,877,30,GREEN,True,'ma')
    idx=bisect.bisect_right(STARTS,t)-1
    if idx>=0 and T[idx]['start']<=t<T[idx]['end']:
        layer=caption(idx);im.paste(layer,(0,947),layer)
    elif sid=='s1' and t<2.8:
        tx(d,'رسالة من أختها قبل ما تختفي',360,990,33,WHITE,True,'ma')
    elif sid=='s7' and t>=199.4:
        tx(d,'ثلاث علامات كانت موجودة من البداية',360,991,28,Y,True,'ma')
    elif sid=='s10' and t>=287:
        tx(d,'المكالمة مستمرة',360,992,31,GREY,False,'ma')
        tx(d,'والباب للحين مسكر',360,1057,37,WHITE,True,'ma')
    d.text((360,1210),f'{int(t)//60:02}:{int(t)%60:02} / 05:00',font=font(21),fill=GREY,anchor='ma',direction='ltr')
    return im

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--samples',action='store_true')
    parser.add_argument('--preview',action='store_true');args=parser.parse_args()
    if args.samples:
        out=P/'frames';out.mkdir(exist_ok=True)
        times=[1,5,14,26,40,59,74,87,94,116,119,122,145,149,152,177,184,190,203,212,229,237,246,255,268,275,280,286,290,297]
        for t in times:frame(t).save(out/f'{t:03}.png')
        print(f'{len(times)} motion design frames ready');return
    if args.preview:
        intervals=[(0,8),(114,124),(144,154),(173,185),(274,291)]
        out=P/'motion-preview.mp4'
        # Preview contains discrete passage excerpts; final export keeps one continuous clock.
        pieces=[]
        for a,b in intervals:
            pieces.extend(range(a*FPS,b*FPS))
        audio_inputs=['-i',str(P/'mix-master.wav')]
        filters=';'.join(f'[1:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{i}]' for i,(a,b) in enumerate(intervals))
        filters+=';'+''.join(f'[a{i}]' for i in range(len(intervals)))+f'concat=n={len(intervals)}:v=0:a=1[a]'
        audio_args=['-filter_complex',filters,'-map','0:v:0','-map','[a]']
    else:
        (R/'deliverables').mkdir(exist_ok=True)
        out=R/'deliverables'/'khawarizmiat-motion-episode.mp4'
        pieces=range(300*FPS);audio_inputs=['-i',str(P/'mix-master.wav')]
        audio_args=['-map','0:v:0','-map','1:a:0']
    log=(P/('preview-encode.log' if args.preview else 'encode.log')).open('w')
    command=['ffmpeg','-nostdin','-y','-v','warning','-f','rawvideo','-pix_fmt','rgb24',
             '-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0',*audio_inputs,*audio_args,
             '-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p',
             '-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart',str(out)]
    proc=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=log)
    try:
        for n,f in enumerate(pieces):
            proc.stdin.write(frame(f/FPS).tobytes())
            if n%(FPS*30)==0:print(f'rendered {n//FPS} seconds',flush=True)
        proc.stdin.close()
        if proc.wait()!=0:raise RuntimeError('Encoder failed: inspect log')
    finally:log.close()
    print(str(out),flush=True)

if __name__=='__main__':main()
