// Markdown -> styled HTML -> PDF (one PDF per chapter) using headless Chrome.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import puppeteer from 'puppeteer-core';
import { BOOK, REPO, PARTS, buildManifest, xrefLabel } from './manifest.mjs';

export const BUILD = path.join(BOOK, 'build');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const nm = (p) => 'file://' + path.join(BOOK, 'node_modules', p);
const partOf = Object.fromEntries(PARTS.map((p) => [p.id, p]));

hljs.registerLanguage('hcl', () => ({
  name: 'hcl',
  contains: [
    hljs.HASH_COMMENT_MODE, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, hljs.QUOTE_STRING_MODE, hljs.NUMBER_MODE,
    { className: 'keyword', begin: /^\s*(resource|data|variable|output|module|provider|terraform|locals|moved|import|backend|required_providers)\b/ },
    { className: 'attr', begin: /\b[a-zA-Z_][\w-]*(?=\s*=[^=])/ },
    { className: 'literal', begin: /\b(true|false|null)\b/ },
  ],
}));
const ALIAS = { js: 'javascript', sh: 'bash', shell: 'bash', yml: 'yaml', docker: 'dockerfile', promql: null, logql: null, rego: null, alloy: 'hcl', text: null };

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Split highlighted HTML into lines, closing and reopening spans across the line break.
function linesOf(html) {
  const out = []; let cur = ''; const open = [];
  for (const tok of html.split(/(<span[^>]*>|<\/span>|\n)/)) {
    if (tok === '\n') { out.push(cur + '</span>'.repeat(open.length)); cur = open.join(''); }
    else if (tok.startsWith('<span')) { open.push(tok); cur += tok; }
    else if (tok === '</span>') { open.pop(); cur += tok; }
    else cur += tok;
  }
  if (cur !== '' && cur !== open.join('')) out.push(cur + '</span>'.repeat(open.length));
  return out;
}

function codeBlock(src, lang) {
  const l = (lang || '').trim().split(/\s+/)[0].toLowerCase();
  const mapped = l in ALIAS ? ALIAS[l] : l;
  const body = mapped && hljs.getLanguage(mapped) ? hljs.highlight(src.replace(/\n$/, ''), { language: mapped, ignoreIllegals: true }).value : esc(src.replace(/\n$/, ''));
  const lines = linesOf(body);
  const tag = l && l !== 'text' ? `<span class="tag">${esc(l)}</span>` : '';
  return `<pre class="${lines.length <= 14 ? 'short' : ''}">${tag}<code>${lines.map((x) => `<span class="ln">${x || ' '}</span>`).join('')}</code></pre>\n`;
}

let figN = 0;
const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
md.renderer.rules.fence = (tokens, i) => {
  const t = tokens[i]; const info = t.info.trim();
  if (info.split(/\s+/)[0] === 'mermaid') {
    figN += 1;
    return `<figure class="diagram" data-fig="${figN}"><pre class="mermaid-src" style="display:none">${esc(t.content)}</pre></figure>\n`;
  }
  return codeBlock(t.content, info);
};
md.renderer.rules.code_block = (tokens, i) => codeBlock(tokens[i].content, '');
md.renderer.rules.table_open = () => '<div class="tw"><table>';
md.renderer.rules.table_close = () => '</table></div>';

export function indexManifest(manifest) {
  const byRel = {}; for (const c of manifest) byRel[c.rel] = c;
  return byRel;
}

