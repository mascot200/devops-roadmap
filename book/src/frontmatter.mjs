// The authored pages of the book: everything that is not a repository page.
import fs from 'node:fs';
import path from 'node:path';
import { PARTS, REPO } from './manifest.mjs';
import { LEVELS, colourOf, stairs, frontPanel, backPanel, TITLE, SUBTITLE, AUTHOR } from './art.mjs';
import { wrap } from './render.mjs';

const BLANK_PART = { accent: '#FFD23F', deep: '#8A6A00' };
const partById = Object.fromEntries(PARTS.map((p) => [p.id, p]));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const portrait = `file://${REPO}/docs/images/ubong-eduok.png`;

// Print volumes are cut at Part boundaries so every volume stays bindable.
export const VOLUMES = [
  { n: 1, title: 'Foundations', sub: 'Base Camp and Part I: DevOps, Linux, Networking, Git', parts: ['base-camp', 'part-1'] },
  { n: 2, title: 'Build, Ship and Cloud', sub: 'Parts II and III: Docker, CI/CD, AWS, Terraform', parts: ['part-2', 'part-3'] },
  { n: 3, title: 'Orchestrate, See and Secure', sub: 'Parts IV and V: Kubernetes, Helm, Observability, DevSecOps', parts: ['part-4', 'part-5'] },
  { n: 4, title: 'Under the Hood', sub: 'Part VI: Advanced Networking, Databases and Distributed Systems', parts: ['part-6'] },
  { n: 5, title: 'Reliability and Platforms at Scale', sub: 'Parts VII and VIII: SRE, Disaster Recovery, Advanced Kubernetes, GitOps, Platform Engineering', parts: ['part-7', 'part-8'] },
  { n: 6, title: 'Senior Altitude and the Summit', sub: 'Parts IX and X, Appendices and Index: Architecture, Cost, the Nine Projects', parts: ['part-9', 'part-10', 'appendices'] },
];

const LEVEL_TIME = Object.fromEntries([...fs.readFileSync(path.join(REPO, 'README.md'), 'utf8').matchAll(/^\| (\d+) \| \[[^\]]+\]\([^)]+\) \| ([^|]+) \| (\d+) \|/gm)].map((m) => [+m[1], { time: m[2].trim(), topics: +m[3] }]));

const page = (html, css = '') => wrap(`<div class="authored">${html}</div>`, BLANK_PART, '', AUTHORED_CSS + css);
const AUTHORED_CSS = `
.authored .nohy, .pull, .authored .centerpage { hyphens: manual; }
.authored h1.t { font: 900 24pt/1.08 Inter; letter-spacing: -.7pt; margin: 0 0 13pt; padding-bottom: 12pt; border-bottom: 2.5pt solid #14171F; }
.authored h2 { margin-top: 14pt; }
.lead { font: 400 12pt/1.42 'Source Serif'; }
.pull { font: 800 13.5pt/1.25 Inter; letter-spacing: -.3pt; margin: 12pt 0; padding: 10pt 13pt; background: #FFD23F; border: 1.4pt solid #14171F; border-radius: 6pt; box-shadow: 2.2pt 2.2pt 0 #14171F; hyphens: manual; }
.centerpage { height: 7.5in; display: flex; flex-direction: column; justify-content: center; }
`;

export function fullBleed(inner, W = 540, H = 666) {
  return wrap(inner, BLANK_PART, '', `@page{size:${W}pt ${H}pt;margin:0}@page :left{margin:0}@page :right{margin:0}body{margin:0}`);
}
export const coverFront = (vol) => fullBleed(frontPanel({ W: 540, H: 666, vol }));
export const coverBack = (vol) => fullBleed(backPanel({ W: 540, H: 666, portrait, vol }));

export function halfTitle(vol) {
  return page(`<div class="centerpage" style="justify-content:flex-start;padding-top:1.5in">
    <div style="font:900 30pt/1 Inter;letter-spacing:-1pt">${TITLE.replace('Production-Ready', 'Production&#8209;Ready')}</div>
    ${vol ? `<div style="font:700 13pt/1.25 Inter;color:#8A6A00;margin-top:12pt">Volume ${vol.n}: ${esc(vol.title)}</div>` : ''}
    <div style="width:70pt;height:4pt;background:#FFD23F;margin-top:16pt"></div></div>`);
}

