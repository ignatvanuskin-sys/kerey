(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = 'auto';
  const ih = window.innerHeight;
  const out = {};
  const rectOf = (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }; };
  const hitTest = (e) => {
    const r = e.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const t = document.elementFromPoint(x, y);
    return { centerHit: !!t && (t === e || e.contains(t)), hitEl: t ? t.tagName.toLowerCase() : null, hitTxt: t ? (t.innerText || '').trim().slice(0, 24).replace(/\n/g, ' ') : null };
  };
  const header = document.querySelector('header');
  const headerBtn = [...header.querySelectorAll('a,button')].find(e => /Записаться/.test(e.innerText));
  const hero = document.querySelector('main > section');
  const heroBtn = [...hero.querySelectorAll('button')].find(e => /Записаться онлайн/.test(e.innerText));
  const heroPhone = hero.querySelector('a[href^="tel:"]');
  const svc = document.getElementById('services');
  const cardBtn = svc ? [...svc.querySelectorAll('a,button')].find(e => /Записаться/.test(e.innerText)) : null;
  const contacts = document.getElementById('contacts');
  const cPhone = contacts ? contacts.querySelector('a[href^="tel:"]') : null;
  const cWa = contacts ? [...contacts.querySelectorAll('a')].find(a => /wa\.me/.test(a.getAttribute('href') || '')) : null;
  const cInst = contacts ? [...contacts.querySelectorAll('a')].find(a => /instagram/.test(a.getAttribute('href') || '')) : null;
  const targets = [['header_booking', headerBtn, false], ['hero_booking', heroBtn, false], ['hero_phone', heroPhone, false], ['service_card_booking', cardBtn, true], ['contacts_phone', cPhone, true], ['contacts_whatsapp', cWa, true], ['contacts_instagram', cInst, true]];
  out.targets = {};
  for (const [name, el, scroll] of targets) {
    if (!el) { out.targets[name] = { found: false }; continue; }
    if (scroll) { el.scrollIntoView({ block: 'center' }); await sleep(180); }
    const rec = rectOf(el);
    out.targets[name] = Object.assign({ found: true, href: el.getAttribute('href') || null, txt: el.innerText.trim().slice(0, 30).replace(/\n/g, ' '), visibleInViewport: rec.top >= 0 && rec.bottom <= ih, display: getComputedStyle(el).display, pointerEvents: getComputedStyle(el).pointerEvents }, rec, hitTest(el));
  }
  out.scrollYAtEnd = Math.round(window.scrollY);
  return out;
})()
