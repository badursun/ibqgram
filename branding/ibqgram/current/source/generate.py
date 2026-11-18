from pathlib import Path
import json, shutil, xml.etree.ElementTree as ET, subprocess, zipfile
from html import escape

OUT = Path(__file__).resolve().parent.parent
SOURCE = Path(__file__).resolve().parent / 'vector-paths.json'
DATA = json.loads(SOURCE.read_text())
OUT.mkdir(parents=True, exist_ok=True)
for folder in ['static','animations','source','previews']:
    (OUT/folder).mkdir(exist_ok=True)
if SOURCE.resolve() != (OUT/'source/vector-paths.json').resolve():
    shutil.copy2(SOURCE,OUT/'source/vector-paths.json')
PALETTE = {'sage':'#AFCB9D','accent':'#76CB2E','motionAccent':'#E44536','ink':'#062111','center':'#F4D366','paper':'#F8F5EA','dark':'#1C2520'}
ORDER = [1,3,4,2,0]

def path(p, **attrs):
    a = {k:v for k,v in p.items() if k in ['d','transform']}
    a.update(attrs)
    return '<path '+ ' '.join(f'{k.replace("_","-")}="{escape(str(v),quote=True)}"' for k,v in a.items())+'/>'

def styles(mode):
    css = '.accent,.motion-accent{opacity:0}.petal-0 .accent{opacity:1}'
    if mode != 'static':
        duration, repeat = ('1.5s','infinite') if mode == 'connecting' else ('0.8s','2')
        css += f'@keyframes hide-resting-accent{{0%,100%{{opacity:0}}}}.petal-0 .accent{{animation:hide-resting-accent {duration} steps(1,end) {repeat};}}'
        for i in range(5):
            lo, hi = 20*i,20*(i+1)
            keys = (f'0%,{lo-.01:g}%{{opacity:0}}' if i else '') + f'{lo}%,{hi-.01:g}%{{opacity:1}}'
            keys += f'{hi}%,100%{{opacity:0}}' if i<4 else '100%{opacity:0}'
            css += f'@keyframes advance-{i}{{{keys}}}.petal-{i} .motion-accent{{animation:advance-{i} {duration} steps(1,end) {repeat};}}'
        css += '@media(prefers-reduced-motion:reduce){.accent,.motion-accent{animation:none!important;opacity:0!important}.petal-0 .accent{opacity:1!important}}'
    return '<style>'+css+'</style>'

def flower(theme='light',mode='static',small=False,mono=False):
    p = DATA['petals']
    outline = DATA['silhouette'][0]
    out = '<defs><clipPath id="flower-boundary">'+path(outline)+'</clipPath></defs>'
    if theme=='dark' and not mono:
        out += path(outline,fill='none',stroke='#DAE8CB',stroke_width='5',stroke_linejoin='round',opacity='.78')
    out += '<g clip-path="url(#flower-boundary)">'
    if not mono: out += path(outline,fill=PALETTE['ink'])
    for i,idx in enumerate(ORDER):
        base = PALETTE['sage'] if small else 'url(#sage)'
        active = PALETTE['accent'] if small else 'url(#leaf)'
        if mono:
            out += path(p[idx],fill='currentColor',stroke='currentColor',stroke_width='4',stroke_linejoin='round')
        else:
            out += f'<g id="petal-{i}" class="petal petal-{i}">'
            out += path(p[idx],fill=base,stroke=base,stroke_width='4',stroke_linejoin='round')
            out += path(p[idx],fill=active,stroke=active,stroke_width='4',stroke_linejoin='round',**{'class':'accent'})
            if mode != 'static':
                out += path(p[idx],fill='url(#signal)',stroke='url(#signal)',stroke_width='4',stroke_linejoin='round',**{'class':'motion-accent'})
            out += '</g>'
    if not mono: out += path(outline,fill='none',stroke=PALETTE['ink'],stroke_width='18',stroke_linejoin='round')
    out += '</g>'
    if mono:
        out += '<circle cx="232" cy="225" r="45" fill="currentColor"/>'
    else:
        out += f'<circle id="flower-center" cx="232" cy="225" r="{51 if small else 50}" fill="{PALETTE["center"] if small else "url(#sun)"}" stroke="{PALETTE["ink"]}" stroke-width="9"/>'
        if not small:
            out += '<ellipse cx="218" cy="204" rx="13" ry="8" transform="rotate(-35 218 204)" fill="#FFFCE0" opacity=".8"/>'
    return out