export function setPage(ranges, vol) {
  const rows = VOLUMES.map((v) => {
    const r = ranges && ranges[v.n];
    return `<tr${vol && vol.n === v.n ? ' style="font-weight:700"' : ''}><td style="width:1.5em"><b>${v.n}</b></td><td><b>${esc(v.title)}</b><br><span style="color:#5B6270">${esc(v.sub)}</span></td><td style="white-space:nowrap;text-align:right">${r ? `pp. ${r[0]}&ndash;${r[1]}` : ''}</td></tr>`;
  }).join('');
  return page(`<div style="padding-top:1.1in"><div class="kicker" style="color:#8A6A00">The print set</div>
    <p style="font:400 10pt/1.42 'Source Serif'">The Production-Ready Engineer is published in six volumes, cut at Part boundaries so that each one stands on its own and binds cleanly. Page numbers run continuously through the set, and the index in Volume 6 covers all of it.</p>
    <div class="tw"><table class="kv"><tbody>${rows}</tbody></table></div></div>`);
}

export function titlePage(vol) {
  return wrap(`<div style="position:relative;width:540pt;height:666pt;overflow:hidden;background:#fff">
    <div style="position:absolute;left:66pt;right:50pt;top:92pt">
      <div style="font:800 9pt/1 Inter;letter-spacing:2.4pt;text-transform:uppercase;color:#8A6A00;margin-bottom:16pt">The Complete DevOps Roadmap</div>
      <div style="font:900 42pt/.98 Inter;letter-spacing:-1.7pt;color:#14171F">The<br>Production-Ready<br>Engineer</div>
      <div style="font:500 12.5pt/1.34 Inter;color:#333A47;margin-top:16pt;max-width:330pt">${SUBTITLE}</div>
      ${vol ? `<div style="display:inline-block;font:800 10pt/1 Inter;padding:6pt 11pt;margin-top:15pt;background:#FFD23F;border:1.2pt solid #14171F;border-radius:4pt">Volume ${vol.n} of 6: ${esc(vol.title)}</div>` : ''}
      <div style="font:900 17pt/1 Inter;letter-spacing:-.4pt;margin-top:26pt">${AUTHOR}</div>
    </div>
    <div style="position:absolute;left:66pt;right:50pt;bottom:58pt">${stairs({ w: 424, h: 190, labels: false, stroke: '#14171F', topPad: 0.22 })}</div>
    <div style="position:absolute;left:66pt;bottom:36pt;font:600 7.6pt/1 Inter;color:#5B6270;letter-spacing:.3pt">github.com/mascot200/devops-roadmap</div>
  </div>`, BLANK_PART, '', '@page{size:540pt 666pt;margin:0}@page :left{margin:0}@page :right{margin:0}body{margin:0}');
}

export function copyright(commit, vol) {
  const year = 2026;
  return page(`<div class="centerpage" style="justify-content:flex-end;font:400 8.1pt/1.48 Inter;color:#333A47">
    <p><b>${TITLE}</b><br>${SUBTITLE}${vol ? `<br>Volume ${vol.n} of 6: ${esc(vol.title)}` : ''}</p>
    <p>Copyright &copy; ${year} ${AUTHOR}.</p>
    <p>This book is released under the MIT License; the full text is printed in Appendix D, in Volume 6. You may use, copy, modify and share this material, including in your own courses and projects, as long as the copyright and license notice are kept.</p>
    <p>Everything here is provided "as is", without warranty of any kind. Run the labs in sandboxes. Read the cost warnings before using a real cloud account, and finish each lab with its teardown steps. Commands that change systems can cause damage or charges; you are responsible for where you run them.</p>
    <p>Product and company names are trademarks of their respective owners and are used here only to identify and teach their technology. Their use implies no affiliation or endorsement. Tool icons in the author portrait are from Devicon (MIT licence).</p>
    <p>Tools change quickly. Command output in this book is illustrative, and version numbers will age. When in doubt, check the official documentation named in each chapter's further reading.</p>
    <p>Source: github.com/mascot200/devops-roadmap${commit ? `, typeset from commit ${esc(commit)}` : ''}.<br>First edition, ${year}.</p>
  </div>`);
}

