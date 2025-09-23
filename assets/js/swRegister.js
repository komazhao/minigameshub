// Simple Service Worker registration with update prompt
(function() {
  const ASSET_VERSION = '20250923-01';

  function createUpdateBanner(onRefresh) {
    const bar = document.createElement('div');
    bar.style.cssText = [
      'position:fixed','left:0','right:0','bottom:16px','z-index:9999',
      'margin:0 auto','max-width:720px','padding:12px 16px',
      'background:#111827','color:#fff','border-radius:8px',
      'box-shadow:0 8px 24px rgba(0,0,0,.25)','display:flex','align-items:center','justify-content:space-between'
    ].join(';');

    const msg = document.createElement('div');
    msg.textContent = 'A new version is available.';
    msg.style.fontSize = '14px';
    const btn = document.createElement('button');
    btn.textContent = 'Refresh';
    btn.style.cssText = 'margin-left:12px;padding:8px 12px;background:#10B981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;';
    btn.onclick = () => { try { onRefresh && onRefresh(); } finally { bar.remove(); } };

    const right = document.createElement('div');
    right.appendChild(btn);

    bar.appendChild(msg);
    bar.appendChild(right);
    document.body.appendChild(bar);
  }

  function promptUpdate(reg) {
    if (!reg || !reg.waiting) return;
    createUpdateBanner(() => {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          try { reg.update(); } catch(e) {}

          if (reg.waiting) {
            promptUpdate(reg);
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                promptUpdate(reg);
              }
            });
          });

          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            // Ensure latest assets are requested
            const url = new URL(window.location.href);
            url.searchParams.set('v', ASSET_VERSION);
            window.location.replace(url.toString());
          });
        })
        .catch((err) => console.error('[SW] Registration failed:', err));
    });
  }
})();

