"""Render the five-minute pilot locally with the existing assets; no API required."""
import os
import sys
from pathlib import Path

root=Path(__file__).resolve().parent
os.environ['KHAWARIZMIAT_PROJECT_ROOT']=str(root)
sys.path.insert(0,str(root/'production'))
from render_motion import main

if __name__=='__main__':main()