function rewriteLinks(html, chap, byRel, pages) {
  const dir = path.posix.dirname(chap.rel);
  return html.replace(/<a href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (m, href, rest, text) => {
    const h = href.replace(/&amp;/g, '&');
    if (/^https?:/.test(h)) {
      const bare = h.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const shown = text.replace(/<[^>]+>/g, '').trim();
      if (shown === h || shown === bare || shown.replace(/^https?:\/\//, '').replace(/\/$/, '') === bare) return `<a href="${href}">${text}</a>`;
      return `<a class="ext" href="${href}" data-url="${esc(bare)}">${text}</a>`;
    }
    const [p, frag] = h.split('#');
    if (!p) return text; // same-page fragment
    const clean = p.split('?')[0];
    const target = path.posix.normalize(path.posix.join(dir, clean));
    const c = byRel[target];
    if (c) {
      const label = xrefLabel(c);
      const already = text.replace(/<[^>]+>/g, '').includes(label.replace('§', '')) || c.kind === 'guide';
      return `<a class="ref" href="https://xref.book/${encodeURI(c.id)}">${text}${already ? '' : `<sup>${label}</sup>`}</a>`;
    }
    if (/\.(png|pdf|jpg|svg)$/i.test(clean) || /raw=true/.test(p)) return `<span class="file">${text}</span>`;
    console.warn(`  unresolved link in ${chap.rel}: ${href}`);
    return text;
  });
}

function chipsFrom(line) {
  return line.split(/\s*·\s*/).map((s) => s.replace(/\*\*/g, '').replace(/⏱\s*/, '').trim()).filter(Boolean);
}

// Pull the title and metadata line off the top of a chapter; the design displays them.
function splitHead(src) {
  let body = src.replace(/\r\n/g, '\n');
  body = body.replace(/\n<!-- nav -->[\s\S]*$/, '\n');
  body = body.replace(/<!--[\s\S]*?-->/g, '');
  body = body.replace(/\n---\n(?:← |\[.*(?:index|home|Roadmap)).*(?:\n.*)?\s*$/, '\n');
  body = body.replace(/\n\[← [^\n]*\]\([^\n]*\)\s*$/, '\n');
  // A pipe inside inline code in a table row would otherwise split the cell and lose text.
  body = body.replace(/^\|.*\|\s*$/gm, (row) => row.replace(/`[^`\n]*`/g, (code) => code.replace(/(?<!\\)\|/g, '\\|')));
  const t = body.match(/^#\s+(.+)\n+/);
  const title = t ? t[1].trim() : '';
  if (t) body = body.slice(t.index + t[0].length);
  let meta = '';
  const q = body.match(/^>\s*(.+)\n+/);
  if (q && /·|\*\*Goal/.test(q[1])) { meta = q[1].trim(); body = body.slice(q[0].length); }
  return { title, meta, body };
}

function polish(html, chap) {
  return html
    .replace(/<li>\s*(<p>)?\s*\[( |x)\]\s*/g, (m, p) => `<li class="task">${p || ''}`)
    .replace(/<details>\s*/g, '<div class="answers">').replace(/<\/details>/g, '</div>')
    .replace(/<summary>([\s\S]*?)<\/summary>/g, '<div class="answers-label">$1</div>')
    .replace(/<h2 id="[^"]*">/g, '<h2>')
    .replace(/<h2>(\d+)\.\s+/g, '<h2><span class="sn">$1</span> ')
    .replace(/<table>\s*<thead>\s*<tr>\s*(<th[^>]*>\s*<\/th>\s*)+<\/tr>\s*<\/thead>/g, '<table class="kv">')
    .replace(/&lt;br\s*\/?&gt;/g, (m) => m);
}

function displayTitle(chap, title) {
  return title
    .replace(/^L\d+\.\d+\s*[—-]\s*/, '')
    .replace(/^L\d+ Capstone\s*[—-]\s*/, '')
    .replace(/^Level \d+\s*[—-]\s*/, '')
    .replace(/^Project \d+\s*[—-]\s*/, '');
}

function head(chap, title, meta) {
  const name = displayTitle(chap, title);
  chap.displayTitle = name;
  const chips = chipsFrom(meta);
  if (chap.kind === 'topic') {
    const lead = chips.shift();
    return `<header class="chead"><div class="kicker">${esc(lead || `Level ${chap.level}: ${chap.levelTitle}`)}</div>
      <div class="row"><div class="numtile">${chap.num}</div><h1>${esc(name)}</h1></div>
      <div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div></header>`;
  }
  if (chap.kind === 'capstone') {
    const lead = chips.shift();
    return `<header class="chead"><div class="kicker">${esc(lead || '')}</div>
      <div class="row"><div class="numtile">★</div><h1>${esc(name)}</h1></div>
      <div class="chips"><span class="chip lead">Level ${chap.num} capstone</span>${chips.filter((c) => c !== 'Capstone').map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div></header>`;
  }
  if (chap.kind === 'project') {
    return `<header class="chead"><div class="kicker">The Summit Projects</div>
      <div class="row"><div class="numtile">P${chap.num}</div><h1>${esc(name)}</h1></div>
      <div class="chips">${chips.map((c, i) => `<span class="chip ${i ? '' : 'lead'}">${esc(c)}</span>`).join('')}</div></header>`;
  }
  if (chap.kind === 'appendix') {
    return `<header class="chead"><div class="kicker">Appendix ${chap.num}</div><div class="row"><div class="numtile">${chap.num}</div><h1>${esc(name)}</h1></div></header>`;
  }
  const kick = partOf[chap.part].label;
  return `<header class="chead"><div class="kicker">${esc(kick)}</div><h1>${esc(chap.short || name)}</h1>
    ${chap.short ? `<div class="chips"><span class="chip">${esc(name)}</span></div>` : ''}
    ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}</header>`;
}

// Level overview: goal and stats go in a designed head; the Topic flow chain becomes a numbered trail.
function levelPage(chap, title, meta, body, byRel, pages) {
  const goal = meta.replace(/^\*\*Goal:\*\*\s*/, '');
  chap.displayTitle = displayTitle(chap, title);
  const stats = {};
  const statTable = body.match(/^\|\s*\|\s*\|\n\|[-| ]+\|\n((?:\|.*\n)+)/m);
  if (statTable) {
    for (const row of statTable[1].trim().split('\n')) {
      const [, k, v] = row.split('|').map((s) => s.trim());
      stats[k.replace(/\*\*/g, '')] = v;
    }
    body = body.replace(statTable[0], '');
  }
  const flow = body.match(/## Topic flow\s*\n+```mermaid\n([\s\S]*?)```/);
  let trail = '';
  if (flow) {
    const nodes = [...flow[1].matchAll(/^\s*T(\d+)\["\d+\.\s*(.+?)"\]/gm)].map((n) => [n[1], n[2]]);
    const cap = /CAP\(\[/.test(flow[1]);
    trail = `<div class="snake">${nodes.map(([n, t]) => `<div class="s"><b>${n}</b>${esc(t)}</div>`).join('')}${cap ? '<div class="s cap"><b>★</b>Capstone</div>' : ''}</div>`;
    body = body.replace(flow[0], '## Topic flow\n\n@@TRAIL@@');
  }
  const statHtml = Object.entries(stats).map(([k, v]) => `<div class="stat ${/capstone/i.test(k) ? 'wide' : ''}"><div class="k">${esc(k)}</div><div class="v">${md.renderInline(v)}</div></div>`).join('');
  const html = md.render(body).replace('<p>@@TRAIL@@</p>', trail);
  return `<header class="level-head"><div class="ln">${chap.num}</div><div class="lk">Level ${chap.num} · ${esc(partOf[chap.part].label)}</div>
    <h1>${esc(chap.displayTitle)}</h1><p class="goal"><b style="color:var(--accent)">Goal:</b> ${esc(goal)}</p><div class="steps-bar"></div></header>
    <div class="stat3">${statHtml}</div>${html}`;
}

// The two HTML-table files get print equivalents of their GitHub-only layouts.
function specialCases(chap, body) {
  if (chap.rel === 'README.md') {
    body = body.replace(/<table>[\s\S]*?<\/td>\s*<\/tr>\s*<\/table>/, () =>
      `<img class="portrait" src="file://${REPO}/docs/images/ubong-eduok.png" alt="Portrait of Ubong Eduok with the DevOps tools taught in this course">\n\n### Your instructor: Ubong Eduok\n\n**Author and instructor - DevOps Roadmap: Beginner to Senior**\n\nGitHub: [@mascot200](https://github.com/mascot200)\n\n<div style="clear:both"></div>\n`);
    body = body.replace(/^## Your Instructor\s*\n/m, '');
  }
  if (chap.rel === 'docs/images/social/carousel/README.md') {
    const cells = [...body.matchAll(/<img src="(slide-[^"]+)"[^>]*alt="([^"]+)"/g)];
    const d = path.join(REPO, 'docs/images/social/carousel');
    const gal = cells.map((m, i) => `<figure><img src="file://${d}/${m[1]}" alt="${m[2]}">${i + 1}. ${m[2].replace(/^Slide \d+:\s*/, '')}<br><span style="font-weight:400;color:#5B6270">${m[1]}</span></figure>`).join('');
    body = body.replace(/<table>[\s\S]*?<\/table>/, () => `<div class="gallery">${gal}</div>`);
    body = body.replace(/\*\*How to download one slide:\*\*.*\n.*\n/, (m) => m);
    const s = path.join(REPO, 'docs/images/social');
    body = body.trimEnd() + `\n\n<img class="wideimg" src="file://${s}/devops-roadmap-share-1200x630.png" alt="Landscape share image">\n<div class="imgcap">Landscape share image, 1200x630 (devops-roadmap-share-1200x630.png)</div>\n\n<img class="wideimg" style="width:62%;margin-left:19%" src="file://${s}/devops-roadmap-square-1080x1080.png" alt="Square share image">\n<div class="imgcap">Square share image, 1080x1080 (devops-roadmap-square-1080x1080.png)</div>\n`;
  }
  return body;
}

export function chapterHtml(chap, byRel, pages = {}) {
  figN = 0;
  const part = partOf[chap.part];
  let content;
  if (chap.rel === 'LICENSE') {
    chap.displayTitle = 'MIT License';
    content = head(chap, 'MIT License', '') + `<pre class="license">${esc(fs.readFileSync(path.join(REPO, 'LICENSE'), 'utf8'))}</pre>`;
  } else {
    const { title, meta, body } = splitHead(fs.readFileSync(path.join(REPO, chap.rel), 'utf8'));
    const b = specialCases(chap, body);
    if (chap.kind === 'level') content = levelPage(chap, title, meta, b, byRel, pages);
    else content = head(chap, title, meta) + md.render(b);
  }
  content = rewriteLinks(polish(content, chap), chap, byRel, pages);
  if (chap.kind === 'level') {
    // Topic table: show real page numbers in the "#" column once they are known.
    content = content.replace(/<a class="ref" href="https:\/\/xref\.book\/([^"]+)">([\s\S]*?)<sup>[^<]*<\/sup><\/a>/g, (m, id, text) => {
      const pg = pages[decodeURI(id)];
      return `<a class="ref" href="https://xref.book/${id}">${text}${pg ? ` <span class="pg">p.${pg}</span>` : ''}</a>`;
    });
  }
  return { html: wrap(content, part, chap.num), figures: figN };
}

export function fontCss() {
  const f = (fam, w, s, file) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:${s};src:url('${nm(file)}');}`;
  const inter = [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold'], [900, 'Black']];
  const out = inter.map(([w, n]) => f('Inter', w, 'normal', `inter-ui/web/Inter-${n}.woff2`));
  for (const w of [400, 600, 700]) {
    for (const st of ['normal', 'italic']) {
      for (const ss of ['latin', 'latin-ext']) {
        out.push(`@font-face{font-family:'Source Serif';font-weight:${w};font-style:${st};src:url('${nm(`@fontsource/source-serif-4/files/source-serif-4-${ss}-${w}-${st}.woff2`)}');unicode-range:${ss === 'latin' ? 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+2215' : 'U+0100-02AF'};}`);
      }
    }
  }
  for (const w of [400, 700]) {
    out.push(`@font-face{font-family:'JetBrains Mono';font-weight:${w};font-style:normal;src:url('${nm(`@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`)}');unicode-range:U+0000-00FF,U+2000-206F,U+2212;}`);
  }
  out.push(`@font-face{font-family:'JetBrains Mono';font-weight:500;font-style:normal;src:url('${nm('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2')}');unicode-range:U+0000-00FF,U+2000-206F,U+2212;}`);
  out.push(`@font-face{font-family:'JetBrains Mono';font-weight:400;font-style:italic;src:url('${nm('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff2')}');unicode-range:U+0000-00FF,U+2000-206F,U+2212;}`);
  out.push(f('DejaVu Mono', 400, 'normal', 'dejavu-fonts-ttf/ttf/DejaVuSansMono.ttf'), f('DejaVu Mono', 700, 'normal', 'dejavu-fonts-ttf/ttf/DejaVuSansMono-Bold.ttf'));
  out.push(f('DejaVu Sans', 400, 'normal', 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf'), f('DejaVu Sans', 700, 'normal', 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf'));
  for (const n of fs.readdirSync(path.join(BOOK, 'node_modules/@fontsource/noto-emoji/files')).filter((x) => /noto-emoji-\d+-400-normal\.woff2$/.test(x))) {
    out.push(f('Noto Emoji', 400, 'normal', `@fontsource/noto-emoji/files/${n}`));
  }
  return out.join('\n');
}