def svg(kind='icon',theme='light',mode='static',small=False,mono=False):
    box = '0 0 512 512' if kind=='icon' else ('0 0 1460 460' if kind=='logo' else '0 0 1460 500')
    ink = '#101713' if theme=='light' else '#F4F7EF'
    title = f'IBQgram — {kind}, {mode}, {theme}'
    desc = 'Five sage-green Mirabilis petals with a leaf-green accent and a warm yellow center.'
    if mode != 'static': desc += ' A warm red accent travels clockwise from the upper-right petal; after a message it returns to static green. Reduced-motion settings show the static mark.'
    defs = '''<defs>
    <linearGradient id="sage" x1="0" y1="0" x2=".78" y2="1"><stop stop-color="#D1E3B9"/><stop offset=".45" stop-color="#B5CF9F"/><stop offset="1" stop-color="#9ABC86"/></linearGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#A8E857"/><stop offset=".35" stop-color="#7CCD2B"/><stop offset="1" stop-color="#55A81F"/></linearGradient>
    <linearGradient id="signal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#FF8E75"/><stop offset=".35" stop-color="#E44536"/><stop offset="1" stop-color="#B92828"/></linearGradient>
    <radialGradient id="sun" cx=".3" cy=".25" r=".9"><stop stop-color="#FFF0A0"/><stop offset=".55" stop-color="#F5D15D"/><stop offset="1" stop-color="#D9AD37"/></radialGradient>
    </defs>'''
    out = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-labelledby="ibq-title ibq-desc" color="{ink}"><title id="ibq-title">{escape(title)}</title><desc id="ibq-desc">{escape(desc)}</desc>{defs}{styles(mode)}'
    transform = 'translate(26 38)' if kind=='icon' else 'translate(5 20)'
    out += f'<g id="flower" transform="{transform}">'+flower(theme,mode,small,mono)+'</g>'
    if kind!='icon':
        out += '<g id="wordmark" transform="translate(510 145)" fill="'+ink+'">'+''.join(path(x) for x in DATA['wordmark'])+'</g>'
        out += f'''<g id="flight" fill="none" stroke="{ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M900 184 C917 123 964 104 1011 125 S1112 181 1152 151 C1187 125 1165 77 1135 81 C1107 84 1103 121 1132 134 C1161 147 1218 135 1242 132" stroke-dasharray="6 9"/>
        <path d="M1252 79 L1384 68 L1306 137 L1291 107 L1276 126 L1275 96 Z M1275 96 L1384 68 L1291 107 M1276 126 L1291 119"/>
        </g>'''
        if kind=='lockup':
            out += f'<g id="tagline" transform="translate(514 375)" fill="{ink}" opacity=".76">'+''.join(path(x) for x in DATA['tagline'])+'</g>'
    return out+'</svg>\n'

files=[]
for kind in ['icon','logo','lockup']:
    for theme in ['light','dark']:
        for mode in ['static','connecting','message']:
            folder = 'static' if mode=='static' else 'animations'
            name = f'ibqgram-{kind}-{theme}'+('' if mode=='static' else f'-{mode}')+'.svg'
            (OUT/folder/name).write_text(svg(kind,theme,mode))
            files.append({'path':folder+'/'+name,'kind':kind,'theme':theme,'state':mode})
for theme in ['light','dark']:
    for variant in ['small','monochrome']:
        name = f'ibqgram-icon-{theme}-{variant}.svg'
        (OUT/'static'/name).write_text(svg('icon',theme,small=True,mono=variant=='monochrome'))
        files.append({'path':'static/'+name,'kind':'icon','theme':theme,'state':variant})

