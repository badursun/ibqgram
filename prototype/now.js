(() => {
  'use strict';
  if(window.icqramView?.kind!=='now')return;
  const frame=document.querySelector('#now-frame');
  const render=()=>{
    const markup=document.querySelector('#now-page-template').innerHTML.replace(/(src|href)="(assets\/[^"<>]+|now-page\.css)"/g,(_,attr,path)=>`${attr}="${new URL(path,document.baseURI).href}"`);
    const page=frame.contentDocument;
    page.open();page.write('<!doctype html>'+markup);page.close();
    if(page.documentElement){page.documentElement.scrollTop=0;page.documentElement.scrollLeft=0;}
    if(page.body){page.body.scrollTop=0;page.body.scrollLeft=0;}
  };
  render();
  for(const id of ['#now-refresh','#now-home'])document.querySelector(id).addEventListener('click',render);
  document.querySelector('#now-minimize').addEventListener('click',()=>window.icqram.request('window.minimize').catch(()=>{}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')window.icqram.request('window.close').catch(()=>{});});
  const grip=document.querySelector('#now-resize');
  grip.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();grip.setPointerCapture(event.pointerId);
    const start={x:event.screenX,y:event.screenY,width:window.innerWidth,height:window.innerHeight};
    const move=e=>{if(e.pointerId===event.pointerId)window.icqram.request('window.resize',{width:Math.round(start.width+e.screenX-start.x),height:Math.round(start.height+e.screenY-start.y)}).catch(()=>{});};
    const end=e=>{if(e.pointerId!==event.pointerId)return;grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);if(grip.hasPointerCapture(event.pointerId))grip.releasePointerCapture(event.pointerId);};
    grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  });
})();
