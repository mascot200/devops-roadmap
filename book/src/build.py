#!/usr/bin/env python3
"""Paginate, stamp and assemble the book. Called by build.mjs, one subcommand per stage."""
import json, os, re, sys, glob, collections
import pymupdf
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ROOT)
BUILD = os.path.join(ROOT, 'build')
RAW = os.path.join(BUILD, 'raw')
OUT = os.path.join(ROOT, 'pages')
DIST = os.path.join(ROOT, 'dist')
W, H = 540, 666
PLAN = lambda: json.load(open(os.path.join(BUILD, 'plan.json')))
pymupdf.TOOLS.mupdf_display_errors(False)


def ttf(name):
    out = os.path.join(BUILD, f'{name}.ttf')
    if not os.path.exists(out):
        f = TTFont(os.path.join(ROOT, 'node_modules/inter-ui/web', f'{name}.woff2'))
        f.flavor = None
        f.save(out)
    return out


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def roman(n):
    s = ''
    for v, r in [(10, 'x'), (9, 'ix'), (5, 'v'), (4, 'iv'), (1, 'i')]:
        while n >= v:
            s += r
            n -= v
    return s


def stamp_page(page, folio, side, head, accent, deep, show_head=True):
    """Running head and folio. side: 'r' recto, 'v' verso."""
    page.insert_font(fontname='ib', fontfile=ttf('Inter-Bold'))
    page.insert_font(fontname='is', fontfile=ttf('Inter-SemiBold'))
    inner, outer = 66.2, 44.6
    ink = (0.08, 0.09, 0.12)
    y_foot = H - 30
    size = 8
    tw = pymupdf.Font(fontfile=ttf('Inter-Bold')).text_length(str(folio), size)
    box_w = max(18, tw + 9)
    x0 = W - outer - box_w if side == 'r' else outer
    r = pymupdf.Rect(x0, y_foot - 10.5, x0 + box_w, y_foot + 3.5)
    page.draw_rect(r, color=ink, fill=rgb(accent), width=.8, radius=.18)
    page.insert_text((x0 + (box_w - tw) / 2, y_foot - .6), str(folio), fontname='ib', fontsize=size, color=ink)
    if show_head and head:
        sz = 6.8
        font = pymupdf.Font(fontfile=ttf('Inter-SemiBold'))
        t = head
        maxw = W - inner - outer
        while font.text_length(t, sz) > maxw and len(t) > 8:
            t = t[:-2].rstrip() + '…' if not t.endswith('…') else t[:-3].rstrip() + '…'
        tl = font.text_length(t, sz)
        x = W - outer - tl if side == 'r' else outer
        page.insert_text((x, 37), t, fontname='is', fontsize=sz, color=rgb('#5B6270'))


def plan_pages():
    """Assign page numbers. Everything starts on a right-hand page; spare left-hand pages become lab notes."""
    plan = PLAN()
    n = 1
    pages = {}
    seq = []
    for item in plan['body']:
        raw = os.path.join(RAW, item['id'] + '.pdf')
        count = len(pymupdf.open(raw))
        pages[item['id']] = n
        seq.append({**item, 'start': n, 'count': count})
        n += count
        if count % 2:
            seq.append({'id': '_notes', 'start': n, 'count': 1, 'part': item['part']})
            n += 1
    json.dump(pages, open(os.path.join(BUILD, 'pages.json'), 'w'))
    json.dump(seq, open(os.path.join(BUILD, 'seq.json'), 'w'))
    print('body pages', n - 1)


def head_for(item, parts, pno):
    part = parts[item['part']]
    if pno % 2 == 0:  # verso: the part
        return f"{part['label']}: {part['title']}".upper() if False else f"{part['label']}  ·  {part['title']}"
    tag = item.get('tag', '')
    return (f"{tag}  ·  " if tag else '') + item.get('title', '')


