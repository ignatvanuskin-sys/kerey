(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = 'auto';
  const iw = window.innerWidth;

  const wideNow = () => {
    const w = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > iw + 1 || r.left < -1) {
        w.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50), l: Math.round(r.left), r: Math.round(r.right) });
        if (w.length >= 8) break;
      }
    }
    return w;
  };

  const top = { y: Math.round(window.scrollY), docSW: document.documentElement.scrollWidth, wide: wideNow() };

  // scroll to exact bottom
  window.scrollTo(0, document.documentElement.scrollHeight);
  await sleep(500);

  const footer = document.body.querySelector(':scope > footer');
  const bar = [...document.body.children].find(e => getComputedStyle(e).position === 'fixed');
  const br = bar.getBoundingClientRect();
  let footerInfo = null;
  if (footer) {
    const kids = [...footer.querySelectorAll('*')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.height > 0 && e.children.length === 0 && e.textContent.trim().length > 0;
    });
    const lastBottom = Math.max(...kids.map(e => e.getBoundingClientRect().bottom));
    const lastEl = kids.find(e => Math.abs(e.getBoundingClientRect().bottom - lastBottom) < 0.5);
    const prev = kids.filter(e => e !== lastEl).map(e => ({ t: e.textContent.trim().slice(0, 30), b: Math.round(e.getBoundingClientRect().bottom) })).sort((a, b) => b.b - a.b)[0];
    const longP = [...footer.querySelectorAll('p')].map(p => ({ txt: p.textContent.trim().slice(0, 40), w: Math.round(p.getBoundingClientRect().width), cls: (typeof p.className === 'string' ? p.className : '').slice(0, 40) }));
    footerInfo = {
      barTop: Math.round(br.top),
      barH: Math.round(br.height),
      lastTextBottom: Math.round(lastBottom),
      lastText: lastEl ? lastEl.textContent.trim().slice(0, 60) : null,
      prevBottom: prev ? prev.b : null,
      gap: Math.round(br.top - lastBottom),
      longParagraphs: longP
    };
  }
  const bottom = { y: Math.round(window.scrollY), docSW: document.documentElement.scrollWidth, wide: wideNow() };

  // tap targets
  const small = [];
  for (const el of document.querySelectorAll('a,button,input,select,textarea')) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (r.height < 44) {
      small.push({ tag: el.tagName.toLowerCase(), txt: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 32).replace(/\n/g, ' '), h: Math.round(r.height * 10) / 10, w: Math.round(r.width), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 45) });
    }
  }

  // fonts
  const badFonts = [...document.querySelectorAll('input,textarea,select')].map(e => ({ tag: e.tagName.toLowerCase(), fs: parseFloat(getComputedStyle(e).fontSize) })).filter(f => f.fs < 16);

  // contacts overlap check
  const contacts = document.getElementById('contacts');
  let contactRows = null;
  if (contacts) {
    const links = [...contacts.querySelectorAll('a')].filter(a => /^(tel:|https:\/\/(wa\.me|instagram))/i.test(a.getAttribute('href') || '') || /Instagram|WhatsApp/i.test(a.innerText));
    const rows = links.map(a => { const r = a.getBoundingClientRect(); return { t: a.innerText.trim().slice(0, 28).replace(/\n/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) }; });
    let overlaps = 0;
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      const vX = a.left < b.right && b.left < a.right;
      const vY = a.top < b.bottom && b.top < a.bottom;
      if (vX && vY) overlaps++;
    }
    contactRows = { count: rows.length, rows, overlaps };
  }

  return { iw, innerH: window.innerHeight, top, bottom, footer: footerInfo, smallCount: small.length, small, badFonts, badFontCount: badFonts.length, contactRows, alertText: (document.querySelector('[role=alert]') || {}).innerText || null };
})()
