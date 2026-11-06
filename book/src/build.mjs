// Full build: node src/build.mjs   (needs Chrome, npm install, and book/.venv with requirements.txt)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { BOOK, REPO, PARTS, buildManifest, xrefLabel } from './manifest.mjs';
import { chapterHtml, indexManifest, launch, renderPdf, BUILD } from './render.mjs';
import * as F from './frontmatter.mjs';
import { fullSpread } from './covers.mjs';

const py = (cmd) => execFileSync(path.join(BOOK, '.venv/bin/python'), [path.join(BOOK, 'src/build.py'), cmd], { stdio: 'inherit' });
const commit = execFileSync('git', ['rev-parse', '--short', 'main'], { cwd: REPO }).toString().trim();
const manifest = buildManifest(); const byRel = indexManifest(manifest);
const partById = Object.fromEntries(PARTS.map((p) => [p.id, p]));
fs.mkdirSync(BUILD, { recursive: true });
const pagesFile = path.join(BUILD, 'pages.json');
const loadPages = () => (fs.existsSync(pagesFile) ? JSON.parse(fs.readFileSync(pagesFile, 'utf8')) : {});

const browser = await launch();
async function pool(jobs, size = 6) {
  let i = 0; const out = {};
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < jobs.length) { const [id, html] = jobs[i++]; out[id] = await renderPdf(browser, html, id); }
  }));
  return out;
}

const tagOf = (c) => ({ topic: c.num, level: `Level ${c.num}`, capstone: `Capstone ${c.num}`, project: `Project ${c.num}`, appendix: `Appendix ${c.num}` }[c.kind] || '');
function partItems(p, pages) {
  return manifest.filter((c) => c.part === p.id && c.kind !== 'topic' && c.kind !== 'capstone').map((c) => {
    const lv = c.level; return {
      tag: c.kind === 'level' ? `${lv}` : c.kind === 'project' ? `P${c.num}` : c.kind === 'appendix' ? c.num : '·',
      title: c.kind === 'level' ? c.levelTitle : (c.short || c.displayTitle || c.title).replace(/^Project \d+\s*[—-]\s*/, ''),
      page: pages[c.id] || '',
    };
  });
}

async function renderBody(pages) {
  const jobs = manifest.map((c) => [c.id, chapterHtml(c, byRel, pages).html]);
  for (const p of PARTS) {
    let extra = '';
    if (p.id === 'part-10') {
      const src = fs.readFileSync(path.join(REPO, 'projects/README.md'), 'utf8');
      const rows = [...src.matchAll(/^\| (\d) \| \[[^\]]+\]\([^)]+\) \| ([^|]+) \|/gm)].map((m) => ({ n: m[1], what: m[2].trim() }));
      extra = F.projectsFigure(rows);
    }
    jobs.push([`_parts/${p.id}`, F.partOpener(p, partItems(p, pages), extra)]);
  }
  const r = await pool(jobs);
  const reportFile = path.join(BUILD, 'render-report.json');
  const prev = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
  for (const [k, v] of Object.entries(r)) if (v) prev[k] = v;
  fs.writeFileSync(reportFile, JSON.stringify(prev, null, 1));
}

function writePlan(front = {}) {
  const body = [];
  for (const p of PARTS) {
    body.push({ id: `_parts/${p.id}`, part: p.id, kind: 'part', title: p.title, tag: p.label, toc: 1, toctitle: p.num ? `${p.label}: ${p.title}` : `${p.label}: ${p.title}` });
    for (const c of manifest.filter((x) => x.part === p.id)) {
      const t = c.short || c.displayTitle || c.title;
      const tag = tagOf(c);
      body.push({ id: c.id, rel: c.rel, part: p.id, kind: c.kind, title: t, tag, toc: c.kind === 'topic' || c.kind === 'capstone' ? 3 : 2, toctitle: tag && c.kind !== 'capstone' ? `${tag}  ${t}` : (c.kind === 'capstone' ? `Capstone: ${t}` : t) });
    }
  }
  const parts = Object.fromEntries(PARTS.map((p) => [p.id, { label: p.label, title: p.title, accent: p.accent, deep: p.deep }]));
  fs.writeFileSync(path.join(BUILD, 'plan.json'), JSON.stringify({ body, parts, ...front }));
  return body;
}

// Stage 1: render, number the pages, then render again until page numbers settle.
for (const c of manifest) chapterHtml(c, byRel, {});
writePlan();
let prevPages = '';
for (let pass = 1; pass <= 4; pass += 1) {
  await renderBody(loadPages());
  py('plan');
  const now = fs.readFileSync(pagesFile, 'utf8');
  if (now === prevPages) { console.log(`page numbers stable after pass ${pass}`); break; }
  prevPages = now;
}
const pages = loadPages();

// Stage 2: index.
py('index');
const index = JSON.parse(fs.readFileSync(path.join(BUILD, 'index.json'), 'utf8'));

// Stage 3: authored pages, now that numbers are known.
const levelNames = {}; const levelIds = {};
for (const c of manifest.filter((x) => x.kind === 'level')) { levelNames[c.level] = c.levelTitle; levelIds[c.level] = c.id; }
const partMeta = Object.fromEntries(PARTS.map((p) => [p.id, { summary: p.levels.length ? p.levels.map((l) => levelNames[l]).join(' · ') : { 'base-camp': 'The roadmap, the senior mindset, learning order, timeline', 'part-10': 'Nine projects, one growing production system', appendices: 'Topic template, sharing kit, licence' }[p.id] }]));