export function wrap(content, part, chapNum = '', extraCss = '') {
  const css = fs.readFileSync(path.join(BOOK, 'src/book.css'), 'utf8');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${fontCss()}\n${css}\n:root{--accent:${part.accent};--deep:${part.deep};}${extraCss}</style>
<script src="${nm('mermaid/dist/mermaid.min.js')}"></script><script src="file://${path.join(BOOK, 'src/diagrams.js')}"></script></head>
<body data-chap="${chapNum}">${content}</body></html>`;
}

export async function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox', '--font-render-hinting=none', '--disable-gpu'], protocolTimeout: 600000 });
}

export async function renderPdf(browser, html, id) {
  const htmlPath = path.join(BUILD, 'html', `${id}.html`);
  const pdfPath = path.join(BUILD, 'raw', `${id}.pdf`);
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true }); fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  const hash = crypto.createHash('sha1').update(html).update(fs.readFileSync(path.join(BOOK, 'src/diagrams.js'))).digest('hex');
  const stamp = pdfPath + '.hash';
  if (fs.existsSync(pdfPath) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === hash) return null;
  fs.writeFileSync(htmlPath, html);
  const page = await browser.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.setViewport({ width: 600, height: 900 });
  await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 120000 });
  const report = await page.evaluate(() => window.__bookReady);
  const overflow = await page.evaluate(() => {
    const col = document.body.getBoundingClientRect().width; const bad = [];
    document.querySelectorAll('table,pre,figure svg,img').forEach((e) => { const w = e.getBoundingClientRect().width; if (w > col + 1) bad.push(`${e.tagName} ${Math.round(w)}>${Math.round(col)}`); });
    return bad;
  });
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, tagged: false, outline: false });
  await page.close();
  fs.writeFileSync(stamp, hash);
  return { report, overflow, logs };
}
