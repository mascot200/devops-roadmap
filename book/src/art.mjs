// Original vector artwork for the book: the 21-level staircase motif used on the cover and part openers.
import { PARTS } from './manifest.mjs';

export const LEVELS = [
  [0, 'What DevOps Is'], [1, 'Linux'], [2, 'Networking'], [3, 'Git & GitHub'], [4, 'Docker'], [5, 'CI/CD'], [6, 'Cloud (AWS)'],
  [7, 'Terraform'], [8, 'Kubernetes'], [9, 'Helm'], [10, 'Observability'], [11, 'DevSecOps'], [12, 'Adv. Networking'],
  [13, 'Databases'], [14, 'SRE'], [15, 'Disaster Recovery'], [16, 'Adv. Kubernetes'], [17, 'GitOps'], [18, 'Platform Eng.'],
  [19, 'Architecture'], [20, 'Cost / FinOps'],
];
export const colourOf = (lv) => PARTS.find((p) => p.levels.includes(lv)).accent;

// A rising staircase: one column per level. `focus` dims every level outside the given list.
export function stairs({ w, h, labels = true, focus = null, flag = true, stroke = '#0B0E18', dim = '#2A3145', labelInk = '#0B0E18', minFrac = 0.12, topPad = 0.2 }) {
  const n = LEVELS.length; const gap = w * 0.0052; const cw = (w - gap * (n - 1)) / n;
  const usable = h * (1 - topPad);
  let out = '';
  LEVELS.forEach(([lv, name], i) => {
    const frac = minFrac + (1 - minFrac) * (i / (n - 1));
    const ch = usable * frac; const x = i * (cw + gap); const y = h - ch;
    const on = !focus || focus.includes(lv);
    const fill = on ? colourOf(lv) : dim;
    out += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="${cw * 0.12}" fill="${fill}" stroke="${stroke}" stroke-width="${cw * 0.05}"/>`;
    out += `<rect x="${x + cw * 0.14}" y="${y + cw * 0.14}" width="${cw * 0.72}" height="${cw * 0.1}" rx="${cw * 0.05}" fill="#fff" opacity="${on ? 0.55 : 0.08}"/>`;
    if (labels) {
      out += `<text x="${x + cw / 2}" y="${h - cw * 0.3}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${cw * 0.5}" fill="${on ? labelInk : '#59627A'}">${lv}</text>`;
      if (ch > cw * 4.1) {
        out += `<text transform="translate(${x + cw * 0.62} ${h - cw * 1.0}) rotate(-90)" font-family="Inter" font-weight="700" font-size="${cw * 0.42}" fill="${on ? labelInk : '#59627A'}">${name.replace('&', '&amp;')}</text>`;
      }
    }
  });
  if (flag) {
    const x = (n - 1) * (cw + gap) + cw / 2; const top = h - usable;
    const pole = usable * 0.17;
    out += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top - pole}" stroke="#fff" stroke-width="${cw * 0.11}" stroke-linecap="round"/>`;
    out += `<path d="M${x} ${top - pole} L${x - cw * 1.9} ${top - pole + cw * 0.72} L${x} ${top - pole + cw * 1.42} Z" fill="#FFD23F" stroke="${stroke}" stroke-width="${cw * 0.05}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible;width:${w}pt;height:${h}pt">${out}</svg>`;
}

function dots(w, h, seed = 7, count = 70) {
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; let o = '';
  for (let i = 0; i < count; i++) {
    const x = r() * w; const y = r() * h; const a = 0.1 + r() * 0.35; const d = 0.5 + r() * 1.1;
    o += `<circle cx="${x}" cy="${y}" r="${d}" fill="#fff" opacity="${a}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="position:absolute;left:0;top:0;width:${w}pt;height:${h}pt">${o}</svg>`;
}

export const TITLE = 'The Production-Ready Engineer';
export const SUBTITLE = 'The complete DevOps roadmap, from your first Linux command to senior architect';
export const AUTHOR = 'Ubong Eduok';
const QUALITIES = ['Secure', 'Observable', 'Scalable', 'Highly available', 'Automatically deployable', 'Recoverable', 'Cost-efficient'];

// Front cover panel, sized in points. `edition` is the line under the author name.
export function frontPanel({ W, H, vol }) {
  const stairH = H * 0.615; const stairW = W - 56;
  return `<div style="position:relative;width:${W}pt;height:${H}pt;overflow:hidden;hyphens:manual;background:radial-gradient(120% 90% at 92% 8%, #2A2F66 0%, #141A36 42%, #0B0E18 100%);color:#fff">
    ${dots(W, H * 0.62)}
    <div style="position:absolute;left:32pt;top:38pt;right:32pt">
      <div style="font:800 9.5pt/1 Inter;letter-spacing:2.6pt;text-transform:uppercase;color:#FFD23F;margin-bottom:15pt">The Complete DevOps Roadmap · Volume ${vol.n} of 6</div>
      <div style="font:900 60pt/.93 Inter;letter-spacing:-2.6pt">
        <div style="font:800 25pt/1 Inter;letter-spacing:-.7pt;margin-bottom:6pt;color:#fff">The</div>
        <div style="color:#FFD23F">Production-</div><div style="color:#FFD23F">Ready</div><div>Engineer</div>
      </div>
      <div style="font:500 12.6pt/1.3 Inter;color:#D6DAE8;margin-top:15pt;max-width:270pt">From your first Linux command to senior architect, one level at a time</div>
    </div>
    <div style="position:absolute;left:28pt;bottom:80pt">${stairs({ w: stairW, h: stairH, focus: vol.levels })}</div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:80pt;background:#0B0E18;border-top:2.5pt solid #FFD23F;display:flex;align-items:center;justify-content:space-between;padding:0 32pt">
      <div><div style="font:900 21pt/1 Inter;letter-spacing:-.5pt">${AUTHOR}</div>
      <div style="font:700 9.4pt/1 Inter;color:#fff;margin-top:7pt;letter-spacing:.1pt">${vol.title.replace('&', '&amp;')}</div></div>
      <div style="display:flex;gap:15pt;text-align:right">
        ${vol.stats.map(([a, b]) => `<div><div style="font:900 17pt/1 Inter;color:#FFD23F;letter-spacing:-.4pt">${a}</div><div style="font:600 7pt/1 Inter;color:#AEB4C8;margin-top:4pt">${b}</div></div>`).join('')}
      </div>
    </div>
  </div>`;
}

// Back cover panel; leaves a clear white box for the printer's ISBN barcode.
export function backPanel({ W, H, portrait, vol }) {
  return `<div style="position:relative;width:${W}pt;height:${H}pt;overflow:hidden;hyphens:manual;background:#0B0E18;color:#fff">
    <div style="position:absolute;left:0;right:0;bottom:0;opacity:.28">${stairs({ w: W, h: H * 0.34, labels: false, flag: false })}</div>
    <div style="position:absolute;left:36pt;right:36pt;top:42pt">
      <div style="font:900 25pt/1.08 Inter;letter-spacing:-.8pt;color:#FFD23F">Do not aim to know 50 tools.</div>
      <div style="font:800 15pt/1.22 Inter;letter-spacing:-.3pt;margin-top:8pt">Aim to take a software application and independently make it production-ready.</div>
      <div style="display:flex;flex-wrap:wrap;gap:5pt;margin:15pt 0 17pt">${QUALITIES.map((q) => `<span style="font:700 7.6pt/1 Inter;padding:4.2pt 8pt;border:1pt solid #FFD23F;border-radius:20pt;color:#FFD23F">${q}</span>`).join('')}</div>
      <p style="font:400 10.4pt/1.44 'Source Serif';color:#E4E7F0;margin:0 0 8pt">This is the full curriculum behind the open-source DevOps Roadmap, set down in print across six volumes. Twenty-one levels climb from Linux, networking and Git through Docker, CI/CD, AWS, Terraform, Kubernetes and Helm, on to observability, security, SRE, disaster recovery, GitOps, platform engineering, architecture and cost.</p>
      <p style="font:400 10.4pt/1.44 'Source Serif';color:#E4E7F0;margin:0 0 8pt">Every topic explains what a thing is and why it matters in production, shows it in a real-world system, draws the mechanism, walks you through it step by step, then hands you tasks you can verify and questions a senior engineer would expect you to answer. Nine projects chain it all into one evolving production system built around a single sample application.</p>
      <div style="margin-top:11pt;padding:7pt 10pt;border-left:3pt solid #FFD23F;background:#161B30"><div style="font:800 9.6pt/1.25 Inter;color:#FFD23F">Volume ${vol.n}: ${vol.title.replace('&', '&amp;')}</div><div style="font:500 8pt/1.3 Inter;color:#E4E7F0;margin-top:2pt">${vol.sub.replace('&', '&amp;')}</div></div>
      <div style="display:flex;gap:13pt;align-items:center;margin-top:13pt">
        <div style="flex:none;width:60pt;height:62pt;overflow:hidden;border-radius:6pt;border:1pt solid #3A4160"><img src="${portrait}" style="width:60pt;display:block"></div>
        <div style="font:400 9.2pt/1.4 'Source Serif';color:#D6DAE8"><b style="font:800 10pt Inter;color:#fff">Ubong Eduok</b><br>Author and instructor of the DevOps Roadmap: Beginner to Senior.<br>github.com/mascot200/devops-roadmap</div>
      </div>
    </div>
    <div style="position:absolute;right:36pt;bottom:30pt;width:144pt;height:86pt;background:#fff;border-radius:2pt"></div>
    <div style="position:absolute;left:36pt;bottom:128pt;font:700 7.6pt/1.5 Inter;color:#AEB4C8;letter-spacing:.5pt;text-transform:uppercase">DevOps · Cloud · Platform Engineering · Beginner to Senior</div>
  </div>`;
}