export function epigraph() {
  return page(`<div class="centerpage"><div style="font:800 19pt/1.24 Inter;letter-spacing:-.5pt;max-width:4.7in">Do not aim to become the person who knows 50 DevOps tools.</div>
    <div style="font:800 19pt/1.24 Inter;letter-spacing:-.5pt;color:#8A6A00;max-width:4.7in;margin-top:12pt">Aim to become the engineer who can take a software application and independently make it production-ready.</div>
    <div style="font:600 9.4pt/1.5 Inter;margin-top:17pt;color:#333A47">Secure, observable, scalable, highly available, automatically deployable, recoverable, and cost-efficient.</div></div>`);
}

function qualitiesFigure() {
  const q = ['Secure', 'Observable', 'Scalable', 'Highly available', 'Automatically deployable', 'Recoverable', 'Cost-efficient'];
  const cols = ['#FF8FB1', '#6EC1FF', '#7EE29B', '#B79CFF', '#FF9F45', '#FF7F6B', '#5FD6C9'];
  const cx = 215; const cy = 118; const rx = 165; const ry = 92;
  let o = '';
  q.forEach((t, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7; const x = cx + rx * Math.cos(a); const y = cy + ry * Math.sin(a);
    o += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#14171F" stroke-width=".9"/>`;
  });
  q.forEach((t, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7; const x = cx + rx * Math.cos(a); const y = cy + ry * Math.sin(a);
    const w = 16 + t.length * 4.25;
    o += `<rect x="${x - w / 2 + 1.6}" y="${y - 10.4}" width="${w}" height="21" rx="5" fill="#14171F"/><rect x="${x - w / 2}" y="${y - 12}" width="${w}" height="21" rx="5" fill="${cols[i]}" stroke="#14171F" stroke-width="1"/>`;
    o += `<text x="${x}" y="${y + 1.6}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="7.6" fill="#14171F">${t}</text>`;
  });
  o += `<circle cx="${cx}" cy="${cy}" r="39" fill="#FFD23F" stroke="#14171F" stroke-width="1.4"/><text x="${cx}" y="${cy - 2}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="9.4">Production-</text><text x="${cx}" y="${cy + 9}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="9.4">ready</text>`;
  return `<figure class="diagram"><svg viewBox="0 0 430 236" style="width:5.4in;height:auto;display:block;margin:0 auto">${o}</svg><figcaption>The seven qualities every level of this book works toward</figcaption></figure>`;
}

export function preface() {
  return page(`<h1 class="t">Preface</h1>
  <p class="lead">Most DevOps roadmaps are lists of tools. Tick off Docker, tick off Kubernetes, tick off Terraform, and you are supposedly done. Then a real system goes down at 3 a.m. and the list is no help at all.</p>
  <p>This book takes a different view of the job. Tools change every few years. What does not change is the standard a production system has to meet, and the judgement it takes to get there. So the whole book climbs toward one ability: to pick up an application you have never seen and independently make it production-ready.</p>
  ${qualitiesFigure()}
  <h2>What you are holding</h2>
  <p>This is the complete text of the open-source <b>DevOps Roadmap: Beginner to Senior</b>, set down in six volumes. It has twenty-one levels, 248 topic chapters, twenty-one capstone projects and nine larger projects that chain the levels into one evolving production system. Nothing from the repository has been left out or summarised. If you prefer a screen, the repository and this book say the same thing.</p>
  <p>It is written for two kinds of reader. If you are starting out, it gives you an order to learn things in and a way to know that you have actually learned them. If you already work in the field, it is a reference you can open at any level to close a gap, with enough depth to explain why things behave as they do.</p>
  <h2>How it teaches</h2>
  <p>Every topic has the same shape, so you always know where to look. It says what the thing is and why it matters in production, shows it in a real-world system, draws the mechanism, and walks you through it step by step in a sandbox. Then a scenario shows the idea under pressure, and tasks with verifiable "done when" checks make you prove it. Reading is the smaller part of this book. The labs are where the learning happens.</p>
  <p>Almost every example builds on one sample application, <b>shop-api</b>: a Node.js API with PostgreSQL, Redis and Nginx. You will run it by hand on one server, then containerise it, automate its delivery, rebuild it as code on AWS, move it to Kubernetes, watch it, attack it, break it and recover it. Isolated tutorials cannot teach what that teaches, which is how choices interact.</p>
  <div class="pull">You do not need to know every tool. You do need to know what to look for, and how to verify what you find.</div>
  <h2>Pace yourself</h2>
  <p>This is a long climb, and it is meant to be. The time estimates are a planning aid, not a promise. Move on from a level when you can do its capstone without the guide, not when the calendar says so. Start at Base Camp, which sets out the learning order and a realistic timeline, and come back to it whenever you lose the thread.</p>`);
}

