// Runs inside Chrome: draws each Mermaid diagram as vector art and fits it to the printed column.
const COL_PX = 5.96 * 96, MAX_H_PX = 7.0 * 96, IDEAL = 0.8, COMFORT_H_PX = 4.6 * 96, MIN_COMFORT = 0.66;
const ROTATE_BELOW = 0.62, ROT_W_PX = 6.5 * 96, ROT_H_PX = 5.8 * 96;
function colour(name, fb) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb; }
function size(svg) {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width) return [vb.width, vb.height];
  const r = svg.getBoundingClientRect(); return [r.width, r.height];
}
// Prefer a compact figure, but never shrink labels below a readable size just to save height.
function fitOf(w, h) { const hard = Math.min(IDEAL, COL_PX / w, MAX_H_PX / h); return Math.min(hard, Math.max(COMFORT_H_PX / h, Math.min(hard, MIN_COMFORT))); }
function flip(src) {
  return src.replace(/^(\s*flowchart\s+)(LR|RL|TD|TB|BT)/m, (m, a, d) => a + ((d === 'LR' || d === 'RL') ? 'TD' : 'LR'));
}
// A chart made of unconnected subgraphs lays out side by side and shrinks to nothing.
// Stacking one chart per subgraph keeps every node and label at a readable size.
function splitPanels(src) {
  const lines = src.split('\n'); const head = lines[0];
  if (!/^\s*flowchart/.test(head)) return null;
  const panels = []; const outside = []; let depth = 0; let cur = null;
  for (const l of lines.slice(1)) {
    const t = l.trim();
    if (/^subgraph\b/.test(t)) { if (depth === 0) cur = { id: t.replace(/^subgraph\s+/, '').match(/^[\w-]*/)[0], title: t, body: [] }; else cur.body.push(l); depth += 1; continue; }
    if (t === 'end') { depth -= 1; if (depth === 0) { panels.push(cur); cur = null; } else cur.body.push(l); continue; }
    if (depth > 0) cur.body.push(l); else if (t) outside.push(t);
  }
  if (panels.length < 2) return null;
  const short = (p) => { const m = p.title.match(/"(.+)"/); return (m ? m[1] : p.id).split(':')[0]; };
  const after = {};
  for (const x of outside.filter((y) => /-->|---|-\.|==>/.test(y))) {
    const m = x.match(/^([\w-]+)\s*-->\s*(?:\|"?([^|"]*)"?\|\s*)?([\w-]+)$/);
    const from = m && panels.find((p) => p.id === m[1]); const to = m && panels.find((p) => p.id === m[3]);
    if (!from || !to) return null;
    after[to.id] = short(from) + (m[2] ? `, ${m[2]}` : '');
  }
  const styles = outside.filter((x) => !/-->|---|-\.|==>|~~~/.test(x));
  return panels.map((p) => {
    const m = p.title.match(/"(.+)"/); const dir = (p.body.find((b) => /^\s*direction\s/.test(b)) || 'direction LR').trim().split(/\s+/)[1];
    return { title: (after[p.id] ? `From "${after[p.id]}" → ` : '') + (m ? m[1] : p.id), src: `flowchart ${dir}\n${p.body.filter((b) => !/^\s*direction\s/.test(b)).join('\n')}\n${styles.join('\n')}` };
  });
}
window.__bookReady = (async () => {
  await Promise.all(['400 14px Inter', '500 14px Inter', '600 14px Inter', '700 14px Inter', '400 14px "JetBrains Mono"'].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const figs = [...document.querySelectorAll('figure.diagram')].filter((f) => f.querySelector('.mermaid-src'));
  const report = [];
  if (!figs.length) return report;
  const accent = colour('--accent', '#FFD23F');
  const init = (compact) => mermaid.initialize({
    startOnLoad: false, securityLevel: 'loose', theme: 'base', fontFamily: 'Inter, "DejaVu Sans", sans-serif',
    themeVariables: {
      fontFamily: 'Inter, "DejaVu Sans", sans-serif', fontSize: '13px', primaryColor: '#FFFFFF', primaryTextColor: '#14171F', primaryBorderColor: '#14171F',
      secondaryColor: accent + '40', secondaryBorderColor: '#14171F', tertiaryColor: '#F5F6F9', tertiaryBorderColor: '#AEB4C0',
      lineColor: '#14171F', textColor: '#14171F', noteBkgColor: accent + '55', noteBorderColor: '#14171F', noteTextColor: '#14171F',
      actorBkg: accent + '55', actorBorder: '#14171F', signalColor: '#14171F', labelBoxBkgColor: accent + '55', labelBoxBorderColor: '#14171F',
      edgeLabelBackground: '#FFFFFF', clusterBkg: '#F5F6F9', clusterBorder: '#AEB4C0',
    },
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis', nodeSpacing: compact ? 14 : 34, rankSpacing: compact ? 20 : 38, padding: compact ? 6 : 9, wrappingWidth: compact ? 125 : 190 },
    sequence: { useMaxWidth: false, wrap: true, actorMargin: compact ? 12 : 26, messageMargin: compact ? 15 : 24, boxMargin: 6, width: compact ? 88 : 112, height: compact ? 34 : 40, mirrorActors: false, noteMargin: 6, diagramMarginX: 6, diagramMarginY: 6 },
    state: { useMaxWidth: false }, gantt: { useMaxWidth: false, barHeight: 18, fontSize: 11, sectionFontSize: 11 },
  });
  init(false);
  let i = 0;
  for (const fig of figs) {
    i += 1;
    const src = fig.querySelector('.mermaid-src').textContent;
    try {
      let { svg } = await mermaid.render(`d${i}`, src);
      const holder = document.createElement('div'); holder.innerHTML = svg; let el = holder.querySelector('svg');
      fig.appendChild(holder);
      let [w, h] = size(el); let s = fitOf(w, h); let flipped = false;
      const panels = s < 0.62 ? splitPanels(src) : null;
      if (panels) {
        holder.remove(); let k = 0;
        for (const p of panels) {
          k += 1; const r = await mermaid.render(`d${i}p${k}`, p.src);
          const box = document.createElement('div'); box.className = 'panel'; box.innerHTML = `<div class="panel-title">${p.title}</div>` + r.svg; fig.appendChild(box);
          const e = box.querySelector('svg'); const [pw, ph] = size(e); const ps = Math.min(IDEAL, COL_PX / pw, (MAX_H_PX / panels.length) / ph);
          if (!e.getAttribute('viewBox')) e.setAttribute('viewBox', `0 0 ${pw} ${ph}`);
          e.removeAttribute('style'); e.setAttribute('width', pw * ps); e.setAttribute('height', ph * ps);
          if (ps < 0.6) report.push({ fig: i, panel: k, scale: +ps.toFixed(2), w: Math.round(pw), h: Math.round(ph), flipped: false });
        }
        const cap = document.createElement('figcaption'); cap.textContent = `Figure ${document.body.dataset.chap}-${i}`.replace(/Figure -/, 'Figure '); fig.appendChild(cap);
        fig.querySelector('.mermaid-src').remove();
        continue;
      }
      if (s < 0.72 && /^\s*flowchart\s/m.test(src)) {
        const alt = await mermaid.render(`d${i}b`, flip(src));
        const hold2 = document.createElement('div'); hold2.innerHTML = alt.svg; fig.appendChild(hold2);
        const el2 = hold2.querySelector('svg'); const [w2, h2] = size(el2); const s2 = fitOf(w2, h2);
        if (s2 > s * 1.12) { holder.remove(); el = el2; w = w2; h = h2; s = s2; flipped = true; } else hold2.remove();
      }
      if (s < 0.62) { // Tighter spacing and narrower labels before giving up any type size.
        init(true);
        const tight = await mermaid.render(`d${i}c`, flipped ? flip(src) : src);
        init(false);
        const hold3 = document.createElement('div'); hold3.innerHTML = tight.svg; fig.appendChild(hold3);
        const el3 = hold3.querySelector('svg'); const [w3, h3] = size(el3); const s3 = fitOf(w3, h3);
        if (s3 > s * 1.05) { el.parentNode.remove(); el = el3; w = w3; h = h3; s = s3; } else hold3.remove();
      }
      if (!el.getAttribute('viewBox')) el.setAttribute('viewBox', `0 0 ${w} ${h}`);
      el.removeAttribute('style');
      // Very tall, narrow chains: cut between two nodes and set them in two columns.
      if (s < 0.58 && h > 2.4 * w && w * 2 + 30 < COL_PX * 1.4) {
        const r0 = el.getBoundingClientRect(); const k = h / r0.height; const vb = el.getAttribute('viewBox').split(/[\s,]+/).map(Number);
        const spans = [...el.querySelectorAll('.node')].map((n) => { const r = n.getBoundingClientRect(); return [(r.top - r0.top) * k, (r.bottom - r0.top) * k]; }).sort((a, b) => a[0] - b[0]);
        let cut = null; let reach = spans.length ? spans[0][1] : 0;
        for (const [t, b] of spans.slice(1)) { if (t > reach) { const y = (t + reach) / 2; if (cut === null || Math.abs(y - h / 2) < Math.abs(cut - h / 2)) cut = y; } reach = Math.max(reach, b); }
        const s2 = cut === null ? 0 : Math.min(IDEAL, MAX_H_PX / Math.max(cut, h - cut), (COL_PX - 28) / (2 * w));
        if (s2 > s * 1.2) {
          const row = document.createElement('div'); row.className = 'twocol';
          const mk = (y0, hh) => { const c = el.cloneNode(true); c.setAttribute('viewBox', `${vb[0]} ${vb[1] + y0} ${w} ${hh}`); c.setAttribute('width', w * s2); c.setAttribute('height', hh * s2); return c; };
          row.append(mk(0, cut)); const ar = document.createElement('div'); ar.className = 'contarrow'; ar.textContent = 'continues →'; row.append(ar); row.append(mk(cut, h - cut));
          el.parentNode.replaceWith(row); s = s2;
          if (s < 0.6) report.push({ fig: i, scale: +s.toFixed(2), w: Math.round(w), h: Math.round(h), flipped, twocol: true });
          const cp = document.createElement('figcaption'); cp.textContent = document.body.dataset.chap ? `Figure ${document.body.dataset.chap}-${i}` : `Figure ${i}`; fig.appendChild(cp);
          fig.querySelector('.mermaid-src').remove();
          continue;
        }
      }
      // Still too small: turn it sideways, as printed books do, so labels stay readable.
      const sR = Math.min(IDEAL, ROT_W_PX / w, ROT_H_PX / h);
      if (s < ROTATE_BELOW && sR > s * 1.12) {
        s = sR; const dw = w * s, dh = h * s;
        el.setAttribute('width', dw); el.setAttribute('height', dh);
        const box = document.createElement('div');
        box.className = 'rotbox'; box.style.width = dh + 'px'; box.style.height = dw + 'px';
        el.style.transform = `translate(0, ${dw}px) rotate(-90deg)`; el.style.transformOrigin = '0 0';
        el.parentNode.insertBefore(box, el); box.appendChild(el); fig.classList.add('turned');
      } else { el.setAttribute('width', w * s); el.setAttribute('height', h * s); }
      if (s < 0.6) report.push({ fig: i, scale: +s.toFixed(2), w: Math.round(w), h: Math.round(h), flipped });
      const cap = document.createElement('figcaption');
      cap.textContent = document.body.dataset.chap ? `Figure ${document.body.dataset.chap}-${i}` : `Figure ${i}`;
      fig.appendChild(cap);
    } catch (e) {
      report.push({ fig: i, error: String(e.message || e).slice(0, 200) });
      const pre = document.createElement('pre'); pre.textContent = src; fig.appendChild(pre);
    }
    fig.querySelector('.mermaid-src').remove();
  }
  return report;
})();
