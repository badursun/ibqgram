"""Build the colored Dock icon and monochrome macOS menu-bar template."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
subprocess.run([sys.executable,str(ROOT/'scripts/sync-brand.py')],check=True)
renderer = shutil.which('rsvg-convert')
if not renderer:
    raise SystemExit('rsvg-convert required: install librsvg before building icons.')
brand = ROOT/'prototype/assets/brand/static'
icon = ROOT/'desktop/assets/icqram-app.svg'
icon.write_bytes((brand/'ibqgram-icon-dark.svg').read_bytes())
folder = ROOT/'build/icqram.iconset'
folder.mkdir(parents=True,exist_ok=True)
for size in (16,32,128,256,512):
    for scale in (1,2):
        suffix = '@2x' if scale==2 else ''
        source = brand/'ibqgram-icon-dark-small.svg' if size<=32 else icon
        subprocess.run([renderer,'-w',str(size*scale),'-h',str(size*scale),str(source),'-o',str(folder/f'icon_{size}x{size}{suffix}.png')],check=True)
subprocess.run(['iconutil','-c','icns',str(folder),'-o',str(ROOT/'build/icqram.icns')],check=True)
subprocess.run([renderer,'-w','44','-h','44',str(brand/'ibqgram-icon-light-monochrome.svg'),'-o',str(brand/'ibqgram-tray.png')],check=True)
print('IBQgram Dock icon and monochrome menu-bar template built.')