const ANATOMY = [
  ['1', 'What it is', 'A plain-English explanation, with every acronym defined on first use.'],
  ['2', 'Why it matters', 'What breaks, costs money, or wakes someone at 3 a.m. when this is misunderstood.'],
  ['3', 'Real-world system', 'How the topic shows up in a named, publicly documented system.'],
  ['4', 'Diagram', 'The real mechanism: a flow, a sequence, an architecture or a state machine.'],
  ['5', 'How it works', 'Key concepts, comparison tables and the commands that matter.'],
  ['6', 'Step-by-step guide', 'A lab you can type in a sandbox, with what to look for at each step.'],
  ['7', 'Real-world scenario', 'A short story under pressure: symptom, investigation, fix, lesson.'],
  ['8', 'Mistakes and practices', 'Two short lists: what not to do, and what to do.'],
  ['9', 'Tasks', 'Hands-on work, easiest first, each with a "done when" check. The last says Prove it.'],
  ['10', 'Self-check', 'Questions a senior engineer would expect you to answer without notes.'],
  ['11', 'Further reading', 'Official documentation and well-known books.'],
];
const GROUPS = [['Understand', '#6EC1FF', 0, 5], ['Do', '#7EE29B', 5, 8], ['Prove', '#FFD23F', 8, 11]];

export function howToRead() {
  const groups = GROUPS.map(([g, c, a, b]) => `<div style="display:flex;gap:8pt;margin-bottom:7pt;break-inside:avoid"><div style="flex:none;width:17pt;border:1.2pt solid #14171F;border-radius:4pt;background:${c};display:flex;align-items:center;justify-content:center"><span style="writing-mode:vertical-rl;transform:rotate(180deg);font:900 7.6pt/1 Inter;letter-spacing:1.4pt;text-transform:uppercase">${g}</span></div>
    <div style="flex:1">${ANATOMY.slice(a, b).map(([n, t, d]) => `<div style="display:flex;gap:7pt;align-items:baseline;border-bottom:.5pt solid #D9DDE5;padding:3pt 0"><span style="flex:none;width:13pt;font:900 8pt/1 Inter;text-align:right;color:#475063">${n}</span><span style="flex:none;width:1.28in;font:700 8pt/1.2 Inter">${t}</span><span style="font:400 7.7pt/1.3 Inter;color:#333A47">${d}</span></div>`).join('')}</div></div>`).join('');
  return page(`<h1 class="t">How to Read This Book</h1>
  <h2>The anatomy of a chapter</h2>
  <p>All 248 topic chapters follow the same eleven sections, which fall into three movements. Appendix A, in Volume 6, prints the template that every chapter was written against.</p>
  <figure class="diagram" style="text-align:left">${groups}<figcaption style="text-align:center">The eleven sections of every topic chapter</figcaption></figure>
  <p>Each level opens with an overview of its goal, recommended time and topics, and closes with a <b>capstone project</b> marked with a star, which pulls all of that level's topics together.</p>
  <h2>Conventions used in print</h2>
  <ul>
  <li><b>Cross-references.</b> Where the repository has a hyperlink, this book prints a small tag after the words: <a class="ref">Docker Compose<sup>§4.8</sup></a> means Level 4, topic 8. Running heads carry the same numbers, so you can flip straight to it. In a PDF the tags are clickable when the target is in the same volume.</li>
  <li><b>Check-boxes.</b> Every task has a box to tick with a pencil. Where the text mentions changing <code>- [ ]</code> to <code>- [x]</code>, that is the same idea for readers who keep their progress in a fork of the repository.</li>
  <li><b>Answers.</b> On GitHub the self-check answers are folded away. In print they sit in a shaded box straight after the questions, so cover it with a card and answer first.</li>
  <li><b>Code.</b> Long lines wrap, and the continuation is indented. Type a wrapped line as one line. Output is illustrative and yours may differ in the details.</li>
  <li><b>Diagrams.</b> A few wide diagrams are printed sideways. Turn the book clockwise to read them.</li>
  <li><b>Lab notes.</b> Chapters start on a right-hand page, and any left-hand page this leaves empty is ruled for your notes. Use them. For each task, write what you ran and what you saw. Explaining output is the skill.</li>
  </ul>
  <h2>Stay safe, and keep it cheap</h2>
  <p>Use disposable sandboxes: local virtual machines, Docker, kind or minikube, LocalStack, or a small VPS. Anything that can cost money says so and ends with teardown steps. Never practise on a system you cannot afford to lose.</p>`);
}

