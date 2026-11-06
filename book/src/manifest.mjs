// The table of contents of the book: every Markdown file in the repository, in reading order.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BOOK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const REPO = path.dirname(BOOK);

// accent = bright print colour, deep = text-safe shade of the same hue.
export const PARTS = [
  { id: 'base-camp', num: '', label: 'Base Camp', title: 'Before You Climb', accent: '#FFD23F', deep: '#8A6A00',
    blurb: 'What this journey is, how to pace it, and what a senior engineer actually does. Read this first, and come back whenever you lose the thread.', levels: [] },
  { id: 'part-1', num: 'I', label: 'Part I', title: 'The Ground Beneath Everything', accent: '#6EC1FF', deep: '#0B5C96',
    blurb: 'What DevOps really is, then the three skills every other level assumes: a Linux shell, a working model of the network, and Git.', levels: [0, 1, 2, 3] },
  { id: 'part-2', num: 'II', label: 'Part II', title: 'Build It, Ship It', accent: '#7EE29B', deep: '#16703A',
    blurb: 'Package software so it runs the same everywhere, then automate the road from a commit to a safe release.', levels: [4, 5] },
  { id: 'part-3', num: 'III', label: 'Part III', title: 'Cloud You Can Rebuild', accent: '#FF9F45', deep: '#A4540A',
    blurb: 'The AWS building blocks that production runs on, and the Terraform practice that turns them into reviewable, repeatable code.', levels: [6, 7] },
  { id: 'part-4', num: 'IV', label: 'Part IV', title: 'Orchestration', accent: '#B79CFF', deep: '#5A37B5',
    blurb: 'Kubernetes from the control plane up, and Helm for packaging what you run on it.', levels: [8, 9] },
  { id: 'part-5', num: 'V', label: 'Part V', title: 'See It, Secure It', accent: '#FF8FB1', deep: '#B02A5B',
    blurb: 'You cannot operate what you cannot see or defend what you do not understand. Metrics, logs, traces, and security woven through every stage.', levels: [10, 11] },
  { id: 'part-6', num: 'VI', label: 'Part VI', title: 'Under the Hood', accent: '#5FD6C9', deep: '#0F6F66',
    blurb: 'The deep systems knowledge that separates debugging from guessing: advanced networking, databases and distributed systems.', levels: [12, 13] },
  { id: 'part-7', num: 'VII', label: 'Part VII', title: 'Keep It Running', accent: '#FF7F6B', deep: '#B23A26',
    blurb: 'Reliability as an engineering discipline, and the plans and drills that bring a system back when the worst happens.', levels: [14, 15] },
  { id: 'part-8', num: 'VIII', label: 'Part VIII', title: 'Platforms at Scale', accent: '#8FA3FF', deep: '#3049B8',
    blurb: 'Advanced Kubernetes, GitOps, and the craft of building an internal platform that other engineers want to use.', levels: [16, 17, 18] },
  { id: 'part-9', num: 'IX', label: 'Part IX', title: 'Senior Altitude', accent: '#E3B7FF', deep: '#7B2FA8',
    blurb: 'Architecture as a series of trade-offs, and cost as an engineering concern rather than a finance surprise.', levels: [19, 20] },
  { id: 'part-10', num: 'X', label: 'Part X', title: 'The Summit Projects', accent: '#FFD23F', deep: '#8A6A00',
    blurb: 'Nine projects that chain every level into one evolving production system, from a hand-built server to a complete platform.', levels: [] },
  { id: 'appendices', num: '', label: 'Appendices', title: 'The Back of the Pack', accent: '#C9CFDA', deep: '#475063',
    blurb: 'The template behind every chapter, the kit for sharing the roadmap, and the licence that lets you reuse all of it.', levels: [] },
];

function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }
function h1(rel) { return (read(rel).match(/^#\s+(.+)$/m) || [, rel])[1].trim(); }
const levelDirs = fs.readdirSync(REPO).filter((d) => /^level-\d\d-/.test(d)).sort();

function chapter(rel, part, extra) {
  const id = rel.replace(/\.md$/, '').replace(/\.txt$/, '');
  return { id, rel, part: part.id, title: h1(rel), ...extra };
}

export function buildManifest() {
  const byId = Object.fromEntries(PARTS.map((p) => [p.id, p]));
  const out = [];
  const base = byId['base-camp'];
  out.push(chapter('README.md', base, { kind: 'guide', num: '', short: 'The Roadmap at a Glance' }));
  out.push(chapter('guides/senior-mindset.md', base, { kind: 'guide', num: '' }));
  out.push(chapter('guides/learning-order.md', base, { kind: 'guide', num: '' }));
  out.push(chapter('guides/timeline.md', base, { kind: 'guide', num: '' }));

  for (const part of PARTS) {
    for (const lv of part.levels) {
      const dir = levelDirs.find((d) => d.startsWith(`level-${String(lv).padStart(2, '0')}-`));
      const files = fs.readdirSync(path.join(REPO, dir)).filter((f) => f.endsWith('.md'));
      const levelTitle = h1(`${dir}/README.md`).replace(/^Level \d+\s*[—-]\s*/, '');
      out.push(chapter(`${dir}/README.md`, part, { kind: 'level', num: `${lv}`, level: lv, levelTitle }));
      for (const f of files.filter((x) => /^\d\d-/.test(x) && !x.startsWith('99-')).sort()) {
        const n = parseInt(f, 10);
        out.push(chapter(`${dir}/${f}`, part, { kind: 'topic', num: `${lv}.${n}`, level: lv, levelTitle }));
      }
      out.push(chapter(`${dir}/99-capstone-project.md`, part, { kind: 'capstone', num: `${lv}`, level: lv, levelTitle }));
    }
  }

  const proj = byId['part-10'];
  out.push(chapter('projects/README.md', proj, { kind: 'guide', num: '' }));
  for (const f of fs.readdirSync(path.join(REPO, 'projects')).filter((x) => /^project-\d\d/.test(x)).sort()) {
    out.push(chapter(`projects/${f}`, proj, { kind: 'project', num: `${parseInt(f.slice(8), 10)}` }));
  }

  const app = byId.appendices;
  out.push(chapter('docs/TOPIC_TEMPLATE.md', app, { kind: 'appendix', num: 'A' }));
  out.push(chapter('docs/images/social/captions.md', app, { kind: 'appendix', num: 'B' }));
  out.push(chapter('docs/images/social/carousel/README.md', app, { kind: 'appendix', num: 'C' }));
  out.push({ id: 'LICENSE', rel: 'LICENSE', part: 'appendices', title: 'MIT License', kind: 'appendix', num: 'D' });
  return out;
}

// How a chapter is referred to from another chapter's text.
export function xrefLabel(c) {
  switch (c.kind) {
    case 'topic': return `§${c.num}`;
    case 'level': return `Level ${c.num}`;
    case 'capstone': return `Capstone ${c.num}`;
    case 'project': return `Project ${c.num}`;
    case 'appendix': return `Appendix ${c.num}`;
    default: return 'Base Camp';
  }
}
