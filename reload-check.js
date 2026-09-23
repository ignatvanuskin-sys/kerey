(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const n = (Number(sessionStorage.getItem('rc')) || 0) + 1;
  sessionStorage.setItem('rc', String(n));
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const t = document.body ? document.body.innerText : '';
    if (document.querySelector('li') || /Заявок пока нет|нет заявок|Пока нет/i.test(t)) break;
    await sleep(150);
  }
  await sleep(500);
  const txt = document.body.innerText;
  const stats = [...document.querySelectorAll('article')].map(a => a.innerText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
  const statNums = stats.map(s => { const m = s.match(/(\d+)\s*(ждут|активные|ближайшие|за всё)/); return m ? Number(m[1]) : null; });
  const items = [...document.querySelectorAll('li')].map(l => l.innerText.replace(/\n/g, ' | ').slice(0, 90));
  const out = {
    readIndex: n,
    url: location.pathname,
    demoBanner: /Демонстрационный режим/.test(txt),
    statNums,
    itemCount: items.length,
    items,
    hasAuditPanel: /Аудит Панель/.test(txt)
  };
  try {
    const r = await fetch('/api/bookings', { credentials: 'include' });
    const j = await r.json();
    out.apiCount = Array.isArray(j.bookings) ? j.bookings.length : null;
  } catch (e) { out.apiError = String(e); }
  setTimeout(() => location.reload(), 80);
  return out;
})()