function mapRow(lv, name, pages, pid) {
  const t = LEVEL_TIME[lv] || {};
  return `<div style="display:flex;align-items:center;gap:7pt;padding:.6pt 0;border-bottom:.45pt solid #E4E7EC">
    <span style="flex:none;width:17pt;height:13pt;border:1pt solid #14171F;border-radius:3pt;background:${colourOf(lv)};display:flex;align-items:center;justify-content:center;font:900 8pt/1 Inter">${lv}</span>
    <span style="flex:1;font:700 8.4pt/1.1 Inter">${esc(name)}</span>
    <span style="font:500 7.1pt/1 Inter;color:#475063;width:1.25in">${esc(t.time || '')}</span>
    <span style="font:500 7.1pt/1 Inter;color:#475063;width:.55in">${t.topics || ''} topics</span>
    <span style="font:800 7.6pt/1 Inter;width:.36in;text-align:right">${pages && pages[pid] ? pages[pid] : ''}</span></div>`;
}

export function mapPage(pages, levelNames, levelIds) {
  const sections = PARTS.filter((p) => p.levels.length).map((p) => `<div style="margin-bottom:4.5pt;break-inside:avoid"><div style="font:800 6.8pt/1 Inter;letter-spacing:.8pt;text-transform:uppercase;color:${p.deep};margin-bottom:1.5pt">${esc(p.label)}: ${esc(p.title)}</div>
    ${p.levels.map((lv) => mapRow(lv, levelNames[lv], pages, levelIds[lv])).join('')}</div>`).join('');
  return page(`<h1 class="t" style="margin-bottom:6pt;font-size:19pt;padding-bottom:6pt">The Whole Climb on One Page</h1>
    <div style="margin:0 0 7pt">${stairs({ w: 408, h: 34, labels: false, stroke: '#14171F', topPad: 0.3, minFrac: 0.14 })}</div>
    ${sections}
    <div style="font:500 6.8pt/1.28 Inter;color:#333A47">Level numbers follow the roadmap document; the recommended learning order differs slightly (see Base Camp). The nine Summit Projects in Part X then chain the levels into one system.</div>`);
}

export function contentsAtGlance(pages, partMeta) {
  const rows = PARTS.map((p) => {
    const m = partMeta[p.id] || {};
    return `<div style="display:flex;align-items:center;gap:10pt;padding:1.1pt 0;border-bottom:.6pt solid #D9DDE5"><span style="flex:none;width:9pt;height:24pt;background:${p.accent};border:1pt solid #14171F;border-radius:2pt"></span>
    <span style="flex:1"><span style="font:800 6.8pt/1 Inter;letter-spacing:.8pt;text-transform:uppercase;color:${p.deep}">${esc(p.label)}</span><br><span style="font:800 9.6pt/1.16 Inter">${esc(p.title)}</span><br><span style="font:400 7.2pt/1.1 Inter;color:#475063">${esc(m.summary || '')}</span></span>
    <span style="font:800 10pt/1 Inter">${pages[`_parts/${p.id}`] || ''}</span></div>`;
  }).join('');
  return page(`<h1 class="t" style="margin-bottom:6pt;padding-bottom:7pt;font-size:21pt">Contents at a Glance</h1>${rows}`);
}

