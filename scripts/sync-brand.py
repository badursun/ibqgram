"""Install approved IBQgram current artwork without changing account identifiers."""
from pathlib import Path
import copy
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'branding/ibqgram/current'
DEST = ROOT / 'prototype/assets/brand'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
q = lambda name: '{' + NS + '}' + name

def save(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_bytes() != content:
        path.write_bytes(content)

for folder in ['static', 'animations']:
    for source in (SOURCE / folder).glob('*.svg'):
        save(DEST / folder / source.name, source.read_bytes())

def adaptive(kind, mode):
    folder = 'static' if mode == 'static' else 'animations'
    suffix = '' if mode == 'static' else '-' + mode
    root = ET.parse(SOURCE / folder / f'ibqgram-{kind}-light{suffix}.svg').getroot()
    dark = ET.parse(SOURCE / folder / f'ibqgram-{kind}-dark{suffix}.svg').getroot()
    flower = root.find('.//'+q('g')+'[@id="flower"]')
    dark_flower = dark.find('.//'+q('g')+'[@id="flower"]')
    halo = copy.deepcopy(next(e for e in dark_flower if e.get('stroke') == '#DAE8CB'))
    halo.set('class','brand-halo')
    flower.insert(1,halo)
    style = ET.SubElement(root,q('style'))
    style.text = '.brand-halo{opacity:0}@media(prefers-color-scheme:dark){#wordmark,#tagline{fill:#F4F7EF}#flight{stroke:#F4F7EF}.brand-halo{opacity:.78}}'
    return ET.tostring(root,encoding='utf-8')

for kind,legacy in [('icon','icqram-flower'),('logo','icqram-logo')]:
    for mode in ['static','connecting','message']:
        folder = 'static' if mode == 'static' else 'animations'
        suffix = '' if mode == 'static' else '-' + mode
        save(DEST / folder / (legacy+suffix+'.svg'),adaptive(kind,mode))

badges = {
    'FC':'<circle cx="353" cy="365" r="102" fill="#F4D366" stroke="#062111" stroke-width="18"/><path d="M310 380 Q353 435 396 380" fill="none" stroke="#062111" stroke-width="16" stroke-linecap="round"/><circle cx="320" cy="340" r="11"/><circle cx="387" cy="340" r="11"/>',
    'AW':'<path d="M280 290H455V410H355L310 450V410H280Z" fill="#FFF9E7" stroke="#062111" stroke-width="17" stroke-linejoin="round"/>',
    'NA':'<rect x="216" y="290" width="270" height="145" rx="15" fill="#FFF9E7" stroke="#C94636" stroke-width="22"/><path d="M250 401V324L305 401V324 M330 401L361 324L395 401 M342 374H383" fill="none" stroke="#062111" stroke-width="17" stroke-linejoin="round"/>',
    'OC':'<circle cx="370" cy="365" r="99" fill="#F4D366" stroke="#062111" stroke-width="17"/><path d="M370 303V369" stroke="#062111" stroke-width="24" stroke-linecap="round"/><circle cx="370" cy="410" r="13"/>',
    'DND':'<circle cx="370" cy="365" r="99" fill="#D94B3C" stroke="#062111" stroke-width="17"/><path d="M310 365H430" stroke="#FFF9E7" stroke-width="25" stroke-linecap="round"/>',
    'PH':'<path d="M295 290C264 330 305 410 378 441C407 455 434 433 442 413L397 377L373 400Q330 380 320 343L343 324Z" fill="#F4D366" stroke="#062111" stroke-width="17" stroke-linejoin="round"/>',
    'LC':'<path d="M275 320H422V386Q422 440 350 440Q275 440 275 386Z M422 335H451Q490 368 422 391" fill="#FFF9E7" stroke="#062111" stroke-width="17" stroke-linejoin="round"/><path d="M302 465H444" stroke="#062111" stroke-width="17" stroke-linecap="round"/>'
}
for code in ['AV','FC','AW','NA','OC','DND','IV','OF','PH','LC']:
    root = ET.parse(SOURCE / 'static/ibqgram-icon-light-small.svg').getroot()
    root.find(q('title')).text = 'IBQgram — '+code
    if code in ['IV','OF']:
        color = '#A8B0AA' if code=='IV' else '#D96859'
        for element in root.iter(q('path')):
            for key in ['fill','stroke']:
                if element.get(key) in ['#AFCB9D','#76CB2E']:
                    element.set(key,color)
    if code in badges:
        root.append(ET.fromstring('<g xmlns="'+NS+'" fill="#062111">'+badges[code]+'</g>'))
    save(DEST/'presence'/(code+'.svg'),ET.tostring(root,encoding='utf-8'))
save(ROOT/'prototype/assets/classic/status.svg',(DEST/'presence/AV.svg').read_bytes())
print('IBQgram current artwork, adaptive aliases and presence icons installed.')
