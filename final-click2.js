(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = 'auto';
  const out = {};
  const dlgOpen = () => !!document.querySelector('[role="dialog"]');
  const closeDlg = async () => { const d = document.querySelector('[role="dialog"]'); if (!d) return true; const b = [...d.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Закрыть'); if (b) b.click(); await sleep(250); return !dlgOpen(); };
  const header = document.querySelector('header');
  const headerBtn = [...header.querySelectorAll('a,button')].find(e => /Записаться/.test(e.innerText));
  const hero = document.querySelector('main > section');
  const heroBtn = [...hero.querySelectorAll('button')].find(e => /Записаться онлайн/.test(e.innerText));
  const svc = document.getElementById('services');
  const cardBtn = svc ? [...svc.querySelectorAll('a,button')].find(e => /Записаться/.test(e.innerText)) : null;

  window.scrollTo(0, 0); await sleep(200);
  headerBtn.click(); await sleep(600);
  const d1 = document.querySelector('[role="dialog"]');
  out.headerClick = { opened: !!d1, step: d1 ? d1.innerText.replace(/\n+/g, ' | ').slice(0, 55) : null, closed: await closeDlg() };

  heroBtn.click(); await sleep(600);
  const d2 = document.querySelector('[role="dialog"]');
  out.heroClick = { opened: !!d2, step: d2 ? d2.innerText.replace(/\n+/g, ' | ').slice(0, 55) : null, closed: await closeDlg() };

  cardBtn.scrollIntoView({ block: 'center' }); await sleep(200);
  cardBtn.click(); await sleep(600);
  const d3 = document.querySelector('[role="dialog"]');
  out.cardClick = { opened: !!d3, step: d3 ? d3.innerText.replace(/\n+/g, ' | ').slice(0, 55) : null, closed: await closeDlg() };
  return out;
})()
