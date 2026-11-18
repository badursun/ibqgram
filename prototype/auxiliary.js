(() => {
  'use strict';
  const kind=window.icqramView?.kind;
  const selector={settings:'#settings-dialog',about:'#about',presence:'#presence-dialog',info:'#info-dialog'}[kind];
  if(!selector)return;
  const panel=document.querySelector(selector);
  document.documentElement.dataset.auxiliary='true';
  panel.classList.add('window','active-window','auxiliary-panel');panel.show();
  const close=()=>window.icqram.request('window.close').catch(()=>{});
  for(const button of panel.querySelectorAll('[data-panel-close],#close-about,#okay-about'))button.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  if(kind==='info'){
    const data=window.icqramView.panelData||{};
    document.querySelector('#info-title').textContent=String(data.title||'Information');
    const body=document.querySelector('#info-lines');
    for(const text of data.lines||[]){const p=document.createElement('p');p.textContent=String(text);body.append(p);}
  }
})();
