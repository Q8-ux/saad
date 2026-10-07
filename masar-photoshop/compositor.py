"""Package approved image layers for Compositor; no AI or facial retouching."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import tempfile
import uuid

from PIL import Image, ImageChops, ImageColor, ImageOps


def load_image(path, mode):
    with Image.open(path) as source:
        if source.width > 30000 or source.height > 30000:
            raise ValueError('Image exceeds Compositor side limit')
        image = ImageOps.exif_transpose(source).convert(mode)
        if image.width * image.height > 100_000_000:
            raise ValueError('Image exceeds pixel budget')
        return image


def build(job_path, output, profile_path):
    job_path, output = Path(job_path).resolve(), Path(output).resolve()
    profile = json.loads(Path(profile_path).read_text())
    job = json.loads(job_path.read_text())
    if output.exists():
        raise ValueError('Output already exists; choose a new version directory')
    width, height = job['size']
    if any(type(n) is not int or not 1 <= n <= 30000 for n in (width, height)):
        raise ValueError('Invalid canvas dimensions')
    if width * height > 20_000_000:
        raise ValueError('Export canvas exceeds this adapter 20M pixel budget')
    dpi = job.get('dpi', 72)
    if type(dpi) is not int or not 1 <= dpi <= 9600:
        raise ValueError('Invalid resolution')
    if len(job['layers']) > 100:
        raise ValueError('Adapter supports at most 100 layers')
    if profile.get('requires_cutout'):
        if not any(x.get('role') == 'subject' for x in job['layers']):
            raise ValueError('Portrait requires a subject layer')
    layers, assets, provenance = [], {}, []
    preview = Image.new('RGBA', (width, height))
    total_pixels = 0
    for item in job['layers']:
        source = (job_path.parent / item['file']).resolve()
        image = load_image(source, 'RGBA')
        total_pixels += image.width * image.height
        if total_pixels > 100_000_000:
            raise ValueError('Total image pixel budget exceeded')
        identifier = str(uuid.uuid4()).upper()
        x, y, w, h = item.get('box', [0, 0, width, height])
        if any(type(n) is not int for n in (x, y, w, h)) or not (0 < w <= 30000 and 0 < h <= 30000):
            raise ValueError('Invalid layer box')
        if w * h > 20_000_000:
            raise ValueError('Layer export size exceeds adapter budget')
        # No distortion: preserve the source aspect ratio, with rounding tolerance.
        if abs(w * image.height - h * image.width) > max(image.size):
            raise ValueError('Layer box would distort the source; use proportional dimensions')
        opacity = item.get('opacity', 1)
        if type(opacity) not in (int, float) or not math.isfinite(opacity) or not 0 <= opacity <= 1:
            raise ValueError('Invalid opacity')
        layer = dict(id=identifier, name=item['name'], imageFile=identifier+'.png',
                     isVisible=True, isGroup=False, opacity=opacity, blendMode='Normal',
                     transform=dict(origin=[x, y], size=[w, h], rotation=0,
                                    flipX=False, flipY=False, sampling='High quality'))
        assets[layer['imageFile']] = image
        rendered = image.copy()
        mask = None
        if item.get('mask'):
            mask_path = (job_path.parent / item['mask']).resolve()
            mask = load_image(mask_path, 'L')
            if mask.size != image.size:
                raise ValueError('Mask must match oriented source dimensions')
            layer.update(maskFile=identifier+'.mask.png', maskEnabled=True)
            assets[layer['maskFile']] = mask
            rendered.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
            provenance.append(dict(role='mask', sha256=hashlib.sha256(mask_path.read_bytes()).hexdigest()))
        if profile.get('requires_cutout') and item.get('role') == 'subject':
            if mask is None and image.getchannel('A').getextrema()[0] == 255:
                raise ValueError('Subject needs an approved cutout PNG or mask; background removal is manual')
        rendered = rendered.resize((w, h), Image.Resampling.LANCZOS)
        rendered.putalpha(rendered.getchannel('A').point(lambda a: round(a * opacity)))
        preview.alpha_composite(rendered, (x, y))
        layers.append(layer)
        provenance.append(dict(role=item.get('role', 'artwork'),
                               sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                               name=source.name, source_size=list(image.size)))
    if not layers:
        raise ValueError('At least one approved layer is required')
    manifest = dict(format='com.compositor.project', version=11, colorSpace='sRGB',
                    documentID=str(uuid.uuid4()).upper(), width=width, height=height,
                    resolution=dpi, activeLayerID=layers[-1]['id'], layers=layers)
    # Build a complete new directory and rename it; never overwrite an open project.
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as temporary:
        staging = Path(temporary) / 'result'
        package = staging / 'design.comp'
        (package / 'images').mkdir(parents=True)
        for filename, asset in assets.items():
            asset.save(package / 'images' / filename)
        (package / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        preview.save(staging / 'export.png', dpi=(dpi, dpi))
        matte = Image.new('RGBA', preview.size, ImageColor.getrgb(job.get('matte', '#FFFFFF')) + (255,))
        matte.alpha_composite(preview)
        rgb = matte.convert('RGB')
        rgb.save(staging / 'export.jpg', quality=95, dpi=(dpi, dpi))
        preview.save(staging / 'export.webp', quality=90)
        rgb.save(staging / 'export.pdf', resolution=dpi)
        (staging / 'production.json').write_text(json.dumps(dict(
            project=profile['project'], sources=provenance, face_retouch=False,
            background_removal='provided mask or existing transparency only',
            text='approved raster layers; text is not editable in this adapter',
            status='requires visual review before publishing'), ensure_ascii=False, indent=2))
        staging.rename(output)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--job', required=True)
    parser.add_argument('--profile', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        build(args.job, args.output, args.profile)
    except (ValueError, KeyError, OSError) as error:
        parser.exit(2, str(error) + '\n')


if __name__ == '__main__':
    main()
