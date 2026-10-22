/* UK Car Source — Google Analytics with cookie consent and lead tracking.
   GA only loads after the visitor clicks Accept (UK PECR / UK GDPR).
   Leads tracked: WhatsApp, LINE and email clicks, and enquiry form submissions. */
(function () {
  var GA_ID = 'G-ZT130QC90G';
  var KEY = 'ukcs_cookie_consent';

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  var loaded = false;

  function loadGA() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function track(name, params) { if (loaded) gtag('event', name, params || {}); }

  // Lead tracking
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    var base = { page_path: location.pathname, link_text: (a.textContent || '').trim().slice(0, 60) };
    if (href.indexOf('wa.me/') > -1) track('whatsapp_click', base);
    else if (href.indexOf('line.me/') > -1) track('line_click', base);
    else if (href.indexOf('mailto:') === 0) track('email_click', base);
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    var dest = f.querySelector && f.querySelector('input[name="destination"]');
    track('enquiry_form_submit', { page_path: location.pathname, destination: dest ? dest.value : '' });
  }, true);

  // Consent banner
  function banner() {
    var css = document.createElement('style');
    css.textContent =
      '#ukcs-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2000;max-width:560px;margin:0 auto;background:#141414;color:#ddd;border:1px solid #2a2a2a;border-top:3px solid #e07b20;border-radius:6px;padding:16px 18px;font-family:Barlow,Arial,sans-serif;font-size:.86rem;line-height:1.5;box-shadow:0 8px 30px rgba(0,0,0,.5)}' +
      '#ukcs-consent p{margin:0 0 12px}#ukcs-consent .b{display:flex;gap:10px;flex-wrap:wrap}' +
      '#ukcs-consent button{font-family:inherit;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.8rem;padding:10px 18px;border-radius:3px;cursor:pointer;border:1px solid #e07b20}' +
      '#ukcs-consent .y{background:#e07b20;color:#fff}#ukcs-consent .n{background:transparent;color:#ddd;border-color:#555}' +
      '@media(max-width:768px){#ukcs-consent{bottom:calc(66px + env(safe-area-inset-bottom,0px))}}';
    document.head.appendChild(css);
    var d = document.createElement('div');
    d.id = 'ukcs-consent';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Cookie consent');
    d.innerHTML = '<p>We use cookies to understand how visitors use our website (Google Analytics). No advertising cookies. Is that OK?</p>' +
      '<div class="b"><button class="y" type="button">Accept</button><button class="n" type="button">Decline</button></div>';
    document.body.appendChild(d);
    d.querySelector('.y').onclick = function () { store('granted'); d.remove(); loadGA(); };
    d.querySelector('.n').onclick = function () { store('denied'); d.remove(); };
  }

  // Footer link "Cookie settings" reopens the banner
  window.ukcsCookieSettings = function () { try { localStorage.removeItem(KEY); } catch (e) {} if (!document.getElementById('ukcs-consent')) banner(); };

  function start() {
    var c = stored();
    if (c === 'granted') loadGA();
    else if (c !== 'denied') banner();
    // Thank-you page = a completed enquiry
    if (/thank-you\.html$/.test(location.pathname)) {
      var fire = function () { track('generate_lead', { page_path: location.pathname, form: 'enquiry_thank_you' }); };
      if (loaded) setTimeout(fire, 800);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
