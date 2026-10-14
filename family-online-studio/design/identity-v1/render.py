"""Rasterize this original geometric mark, then package it with masar-photoshop."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import zipfile
from PIL import Image, ImageDraw

def render(engine, output):
    root = Path(__file__).resolve().parent
    unit = 4
    def point(value):
        return tuple(round(x * unit) for x in value)
    def layer():
        return Image.new('RGBA', (128 * unit, 128 * unit))
    def save(image, name):
        image.resize((256, 256), Image.Resampling.LANCZOS).save(root / 'layers' / (name + '.png'))
    image = layer()
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(point((1, 1, 127, 127)), radius=28 * unit, fill='#172e37')
    draw.rounded_rectangle(point((1.5, 1.5, 126.5, 126.5)), radius=27.5 * unit, outline='#405a61', width=unit)
    save(image, 'stamp')
    image = layer()
    draw = ImageDraw.Draw(image)
    for left, right, y in [(32, 96, 96), (40, 88, 105)]:
        color = (161, 214, 200, 153)
        draw.line([point((left, y)), point((right, y))], fill=color, width=3 * unit)
        for x in (left, right):
            draw.ellipse(point((x-1.5, y-1.5, x+1.5, y+1.5)), fill=color)
    save(image, 'lines')
    image = layer()
    draw = ImageDraw.Draw(image)
    draw.polygon([point(p) for p in [(64,18),(43,59),(53,77),(75,77),(85,59)]], fill='#f6f3ec')
    draw.line([point((64,21)), point((64,51))], fill='#172e37', width=3 * unit)
    draw.ellipse(point((59.5,49.5,68.5,58.5)), fill='#172e37')
    draw.line([point((53,84)),point((75,84))], fill='#a1d6c8', width=6 * unit)
    for x in (53,75):
        draw.ellipse(point((x-3,81,x+3,87)), fill='#a1d6c8')
    image = image.rotate(-28, resample=Image.Resampling.BICUBIC, center=point((64,58)))
    save(image, 'nib')
    subprocess.run(['python', str(Path(engine).resolve()), '--profile', str(root/'profile.json'), '--job', str(root/'job.json'), '--output', str(Path(output).resolve())], check=True)
    output = Path(output).resolve()
    with zipfile.ZipFile(root/'design.comp.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted((output/'design.comp').rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(output))
    public = root.parents[2] / 'public' / 'studio'
    public.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(output/'export.webp', public/'pen-mark.webp')
    shutil.copyfile(output/'production.json', root/'production.json')
    print(json.dumps({'layers':3, 'export':str(public/'pen-mark.webp'), 'editable':str(root/'design.comp.zip')}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    render(args.engine, args.output)
