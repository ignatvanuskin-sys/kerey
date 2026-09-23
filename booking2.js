(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = 'auto';
  const setV = (el, v) => {
    const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    d.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const dlg = () => document.querySelector('[role="dialog"]');
  const btn = (re) => { const d = dlg(); return d ? [...d.querySelectorAll('button')].find(b => re.test(b.innerText)) : null; };

  const open = [...document.querySelectorAll('button')].find(b => b.innerText.trim().startsWith('Записаться онлайн'));
  if (!open) return { err: 'no open button' };
  open.click(); await sleep(800);
  if (!dlg()) return { err: 'no dialog' };

  // step1 service
  const svc = [...dlg().querySelectorAll('button')].find(b => /Ремонт ходовой/.test(b.innerText));
  svc.click(); await sleep(300);
  btn(/^Далее$/).click(); await sleep(600);

  // step2 car
  const ins2 = [...dlg().querySelectorAll('input')];
  setV(ins2[0], 'Toyota'); setV(ins2[1], 'Camry'); setV(ins2[2], '2014');
  await sleep(200);
  btn(/^Далее$/).click(); await sleep(700);

  // step3 date - pick first enabled day card
  let sc = [...dlg().querySelectorAll('*')].find(e => { const cs = getComputedStyle(e); return cs.overflowX === 'auto' && e.scrollWidth > e.clientWidth + 2; });
  const days = sc ? [...sc.children] : [];
  const day = days.find(d => !d.disabled);
  if (!day) return { err: 'no enabled day', dayCount: days.length };
  const dayTxt = day.innerText.replace(/\n/g, ' ').trim();
  day.click(); await sleep(300);
  btn(/^Далее$/).click(); await sleep(800);

  // step4 time
  const slots = [...dlg().querySelectorAll('button')].filter(b => /^\d{2}:\d{2}/.test(b.innerText.trim()));
  const free = slots.find(s => !s.disabled);
  if (!free) return { err: 'no free slot', slotCount: slots.length };
  const slotTxt = free.innerText.trim();
  free.click(); await sleep(300);
  btn(/^Далее$/).click(); await sleep(800);

  // step5 contacts
  const ins5 = [...dlg().querySelectorAll('input')];
  setV(ins5[0], 'Аудит Панель');
  setV(ins5[1], '+7 705 111 22 33');
  await sleep(300);
  const cb = dlg().querySelector('input[type=checkbox]');
  if (!cb.checked) cb.click();
  await sleep(300);
  const sub = [...dlg().querySelectorAll('button')].find(b => /Подтвердить/.test(b.innerText));
  const disabledBefore = sub.disabled;
  sub.click(); await sleep(3000);
  const d2 = dlg();
  const txt = d2 ? d2.innerText : document.body.innerText;
  return {
    dayTxt, slotTxt, submitDisabledBefore: disabledBefore,
    success: /ЗАПИСЬ ПРИНЯТА/.test(txt),
    number: (txt.match(/№\d+/) || [null])[0],
    text: txt.slice(0, 350)
  };
})()