export function contents(entries, pages, title = 'Contents') {
  const line = (cls, label, t, pg) => `<div class="tl ${cls}"><span class="nn">${esc(label)}</span><span class="tt">${esc(t)}</span><span class="pp">${pg || ''}</span></div>`;
  const body = entries.map((e) => line(e.cls, e.label, e.title, pages[e.id])).join('');
  return page(`<h1 class="t">${esc(title)}</h1>${body}`, `
  .tl { display: flex; align-items: baseline; gap: 6pt; font: 400 8.2pt/1.5 Inter; }
  .tl .nn { flex: none; width: 27pt; color: #5B6270; font-weight: 600; font-size: 7.4pt; }
  .tl .tt { flex: 1; }
  .tl .pp { flex: none; font-weight: 600; font-size: 7.8pt; }
  .tl.part { margin: 13pt 0 4pt; padding: 5pt 7pt; background: #14171F; color: #fff; border-radius: 3pt; font-weight: 800; font-size: 9.2pt; break-after: avoid; }
  .tl.part .nn { width: auto; color: #FFD23F; font-size: 7.2pt; letter-spacing: .6pt; text-transform: uppercase; }
  .tl.level { margin-top: 7pt; font-weight: 800; font-size: 9pt; border-bottom: .6pt solid #14171F; break-after: avoid; }
  .tl.level .nn { color: #14171F; font-size: 8.4pt; font-weight: 800; }
  .tl.cap .nn { color: #8A6A00; }`);
}

export function partOpener(p, items, extra = '') {
  const focus = p.levels.length ? p.levels : null;
  const art = stairs({ w: 380, h: 112, labels: false, focus, flag: !p.levels.length || p.id === 'part-9', stroke: '#0B0E18', dim: '#2A3145', topPad: 0.26 });
  const list = items.map((it) => `<div style="display:flex;gap:9pt;align-items:baseline;padding:4pt 0;border-bottom:.55pt solid #D9DDE5"><span style="flex:none;min-width:25pt;font:900 9.6pt/1 Inter;color:${p.deep}">${esc(it.tag)}</span><span style="flex:1;font:700 9pt/1.25 Inter">${esc(it.title)}</span>${it.note ? `<span style="font:500 7.4pt/1.2 Inter;color:#475063;white-space:nowrap">${esc(it.note)}</span>` : ''}<span style="font:800 8.4pt/1 Inter;min-width:24pt;text-align:right">${it.page || ''}</span></div>`).join('');
  return wrap(`<div style="background:radial-gradient(120% 110% at 90% 0%, #262B5E 0%, #12172F 55%, #0B0E18 100%);color:#fff;border-radius:10pt;padding:22pt 20pt 16pt;margin-bottom:15pt;overflow:hidden">
      <div style="font:800 9pt/1 Inter;letter-spacing:2.2pt;text-transform:uppercase;color:${p.accent}">${esc(p.label)}</div>
      <div style="font:900 31pt/1.03 Inter;letter-spacing:-1.1pt;margin:10pt 0 11pt;hyphens:manual">${esc(p.title)}</div>
      <div style="font:400 11pt/1.4 'Source Serif';color:#E4E7F0;margin-bottom:15pt">${esc(p.blurb)}</div>
      ${art}
    </div>
    <div style="font:800 7.4pt/1 Inter;letter-spacing:1pt;text-transform:uppercase;color:${p.deep};margin:0 0 4pt">In this part</div>${list}${extra}`, p, '', AUTHORED_CSS);
}