def stamp_all():
    """Write book/pages/<repo path>.pdf: each chapter stamped with its final folios."""
    plan = PLAN()
    parts = plan['parts']
    seq = json.load(open(os.path.join(BUILD, 'seq.json')))
    done = 0
    for item in seq:
        if item['id'] == '_notes':
            continue
        src = os.path.join(RAW, item['id'] + '.pdf')
        dst = os.path.join(OUT, item['id'] + '.pdf')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        d = pymupdf.open(src)
        part = parts[item['part']]
        for i, page in enumerate(d):
            pno = item['start'] + i
            stamp_page(page, pno, 'r' if pno % 2 else 'v', head_for(item, parts, pno), part['accent'], part['deep'], show_head=i > 0)
            for l in page.get_links():
                if l.get('uri', '').startswith('https://xref.book/'):
                    page.delete_link(l)
        d.subset_fonts()
        d.save(dst, garbage=4, deflate=True, use_objstms=1)
        d.close()
        done += 1
    print('stamped', done)


def copy_front():
    """Authored pages also get their own PDF under book/pages/_front."""
    import shutil
    os.makedirs(os.path.join(OUT, '_front'), exist_ok=True)
    for f in glob.glob(os.path.join(RAW, '_gen', '*.pdf')):
        shutil.copy(f, os.path.join(OUT, '_front', os.path.basename(f)))


def notes_pdf(part_accent='#FFD23F'):
    """A ruled lab-notes page."""
    d = pymupdf.open()
    p = d.new_page(width=W, height=H)
    grid = rgb('#CBD0DA')
    x0, x1, y0, y1 = 44.6, W - 66.2, 62, H - 58
    y = y0 + 24
    while y < y1:
        p.draw_line((x0, y), (x1, y), color=grid, width=.45)
        y += 20
    p.insert_font(fontname='ib', fontfile=ttf('Inter-Bold'))
    p.insert_text((x0, y0 + 6), 'LAB NOTES', fontname='ib', fontsize=7.2, color=rgb('#475063'))
    p.insert_font(fontname='is', fontfile=ttf('Inter-SemiBold'))
    p.insert_text((x0 + 56, y0 + 6), 'What I ran, what I saw, what it means', fontname='is', fontsize=6.8, color=rgb('#7A8192'))
    return d


# ------- index mining -------
STOP = re.compile(r"^(gotcha|trusted|goal|steps?|done when|prove it|prerequisites?|don'?t|do|yes|no|symptom|investigation|fix|lesson|note|warning|tip|why|what|how|when|where|who|example|result|output|answer|answers|cost|teardown|cleanup|clean up|verify|check|expected|important|never|always|first|second|third|next|then|finally|before|after|step \d+|t\d+|task|before you|option [a-z0-9]|pattern \d+|the fix|the lesson|the symptom|the problem|the result|the outcome|good|bad|wrong|right|correct|true|false|must|should|may|one|two|three|four|five|today|tomorrow|now|later|also|only|not|none|all|any|both|each|every|most|many|some|more|less|same|different|high|low|medium|critical|optional|required|recommended)$", re.I)


def clean_term(t):
    t = re.sub(r'`', '', t).strip()
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    t = t.strip(' .:;,!?—-*_"\'')
    if t.count('(') > t.count(')'):
        t += ')'
    elif t.count(')') > t.count('('):
        t = t.rstrip(')')
    return re.sub(r'\s+', ' ', t)


def good_term(t):
    if not (2 <= len(t) <= 34) or len(t.split()) > 4:
        return False
    if STOP.match(t) or not re.search(r'[A-Za-z]', t):
        return False
    if re.search(r'[{}<>=|$\\]', t) or t.startswith(('/', '-', '.')):
        return False
    if re.match(r'^\d', t) or re.search(r'\b(is|are|was|were|the|you|your|this|that|it|will|can|do|does|did|not|has|have|with|for|of|to|from|and|or|in|on|at|as|by)$', t, re.I):
        return False
    return bool(re.match(r'^[A-Za-z]', t))


def norm(s):
    s = s.replace('-\n', '').replace('\n', ' ')
    return re.sub(r'\s+', ' ', s).lower()


