// Normalize navigation for collections routes to ensure correct landing pages
// Works regardless of server redirect rules.
(function() {
  function onClick(e) {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (a.hasAttribute('download') || a.target === '_blank' || a.getAttribute('rel')?.includes('external')) return;

    try {
      const url = new URL(a.getAttribute('href'), window.location.origin);
      if (url.origin !== window.location.origin) return;

      const path = url.pathname.replace(/\/+$/, '');
      if (path === '/collections/featured' || path === '/collections/new' || path === '/collections/popular') {
        e.preventDefault();
        const collection = path.split('/')[2];
        window.location.href = `/collection.html?collection=${collection}`;
        return;
      }

      if (path.startsWith('/collections/category/')) {
        e.preventDefault();
        const slug = decodeURIComponent(path.split('/')[3] || '');
        if (slug) {
          window.location.href = `/collection.html?category=${slug}`;
        }
        return;
      }
    } catch (err) {
      // no-op
    }
  }

  document.addEventListener('click', onClick, true);
})();