// Part X: how the single system grows, project by project.
export function projectsFigure(rows) {
  const cols = ['#6EC1FF', '#7EE29B', '#FFD23F', '#FF9F45', '#B79CFF', '#FF8FB1', '#5FD6C9', '#FF7F6B', '#E3B7FF'];
  const out = rows.map((r, i) => `<div style="display:flex;align-items:stretch;margin-left:${(8 - i) * 0}pt"><div style="flex:none;width:${16 + i * 18}pt;background:${cols[i]};border:1pt solid #14171F;border-right:0;border-radius:3pt 0 0 3pt;font:900 7.6pt/1 Inter;display:flex;align-items:center;justify-content:flex-end;padding-right:3pt">P${r.n}</div><div style="flex:1;border:1pt solid #14171F;border-radius:0 3pt 3pt 0;padding:2.6pt 6pt;font:500 6.9pt/1.2 Inter;background:#fff">${esc(r.what)}</div></div>`).join('<div style="height:2.2pt"></div>');
  return `<figure class="diagram" style="margin-top:11pt;text-align:left"><div style="font:800 7.4pt/1 Inter;letter-spacing:1pt;text-transform:uppercase;color:#8A6A00;margin-bottom:5pt">One system, nine stages of growth</div>${out}</figure>`;
}

export function indexPage(entries) {
  const groups = {};
  for (const e of entries) { const k = /^[a-z]/i.test(e.term) ? e.term[0].toUpperCase() : '#'; (groups[k] ||= []).push(e); }
  const html = Object.keys(groups).sort().map((k) => `<div class="ig"><div class="il">${k === '#' ? 'Symbols' : k}</div>${groups[k].map((e) => `<div class="ie">${esc(e.term)}<span class="ip"> ${e.pages.join(', ')}</span></div>`).join('')}</div>`).join('');
  return page(`<h1 class="t">Index</h1><p style="font:400 8.2pt/1.4 Inter;color:#333A47;margin-bottom:9pt">Page numbers point to where a term is defined or discussed in depth. Numbers run continuously through all six volumes; the print-set page at the front of each volume shows which pages it holds.</p><div class="cols">${html}</div>`, `
  .cols { column-count: 3; column-gap: 11pt; font: 400 6.9pt/1.3 Inter; hyphens: manual; }
  .il { font: 900 12pt/1 Inter; color: #8A6A00; margin: 7pt 0 3pt; break-after: avoid; }
  .ie { padding-left: 7pt; text-indent: -7pt; margin-bottom: 1pt; break-inside: avoid; }
  .ip { color: #475063; font-weight: 600; }`);
}

export function aboutAuthor() {
  return page(`<h1 class="t">About the Author</h1>
    <div style="display:flex;gap:17pt;align-items:flex-start"><img src="${portrait}" style="width:2.1in;border-radius:9pt;flex:none">
    <div><div style="font:900 18pt/1.1 Inter;letter-spacing:-.4pt;margin-bottom:5pt">Ubong Eduok</div>
    <div style="font:600 9pt/1.35 Inter;color:#8A6A00;margin-bottom:10pt">Author and instructor, DevOps Roadmap: Beginner to Senior</div>
    <p>Ubong Eduok created the DevOps Roadmap, the open-source, hands-on curriculum that this book sets in print, along with its companion <b>devops-deploy-toolkit</b> for deploying real applications with an AI pair-deployer.</p>
    <p>The roadmap is free to read and released under the MIT License, so that anyone can use it, including in their own courses and projects.</p>
    <p style="font:600 8.6pt/1.6 Inter">GitHub: github.com/mascot200<br>Roadmap: github.com/mascot200/devops-roadmap<br>Toolkit: github.com/mascot200/devops-deploy-toolkit</p></div></div>`);
}

export function colophon(commit, stats) {
  return page(`<div class="centerpage" style="justify-content:flex-end"><div class="kicker" style="color:#8A6A00">Colophon</div>
    <div style="font:400 8.7pt/1.5 'Source Serif';color:#333A47">
    <p>This book is set in Source Serif 4 for the text, Inter for headings, tables and diagrams, and JetBrains Mono for code, with DejaVu Sans and Noto Emoji supplying a few symbols. All are open-licensed typefaces. Trim size is 7.5 by 9.25 inches.</p>
    <p>It was typeset directly from the Markdown of the repository${commit ? ` at commit ${esc(commit)}` : ''}, so the book and the repository can be kept in step. The ${stats ? esc(stats.figures) : ''} diagrams were drawn from their Mermaid sources as vector art. The staircase motif has one step for each of the twenty-one levels. The typesetting toolchain is in the <code>book/</code> folder of the repository, and you can rebuild the whole book from it with a single command.</p>
    </div></div>`);
}
