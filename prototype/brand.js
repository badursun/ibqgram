(() => {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    const theme = root.dataset.theme || (media.matches ? 'dark' : 'light');
    for (const image of document.querySelectorAll('img[src*="assets/brand/"]')) {
      const current = image.getAttribute('src');
      const match = /assets\/brand\/(static|animations)\/(?:icqram-(flower|logo)|ibqgram-(icon|logo)-(?:light|dark))(-(connecting|message))?\.svg(\?.*)?$/.exec(current);
      if (!match) continue;
      const kind = match[2] === 'flower' ? 'icon' : match[2] || match[3];
      const next = `assets/brand/${match[1]}/ibqgram-${kind}-${theme}${match[4] || ''}.svg${match[6] || ''}`;
      if (current !== next) image.setAttribute('src', next);
    }
  }
  window.IBQgramBrand = Object.freeze({ apply });
  const observer = new MutationObserver(apply);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'], childList: true, subtree: true });
  media.addEventListener('change', apply);
  document.querySelector('#replay-message')?.addEventListener('click', () => {
    document.querySelector('#message-preview').src = `assets/brand/animations/icqram-flower-message.svg?replay=${Date.now()}`;
    apply();
    window.ICQAudio?.play('message');
  });
  if (document.querySelector('#sound-buttons')) {
    const labels = { startup:'Açılış', message:'Mesaj geldi', system:'Sistem', url:'URL', auth:'Giriş', online:'Çevrimiçi', chat:'Sohbet', chatRequest:'Sohbet isteği', contact:'Kişi geldi', file:'Dosya geldi', transfer:'Dosya aktarımı', web:'Web sayfası', phoneRequest:'Arama isteği', phone:'Telefon' };
    for (const [key,label] of Object.entries(labels)) {
      const button = document.createElement('button'); button.textContent = label;
      button.addEventListener('click', async () => {
        const playing = await window.ICQAudio.play(key);
        document.querySelector('#sound-result').textContent = playing ? `${label} çalınıyor.` : 'Ses başlatılamadı. Yerel dosyayı ve tarayıcı ses iznini kontrol et.';
      });
      document.querySelector('#sound-buttons').append(button);
    }
  }
  apply();
})();
