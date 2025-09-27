// Funding Choices (Google Certified CMP) Loader
// - Inserts IAB TCF v2.2 stub and googlefcPresent signal
// - Loads Funding Choices using publisher id derived from AdSense tag
// - Safe no-ops if publisher id cannot be determined

(function(){
  try {
    function derivePublisherId() {
      // Try from existing AdSense tag: client=ca-pub-XXXXXXXXXXXXXXX
      const s = document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
      if (s) {
        const src = new URL(s.src, window.location.origin);
        const client = src.searchParams.get('client');
        if (client && client.startsWith('ca-pub-')) {
          return client.replace(/^ca-/, ''); // ca-pub-... -> pub-...
        }
      }
      // Fallback hardcoded known publisher id
      return 'pub-8059207534738960';
    }

    function injectTcfStub() {
      // IAB TCF v2 stub
      const TCF_LOCATOR_NAME = '__tcfapiLocator';
      if (!window.frames[TCF_LOCATOR_NAME]) {
        if (document.body) {
          const iframe = document.createElement('iframe');
          iframe.style.cssText = 'display:none;position:fixed;left:-9999px;width:0;height:0;border:0;';
          iframe.name = TCF_LOCATOR_NAME;
          document.body.appendChild(iframe);
        } else {
          document.addEventListener('DOMContentLoaded', injectTcfStub);
        }
      }
      function addFrame() {}
      function tcfAPIHandler() {}
      if (!window.__tcfapi) {
        let gdprApplies;
        const queue = [];
        window.__tcfapi = function() {
          const args = arguments;
          if (!args.length) return queue;
          if (args[0] === 'setGdprApplies') {
            gdprApplies = args[1];
            if (typeof args[2] === 'function') args[2]('set', true);
          } else if (args[0] === 'ping') {
            if (typeof args[2] === 'function') args[2]({gdprApplies: gdprApplies, cmpLoaded: false, cmpStatus: 'stub'});
          } else {
            queue.push(args);
          }
        };
        window.__tcfapi.queue = queue;
      }
      // googlefcPresent signal
      (function signalGooglefcPresent() {
        if (!window.frames['googlefcPresent']) {
          if (document.body) {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'width:0;height:0;border:0;display:none;';
            iframe.name = 'googlefcPresent';
            document.body.appendChild(iframe);
          } else {
            setTimeout(signalGooglefcPresent, 0);
          }
        }
      })();
    }

    function loadFundingChoices(pubId) {
      const sid = String(pubId || '').startsWith('pub-') ? pubId : ('pub-' + String(pubId || ''));
      const src = `https://fundingchoicesmessages.google.com/i/${encodeURIComponent(sid)}?ers=1`;
      const s = document.createElement('script');
      s.async = true;
      s.src = src;
      s.setAttribute('data-fc', '1');
      (document.head || document.documentElement).appendChild(s);
    }

    injectTcfStub();
    const pubId = derivePublisherId();
    if (pubId) loadFundingChoices(pubId);
  } catch (e) {
    // no-op
  }
})();

