// Lightweight Consent Manager (CMP) for MiniGamesHub
// - Shows a simple banner to choose cookies (Analytics, Advertising)
// - Defaults to non-personalized ads and disabled analytics until consent
// - Exposes window.openConsentPreferences() to reopen settings

(function () {
  try {
    const LS_KEY = 'cmpConsent';
    const GA_MEASUREMENT_ID = 'G-7CTFS1X9ZS';

    function readConsent() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (typeof obj !== 'object') return null;
        return obj;
      } catch (_) { return null; }
    }

    function saveConsent(consent) {
      const payload = Object.assign({}, consent || {});
      payload.updatedAt = new Date().toISOString();
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    }

    function applyConsent(consent) {
      // Defaults (privacy-first): non-personalized ads + GA disabled unless allowed
      window.adsbygoogle = window.adsbygoogle || [];
      let allowAdsPersonalized = !!(consent && consent.ads === true);
      let allowAnalytics = !!(consent && consent.analytics === true);

      if (!allowAdsPersonalized) {
        window.adsbygoogle.requestNonPersonalizedAds = 1;
      }
      if (GA_MEASUREMENT_ID) {
        window['ga-disable-' + GA_MEASUREMENT_ID] = !allowAnalytics;
      }
    }

    function createEl(tag, attrs, html) {
      const el = document.createElement(tag);
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (html !== undefined) el.innerHTML = html;
      return el;
    }

    function injectStyles() {
      if (document.getElementById('cmp-styles')) return;
      const css = `
      .cmp-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;background:var(--system-background, #111);color:var(--label-primary, #fff);border:1px solid var(--separator, #333);box-shadow:0 6px 24px rgba(0,0,0,.3);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;max-width:840px;margin:0 auto}
      .cmp-actions{display:flex;gap:8px;flex-wrap:wrap}
      .cmp-btn{padding:10px 14px;border-radius:10px;border:1px solid var(--separator,#333);background:#1c1c1e;color:#fff;font-weight:600;cursor:pointer}
      .cmp-btn.primary{background:#007AFF;border-color:#007AFF}
      .cmp-btn.ghost{background:transparent}
      .cmp-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:100000}
      .cmp-modal-card{background:var(--system-background,#111);color:var(--label-primary,#fff);border-radius:12px;max-width:600px;width:92%;padding:16px;border:1px solid var(--separator,#333)}
      .cmp-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid var(--separator,#333)}
      .cmp-row:first-child{border-top:none}
      .cmp-toggle{width:42px;height:26px;border-radius:13px;background:#3a3a3c;position:relative;cursor:pointer;display:inline-block}
      .cmp-toggle input{display:none}
      .cmp-toggle span{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:all .2s ease}
      .cmp-toggle input:checked + span{left:19px;background:#fff}
      .cmp-note{color:var(--label-secondary,#bbb);font-size:14px}
      @media (prefers-color-scheme: light){.cmp-banner{background:#fff;color:#1c1c1e;border-color:#e5e5ea}.cmp-modal-card{background:#fff;color:#1c1c1e;border-color:#e5e5ea}.cmp-btn{background:#f2f2f7;color:#1c1c1e;border-color:#e5e5ea}.cmp-btn.primary{color:#fff}.cmp-row{border-color:#e5e5ea}}
      `;
      const style = createEl('style', { id: 'cmp-styles' });
      style.textContent = css;
      document.head.appendChild(style);
    }

    function showBanner() {
      if (document.getElementById('cmp-banner')) return;
      injectStyles();
      const banner = createEl('div', { class: 'cmp-banner', id: 'cmp-banner', role: 'dialog', 'aria-label': 'Cookie consent banner' });
      const text = createEl('div', null, `We use cookies for site performance and to support ads. You can accept all, reject non‑essential, or manage preferences. See our <a href="/privacy-policy">Privacy Policy</a>.`);
      const actions = createEl('div', { class: 'cmp-actions' });
      const accept = createEl('button', { class: 'cmp-btn primary', id: 'cmp-accept' }, 'Accept All');
      const reject = createEl('button', { class: 'cmp-btn', id: 'cmp-reject' }, 'Reject Non‑Essential');
      const manage = createEl('button', { class: 'cmp-btn ghost', id: 'cmp-manage' }, 'Manage Preferences');
      actions.appendChild(accept); actions.appendChild(reject); actions.appendChild(manage);
      banner.appendChild(text); banner.appendChild(actions);
      document.body.appendChild(banner);

      accept.addEventListener('click', () => {
        const consent = { necessary: true, analytics: true, ads: true };
        saveConsent(consent);
        applyConsent(consent);
        banner.remove();
      });
      reject.addEventListener('click', () => {
        const consent = { necessary: true, analytics: false, ads: false };
        saveConsent(consent);
        applyConsent(consent);
        banner.remove();
      });
      manage.addEventListener('click', () => openPreferences());
    }

    function openPreferences() {
      injectStyles();
      const existing = document.getElementById('cmp-modal');
      if (existing) existing.remove();
      const consent = readConsent() || { necessary: true, analytics: false, ads: false };
      const modal = createEl('div', { class: 'cmp-modal', id: 'cmp-modal', role: 'dialog', 'aria-label': 'Cookie preferences' });
      const card = createEl('div', { class: 'cmp-modal-card' });
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">Cookie Preferences</h3>
        <p class="cmp-note">Control how we use cookies on MiniGamesHub. Necessary cookies are always on for core functionality.</p>
        <div class="cmp-row">
          <div>
            <div><strong>Necessary</strong></div>
            <div class="cmp-note">Required for core features (e.g., game lists, navigation).</div>
          </div>
          <label class="cmp-toggle" aria-label="Necessary cookies (always on)">
            <input type="checkbox" checked disabled>
            <span></span>
          </label>
        </div>
        <div class="cmp-row">
          <div>
            <div><strong>Analytics</strong></div>
            <div class="cmp-note">Helps us understand usage to improve the site.</div>
          </div>
          <label class="cmp-toggle" aria-label="Analytics cookies">
            <input id="cmp-analytics" type="checkbox" ${consent.analytics ? 'checked' : ''}>
            <span></span>
          </label>
        </div>
        <div class="cmp-row">
          <div>
            <div><strong>Advertising</strong></div>
            <div class="cmp-note">Used to deliver and measure ads. If off, we show non‑personalized ads.</div>
          </div>
          <label class="cmp-toggle" aria-label="Advertising cookies">
            <input id="cmp-ads" type="checkbox" ${consent.ads ? 'checked' : ''}>
            <span></span>
          </label>
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
          <button class="cmp-btn ghost" id="cmp-cancel">Cancel</button>
          <button class="cmp-btn primary" id="cmp-save">Save Preferences</button>
        </div>
      `;
      modal.appendChild(card);
      document.body.appendChild(modal);

      card.querySelector('#cmp-cancel').addEventListener('click', () => modal.remove());
      card.querySelector('#cmp-save').addEventListener('click', () => {
        const analytics = !!card.querySelector('#cmp-analytics').checked;
        const ads = !!card.querySelector('#cmp-ads').checked;
        const consentNew = { necessary: true, analytics, ads };
        saveConsent(consentNew);
        applyConsent(consentNew);
        modal.remove();
      });
    }

    // Expose open preferences
    window.openConsentPreferences = openPreferences;
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.id === 'manage-consent') { e.preventDefault(); openPreferences(); }
    }, true);

    // If a TCF CMP is present (e.g., Google Funding Choices), respect it and do not render our banner
    function initWithTCFOrLocal() {
      // If TCF API exists, read purposes and map to local toggles
      if (typeof window.__tcfapi === 'function') {
        try {
          window.__tcfapi('getTCData', 2, function(tcData, success) {
            if (success && tcData) {
              // Purposes commonly used for analytics: 7, 8, 9; for storage: 1; for ads personalization: 4 (Select personalised ads)
              const pc = (tcData.purpose && tcData.purpose.consents) || {};
              const allowAnalytics = !!(pc['7'] || pc['8'] || pc['9']);
              const allowAds = !!(pc['4']);
              applyConsent({ necessary: true, analytics: allowAnalytics, ads: allowAds });
            } else {
              // Fallback to strict defaults (NPA + GA disabled)
              applyConsent({ necessary: true, analytics: false, ads: false });
            }
          });
          return; // Do not render local banner when TCF is present
        } catch (_) {}
      }

      // Fallback: use stored local consent, else show banner
      const consent = readConsent();
      applyConsent(consent);
      if (!consent) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') showBanner();
        else document.addEventListener('DOMContentLoaded', showBanner);
      }
    }

    initWithTCFOrLocal();
  } catch (_) { /* no-op */ }
})();
