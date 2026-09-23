(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const setV = (el, v) => { const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; d.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const d = () => document.querySelector('[role="dialog"]');
  const btn = (re) => { const x = d(); return x ? [...x.querySelectorAll('button')].find(b => re.test(b.innerText)) : null; };
  // ensure closed then reopen from hero
  const d0 = d();
  if (d0) { const c = [...d0.querySelectorAll('button')].find(b => /Закрыть/.test(b.getAttribute('aria-label') || '')); if (c) c.click(); await sleep(300); }
  const hero = document.querySelector('main > section');
  [...hero.querySelectorAll('button')].find(e => /Записаться онлайн/.test(e.innerText)).click();
  await sleep(400);
  if (!d()) return { err: 'no dialog' };
  [...d().querySelectorAll('button')].find(b => /Ремонт ходовой/.test(b.innerText)).click();
  await sleep(150);
  btn(/^Далее$/).click(); await sleep(350);
  const ins = [...d().querySelectorAll('input')];
  setV(ins[0], 'Toyota'); setV(ins[1], 'Camry'); setV(ins[2], '2016');
  await sleep(150);
  btn(/^Далее$/).click(); await sleep(450);
  const dd = d();
  const sc = [...dd.querySelectorAll('*')].find(e => { const cs = getComputedStyle(e); return cs.overflowX === 'auto' && e.scrollWidth > e.clientWidth + 2; });
  return {
    step: dd.innerText.replace(/\n+/g, ' | ').slice(0, 130),
    dayCards: sc ? [...sc.children].map(c => ({ t: c.innerText.replace(/\n/g, ' ').trim().slice(0, 20), dis: !!c.disabled })) : null,
    scroller: sc ? { clientW: sc.clientWidth, scrollW: sc.scrollWidth, left: Math.round(sc.getBoundingClientRect().left), right: Math.round(sc.getBoundingClientRect().right) } : null,
    iw: window.innerWidth
  };
})()
