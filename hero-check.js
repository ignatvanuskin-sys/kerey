(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = 'auto';
  const iw = window.innerWidth, ih = window.innerHeight;
  const chk = () => {
    const w = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > iw + 1 || r.left < -1) { w.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 40), r: Math.round(r.right) }); if (w.length >= 6) break; }
    }
    return w;
  };
  const res = { iw, ih, docH: document.documentElement.scrollHeight };
  window.scrollTo(0, 0); await sleep(350);
  res.top = { y: 0, sw: document.documentElement.scrollWidth, wide: chk() };
  const hero = document.querySelector('main > section');
  const h1 = hero.querySelector('h1');
  const h1r = h1.getBoundingClientRect();
  res.h1 = { fs: parseFloat(getComputedStyle(h1).fontSize), lh: getComputedStyle(h1).lineHeight, top: Math.round(h1r.top), bottom: Math.round(h1r.bottom), h: Math.round(h1r.height), scrollH: h1.scrollHeight, clientH: h1.clientHeight, lines: Math.round(h1r.height / parseFloat(getComputedStyle(h1).lineHeight)) };
  res.clickables = [...hero.querySelectorAll('a,button')].map(e => { const r = e.getBoundingClientRect(); return { txt: e.innerText.trim().slice(0, 26).replace(/\n/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), fullyVisible: r.top >= 0 && r.bottom <= ih }; });
  const rating = hero.querySelector('a[href*="2gis"], a[href*="2ГИС"]');
  if (rating) { const r = rating.getBoundingClientRect(); res.rating = { txt: rating.innerText.trim().slice(0, 40).replace(/\n/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), fullyVisible: r.bottom <= ih }; }
  const hrs = [...hero.querySelectorAll('*')].filter(e => /Ежедневно|[0-9]{2}:[0-9]{2}–|08:30/i.test(e.textContent) && e.textContent.length < 90);
  if (hrs.length) {
    const el = hrs[hrs.length - 1];
    const r = el.getBoundingClientRect();
    res.hours = { txt: el.textContent.trim().slice(0, 40), tag: el.tagName.toLowerCase(), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), fullyVisible: r.bottom <= ih && r.top >= 0 };
  }
  res.heroRect = { top: Math.round(hero.getBoundingClientRect().top), bottom: Math.round(hero.getBoundingClientRect().bottom), h: Math.round(hero.getBoundingClientRect().height) };
  window.scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.5)); await sleep(350);
  res.mid = { y: Math.round(window.scrollY), sw: document.documentElement.scrollWidth, wide: chk() };
  window.scrollTo(0, document.documentElement.scrollHeight); await sleep(400);
  res.bottom = { y: Math.round(window.scrollY), sw: document.documentElement.scrollWidth, wide: chk() };
  window.scrollTo(0, 0); await sleep(200);
  const small = [...document.querySelectorAll('a,button,input,select,textarea')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 44; }).map(e => ({ tag: e.tagName.toLowerCase(), t: (e.innerText || '').trim().slice(0, 26).replace(/\n/g, ' '), h: Math.round(e.getBoundingClientRect().height * 10) / 10 }));
  res.small = small; res.smallCount = small.length;
  return res;
})()
