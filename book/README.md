# The Production-Ready Engineer

The whole of this repository, typeset as a six-volume book by Ubong Eduok.

| Volume | Title | Covers | Interior pages |
|-------:|-------|--------|---------------:|
| 1 | Foundations | Base Camp, Part I: DevOps, Linux, Networking, Git | 752 |
| 2 | Build, Ship and Cloud | Parts II, III: Docker, CI/CD, AWS, Terraform | 824 |
| 3 | Orchestrate, See and Secure | Parts IV, V: Kubernetes, Helm, Observability, DevSecOps | 788 |
| 4 | Under the Hood | Part VI: Advanced Networking, Databases and Distributed Systems | 508 |
| 5 | Reliability and Platforms at Scale | Parts VII, VIII: SRE, Disaster Recovery, Advanced Kubernetes, GitOps, Platform Engineering | 748 |
| 6 | Senior Altitude and the Summit | Parts IX, X, Appendices, Index: Architecture, Cost, the Nine Projects | 460 |

## Get the PDFs

All PDFs are attached to the **[book-v1.0 Release](https://github.com/mascot200/devops-roadmap/releases/tag/book-v1.0)**, not stored in Git, so cloning this repository stays fast.

| Release file | What it is |
|--------------|------------|
| `The-Production-Ready-Engineer-Volume-N-*.pdf` | The six volumes to read and share, with front and back covers |
| `Volume-N-interior.pdf` | Print interiors: 7.5 x 9.25 in, no bleed, even page count, no covers |
| `Volume-N-cover.pdf` | Wraparound print covers: back, spine and front, with 0.125 in bleed |
| `The-Production-Ready-Engineer-Pages.zip` | Every book page as its own PDF, at the same path as its source file in the repository |

## What is in this folder

| Path | What it is |
|------|------------|
| `TASKS.md` | The task list for this book: one task, one commit, one push |
| `src/` | The typesetting toolchain |
| `pages/`, `dist/` | Created by a build and ignored by Git |

## Before you print

- **Spine width** assumes 0.00235 in per page (`SPINE_IN_PER_PAGE` in `src/covers.mjs`). Check it against your printer's calculator and rebuild.
- **Page limits vary by printer.** Volume 2 has 824 pages, which is inside Amazon KDP's 828-page limit but over some other services' limits. Confirm before ordering.
- **Colour:** the files are RGB. Most print-on-demand services convert them; a printer that requires PDF/X or CMYK will need a conversion step.
- **ISBN:** none is assigned. The back cover keeps a clear white box for the barcode. Add your ISBN to the copyright page in `src/frontmatter.mjs`.

## Rebuild

Needs Google Chrome and Node.js. A full build takes a few minutes and writes its PDFs to `dist/` and `pages/`. To publish a new edition, attach those files to a new Release.

```bash
cd book
npm install
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
npm run build
npm run verify
```

`npm run verify` checks that every word of every repository page appears in that page's PDF. A word hyphenated across a page break is reported as missing; the current build reports 8, all of that kind.

The book's text comes straight from the repository's Markdown. Edit the Markdown and rebuild, and the book follows.
