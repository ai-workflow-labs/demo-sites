/* Mock-up behaviour. Leads stay in this browser (localStorage); nothing is sent anywhere. */
(function () {
  'use strict';
  var D = document, q = new URLSearchParams(location.search);
  var root = D.querySelector('script[src$="assets/site.js"]').getAttribute('src').replace('assets/site.js', '');
  function $(s, c) { return (c || D).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || D).querySelectorAll(s)); }
  function get(k, d) { try { var v = localStorage.getItem('er_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem('er_' + k, JSON.stringify(v)); } catch (e) {} }
  function track(name, data) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, data || {})); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Attribution: tags visits from AI assistants, search and social so every lead shows where it came from */
  var AI = { 'chatgpt.com': 'ChatGPT', 'chat.openai.com': 'ChatGPT', 'perplexity.ai': 'Perplexity', 'claude.ai': 'Claude', 'gemini.google.com': 'Gemini', 'copilot.microsoft.com': 'Copilot', 'meta.ai': 'Meta AI', 'grok.com': 'Grok', 'deepseek.com': 'DeepSeek' };
  (function () {
    var u = (q.get('utm_source') || '').toLowerCase(), h = '';
    try { h = D.referrer ? new URL(D.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) {}
    if (h === location.hostname) h = '';
    var key = u || h, hit = Object.keys(AI).filter(function (k) { return key.indexOf(k) > -1; })[0], a = null;
    if (hit) a = { channel: 'AI assistant', source: AI[hit] };
    else if (/google|bing|duckduckgo|yahoo/.test(key)) a = { channel: 'Search', source: key };
    else if (/facebook|instagram|linkedin|youtube|tiktok|x\.com|^t\.co/.test(key)) a = { channel: 'Social', source: key };
    else if (key) a = { channel: 'Referral', source: key };
    if (a) { a.landing = location.pathname; set('touch', a); track('traffic_source', a); }
    else if (!get('touch')) set('touch', { channel: 'Direct', source: 'None', landing: location.pathname });
  })();

  function lead(type, data) {
    var t = get('touch', {}), o = Object.assign({ id: Date.now(), type: type, at: new Date().toISOString(), channel: t.channel, source: t.source }, data);
    var all = get('leads', []); all.unshift(o); set('leads', all); set('last', o.id);
    track('generate_lead', { lead_type: type, lead_channel: t.channel, lead_source: t.source });
    return o;
  }
  function patch(data) {
    var id = get('last'), all = get('leads', []);
    all.forEach(function (l) { if (l.id === id) Object.assign(l, data); }); set('leads', all);
  }
  function who(f) {
    var p = get('person', {});
    ['name', 'email', 'phone'].forEach(function (k) { var i = f.elements[k]; if (i && i.value.trim()) p[k] = i.value.trim(); });
    set('person', p); return p;
  }

  /* Validation */
  function fail(box, on) { box.classList.toggle('bad', on); var i = $('input,select,textarea', box); if (i) i.setAttribute('aria-invalid', on ? 'true' : 'false'); }
  function valid(f) {
    var first = null;
    $$('.f', f).forEach(function (b) {
      if (b.closest('[hidden]')) return;
      var i = $('[required]', b), bad = false;
      if (!i) return fail(b, false);
      if (i.type === 'radio') bad = !$('input:checked', b);
      else if (i.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim());
      else if (i.type === 'tel') bad = i.value.replace(/\D/g, '').length < 7;
      else bad = !i.value.trim();
      fail(b, bad); if (bad && !first) first = i;
    });
    if (first) first.focus();
    return !first;
  }
  function waPhone(tickBox, phone) {
    if (!tickBox || !phone) return;
    function sync() {
      phone.required = tickBox.checked;
      var l = $('.l', phone.closest('.f'));
      if (l) l.innerHTML = tickBox.checked ? 'Phone <span class="req">*</span>' : 'Phone (optional)';
      if (!tickBox.checked) phone.closest('.f').classList.remove('bad');
    }
    tickBox.addEventListener('change', sync); sync();
  }

  /* Menu drawer */
  var links = [['Home', ''], ['Get Buyer Alerts', 'buyers/register/'], ['Get Free Sell vs. Rent Report', 'sellers/report/'], ['Featured Properties', 'properties/'], ['Private Off-Market Seller List', 'sellers/private-list/'], ['Neighborhoods', 'neighborhoods/'], ['Miami Guides', 'guides/'], ['About Eve', 'about/'], ['Contact', 'contact/']];
  var drawer = D.createElement('div'); drawer.className = 'drawer';
  drawer.innerHTML = '<nav aria-label="Menu"><button aria-label="Close menu">&times;</button><p>Menu</p>' + links.map(function (l) { return '<a href="' + root + l[1] + '">' + l[0] + '</a>'; }).join('') + '</nav>';
  D.body.appendChild(drawer);
  $$('.burger').forEach(function (b) { b.addEventListener('click', function () { drawer.classList.add('open'); }); });
  drawer.addEventListener('click', function (e) { if (e.target === drawer || e.target.tagName === 'BUTTON') drawer.classList.remove('open'); });

  D.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a && /wa\.me/.test(a.href)) track('whatsapp_click', { page: location.pathname });
    if (a && /^tel:/.test(a.href)) track('phone_click', { page: location.pathname });
    if (a && /^mailto:/.test(a.href)) track('email_click', { page: location.pathname });
    $$('details.ms[open]').forEach(function (m) { if (!m.contains(e.target)) m.open = false; });
  });

  /* Buyer registration (buyer flow 2) */
  var fb = $('#buyer');
  if (fb) {
    var boxes = $$('.ms input', fb), sum = $('.ms summary', fb), blank = sum.textContent;
    var paint = function () {
      var on = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
      sum.textContent = on.length ? on.join(', ') : blank; sum.classList.toggle('on', !!on.length);
    };
    boxes.forEach(function (b) {
      b.addEventListener('change', paint);
      if (b.value.toLowerCase().replace(/\s+/g, '-') === q.get('area')) b.checked = true;
    });
    paint();
    var wa = fb.elements.alert_whatsapp, em = fb.elements.alert_email;
    waPhone(wa, fb.elements.phone);
    fb.addEventListener('submit', function (e) {
      e.preventDefault();
      var chan = $('#chan-e'); chan.hidden = wa.checked || em.checked;
      if (!valid(fb) || !chan.hidden) return;
      var p = who(fb);
      lead('Buyer alert signup', {
        name: p.name, email: p.email, phone: p.phone || '',
        detail: [boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }).join(', '), fb.elements.price.value, fb.elements.ptype.value, fb.elements.beds.value, fb.elements.timeframe.value].filter(Boolean).join(' | '),
        consent: [em.checked ? 'Email' : '', wa.checked ? 'WhatsApp' : ''].filter(Boolean).join(' + ')
      });
      location.href = '../registered/';
    });
  }

  /* Sell vs Rent: address, then contact step (seller flow 2) */
  var fa = $('#seller');
  if (fa) {
    var s1 = $('#step1'), s2 = $('#step2'), known = get('person', {});
    ['name', 'email', 'phone'].forEach(function (k) { if (known[k]) fa.elements[k].value = known[k]; });
    waPhone(fa.elements.alert_whatsapp, fa.elements.phone);
    fa.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid(fa)) return;
      if (!s1.hidden) {
        set('address', fa.elements.address.value.trim()); s1.hidden = true; s2.hidden = false;
        track('report_address_entered'); fa.elements.name.focus(); return;
      }
      var p = who(fa);
      lead('Sell vs Rent report', { name: p.name, email: p.email, phone: p.phone || '', detail: fa.elements.address.value.trim(), consent: 'Email' + (fa.elements.alert_whatsapp.checked ? ' + WhatsApp' : '') });
      location.href = '../your-analysis/';
    });
  }

  /* Report page (seller flow 3) */
  $$('[data-fill=address]').forEach(function (n) { var a = get('address'); if (a) n.textContent = a; });
  $$('[data-intent]').forEach(function (b) {
    b.addEventListener('click', function () { patch({ intent: b.getAttribute('data-intent') }); track('report_option_chosen', { option: b.getAttribute('data-intent') }); });
  });

  /* Private off-market seller list (seller flow 5) */
  var fp = $('#private');
  if (fp) {
    var me = get('person', {}), box = $('#who'), adr = get('address');
    if (adr) fp.elements.address.value = adr;
    if (me.name && me.email) {
      box.hidden = true; fp.elements.name.required = fp.elements.email.required = false;
      var sumr = $('#known'); sumr.hidden = false; $('b', sumr).textContent = me.name + ' (' + me.email + ')';
    }
    $$('input[name=best]', fp).forEach(function (r) {
      r.addEventListener('change', function () {
        var w = r.value === 'WhatsApp' && r.checked, ph = $('#ph');
        ph.hidden = !(w && !me.phone); fp.elements.phone.required = !ph.hidden;
      });
    });
    fp.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid(fp)) return;
      var p = who(fp);
      lead('Private seller list', {
        name: p.name, email: p.email, phone: p.phone || '',
        detail: [fp.elements.address.value.trim(), fp.elements.ptype.value, fp.elements.beds.value, fp.elements.price.value].filter(Boolean).join(' | '),
        consent: $('input[name=best]:checked', fp).value
      });
      fp.hidden = true; $('#private-ok').hidden = false;
    });
  }

  /* Contact (contact page) */
  var fc = $('#contact');
  if (fc) {
    fc.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid(fc)) return;
      var p = who(fc);
      lead('Contact message', { name: p.name, email: p.email, phone: p.phone || '', detail: fc.elements.message.value.trim(), consent: 'Reply to enquiry' });
      fc.hidden = true; $('#contact-ok').hidden = false;
    });
  }

  /* "How did you find Eve?" asked after the conversion so it cannot cost one */
  $$('.hear button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.hear button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); patch({ heard: b.textContent }); track('how_heard', { answer: b.textContent });
    });
  });

  /* Personalised sample alert (buyer flow 4) */
  $$('[data-fill=first]').forEach(function (n) { var p = get('person', {}); if (p.name) n.textContent = p.name.split(' ')[0]; });

  /* Property search */
  var ff = $('#filters');
  if (ff) {
    var cards = $$('[data-area]'), none = $('#none'), count = $('#count');
    var run = function () {
      var a = ff.elements.area.value, t = ff.elements.ptype.value, b = +ff.elements.beds.value || 0, m = +ff.elements.price.value || 0, n = 0;
      cards.forEach(function (c) {
        var ok = (!a || c.dataset.area === a) && (!t || c.dataset.type === t) && +c.dataset.beds >= b && (!m || +c.dataset.price <= m);
        c.hidden = !ok; if (ok) n++;
      });
      count.textContent = n + (n === 1 ? ' sample home' : ' sample homes') + ' shown'; none.hidden = n > 0;
      track('property_search', { area: a, type: t, beds: b, max_price: m, results: n });
    };
    ff.addEventListener('change', run); if (q.get('area')) { ff.elements.area.value = q.get('area'); run(); }
  }

  /* Demo lead inbox */
  var ib = $('#inbox');
  if (ib) {
    var list = get('leads', []), body = $('tbody', ib);
    $('#empty').hidden = !!list.length; ib.hidden = !list.length; $('#lead-count').textContent = list.length;
    body.innerHTML = list.map(function (l) {
      return '<tr><td>' + new Date(l.at).toLocaleString() + '</td><td><span class="badge">' + esc(l.type) + '</span></td><td>' + esc(l.name) + '<br>' + esc(l.email) + (l.phone ? '<br>' + esc(l.phone) : '') + '</td><td>' + esc(l.detail) + (l.intent ? '<br><b>Chose: ' + esc(l.intent) + '</b>' : '') + '</td><td>' + esc(l.consent) + '</td><td><span class="badge' + (l.channel === 'AI assistant' ? ' tag-ai' : '') + '">' + esc(l.channel) + '</span><br>' + esc(l.source) + (l.heard ? '<br>Said: ' + esc(l.heard) : '') + '</td></tr>';
    }).join('');
    $('#clear').addEventListener('click', function () { if (confirm('Clear the demo leads saved in this browser?')) { ['leads', 'person', 'address', 'last', 'touch'].forEach(function (k) { localStorage.removeItem('er_' + k); }); location.reload(); } });
    $('#csv').addEventListener('click', function () {
      var cols = ['at', 'type', 'name', 'email', 'phone', 'detail', 'intent', 'consent', 'channel', 'source', 'heard'];
      var rows = [cols.join(',')].concat(list.map(function (l) { return cols.map(function (c) { return '"' + String(l[c] || '').replace(/"/g, '""') + '"'; }).join(','); }));
      var a = D.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = 'demo-leads.csv'; a.click();
    });
  }

  /* Planned page */
  var pl = $('#planned-url'); if (pl && q.get('p')) pl.textContent = q.get('p');
})();