function tocEntries(partsFilter) {
  const out = [];
  for (const p of PARTS.filter((x) => !partsFilter || partsFilter.includes(x.id))) {
    out.push({ cls: 'part', label: p.label, title: p.title, id: `_parts/${p.id}` });
    for (const c of manifest.filter((x) => x.part === p.id)) {
      const t = c.short || c.displayTitle || c.title;
      if (c.kind === 'level') out.push({ cls: 'level', label: c.num, title: t, id: c.id });
      else if (c.kind === 'topic') out.push({ cls: '', label: c.num, title: t, id: c.id });
      else if (c.kind === 'capstone') out.push({ cls: 'cap', label: '★', title: `Capstone: ${t}`, id: c.id });
      else if (c.kind === 'project') out.push({ cls: '', label: `P${c.num}`, title: t, id: c.id });
      else if (c.kind === 'appendix') out.push({ cls: '', label: c.num, title: t, id: c.id });
      else out.push({ cls: '', label: '', title: t, id: c.id });
    }
  }
  return out;
}

for (const v of F.VOLUMES) {
  const ch = manifest.filter((c) => v.parts.includes(c.part));
  v.levels = PARTS.filter((p) => v.parts.includes(p.id)).flatMap((p) => p.levels);
  const n = (k) => ch.filter((c) => c.kind === k).length;
  v.stats = [[String(n('level')), 'levels'], [String(n('topic')), 'topics'], [String(n('capstone')), 'capstones']];
  if (n('project')) v.stats.push([String(n('project')), 'projects']);
}
const seq = JSON.parse(fs.readFileSync(path.join(BUILD, 'seq.json'), 'utf8'));
const ranges = {};
for (const v of F.VOLUMES) {
  const s = seq.filter((x) => v.parts.includes(x.part));
  ranges[v.n] = [s[0].start, s[s.length - 1].start + s[s.length - 1].count - 1];
}
const figures = String([...manifest].reduce((n, c) => n + chapterHtml(c, byRel, pages).figures, 0));

const gen = {
  epigraph: F.epigraph(), preface: F.preface(), howto: F.howToRead(), map: F.mapPage(pages, levelNames, levelIds),
  glance: F.contentsAtGlance(pages, partMeta), index: F.indexPage(index), about: F.aboutAuthor(), colophon: F.colophon(commit, { figures }),
};
for (const v of F.VOLUMES) {
  gen[`v${v.n}-cover-front`] = F.coverFront(v); gen[`v${v.n}-cover-back`] = F.coverBack(v);
  gen[`v${v.n}-half`] = F.halfTitle(v); gen[`v${v.n}-set`] = F.setPage(ranges, v); gen[`v${v.n}-title`] = F.titlePage(v); gen[`v${v.n}-copy`] = F.copyright(commit, v);
  gen[`v${v.n}-toc`] = F.contents(tocEntries(v.parts), pages, `Contents of Volume ${v.n}`);
}
await pool(Object.entries(gen).map(([k, h]) => [`_gen/${k}`, h]));

const vols = F.VOLUMES.map((v) => ({ n: v.n, title: v.title, parts: v.parts,
  front: [[`v${v.n}-half`, 'plain', null], [`v${v.n}-set`, 'plain', null], [`v${v.n}-title`, 'plain', 'Title page'], [`v${v.n}-copy`, 'plain', 'Copyright'], ['epigraph', 'plain', null], [null, 'blank', null],
    ...(v.n === 1 ? [['preface', 'roman', 'Preface']] : []), ['howto', 'roman', 'How to Read This Book'], ['map', 'roman', 'The Whole Climb on One Page'], ...(v.n === 1 ? [['glance', 'roman', 'Contents at a Glance']] : []), [`v${v.n}-toc`, 'roman', `Contents of Volume ${v.n}`]],
  back: v.n === 6 ? [['index', 'arabic', 'Index'], ['about', 'arabic', 'About the Author'], ['colophon', 'arabic', 'Colophon']] : [['about', 'plain', 'About the Author'], ['colophon', 'plain', 'Colophon']] }));
writePlan({ volumes: vols });
const plan = JSON.parse(fs.readFileSync(path.join(BUILD, 'plan.json'), 'utf8')); 

// Stage 4: stamp the per-page PDFs and assemble the six volumes.
py('stamp');
py('front');
py('assemble');

// Stage 5: wraparound print covers, spine sized from each volume's real page count.
const volPages = JSON.parse(fs.readFileSync(path.join(BUILD, 'vol-pages.json'), 'utf8'));
for (const v of F.VOLUMES) {
  const { html, width, height } = fullSpread(v, volPages[v.n]);
  const f = path.join(BUILD, 'html', `_cover-v${v.n}.html`); fs.writeFileSync(f, html);
  const page = await browser.newPage();
  await page.goto('file://' + f, { waitUntil: 'networkidle0' }); await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(BOOK, 'dist/print', `Volume-${v.n}-cover.pdf`), width: `${width}pt`, height: `${height}pt`, printBackground: true, pageRanges: '1' });
  await page.close();
}
await browser.close();
console.log('done');
