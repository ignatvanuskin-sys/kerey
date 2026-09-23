(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const d = () => document.querySelector('[role="dialog"]');
  const btn = (re) => { const x = d(); return x ? [...x.querySelectorAll('button')].find(b => re.test(b.innerText)) : null; };
  const sc = [...d().querySelectorAll('*')].find(e => { const cs = getComputedStyle(e); return cs.overflowX === 'auto' && e.scrollWidth > e.clientWidth + 2; });
  sc.children[0].click(); await sleep(150);
  btn(/^Далее$/).click(); await sleep(500);
  const dd = d();
  const slots = [...dd.querySelectorAll('button')].filter(b => /^\d{2}:\d{2}/.test(b.innerText.trim()));
  const rects = slots.map(s => { const r = s.getBoundingClientRect(); return { t: s.innerText.trim(), dis: !!s.disabled, l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; });
  const groups = [...dd.querySelectorAll('*')].filter(e => /УТРО|ДЕНЬ|ВЕЧЕР/.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim());
  const uniqLefts = [...new Set(rects.map(r => r.l))];
  const maxRight = Math.max(...rects.map(r => r.r));
  const minLeft = Math.min(...rects.map(r => r.l));
  const hScroller = [...dd.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return cs.overflowX === 'auto' && e.scrollWidth > e.clientWidth + 2; }).length;
  return {
    step: dd.innerText.replace(/\n+/g, ' | ').slice(0, 90),
    slotCount: rects.length,
    disabledCount: rects.filter(r => r.dis).length,
    disabledSample: rects.filter(r => r.dis).slice(0, 3),
    columnLefts: uniqLefts,
    minLeft, maxRight,
    gridWidth: maxRight - minLeft,
    horizontalScrollersInsideDialog: hScroller,
    groups,
    iw: window.innerWidth
  };
})()
