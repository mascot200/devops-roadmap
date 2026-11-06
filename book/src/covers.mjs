// Wraparound print cover: back + spine + front, with 0.125in bleed on every edge.
import path from 'node:path';
import { REPO } from './manifest.mjs';
import { frontPanel, backPanel } from './art.mjs';
import { wrap } from './render.mjs';

const INCH = 72; const BLEED = 0.125 * INCH;
// Common print-on-demand white-paper thickness, inches per page. Check your printer's calculator before ordering.
export const SPINE_IN_PER_PAGE = 0.00235;
const part = { accent: '#FFD23F', deep: '#8A6A00' };

export function fullSpread(v, pages) {
  const spine = pages * SPINE_IN_PER_PAGE * INCH; const W = 540; const H = 666;
  const width = W * 2 + spine + BLEED * 2; const height = H + BLEED * 2;
  const portrait = `file://${REPO}/docs/images/ubong-eduok.png`;
  const html = wrap(`<div style="position:relative;width:${width}pt;height:${height}pt;background:#0B0E18;overflow:hidden">
    <div style="position:absolute;left:0;top:0;width:${W + BLEED}pt;height:${height}pt;overflow:hidden">${backPanel({ W: W + BLEED, H: H + BLEED * 2, portrait, vol: v })}</div>
    <div style="position:absolute;left:${W + BLEED}pt;top:0;width:${spine}pt;height:${height}pt;background:#0B0E18;display:flex;align-items:center;justify-content:center">
      <div style="writing-mode:vertical-rl;white-space:nowrap;display:flex;align-items:center;gap:22pt;font-family:Inter;color:#fff">
        <span style="font:900 ${Math.min(14, spine * 0.42)}pt/1 Inter;letter-spacing:-.2pt;color:#FFD23F">The Production-Ready Engineer</span>
        <span style="font:700 ${Math.min(10, spine * 0.3)}pt/1 Inter">Volume ${v.n}: ${v.title}</span>
        <span style="font:800 ${Math.min(10, spine * 0.3)}pt/1 Inter;color:#FFD23F">Ubong Eduok</span>
      </div></div>
    <div style="position:absolute;left:${W + BLEED + spine}pt;top:0;width:${W + BLEED}pt;height:${height}pt;overflow:hidden">${frontPanel({ W: W + BLEED, H: H + BLEED * 2, vol: v })}</div>
  </div>`, part, '', `@page{size:${width}pt ${height}pt;margin:0}@page :left{margin:0}@page :right{margin:0}body{margin:0}`);
  return { html, width, height };
}
