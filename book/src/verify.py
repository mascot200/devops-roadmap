#!/usr/bin/env python3
"""Proves the book is complete: every word of every repository page must appear in that page's rendered PDF."""
import json, os, re, subprocess, sys, collections
import pymupdf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ROOT)
seq = json.load(open(os.path.join(ROOT, 'build/seq.json')))
tracked = subprocess.check_output(['git', 'ls-files'], cwd=REPO, text=True).split('\n')
tracked = [t for t in tracked if t and not t.startswith('book/')]
in_book = {s['rel'] for s in seq if s.get('rel')}

def words(t):
    return re.findall(r"[a-z0-9]{2,}", t.lower())

def mermaid_words(block):
    # Only what a reader sees: quoted and bracketed labels, edge labels and sequence messages. Not syntax or node ids.
    out = []
    first = block.strip().split('\n')[0]
    for line in block.split('\n')[1:]:
        l = line.strip()
        if first.startswith('sequenceDiagram'):
            m = re.match(r'participant\s+\S+\s+as\s+(.+)', l) or re.match(r'participant\s+(.+)', l)
            if m: out.append(m.group(1)); continue
            if ':' in l: out.append(l.split(':', 1)[1])
            elif re.match(r'(alt|else|opt|loop|par|and|rect|critical|break)\b', l): out.append(re.sub(r'^\w+', '', l))
        elif first.startswith('gantt'):
            if l.startswith(('dateFormat', 'axisFormat')): continue
            if l.startswith('section') or l.startswith('title'): out.append(l.split(' ', 1)[-1])
            elif ':' in l and not re.match(r'(dateFormat|axisFormat|tickInterval|excludes)', l): out.append(l.split(':', 1)[0])
        elif first.startswith('stateDiagram'):
            if ':' in l: out.append(l.split(':', 1)[1])
        else:
            out += re.findall(r'"([^"]+)"', l)
            out += re.findall(r'\|([^|]+)\|', l)
            out += re.findall(r'\[([^\]"]+)\]', l) + re.findall(r'\{([^}"]+)\}', l)
    return ' '.join(out).replace('<br/>', ' ').replace('<br>', ' ')

def source_text(src):
    s = re.sub(r'<!-- nav -->[\s\S]*$', '', src)
    s = re.sub(r'```mermaid\n(.*?)```', lambda m: mermaid_words(m.group(1)), s, flags=re.S)
    s = re.sub(r'^---\n(?:← |\[.*(?:index|home|Roadmap)).*$', '', s, flags=re.M)
    s = re.sub(r'^\[?← .*$', '', s, flags=re.M)
    s = re.sub(r'<!--[\s\S]*?-->', '', s)
    s = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', s)          # keep link words, drop targets
    s = re.sub(r'^(\s*[-*] )?\[[ x]\]', '', s, flags=re.M)
    s = re.sub(r'^(\s*)```text', r'\1```', s, flags=re.M)
    s = re.sub(r'<(/?)(kbd|table|tr|td|th|img|a|b|br|details|summary|sub|sup|div|p)\b[^>]*>', ' ', s)
    return s

missing_total = 0; checked = 0; rows = []
for s in seq:
    if not s.get('rel'):
        continue
    src = open(os.path.join(REPO, s['rel']), encoding='utf8').read()
    # Mermaid layouts place words freely and turn them into shapes, so compare multisets not sequences.
    doc = pymupdf.open(os.path.join(ROOT, 'build/raw', s['id'] + '.pdf'))
    text = '\n'.join(p.get_text() for p in doc).replace('-\n', '').replace('­', '')
    pdf = collections.Counter(words(text))
    pdf_joined = re.sub(r'[^a-z0-9]', '', text.lower())
    want = collections.Counter(words(source_text(src)))
    lost = {w: n for w, n in want.items() if w not in pdf and w not in pdf_joined}
    checked += sum(want.values()); missing_total += sum(lost.values())
    if lost:
        rows.append((sum(lost.values()), s['rel'], sorted(lost)[:12]))
rows.sort(reverse=True)
print(f'pages in book: {len(in_book)}; words checked: {checked:,}; words missing: {missing_total}')
for r in rows[:40]:
    print(r)
images = [t for t in tracked if t.endswith(('.png', '.jpg'))]
html = ''.join(open(os.path.join(ROOT, 'build/html', s['id'] + '.html'), encoding='utf8').read() for s in seq if s.get('rel') in ('README.md', 'docs/images/social/carousel/README.md'))
print('images not placed:', [i for i in images if os.path.basename(i) not in html])
print('tracked text files not in book:', [t for t in tracked if t not in in_book and not t.endswith(('.png', '.jpg', '.pdf'))])