def build_index():
    plan = PLAN()
    seq = json.load(open(os.path.join(BUILD, 'seq.json')))
    terms = collections.defaultdict(lambda: collections.defaultdict(int))
    forms = collections.defaultdict(collections.Counter)
    for item in seq:
        if item['id'] == '_notes' or not item.get('rel') or not item['rel'].endswith('.md'):
            continue
        src = open(os.path.join(REPO, item['rel']), encoding='utf8').read()
        src = re.sub(r'```.*?```', '', src, flags=re.S)
        keep = re.split(r'^## \d+\. (?:Real-world scenario|Common mistakes|Tasks|Self-check|Further reading)', src, flags=re.M)[0] if item.get('kind') == 'topic' else ''
        if not keep:
            continue
        doc = pymupdf.open(os.path.join(RAW, item['id'] + '.pdf'))
        texts = [norm(p.get_text()) for p in doc]
        for m in re.finditer(r'\*\*(.+?)\*\*', keep):
            t = clean_term(m.group(1))
            # A bold phrase that ends in a full stop or colon is a run-in sentence, not a term.
            if len(t.split()) > 1 and re.search(r'[.:!?]\s*$', m.group(1)):
                continue
            if not good_term(t) or re.match(r'^(no|all|delete|every|some|any|only|not|more|less|the|a|an|they|this|these|those|it|we|you|your|our|their|its|if|when|use|do|don|never|always|keep|make|add|run|set|tag|check|start|stop|see|get|put|pick|choose|avoid|prefer)\b', t, re.I) and len(t.split()) > 1:
                continue
            key = t.lower()
            for i, tx in enumerate(texts):
                if key in tx:
                    terms[key][item['start'] + i] += 1
                    forms[key][t] += 1
                    break
        # acronyms as introduced: "Full Name (ABC)"
        for m in re.finditer(r'\b([A-Z][\w-]+(?: [A-Za-z][\w-]+){0,4}) \(([A-Z][A-Z0-9]{1,6})\)', keep):
            a = m.group(2)
            key = a.lower()
            for i, tx in enumerate(texts):
                if f'({key})' in tx:
                    terms[key][item['start'] + i] += 1
                    forms[key][a] += 1
                    break
    # chapter titles always make the index, at their first page
    for item in seq:
        if item.get('kind') in ('topic', 'level', 'project') and item.get('title'):
            t = clean_term(item['title'])
            key = t.lower()
            terms[key][item['start']] += 5
            forms[key][t] += 5
    out = []
    for key, pgs in terms.items():
        ps = sorted(pgs, key=lambda p: (-pgs[p], p))[:6]
        form = forms[key].most_common(1)[0][0]
        out.append({'term': form, 'pages': sorted(ps)})
    out.sort(key=lambda e: re.sub(r'[^a-z0-9 ]', '', e['term'].lower()))
    json.dump(out, open(os.path.join(BUILD, 'index.json'), 'w'))
    print('index terms', len(out))


# ------- assembly -------
def add_stamped_gen(doc, gid, style='roman', start=1, head='', accent='#FFD23F', show=True):
    """Append a generated page set; style 'none' leaves pages clean."""
    src = pymupdf.open(os.path.join(RAW, f'_gen/{gid}.pdf'))
    first = len(doc)
    doc.insert_pdf(src, links=True)
    n = start
    for i in range(first, len(doc)):
        if style != 'none':
            lab = roman(n) if style == 'roman' else n
            stamp_page(doc[i], lab, 'r' if n % 2 else 'v', head, accent, accent, show_head=show and i > first)
        n += 1
    return n


def add_blank(doc, n=1):
    for _ in range(n):
        doc.new_page(width=W, height=H)


