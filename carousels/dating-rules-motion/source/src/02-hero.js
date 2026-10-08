// ================================================================== BRAND KIT · Midlife Brotherhood
// Type: Poppins (OFL) for everything, JetBrains Mono for terminal / labels.
FONT.anton = 'MBP8'; FONT.wide = 'MBP7'; FONT.blk = 'MBP5';
const F8 = FONT.anton, F7 = FONT.wide, F5 = FONT.blk, FM = FONT.mono;
const C = { red: '#d7141e', hot: '#ff3b40', white: '#f4f2ee', grey: '#b3b3b3', dim: '#707070', char: '#1c1c1c', ink: '#0c0c0c' };
const BEAT = 60 / 90;                 // 90 BPM
const SN = (n) => n * BEAT;           // time of beat n (snares on odd n: 0.67, 2.0, 3.33, 4.67, 6.0, 7.33)
const TX = {
  white: { fill: C.white, ext: [5, '#050505'], extX: 0 },
  red: { fill: [[0, '#ff3a40'], [1, '#c10f18']], ext: [5, '#2a0204'], extX: 0 },
  num: { fill: [[0, '#ff4045'], [1, '#c20f18']], glow: ['rgba(215,20,30,0.55)', 26] },
  grey: { fill: C.grey },
  plain: { fill: C.white },
};

// ---------------------------------------------------------------- text layout (word sprites)
function wrapWords(str, font, size, maxW) {
  SCR.font = fstr(font, size); const sp = SCR.measureText(' ').width;
  const lines = []; let cur = [], w = 0;
  for (const wd of str.split(' ')) {
    const ww = SCR.measureText(wd).width;
    if (cur.length && w + sp + ww > maxW) { lines.push(cur); cur = []; w = 0; }
    w += (cur.length ? sp : 0) + ww; cur.push(wd);
  }
  if (cur.length) lines.push(cur);
  return lines;
}
// o: cx, top, lh, align, lines (array of word arrays), styleFor(word, index)
function layoutText(str, font, size, maxW, style, o = {}) {
  const lh = (o.lh || 1.15) * size, cx = o.cx ?? 540, top = o.top ?? 400, align = o.align || 'center';
  const lines = o.lines || wrapWords(str, font, size, maxW);
  SCR.font = fstr(font, size); const sp = SCR.measureText(' ').width, cap = capOf(font, size);
  const items = []; let wi = 0;
  lines.forEach((ws, li) => {
    SCR.font = fstr(font, size);
    const widths = ws.map((w) => SCR.measureText(w).width), tw = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
    let x = align === 'center' ? cx - tw / 2 : align === 'left' ? cx : cx - tw;
    const base = top + cap + li * lh;
    ws.forEach((w, j) => {
      const st = (o.styleFor && o.styleFor(w, wi)) || style;
      items.push({ w, G: glyph(w, font, size, st), x: x + widths[j] / 2, left: x, base, li, wi: wi++, width: widths[j] });
      x += widths[j] + sp;
    });
  });
  return { items, n: lines.length, top, bottom: top + cap + (lines.length - 1) * lh, lh, cap, size };
}
function drawText(g, L, f) { for (const it of L.items) drawSprite(g, it.G, it.x, it.base, f ? f(it) || {} : {}); }

// ---------------------------------------------------------------- the wolf (from the official logo)
// eye position inside the images (fractions of width / height)
const EYE = { wolf: [0.432, 0.2006], shield: [0.5067, 0.2882] };
function drawLogo(g, name, x, y, w, o = {}) {
  const im = IMG[name]; if (!im) return;
  const h = (w * im.naturalHeight) / im.naturalWidth;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot);
  g.scale(o.sx ?? 1, o.sy ?? 1);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.drawImage(im, -w / 2, -h / 2, w, h);
  if (o.eye > 0.01) { // red glow on the eye
    const [ex, ey] = EYE[name], px = -w / 2 + ex * w, py = -h / 2 + ey * h, s = w * 0.16 * (0.6 + o.eye);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(o.eye) * (o.alpha ?? 1);
    g.drawImage(SPR.red, px - s, py - s, s * 2, s * 2);
    g.drawImage(SPR.red, px - s * 3, py - s * 0.3, s * 6, s * 0.6); // lens streak
  }
  g.restore();
}
// the wolf's open mouth (where the howl comes from), in the same fractions of wolf.png
const MOUTH = [0.13, 0.11];

// ---------------------------------------------------------------- shapes
function heart(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); g.closePath();
}
function keyPath(g, s) { // centred on the bow, shaft pointing right
  g.beginPath(); g.arc(-60 * s, 0, 34 * s, 0, TAU); g.moveTo(-60 * s + 14 * s, 0); g.arc(-60 * s, 0, 14 * s, 0, TAU, true);
  g.rect(-28 * s, -9 * s, 128 * s, 18 * s);
  g.rect(62 * s, 9 * s, 12 * s, 22 * s); g.rect(84 * s, 9 * s, 12 * s, 30 * s); g.rect(46 * s, 9 * s, 10 * s, 14 * s);
}
// chrome: shield + mark (top-left), counter (bottom-left). Top-right and bottom-right stay clear for Instagram.
const CH = {};
function buildChrome() {
  const size = 19, track = 5, text = PROJECT.mark; SCR.font = fstr(FM, size);
  let tw = 0; for (const ch of text) tw += SCR.measureText(ch).width + track;
  const c = mk(tw + 70, 56), g = c.getContext('2d');
  if (IMG.shield) g.drawImage(IMG.shield, 2, 3, 44, (44 * 855) / 777);
  g.font = SCR.font; g.fillStyle = 'rgba(244,242,238,0.9)';
  let x = 60; for (const ch of text) { g.fillText(ch, x, 35); x += SCR.measureText(ch).width + track; }
  CH.mark = c;
  CH.count = PROJECT.counters.map((s) => {
    SCR.font = fstr(FM, 20); let w = 0; for (const ch of s) w += SCR.measureText(ch).width + 4;
    const cc = mk(w + 40, 36), gg = cc.getContext('2d'); gg.font = SCR.font;
    gg.fillStyle = C.red; gg.fillRect(0, 14, 20, 4);
    gg.fillStyle = 'rgba(244,242,238,0.72)'; let xx = 30; for (const ch of s) { gg.fillText(ch, xx, 24); xx += SCR.measureText(ch).width + 4; }
    return cc;
  });
}
function chrome(g, k, t, a = 1) {
  if (!vis(0, 560)) return;
  g.save(); g.globalAlpha = a; g.drawImage(CH.mark, 64, 58);
  g.drawImage(CH.count[k], 70, 1262); g.restore();
}
// red underline (the style-sheet accent)
function underline(g, x, y, w, a = 1) { if (w < 1) return; g.save(); g.globalAlpha *= a; g.fillStyle = C.red; g.fillRect(x - w / 2, y, w, 7); g.restore(); }
// rule slide header: big red number + headline + underline + body, laid out top-down. Returns the layouts.
function ruleText(num, head, body, o = {}) {
  const R = {};
  R.num = glyph(num, F8, o.numSize || 150, TX.num);
  R.numBase = o.numBase || 250;
  R.head = layoutText(head, F8, o.headSize || 74, o.headW || 900, TX.white, { top: R.numBase + 34, lh: 1.1, lines: o.lines, styleFor: o.styleFor });
  R.ul = R.head.bottom + 44;
  R.body = layoutText(body, F5, o.bodySize || 35, o.bodyW || 860, TX.grey, { top: R.ul + 36, lh: 1.42 });
  return R;
}
