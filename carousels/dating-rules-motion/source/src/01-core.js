/* ==================================================================
   CAROUSELS ON STEROIDS · live carousel engine
   N slides · 1080×1350 · seamless loops · one continuous world.
   Every pixel is drawn in code (canvas 2D) as a pure function of t,
   so any frame can be rendered at any time and every loop is exact.
   ================================================================== */
'use strict';

// ---------------------------------------------------------------- constants
const W = PROJECT.width || 1080, H = PROJECT.height || 1350, N = PROJECT.slides.length, LOOP = PROJECT.loop || 8, WORLD = W * N;
const TAU = Math.PI * 2, PI = Math.PI;
const FLOOR = PROJECT.floor ?? 1100; // the world's floor line (y), shared by every slide
const FONT = { anton: 'EBAnton', wide: 'EBWide', blk: 'EBBlk', mono: 'EBMono' };
const OM = (k) => (TAU * k) / LOOP; // angular speed that loops exactly k times per LOOP

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const frac = (x) => x - Math.floor(x);
const wrapT = (x) => ((x % LOOP) + LOOP) % LOOP;
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function hash(a, b = 0) {
  let h = Math.imul((a | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul(((b | 0) + 0x3c6ef372) | 0, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const E = {
  inQ: (x) => x * x,
  outQ: (x) => 1 - (1 - x) * (1 - x),
  inC: (x) => x * x * x,
  outC: (x) => 1 - (1 - x) ** 3,
  ioC: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  ioS: (x) => x * x * (3 - 2 * x),
  outQuart: (x) => 1 - (1 - x) ** 4,
  inExpo: (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
  ioBack: (x, s = 1.2) => {
    const c = s * 1.525;
    return x < 0.5 ? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2 : ((2 * x - 2) ** 2 * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
  },
  outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
};
const damp = (dt, f, d) => (dt < 0 ? 0 : Math.exp(-d * dt) * Math.cos(f * dt)); // 1 → 0, oscillating
const kick = (dt, f, d) => (dt < 0 ? 0 : Math.exp(-d * dt) * Math.sin(f * dt)); // 0 → bump → 0
const decay = (dt, d) => (dt < 0 ? 0 : Math.exp(-d * dt));
// value noise that loops exactly every LOOP seconds (P lattice points per loop)
function pnoise(t, P, seed = 0) {
  const x = (wrapT(t) / LOOP) * P, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i % P, seed), hash((i + 1) % P, seed), u) * 2 - 1;
}
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}

// ---------------------------------------------------------------- visibility (set by renderer per slide call)
const VIS = { x0: 0, x1: W };
const vis = (a, b) => b > VIS.x0 && a < VIS.x1;

// ---------------------------------------------------------------- canvases, sprites, gradient cache
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
let CAN_FILTER = false;
try { const tg = mk(4, 4).getContext('2d'); tg.filter = 'blur(2px)'; CAN_FILTER = tg.filter === 'blur(2px)'; } catch (e) { /* no filter */ }
function blurred(src, px, pad = Math.ceil(px * 2.5)) {
  const c = mk(src.width + pad * 2, src.height + pad * 2), g = c.getContext('2d');
  if (CAN_FILTER) { g.filter = `blur(${px}px)`; g.drawImage(src, pad, pad); g.filter = 'none'; }
  else {
    const f = Math.max(2, px / 2), s = mk(c.width / f, c.height / f), sg = s.getContext('2d');
    sg.imageSmoothingQuality = 'high'; sg.drawImage(src, pad / f, pad / f, src.width / f, src.height / f);
    g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, c.width, c.height);
  }
  c.pad = pad; return c;
}
function soften(src, px) {
  if (!CAN_FILTER) return src;
  const c = mk(src.width, src.height), g = c.getContext('2d');
  g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); g.filter = 'none'; return c;
}
function radial(size, stops) {
  const c = mk(size, size), g = c.getContext('2d'), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
const GC = new WeakMap();
function gcache(g) { let c = GC.get(g); if (!c) { c = {}; GC.set(g, c); } return c; }
function LG(g, key, x0, y0, x1, y1, stops) {
  const c = gcache(g); let gr = c[key];
  if (!gr) { gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, col] of stops) gr.addColorStop(o, col); c[key] = gr; }
  return gr;
}
function RG(g, key, x0, y0, r0, x1, y1, r1, stops) {
  const c = gcache(g); let gr = c[key];
  if (!gr) { gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1); for (const [o, col] of stops) gr.addColorStop(o, col); c[key] = gr; }
  return gr;
}
function cloud(size, seed, rgb) {
  const c = mk(size, size), g = c.getContext('2d');
  for (let k = 0; k < 30; k++) {
    const a = hash(seed, k) * TAU, d = Math.sqrt(hash(seed, k + 50)) * size * 0.25;
    const x = size / 2 + Math.cos(a) * d, y = size / 2 + Math.sin(a) * d * 0.8;
    const r = size * (0.1 + 0.15 * hash(seed, k + 99));
    const al = 0.09 + 0.13 * hash(seed, k + 7);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${rgb},${al})`); gr.addColorStop(0.6, `rgba(${rgb},${al * 0.45})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  return soften(c, 4);
}
function grainTile(size) {
  const c = mk(size, size), g = c.getContext('2d'), im = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = hash(i, 991) * 255, a = 10 + hash(i, 992) * 22;
    im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = a;
  }
  g.putImageData(im, 0, 0); return c;
}
function flameSprite() {
  const c = mk(128, 256), g = c.getContext('2d');
  const tear = (s, bot) => {
    const cx = 64, b = bot, top = bot - 236 * s;
    g.beginPath(); g.moveTo(cx, top);
    g.bezierCurveTo(cx + 12 * s, top + 60 * s, cx + 54 * s, b - 120 * s, cx + 50 * s, b - 58 * s);
    g.bezierCurveTo(cx + 46 * s, b - 14 * s, cx + 22 * s, b, cx, b);
    g.bezierCurveTo(cx - 22 * s, b, cx - 46 * s, b - 14 * s, cx - 50 * s, b - 58 * s);
    g.bezierCurveTo(cx - 54 * s, b - 120 * s, cx - 12 * s, top + 60 * s, cx, top);
    g.closePath();
  };
  let gr = g.createLinearGradient(0, 10, 0, 250);
  gr.addColorStop(0, 'rgba(190,25,0,0)'); gr.addColorStop(0.25, 'rgba(225,45,5,0.42)'); gr.addColorStop(0.52, 'rgba(255,105,18,0.78)');
  gr.addColorStop(0.8, 'rgba(255,165,48,0.95)'); gr.addColorStop(1, 'rgba(255,205,105,1)');
  tear(1, 250); g.fillStyle = gr; g.fill();
  gr = g.createLinearGradient(0, 120, 0, 250);
  gr.addColorStop(0, 'rgba(255,215,120,0)'); gr.addColorStop(0.5, 'rgba(255,232,165,0.75)'); gr.addColorStop(1, 'rgba(255,250,225,1)');
  tear(0.52, 250); g.fillStyle = gr; g.fill();
  return soften(c, 5);
}
function wisp(seed) {
  const c = mk(128, 256), g = c.getContext('2d');
  for (let k = 0; k < 22; k++) {
    const u = k / 21, x = 64 + Math.sin(u * 5 + seed) * 22 + (hash(seed, k) - 0.5) * 18, y = 236 - u * 210, r = 18 + 22 * Math.sin(PI * u) + 8 * hash(seed, k + 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); const a = 0.1 + 0.08 * hash(seed, k + 9);
    gr.addColorStop(0, `rgba(245,238,230,${a})`); gr.addColorStop(1, 'rgba(245,238,230,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  return soften(c, 5);
}

const SPR = {};
function buildBaseSprites() {
  SPR.glow = radial(128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
  SPR.ember = radial(64, [[0, 'rgba(255,252,232,1)'], [0.12, 'rgba(255,214,120,1)'], [0.3, 'rgba(255,130,30,0.55)'], [0.6, 'rgba(255,70,10,0.15)'], [1, 'rgba(255,40,0,0)']]);
  SPR.orange = radial(256, [[0, 'rgba(255,150,50,0.95)'], [0.3, 'rgba(255,100,20,0.45)'], [0.65, 'rgba(220,50,5,0.12)'], [1, 'rgba(180,20,0,0)']]);
  SPR.red = radial(256, [[0, 'rgba(255,60,25,0.85)'], [0.45, 'rgba(190,20,8,0.3)'], [1, 'rgba(120,0,0,0)']]);
  SPR.gold = radial(256, [[0, 'rgba(255,205,90,0.9)'], [0.4, 'rgba(255,160,40,0.32)'], [1, 'rgba(220,110,10,0)']]);
  SPR.cream = radial(128, [[0, 'rgba(255,244,220,1)'], [0.35, 'rgba(255,220,170,0.4)'], [1, 'rgba(255,200,140,0)']]);
  SPR.dark = radial(128, [[0, 'rgba(0,0,0,0.9)'], [0.5, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);
  SPR.smoke = [0, 1, 2, 3].map((i) => cloud(256, 40 + i, '62,50,46'));
  SPR.smokeLit = [0, 1].map((i) => cloud(256, 60 + i, '160,72,40'));
  SPR.steam = [0, 1, 2].map((i) => cloud(256, 80 + i, '240,232,224'));
  SPR.wisp = [0, 1, 2, 3].map((i) => wisp(3 + i * 2.3));
  SPR.flame = flameSprite();
  SPR.grain = grainTile(256);
}

// ---------------------------------------------------------------- typography
const SCR = mk(8, 8).getContext('2d');
const fstr = (font, size) => `${size}px ${font}`;
function capOf(font, size) { SCR.font = fstr(font, size); return SCR.measureText('H').actualBoundingBoxAscent; }
function fillFrom(g, fill, top, base) {
  if (typeof fill === 'string') return fill;
  const gr = g.createLinearGradient(0, top, 0, base);
  for (const [o, c] of fill) gr.addColorStop(o, c);
  return gr;
}
// One glyph (or a whole string) rendered with a full style to its own canvas.
// st: { fill, stroke:[color,w], ext:[depth,color], extX, glow:[color,blur], shine, inner }
function glyph(str, font, size, st) {
  SCR.font = fstr(font, size);
  const m = SCR.measureText(str);
  const ext = st.ext ? st.ext[0] : 0, gl = st.glow ? st.glow[1] : 0, sw = st.stroke ? st.stroke[1] : 0;
  const pad = Math.ceil(10 + ext * 1.1 + gl * 1.3 + sw);
  const L0 = Math.ceil(m.actualBoundingBoxLeft), R0 = Math.ceil(m.actualBoundingBoxRight);
  const A0 = Math.ceil(m.actualBoundingBoxAscent), D0 = Math.ceil(m.actualBoundingBoxDescent);
  const w = L0 + R0 + pad * 2, h = A0 + D0 + pad * 2;
  const c = mk(w, h), g = c.getContext('2d');
  const bx = pad + L0, by = pad + A0, cap = capOf(font, size);
  g.font = SCR.font; g.lineJoin = 'round'; g.miterLimit = 2;
  if (str.trim()) {
    const ex = st.extX ?? 0.32;
    if (st.glow) { g.save(); g.shadowColor = st.glow[0]; g.shadowBlur = st.glow[1]; g.fillStyle = st.glow[0]; g.fillText(str, bx, by); g.fillText(str, bx, by); g.restore(); }
    if (st.ext) {
      const [d, col] = st.ext; g.fillStyle = col;
      for (let i = d; i >= 1; i -= 1) g.fillText(str, bx + i * ex, by + i);
      if (sw) { g.strokeStyle = col; g.lineWidth = sw; g.strokeText(str, bx + d * ex, by + d); }
    }
    if (st.stroke) { g.strokeStyle = st.stroke[0]; g.lineWidth = st.stroke[1]; g.strokeText(str, bx, by); }
    if (st.fill) { g.fillStyle = fillFrom(g, st.fill, by - cap, by); g.fillText(str, bx, by); }
    if (st.shine) {
      g.save(); g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, by - cap, 0, by - cap * 0.5);
      gr.addColorStop(0, `rgba(255,255,255,${st.shine})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, by - cap - 4, w, cap * 0.5 + 4); g.restore();
    }
  }
  // cx, cy = sprite-local center of the cap box (pivot for animation)
  return { c, w, h, bx, by, adv: m.width, cap, cx: bx + (R0 - L0) / 2, cy: by - cap / 2 };
}
// Word split into per-letter sprites sharing one layout.
function word(str, font, size, st, track = 0) {
  SCR.font = fstr(font, size);
  const items = []; let x = 0;
  for (const ch of str) {
    const adv = SCR.measureText(ch).width;
    items.push({ ch, pen: x, adv, g: ch === ' ' ? null : glyph(ch, font, size, st) });
    x += adv + track;
  }
  return { items, width: x - track, size, cap: capOf(font, size), font };
}
function fitSize(str, font, size, maxW, track = 0) {
  SCR.font = fstr(font, size);
  let w = 0; for (const ch of str) w += SCR.measureText(ch).width + track; w -= track;
  return w > maxW ? Math.floor((size * maxW) / w) : size;
}
// draw letter `it` of a word whose left pen is at `left`, baseline `base`.
// o: dx, dy, s, sx, sy, rot, alpha, piv (0 = cap centre, 1 = baseline), spr (override sprite)
function drawLetter(g, it, left, base, o = {}) {
  const G = o.spr || it.g; if (!G) return;
  const a = o.alpha ?? 1; if (a <= 0.003) return;
  const piv = o.piv || 0, pcy = G.cy + (G.cap / 2) * piv;
  const px = left + it.pen + (G.cx - G.bx), py = base - G.cap / 2 + (G.cap / 2) * piv;
  g.save();
  g.translate(px + (o.dx || 0), py + (o.dy || 0));
  if (o.rot) g.rotate(o.rot);
  const sx = o.sx ?? o.s ?? 1, sy = o.sy ?? o.s ?? 1;
  if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  if (a !== 1) g.globalAlpha *= a;
  if (o.comp) g.globalCompositeOperation = o.comp;
  g.drawImage(G.c, -G.cx, -pcy);
  g.restore();
}
function letterCenter(it, left, base) { const G = it.g; return { x: left + it.pen + (G ? G.cx - G.bx : it.adv / 2), y: base - (G ? G.cap / 2 : 0) }; }
// whole-string sprite drawn centred on (x, baseline)
function drawSprite(g, G, x, base, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.003) return;
  g.save();
  g.translate(x + (o.dx || 0), base - G.cap / 2 + (o.dy || 0));
  if (o.rot) g.rotate(o.rot);
  const sx = o.sx ?? o.s ?? 1, sy = o.sy ?? o.s ?? 1;
  if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  if (a !== 1) g.globalAlpha *= a;
  if (o.comp) g.globalCompositeOperation = o.comp;
  g.drawImage(G.c, -G.cx, -G.cy);
  g.restore();
}

// Burn mask: draws sprite G with everything above a jagged burning front removed,
// and a white-hot band just below the front. edge: 0 = front at top (all visible) … 1 = front at bottom (nothing).
const BURN = mk(1400, 700), BX = BURN.getContext('2d');
function burnLetter(g, G, cx, cy, edge, t, seed, s = 1, alpha = 1) {
  if (edge >= 1 || alpha <= 0.003) return;
  const w = G.c.width, h = G.c.height;
  const top = G.cy - G.cap / 2 - 30, bot = G.cy + G.cap / 2 + 34;
  const ey = lerp(top, bot, edge);
  BX.globalCompositeOperation = 'source-over'; BX.globalAlpha = 1;
  BX.clearRect(0, 0, w + 2, h + 2); BX.drawImage(G.c, 0, 0);
  if (edge > 0) {
    BX.globalCompositeOperation = 'source-atop';
    const gr = BX.createLinearGradient(0, ey - 12, 0, ey + 90);
    gr.addColorStop(0, 'rgba(255,255,236,1)'); gr.addColorStop(0.18, 'rgba(255,214,110,1)');
    gr.addColorStop(0.5, 'rgba(255,110,25,0.75)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    BX.fillStyle = gr; BX.fillRect(0, ey - 12, w, 104);
    BX.globalCompositeOperation = 'destination-out';
    BX.beginPath(); BX.moveTo(-2, -2); BX.lineTo(w + 2, -2);
    for (let k = 14; k >= 0; k--) {
      const x = (k / 14) * w;
      const y = ey + 10 * Math.sin(k * 2.1 + seed * 3.7 + t * OM(88)) + 7 * Math.sin(k * 5.3 + seed);
      BX.lineTo(x, y);
    }
    BX.closePath(); BX.fill();
  }
  BX.globalCompositeOperation = 'source-over';
  g.save(); if (alpha !== 1) g.globalAlpha *= alpha;
  g.translate(cx, cy); if (s !== 1) g.scale(s, s);
  g.drawImage(BURN, 0, 0, w, h, -G.cx, -G.cy, w, h);
  g.restore();
  if (edge > 0.02 && edge < 0.98) { // glowing front line
    const yy = cy + (ey - G.cy) * s;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 * alpha;
    g.drawImage(SPR.orange, cx - w * 0.5 * s, yy - 26, w * s, 52); g.restore();
  }
}

// ---------------------------------------------------------------- particles (closed-form, deterministic)
// Rising field (embers/sparks). Life must divide LOOP so the field loops exactly.
function embers(g, t, o) {
  const nc = Math.round(LOOP / o.life);
  g.save(); g.globalCompositeOperation = o.comp || 'lighter';
  const sp = o.spr || SPR.ember;
  for (let i = 0; i < o.n; i++) {
    const ph = hash(o.seed, i), z = t / o.life + ph, cyc = Math.floor(z), u = z - cyc, age = u * o.life;
    const ci = ((cyc % nc) + nc) % nc;
    const r1 = hash(o.seed + 1, i * 16 + ci), r2 = hash(o.seed + 2, i * 16 + ci), r3 = hash(o.seed + 3, i * 16 + ci);
    const x = lerp(o.x0, o.x1, r1) + (o.wind || 0) * age + Math.sin(age * (2 + r3 * 3) + r2 * 9) * (o.wig ?? 26) * u;
    const y = lerp(o.y0, o.y1 ?? o.y0, r3) - o.rise * (0.55 + 0.7 * r2) * u;
    if (x < VIS.x0 - 60 || x > VIS.x1 + 60) continue;
    const I = o.inten ? o.inten(wrapT(t - age), x) : 1; if (I <= 0.01) continue;
    const s = lerp(o.size[0], o.size[1], r3 * r3) * (1 - u * 0.55);
    const fl = 0.7 + 0.3 * Math.sin(t * OM(40) + i * 1.7);
    g.globalAlpha = clamp(I * (o.alpha ?? 1) * Math.sin(PI * Math.min(1, u * 1.1)) * fl);
    g.drawImage(sp, x - s, y - s, s * 2, s * 2);
    if (o.streak && s > 2) { // short motion streak
      g.globalAlpha *= 0.5; g.drawImage(sp, x - s * 0.6 - (o.wind || 0) * 0.03, y - s * 0.6 + o.rise * 0.03, s * 1.2, s * 1.2);
    }
  }
  g.restore();
}
// Soft puffs (smoke / steam). x(tb), y(tb) give the emitter position at birth time.
function puffs(g, t, o) {
  const nc = Math.round(LOOP / o.life);
  g.save(); if (o.comp) g.globalCompositeOperation = o.comp;
  const set = o.sprites;
  for (let i = 0; i < o.n; i++) {
    const ph = hash(o.seed, i), z = t / o.life + ph, cyc = Math.floor(z), u = z - cyc, age = u * o.life;
    const ci = ((cyc % nc) + nc) % nc;
    const r1 = hash(o.seed + 1, i * 16 + ci), r2 = hash(o.seed + 2, i * 16 + ci), r3 = hash(o.seed + 3, i * 16 + ci);
    const tb = wrapT(t - age);
    const I = o.inten ? o.inten(tb) : 1; if (I <= 0.01) continue;
    const ex = o.x ? o.x(tb) : 0, ey = o.y ? o.y(tb) : 0;
    const sz = lerp(o.size[0], o.size[1], Math.sqrt(u)) * (0.7 + 0.6 * r2);
    const x = ex + (r1 - 0.5) * o.spread + (o.drift || 0) * age * (0.7 + 0.6 * r3) + Math.sin(age * 1.3 + r2 * 9) * 22;
    const y = ey - o.rise * u * (0.7 + 0.6 * r3) + (o.yspread ? (r3 - 0.5) * o.yspread : 0);
    if (x + sz < VIS.x0 || x - sz > VIS.x1) continue;
    g.globalAlpha = clamp(o.alpha * I * Math.sin(PI * u) ** 1.1);
    const asp = o.aspect || 1, ww = sz / Math.sqrt(asp), hh = sz * Math.sqrt(asp);
    g.drawImage(set[(i + ci) % set.length], x - ww / 2, y - hh / 2, ww, hh);
  }
  g.restore();
}
// Burst: n particles launched at te with drag + gravity (closed form). wrap: tails continue across the loop.
function burst(g, t, te, o) {
  let age = t - te; if (o.wrap !== false) age = wrapT(age);
  const maxLife = o.life[1] + (o.delayMax || 0);
  if (age < 0 || age > maxLife) return;
  const k = o.drag ?? 1.6, gy = o.g ?? 0;
  g.save(); g.globalCompositeOperation = o.comp || 'lighter';
  for (let i = 0; i < o.n; i++) {
    const r = (j) => hash(o.seed * 31 + j, i);
    const a = age - (o.delay ? o.delay(i, r) : 0);
    const life = lerp(o.life[0], o.life[1], r(1)); if (a < 0 || a > life) continue;
    const ang = lerp(o.ang[0], o.ang[1], r(2)), spd = lerp(o.spd[0], o.spd[1], r(3) ** 0.8);
    const vx = Math.cos(ang) * spd, vy = Math.sin(ang) * spd;
    const e = Math.exp(-k * a), f = (1 - e) / k;
    const x0 = o.x + (r(4) - 0.5) * (o.sx || 0), y0 = o.y + (r(5) - 0.5) * (o.sy || 0);
    const x = x0 + vx * f + (o.wind || 0) * a;
    let y = y0 + (vy - gy / k) * f + (gy / k) * a;
    let cvx = vx * e, cvy = (vy - gy / k) * e + gy / k;
    if (o.floor != null && y > o.floor) { y = o.floor; cvx *= 0.1; cvy = 0; }
    if (x < VIS.x0 - 80 || x > VIS.x1 + 80) continue;
    const u = a / life, sz = lerp(o.size[0], o.size[1], r(6)) * (o.shrink === false ? 1 : 1 - u * 0.6);
    const al = (o.alpha ?? 1) * (1 - u) ** (o.fade ?? 1.2);
    if (al <= 0.01) continue;
    g.globalAlpha = clamp(al);
    if (o.kind === 'spark') {
      const sp = Math.hypot(cvx, cvy), ln = Math.min(o.len ?? 0.035, 0.035) * sp + 2;
      const nx = sp ? cvx / sp : 0, ny = sp ? cvy / sp : 0;
      g.strokeStyle = o.color || 'rgba(255,214,140,1)'; g.lineWidth = sz; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - nx * ln, y - ny * ln); g.stroke();
    } else if (o.kind === 'drop') {
      const sp = Math.hypot(cvx, cvy), st = 1 + Math.min(1.6, sp / 900);
      g.save(); g.translate(x, y); g.rotate(Math.atan2(cvy, cvx));
      g.fillStyle = o.color; g.beginPath(); g.ellipse(0, 0, sz * st, sz, 0, 0, TAU); g.fill();
      g.fillStyle = o.hi || 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(sz * 0.3, -sz * 0.35, sz * 0.38, sz * 0.24, 0, 0, TAU); g.fill();
      g.restore();
    } else if (o.kind === 'puff') {
      const s2 = sz * (1 + u * (o.grow ?? 2));
      const set = o.sprites; g.drawImage(set[i % set.length], x - s2 / 2, y - s2 / 2, s2, s2);
    } else if (o.kind === 'dot') {
      g.fillStyle = o.color; g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill();
    } else {
      const sp = o.spr || SPR.ember; g.drawImage(sp, x - sz, y - sz, sz * 2, sz * 2);
    }
  }
  g.restore();
}
// Shockwave ring (ellipse). flat = ry/rx
function ring(g, t, ti, x, y, o) {
  const dt = t - ti; if (dt < 0 || dt > o.dur) return;
  const p = dt / o.dur, r = lerp(o.r0, o.r1, E.outC(p));
  g.save(); g.globalCompositeOperation = o.comp || 'lighter';
  g.globalAlpha = (o.alpha ?? 1) * (1 - p) ** 1.4;
  g.strokeStyle = o.color || 'rgba(255,170,80,1)'; g.lineWidth = Math.max(0.5, o.w * (1 - p * 0.85));
  g.beginPath(); g.ellipse(x, y, r, r * (o.flat ?? 1), 0, 0, TAU); g.stroke();
  if (o.soft) { g.globalAlpha *= 0.35; g.lineWidth *= 4; g.stroke(); }
  g.restore();
}
// Fire: a row of flame tongues. World-anchored (wx = world offset of local x=0) so rows line up across seams.
function flames(g, t, x0, x1, base, hgt, o = {}) {
  const sp = o.spacing || 34, wx = o.wx || 0, seed = o.seed || 0;
  const i0 = Math.floor((x0 + wx) / sp) - 2, i1 = Math.ceil((x1 + wx) / sp) + 2;
  g.save(); g.globalCompositeOperation = o.comp || 'lighter';
  for (let layer = 0; layer < (o.layers || 2); layer++) {
    for (let i = i0; i <= i1; i++) {
      const r1 = hash(i, seed + layer * 7), r2 = hash(i, seed + 13 + layer * 7);
      const xw = i * sp + (r1 - 0.5) * sp * 0.9, x = xw - wx;
      if (x < VIS.x0 - 120 || x > VIS.x1 + 120) continue;
      const env = o.env ? o.env(x, xw) : 1; if (env <= 0.01) continue;
      const n = 0.5 + 0.5 * pnoise(t + r1 * 3, 22, i * 3 + layer + seed);
      const h = hgt * env * (0.42 + 0.58 * n) * (layer ? 0.62 : 1) * (0.75 + 0.5 * r2);
      if (h < 6) continue;
      const w = (o.width || 74) * (0.7 + 0.6 * r2) * (layer ? 0.75 : 1) * (0.6 + 0.4 * Math.min(1, h / 200));
      const sway = pnoise(t + r2 * 5, 14, i + 77 + seed) * h * 0.22;
      g.globalAlpha = (o.alpha ?? 1) * (layer ? 1 : 0.85);
      g.save(); g.translate(x, base); g.transform(1, 0, -sway / h, 1, 0, 0);
      g.drawImage(SPR.flame, -w / 2, -h, w, h * 1.02); g.restore();
    }
  }
  // base bed of light + embers spitting off the tips
  if (o.bed !== false) {
    g.globalAlpha = (o.alpha ?? 1) * 0.55; g.drawImage(SPR.orange, x0 - 80, base - hgt * 0.55, x1 - x0 + 160, hgt * 1.1);
  }
  if (o.licks !== false) {
    const sp2 = sp * 1.4, nl = Math.ceil((x1 - x0) / sp2) + 2;
    for (let j = 0; j < nl; j++) {
      const idx = Math.floor((x0 + wx) / sp2) + j, life = LOOP / 8, u = frac(t / life + hash(idx, seed + 91));
      const xw = idx * sp2 + hash(idx, seed + 92) * sp2, x = xw - wx;
      const env = o.env ? o.env(x, xw) : 1; if (env <= 0.05) continue;
      const y = base - hgt * env * (0.5 + 1.1 * u), s = (4 + 7 * hash(idx, seed + 93)) * (1 - u * 0.6);
      g.globalAlpha = (o.alpha ?? 1) * Math.sin(PI * u);
      g.drawImage(SPR.ember, x + Math.sin(u * 7 + idx) * 14 - s * 2, y - s * 2, s * 4, s * 4);
    }
  }
  g.restore();
}
// drip shape with a bulb, hanging from (x, y0)
function dripPath(g, x, y0, w, len) {
  if (len < 2) return;
  const b = Math.min(w * 0.6, len * 0.45);
  g.moveTo(x - w / 2, y0);
  g.bezierCurveTo(x - w / 2, y0 + len * 0.45, x - b * 0.7, y0 + len - b * 2.1, x - b, y0 + len - b);
  g.arc(x, y0 + len - b, b, PI, 0, true);
  g.bezierCurveTo(x + b * 0.7, y0 + len - b * 2.1, x + w / 2, y0 + len * 0.45, x + w / 2, y0);
  g.closePath();
}
function rrect(g, x, y, w, h, r) {
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r); g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
}

// ---------------------------------------------------------------- image assets (files in assets/, embedded by build.py)
// IMG['logo'] is the HTMLImageElement for assets/logo.png (name = file name without extension).
const IMG = {};
function loadAssets() {
  const src = window.__ASSETS || {};
  return Promise.all(Object.entries(src).map(([name, url]) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[name] = im; res(); };
    im.onerror = () => { console.warn('asset failed to load:', name); res(); };
    im.src = url;
  })));
}
// draw an asset centred on (x, y) at width w (height keeps aspect unless h given). o: rot, alpha, comp
function drawImg(g, name, x, y, w, h, o = {}) {
  const im = IMG[name]; if (!im) return;
  const hh = h || (w * im.naturalHeight) / im.naturalWidth;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.alpha != null) g.globalAlpha *= o.alpha; if (o.comp) g.globalCompositeOperation = o.comp;
  g.drawImage(im, -w / 2, -hh / 2, w, hh); g.restore();
}