def assemble_interior(front, seq_slice, back=None, cover=None, back_cover=None, name='book', title='', toc_extra=None):
    plan = PLAN()
    parts = plan['parts']
    doc = pymupdf.open()
    toc = []
    if cover:
        src = pymupdf.open(os.path.join(RAW, f'_gen/{cover}.pdf'))
        doc.insert_pdf(src)
        toc.append([1, 'Cover', 1])
        add_blank(doc)
    n = 1
    for gid, style, label in front:
        if style == 'blank':
            add_blank(doc)
            n += 1
            continue
        at = len(doc) + 1
        n = add_stamped_gen(doc, gid, style='none' if style == 'plain' else 'roman', start=n, head=label or '', show=True)
        if label:
            toc.append([1, label, at])
    if n % 2 == 0:  # body must start on a right-hand page
        add_blank(doc)
        n += 1
    page_of = {}
    notes = notes_pdf()
    cur_part = None
    for item in seq_slice:
        if item['id'] == '_notes':
            doc.insert_pdf(notes)
            part = parts[item['part']]
            pno = item['start']
            stamp_page(doc[-1], pno, 'r' if pno % 2 else 'v', '', part['accent'], part['deep'], show_head=False)
            continue
        at = len(doc)
        page_of[item['id']] = at
        src = pymupdf.open(os.path.join(RAW, item['id'] + '.pdf'))
        doc.insert_pdf(src, links=True)
        part = parts[item['part']]
        for i in range(item['count']):
            pno = item['start'] + i
            stamp_page(doc[at + i], pno, 'r' if pno % 2 else 'v', head_for(item, parts, pno), part['accent'], part['deep'], show_head=i > 0)
        lvl = item.get('toc', 2)
        toc.append([lvl, item.get('toctitle') or item.get('title') or item['id'], at + 1])
    pno_last = seq_slice[-1]['start'] + seq_slice[-1]['count'] - 1
    if back:
        n = pno_last + 1
        for gid, style, label in back:
            if n % 2 == 0 and gid in ('index', 'about'):
                doc.insert_pdf(notes)
                if style != 'plain':
                    stamp_page(doc[-1], n, 'v', '', '#FFD23F', '#8A6A00', show_head=False)
                n += 1
            at = len(doc) + 1
            n = add_stamped_gen(doc, gid, style=('none' if style == 'plain' else 'arabic'), start=n, head=label or '')
            if label:
                toc.append([1, label, at])
    if back_cover:
        if len(doc) % 2 == 0:  # the back cover belongs on a left-hand page
            add_blank(doc)
        src = pymupdf.open(os.path.join(RAW, f'_gen/{back_cover}.pdf'))
        doc.insert_pdf(src)
        toc.append([1, 'Back cover', len(doc)])
    # interior print files must end on an even page
    if not back_cover and len(doc) % 2 == 1:
        add_blank(doc)
    # cross-references become internal links, or plain text if the target is in another volume
    fixed = dead = 0
    for page in doc:
        for l in page.get_links():
            uri = l.get('uri', '')
            if not uri.startswith('https://xref.book/'):
                continue
            tid = re.sub(r'%20', ' ', uri[len('https://xref.book/'):])
            page.delete_link(l)
            if tid in page_of:
                page.insert_link({'kind': pymupdf.LINK_GOTO, 'from': l['from'], 'page': page_of[tid], 'to': pymupdf.Point(0, 0)})
                fixed += 1
            else:
                dead += 1
    doc.set_toc(toc)
    doc.set_metadata({'title': title, 'author': 'Ubong Eduok', 'subject': 'The complete DevOps roadmap, from your first Linux command to senior architect',
                      'keywords': 'DevOps, Linux, Docker, Kubernetes, Terraform, AWS, SRE, GitOps, Platform Engineering', 'creator': 'book/ toolchain', 'producer': 'Chrome + MuPDF'})
    os.makedirs(DIST, exist_ok=True)
    path = os.path.join(DIST, name + '.pdf')
    doc.subset_fonts()
    doc.save(path, garbage=4, deflate=True, use_objstms=1)
    print(name, 'pages', len(doc), 'MB', round(os.path.getsize(path) / 1e6, 1), 'links', fixed, 'unlinked', dead)
    return len(doc)


def assemble():
    plan = PLAN()
    seq = json.load(open(os.path.join(BUILD, 'seq.json')))
    counts = {}
    for v in plan['volumes']:
        slice_ = [s for s in seq if s['part'] in v['parts']]
        slug = re.sub(r'[^A-Za-z]+', '-', v['title']).strip('-')
        title = f"The Production-Ready Engineer, Volume {v['n']}: {v['title']}"
        # Reader's copy, with covers.
        assemble_interior(v['front'], slice_, back=v['back'], cover=f"v{v['n']}-cover-front", back_cover=f"v{v['n']}-cover-back",
                          name=f"The-Production-Ready-Engineer-Volume-{v['n']}-{slug}", title=title)
        # Printer's interior, no covers.
        counts[v['n']] = assemble_interior(v['front'], slice_, back=v['back'], name=f"print/Volume-{v['n']}-interior", title=title)
    json.dump(counts, open(os.path.join(BUILD, 'vol-pages.json'), 'w'))


if __name__ == '__main__':
    os.makedirs(os.path.join(DIST, 'print'), exist_ok=True)
    {'plan': plan_pages, 'stamp': stamp_all, 'front': copy_front, 'index': build_index, 'assemble': assemble}[sys.argv[1]]()
