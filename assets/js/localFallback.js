(function () {
    const isLocalHost = () => {
        const host = window.location.hostname;
        if (!host) return false;
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
        if (host.endsWith('.local')) return true;
        return false;
    };

    if (!isLocalHost()) {
        return;
    }

    const applyFallbackLinks = () => {
        document.querySelectorAll('[data-local-href]').forEach((link) => {
            const fallback = link.getAttribute('data-local-href');
            if (fallback && link.getAttribute('href') !== fallback) {
                link.setAttribute('href', fallback);
            }
        });
    };

    const run = () => applyFallbackLinks();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
