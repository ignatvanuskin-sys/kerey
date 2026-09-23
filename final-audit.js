(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = 'auto';
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  const res = { url: location.pathname, iw, ih, docH: document.documentElement.scrollHeight };

  const chk = () => {
    const w = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > iw + 1 || r.left < -1) {
        w.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 45), l: Math.round(r.left), r: Math.round(r.right) });
        if (w.length >= 8) break;
      }
    }
    return w;
  };

  // 1) elements pinned to bottom
  const pinned = [];
  const bottomStuck = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const bVal = cs.bottom === 'auto' ? null : parseFloat(cs.bottom);
    if ((cs.position === 'fixed' || cs.position === 'absolute') && bVal !== null && bVal <= 8 && bVal >= -1) {
      bottomStuck.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50), pos: cs.position, bottom: cs.bottom, visBottom: Math.round(r.bottom), visH: Math.round(r.height), w: Math.round(r.width) });
    }
    if (cs.position === 'fixed') {
      pinned.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), display: cs.display });
    }
  }
  res.bottomStuckCount = bottomStuck.length;
  res.bottomStuck = bottomStuck.slice(0, 10);
  res.fixedCount = pinned.length;
  res.fixed = pinned.slice(0, 10);

  // overflow: three positions
  window.scrollTo(0, 0); await sleep(350);
  res.top = { y: Math.round(window.scrollY), sw: document.documentElement.scrollWidth, wide: chk() };
  window.scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.5)); await sleep(350);
  res.mid = { y: Math.round(window.scrollY), sw: document.documentElement.scrollWidth, wide: chk() };
  window.scrollTo(0, document.documentElement.scrollHeight); await sleep(450);
  res.bottom = { y: Math.round(window.scrollY), sw: document.documentElement.scrollWidth, wide: chk() };

  // 2) bottom padding
  const txt = [...document.querySelectorAll('body *')].filter(e => {
    const r = e.getBoundingClientRect();
    return r.height > 0 && e.children.length === 0 && e.textContent.trim().length > 0 && getComputedStyle(e).position !== 'fixed';
  });
  const lastAbs = Math.max(...txt.map(e => e.getBoundingClientRect().bottom + window.scrollY));
  const lastEl = txt.find(e => Math.abs(e.getBoundingClientRect().bottom + window.scrollY - lastAbs) < 0.5);
  res.bottomPad = {
    docH: document.documentElement.scrollHeight,
    lastTextAbsBottom: Math.round(lastAbs),
    distanceToDocEnd: Math.round(document.documentElement.scrollHeight - lastAbs),
    lastText: lastEl ? lastEl.textContent.trim().slice(0, 60) : null
  };

  // 4) tap targets
  const small = [];
  for (const el of document.querySelectorAll('a,button,input,select,textarea')) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (r.height < 44) small.push({ tag: el.tagName.toLowerCase(), txt: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 34).replace(/\n/g, ' '), h: Math.round(r.height * 10) / 10, w: Math.round(r.width), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 45) });
  }
  res.smallCount = small.length;
  res.small = small;

  // 3) hero / top screen
  const hero = document.querySelector('main > section') || document.querySelector('main section');
  if (hero && window.scrollY !== 0) { window.scrollTo(0, 0); await sleep(300); }
  if (hero) {
    window.scrollTo(0, 0); await sleep(300);
    const item = (sel) => { const e = hero.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), txt: (e.innerText || '').trim().slice(0, 40).replace(/\n/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right), fs: parseFloat(getComputedStyle(e).fontSize), lh: getComputedStyle(e).lineHeight }; };
    const h1 = hero.querySelector('h1');
    const h1r = h1 ? h1.getBoundingClientRect() : null;
    res.hero = {
      rect: { top: Math.round(hero.getBoundingClientRect().top), bottom: Math.round(hero.getBoundingClientRect().bottom), h: Math.round(hero.getBoundingClientRect().height) },
      h1: h1r ? { top: Math.round(h1r.top), bottom: Math.round(h1r.bottom), h: Math.round(h1r.height), fs: parseFloat(getComputedStyle(h1).fontSize), lh: getComputedStyle(h1).lineHeight, sh: h1.scrollHeight, ch: h1.clientHeight } : null,
      clickables: [...hero.querySelectorAll('a,button')].map(e => { const r = e.getBoundingClientRect(); return { txt: e.innerText.trim().slice(0, 28).replace(/\n/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), visibleInVp: r.top >= 0 && r.bottom <= ih, partial: r.top < ih && r.bottom > ih }; }),
      phone: item('a[href^="tel:"]'),
      rating: item('a[href*="2gis"], a[href*="2ГИС"]'),
      hoursRow: (() => { const els = [...hero.querySelectorAll('*')].filter(e => e.children.length === 0 && /Ежедневно/i.test(e.textContent)); if (!els.length) return null; const r = els[0].getBoundingClientRect(); return { txt: els[0].textContent.trim().slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; })()
    };
    // overlaps among clickables
    const cl = [...hero.querySelectorAll('a,button')].map(e => e.getBoundingClientRect());
    const ov = [];
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
      const a = cl[i], b = cl[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) ov.push(i + '-' + j);
    }
    res.hero.overlaps = ov;
  }
  res.alert = (document.querySelector('[role=alert]') || {}).innerText || null;
  return res;
})()