manifest={'name':'IBQgram','version':4,'palette':PALETTE,'assets':files,'motion':{'direction':'clockwise','petals':5,'start':'upper-right','connecting':{'seconds':1.5,'repeat':'infinite'},'message':{'seconds':.8,'repeat':2,'totalSeconds':1.6},'reducedMotion':'static upper-right accent'},'wordmark':'Outlined from the approved concept; no installed font or external image is required.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IBQgram · SVG set</title>
<style>*{box-sizing:border-box}body{margin:0;background:#ecece2;color:#17251b;font:15px system-ui,sans-serif}header{padding:32px max(24px,5vw);border-bottom:1px solid #bcc9b6}h1{margin:0 0 8px;font-size:28px}p{margin:8px 0;color:#52614e}nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}button{font:inherit;padding:8px 16px;border:1px solid #879d7f;border-radius:7px;background:#f8faf3;color:#17251b;cursor:pointer}button[aria-pressed=true]{background:#203a27;color:white}main{max-width:1280px;margin:auto;padding:24px;display:grid;gap:24px}.row{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{padding:24px;border-radius:16px;background:#faf7ee;min-width:0}.dark{background:#1c2520;color:#edf4e8}.card h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 12px}.logo{display:block;width:100%;height:auto}.icon{width:160px;height:160px}.sizes{display:flex;gap:22px;align-items:center;min-height:70px;margin-top:12px}.small-note{font-size:13px}.download{color:inherit}footer{padding:24px;text-align:center}@media(max-width:700px){.row{grid-template-columns:1fr}}</style>
<header><h1>IBQgram</h1><p>One letter back. A whole era closer.</p><nav><button data-mode="static" aria-pressed="true">Static</button><button data-mode="connecting" aria-pressed="false">Connecting</button><button data-mode="message" aria-pressed="false">Message · replay</button></nav><p id="state" class="small-note">Static artwork · transparent SVG · outlined lettering</p></header><main>'''
for kind,label in [('lockup','Logo + tagline'),('logo','Icon + wordmark'),('icon','Flower icon')]:
    html+='<div class="row">'
    for theme in ['light','dark']:
        html+=f'<section class="card {theme}"><h2>{label} · {theme}</h2><img class="{ "icon" if kind=="icon" else "logo"}" data-kind="{kind}" data-theme="{theme}" src="static/ibqgram-{kind}-{theme}.svg" alt="IBQgram {label}">'
        if kind=='icon':
            html+='<div class="sizes">'+''.join(f'<img src="static/ibqgram-icon-{theme}-small.svg" width="{n}" height="{n}" alt="{n} pixel flower">' for n in [16,22,32,48,64])+'</div><p class="small-note">16 · 22 · 32 · 48 · 64 px / small-size artwork</p>'
            html+=f'<div class="sizes"><img src="static/ibqgram-icon-{theme}-monochrome.svg" width="22" height="22" alt="Template"><img src="static/ibqgram-icon-{theme}-monochrome.svg" width="64" height="64" alt="Template"></div><p class="small-note">Monochrome menu-bar template</p>'
        html+='</section>'
    html+='</div>'
html+='''</main><footer>Animations respect “Reduce motion”. Static files also work in renderers without CSS animation.</footer>
<script>document.querySelectorAll('button[data-mode]').forEach(b=>b.onclick=()=>{const mode=b.dataset.mode;document.querySelectorAll('button[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('img[data-kind]').forEach(x=>{x.src=(mode==='static'?'static/':'animations/')+'ibqgram-'+x.dataset.kind+'-'+x.dataset.theme+(mode==='static'?'':'-'+mode)+'.svg?replay='+Date.now()});document.querySelector('#state').textContent=mode==='connecting'?'Clockwise red accent · 1.5 second loop':mode==='message'?'Two red clockwise turns · 1.6 seconds · returns to green':'Static artwork · transparent SVG · outlined lettering'});</script></html>'''
(OUT/'preview.html').write_text(html)
(OUT/'README.txt').write_text('''IBQgram SVG set — v4

22 standalone SVG files. Transparent canvas; no raster embeds, JavaScript,
external fonts, network resources or background tiles in the SVG assets.
Open preview.html to compare light/dark versions and replay animations.

static/:
  icon: flower only (512 × 512 viewBox).
  logo: flower + outlined IBQgram lettering + fine paper-plane accent.
  lockup: logo plus the approved tagline.
  icon-small: flat artwork for 16–32 px use.
  icon-monochrome: opaque silhouette with transparent seams for macOS template icons.
  light/dark refers to the destination background. Neither adds a background.

animations/:
  connecting: warm red 1.5 s clockwise loop, five equal steps; start at upper right.
  message: two red 0.8 s clockwise turns, then the static green upper-right accent.
  Geometry stays fixed; only the red accent moves between petals.
  Reduced-motion preferences disable both animations.
  For startup, display connecting for the actual 1–3 s loading state, then
  replace with static. Replay a message animation by remounting the image.

Use SVG as <img> or CSS background in browser/webview UI. Inline SVG is also
supported; namespace IDs and animation names if inserting multiple copies
in one DOM. Qt/macOS static image renderers do not run CSS animations:
use a webview or drive the five petal states from native application code.
Use the monochrome SVG rasterization as a macOS NSImage template; let the OS
apply menu-bar color. It must be configured as a template by the application.

The wordmark and tagline are vector outlines derived from the approved
concept, not an installed font. Paper plane is confined to the wordmark;
the application icon remains a flower. Palette/motion data: manifest.json.
Generator and editable path data: source/. Run python3 source/generate.py
to regenerate SVGs with no third-party Python dependencies.

This package does not rename the application, change bundle identifiers,
replace existing icons, or alter account data. It contains design assets;
it does not assert trademark availability or grant third-party rights.
''')

print(f'Generated {len(files)} SVGs at {OUT}')
