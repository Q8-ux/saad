from pathlib import Path
import json
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[1]
size=1024
image=Image.new('RGB',(size,size),'#142b3e')
d=ImageDraw.Draw(image)
d.rounded_rectangle((195,210,829,814),radius=70,fill='#087f7c')
d.rounded_rectangle((235,177,784,750),radius=44,fill='#f5f7f0')
d.rectangle((495,185,524,746),fill='#d7e6df')
for y in [320,400,480,560]:
 d.rounded_rectangle((298,y,448,y+14),radius=7,fill='#8aaba7')
 d.rounded_rectangle((566,y,716,y+14),radius=7,fill='#8aaba7')
d.polygon([(610,746),(659,625),(817,419),(878,467),(720,674)],fill='#d8b66e')
d.polygon([(610,746),(625,682),(665,714)],fill='#142b3e')
d.polygon([(817,419),(842,386),(904,435),(878,467)],fill='#f5f7f0')
icons=root/'Sources/WritingStudio/Assets.xcassets/AppIcon.appiconset'
entries=[]
specs=[('iphone','20x20','2x',40),('iphone','20x20','3x',60),('iphone','29x29','2x',58),('iphone','29x29','3x',87),('iphone','40x40','2x',80),('iphone','40x40','3x',120),('iphone','60x60','2x',120),('iphone','60x60','3x',180),('ipad','20x20','1x',20),('ipad','20x20','2x',40),('ipad','29x29','1x',29),('ipad','29x29','2x',58),('ipad','40x40','1x',40),('ipad','40x40','2x',80),('ipad','76x76','1x',76),('ipad','76x76','2x',152),('ipad','83.5x83.5','2x',167),('ios-marketing','1024x1024','1x',1024)]
for idiom,point,scale,pixels in specs:
 filename=f'icon-{pixels}.png'
 image.resize((pixels,pixels),Image.Resampling.LANCZOS).save(icons/filename)
 entries.append({'idiom':idiom,'size':point,'scale':scale,'filename':filename})
(icons/'Contents.json').write_text(json.dumps({'images':entries,'info':{'author':'xcode','version':1}},indent=2)+'\n')
web=root.parent/'family-online-iphone/icons'
for pixels in [180,192,512]: image.resize((pixels,pixels),Image.Resampling.LANCZOS).save(web/f'icon-{pixels}.png')
print('Original book-and-pen icons generated: opaque RGB PNG, native and web sizes')
