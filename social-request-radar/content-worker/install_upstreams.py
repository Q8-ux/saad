"""Fetch reviewed repository SHAs without executing upstream installers or downloading model weights."""
from pathlib import Path
import argparse,json,subprocess

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--directory',type=Path,default=Path(__file__).parent/'upstreams');parser.add_argument('--tool',action='append');args=parser.parse_args()
    lock=json.loads(Path(__file__).with_name('upstream-lock.json').read_text());chosen=args.tool or [r['id'] for r in lock['repositories']]
    if set(chosen)-{r['id'] for r in lock['repositories']}:parser.error('Unknown tool')
    args.directory.mkdir(parents=True,exist_ok=True)
    for repo in lock['repositories']:
        if repo['id'] not in chosen:continue
        dest=(args.directory/repo['id']).resolve()
        if dest.exists():
            current=subprocess.check_output(['git','-C',str(dest),'rev-parse','HEAD'],text=True).strip()
            if current!=repo['commit']:raise SystemExit('Existing checkout differs; preserve it and choose a fresh directory: '+repo['id'])
        else:
            dest.mkdir();subprocess.run(['git','init',str(dest)],check=True,capture_output=True)
            subprocess.run(['git','-C',str(dest),'fetch','--depth','1','https://github.com/'+repo['repository']+'.git',repo['commit']],check=True)
            subprocess.run(['git','-C',str(dest),'checkout','--detach','FETCH_HEAD'],check=True,capture_output=True)
        print(repo['id']+' '+repo['commit']+' '+repo['license'])
    print('Sources fetched. No dependencies, models, account sessions or publishing services were installed.')

if __name__=='__main__':main()
