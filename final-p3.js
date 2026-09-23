(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const setV = (el, v) => { const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; d.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const d = () => document.querySelector('[role="dialog"]');
  const btn = (re) => { const x = d(); return x ? [...x.querySelectorAll('button')].find(b => re.test(b.innerText)) : null; };
  const slots = [...d().querySelectorAll('button')].filter(b => /^\d{2}:\d{2}/.test(b.innerText.trim()));
  const free = slots.find(s => !s.disabled);
  const picked = free.innerText.trim();
  free.click(); await sleep(150);
  btn(/^Далее$/).click(); await sleep(500);
  const fields = [...d().querySelectorAll('input')].map(e => ({ tag: e.tagName.toLowerCase(), type: e.type, fs: parseFloat(getComputedStyle(e).fontSize), h: Math.round(e.getBoundingClientRect().height) }));
  const ins = [...d().querySelectorAll('input')];
  setV(ins[0], 'Анализ Мобильный');
  setV(ins[1], '+7 705 111 22 33');
  await sleep(200);
  const cb = d().querySelector('input[type=checkbox]');
  const cbRect = cb.getBoundingClientRect();
  if (!cb.checked) cb.click();
  await sleep(200);
  const sub = [...d().querySelectorAll('button')].find(b => /Подтвердить/.test(b.innerText));
  const subRect = sub.getBoundingClientRect();
  const disabledBefore = sub.disabled;
  sub.click(); await sleep(2200);
  const d2 = d();
  const txt = d2 ? d2.innerText : document.body.innerText;
  return {
    pickedSlot: picked,
    fieldFonts: fields,
    checkbox: { w: Math.round(cbRect.width), h: Math.round(cbRect.height) },
    submitBtn: { h: Math.round(subRect.height), w: Math.round(subRect.width), disabledBefore },
    success: /ЗАПИСЬ ПРИНЯТА/.test(txt),
    number: (txt.match(/№\d+/) || [null])[0],
    step5text: txt.replace(/\n+/g, ' | ').slice(0, 220)
  };
})()
