"""Extract each original illustration from the supplied 1024 x 1536 word sheet."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

# Each rectangle contains the drawing only; its printed label is replaced by live text.
PICTURES = [
    ('air', (30, 271, 227, 445)),
    ('leaf', (266, 285, 420, 449)),
    ('buds', (449, 283, 598, 449)),
    ('soil', (632, 289, 796, 449)),
    ('grow', (832, 285, 997, 449)),
    ('water', (32, 562, 354, 719)),
    ('plants', (405, 561, 687, 718)),
    ('flower', (734, 562, 990, 721)),
    ('climber', (38, 838, 322, 1016)),
    ('creeper', (351, 844, 638, 1016)),
    ('sunlight', (694, 834, 988, 1016)),
    ('animals', (34, 1139, 352, 1325)),
    ('healthy', (404, 1139, 663, 1328)),
    ('energy', (714, 1143, 983, 1328)),
]

def extract(source, output):
    with Image.open(source) as image:
        if image.size != (1024, 1536):
            raise ValueError('Expected the supplied 1024 x 1536 Science Dictation Words image')
        output.mkdir(parents=True, exist_ok=True)
        pictures = []
        for word, bounds in PICTURES:
            crop = image.crop(bounds).convert('RGB')
            filename = word + '-v1.webp'
            crop.save(output / filename, 'WEBP', lossless=True, method=6)
            pictures.append({'id': word, 'file': filename, 'width': crop.width,
                             'height': crop.height, 'bounds': list(bounds)})
    manifest = {'source': {'width': 1024, 'height': 1536,
                           'sha256': hashlib.sha256(source.read_bytes()).hexdigest()},
                'pictures': pictures}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Extracted {len(pictures)} original drawings, one file per word')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    extract(args.source, args.output)
