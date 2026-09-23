(() => {
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  const de = document.documentElement;
  const sy = Math.round(window.scrollY);

  // 1. wide elements
  const wide = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > iw + 1 || r.left < -1) {
      wide.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 70) : '',
        id: el.id || '',
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width)
      });
      if (wide.length >= 10) break;
    }
  }

  // 2. tap targets
  const small = [];
  for (const el of document.querySelectorAll('a,button,input,select,textarea')) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (r.height < 44) {
      small.push({
        tag: el.tagName.toLowerCase(),
        txt: (el.innerText || el.getAttribute('aria-label') || el.value || el.getAttribute('placeholder') || '').trim().slice(0, 40),
        h: Math.round(r.height * 10) / 10,
        w: Math.round(r.width),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60)
      });
    }
  }

  // 3. input font sizes
  const fonts = [];
  for (const el of document.querySelectorAll('input,textarea,select')) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    fonts.push({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      fs: fs,
      name: el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.id || el.name || ''
    });
  }

  // 4. text clipping
  const clipped = [];
  for (const el of document.querySelectorAll('p,span,h1,h2,h3,h4,li,div')) {
    if (el.children.length > 0) continue;
    if (!el.innerText || el.innerText.trim().length < 12) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
      clipped.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 55),
        txt: el.innerText.trim().slice(0, 35),
        sh: el.scrollHeight, ch: el.clientHeight,
        sw: el.scrollWidth, cw: el.clientWidth
      });
      if (clipped.length >= 12) break;
    }
  }

  // H1 line overlap + bottom fixed bar
  let h1 = null;
  const h1el = document.querySelector('h1');
  if (h1el) {
    const cs = getComputedStyle(h1el);
    const r = h1el.getBoundingClientRect();
    h1 = { txt: h1el.innerText.trim().slice(0, 50), h: Math.round(r.height), lh: cs.lineHeight, fs: cs.fontSize, sh: h1el.scrollHeight, ch: h1el.clientHeight };
  }

  // fixed bottom bars
  const fixed = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if ((cs.position === 'fixed' || cs.position === 'sticky') && el.getBoundingClientRect().height > 20) {
      const r = el.getBoundingClientRect();
      fixed.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 55), pos: cs.position, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), z: cs.zIndex });
    }
  }

  const footer = document.querySelector('footer');
  let footerRect = null;
  if (footer) { const r = footer.getBoundingClientRect(); footerRect = { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }

  return {
    __result: {
      iw, ih, scrollY: sy,
      docScrollWidth: de.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollHeight: de.scrollHeight,
      overflow: de.scrollWidth - iw,
      wide,
      smallCount: small.length,
      small,
      fonts,
      badFonts: fonts.filter(f => f.fs < 16),
      clipped,
      h1,
      fixed,
      footerRect,
      atBottom: (window.scrollY + ih) >= (de.scrollHeight - 3)
    }
  };
})()
