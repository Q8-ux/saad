"""Render the Bohamdan production preset with FFmpeg; no provider keys needed.

Synthesize the selected voice first. This command processes that existing audio.
"""
import argparse
import json
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--voice', required=True, type=Path)
    parser.add_argument('--effects', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    inputs = [args.voice, *([args.effects] if args.effects else [])]
    if any(not path.is_file() for path in inputs):
        parser.error('Input audio file does not exist.')
    if args.output.resolve() in [path.resolve() for path in inputs]:
        parser.error('Output must be separate from input audio.')
    p = json.loads(Path(__file__).with_name('bohamdan-narrator.json').read_text())['processing']
    c = p['compression']
    chain = f"highpass=f={p['highpass_hz']}"
    for key, width in [('warmth_eq', 0.9), ('mud_eq', 1), ('presence_eq', 1)]:
        eq = p[key]
        chain += f",equalizer=f={eq['hz']}:t=q:w={width}:g={eq['gain_db']}"
    chain += f",acompressor=threshold={c['threshold']}:ratio={c['ratio']}:attack={c['attack_ms']}:release={c['release_ms']}:makeup={c['makeup']},aformat=channel_layouts=stereo"
    graph = '[0:a]' + chain + '[voice];'
    if args.effects:
        graph += '[1:a]volume=0.85[fx];[voice][fx]amix=inputs=2:duration=first:normalize=0[mix];'
    else:
        graph += '[voice]anull[mix];'
    graph += f"[mix]loudnorm=I={p['target_lufs']}:TP={p['true_peak_ceiling_db']}:LRA=8[out]"
    command = ['ffmpeg', '-nostdin', '-v', 'error', '-n']
    for path in inputs:
        command += ['-i', str(path)]
    command += ['-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '160k', str(args.output)]
    subprocess.run(command, check=True)
    print(args.output)


if __name__ == '__main__':
    main()
