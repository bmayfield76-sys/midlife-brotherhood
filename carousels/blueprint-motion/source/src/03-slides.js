// ================================================================== SLIDES · The Midlife Comeback Blueprint (free download)
// 8 s loops = 3 bars at 90 BPM. Big hits land on snares: SN(1)=0.67, SN(3)=2.0, SN(5)=3.33, SN(7)=4.67, SN(9)=6.0, SN(11)=7.33.
// Text is fully readable at frame 0 and settles back to the same state by the loop end.
const hitIn = (t, te, d = 9) => (t >= te ? decay(t - te, d) : 0);
const bounceIn = (t, te, f = 20, d = 8) => kick(t - te, f, d);
const popIn = (t, a, d = 0.3, s = 2.2) => E.outBack(seg(t, a, a + d), s);
const RESET = (t) => 1 - E.ioS(seg(t, 7.15, 7.85));
function card(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); rrect(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function monoText(g, s, x, y, size, col, align = 'left') { g.font = fstr(FM, size); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); g.textAlign = 'left'; }
function popText(g, s, x, y, font, size, col, align = 'center') { g.font = fstr(font, size); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); g.textAlign = 'left'; }

// ================================================================== 01 · HOOK — the headline fades out, the pulse slams it back to full power
const S1 = {
  shakes: [[SN(7), 20]], zooms: [[SN(7), 0.04]], flashes: [[SN(7), 0.35, '230,30,40']],
  spikes: [[SN(7), 1.0], [SN(1), 0.3]],
};
S1.build = () => {
  S1.head = layoutText('', F8, 108, 900, TX.white, { top: 300, lh: 1.0, lines: [['YOU'], ['WEREN’T', 'MEANT'], ['TO', 'FADE', 'OUT.']], styleFor: (w) => (w === 'FADE' || w === 'OUT.' ? TX.red : null) });
  S1.sub = glyph('The Midlife Comeback Blueprint', F7, 42, TX.plain);
  S1.swipe = glyph('SWIPE', FM, 26, { fill: C.white });
  S1.chev = glyph('>', F8, 44, { fill: C.red });
};
S1.power = (t) => { // 1 = full power; drains, flickers, slams back on the snare
  if (t < 2.0) return 1;
  if (t < SN(7)) { const d = E.ioS(seg(t, 2.0, 4.3)); const fl = t > 4.0 ? (Math.floor(t * 28) % 3 === 0 ? 0.5 : 1) : 1; return (1 - 0.82 * d) * fl; }
  return 1;
};
S1.back = (g, t) => {
  if (!vis(0, W)) return;
  const p = S1.power(t);
  drawLogo(g, 'wolf', 760, 560 + 14 * Math.sin(t * OM(1)), 560, { alpha: 0.05 + 0.06 * p, eye: 1.5 * hitIn(t, SN(7), 2.2) });
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2 + 0.5 * p * hitIn(t, SN(7), 2) + 0.15 * p; g.drawImage(SPR.red, 80, 150, 920, 760); g.restore();
};
S1.mid = (g, t) => {
  if (!vis(0, W)) return;
  // power meter: ten cells drain with the fade, refill instantly on the slam
  const p = S1.power(t), x0 = 190, y0 = 930, cw = 62, gap = 8, lit = Math.round(p * 10);
  for (let i = 0; i < 10; i++) {
    const on = i < lit, x = x0 + i * (cw + gap), pop = 1 + 0.25 * hitIn(t, SN(7) + i * 0.025, 8);
    g.save(); g.translate(x + cw / 2, y0 + 30); g.scale(1, pop);
    card(g, -cw / 2, -30, cw, 60, 8, on ? (i < 3 ? C.red : '#f2f2f2') : 'rgba(255,255,255,0.07)');
    g.restore();
  }
  monoText(g, p < 0.4 ? 'FADING...' : 'FULL POWER', 540, y0 + 100, 22, p < 0.4 ? C.red : 'rgba(255,255,255,0.7)', 'center');
  ring(g, t, SN(7), 540, 480, { r0: 200, r1: 820, dur: 0.9, w: 10, color: 'rgba(230,30,40,1)', alpha: 0.8 });
};
S1.front = (g, t) => {
  burst(g, t, SN(7), { n: 44, seed: 11, x: 540, y: 480, sx: 700, sy: 300, ang: [0, TAU], spd: [300, 1200], life: [0.4, 1.1], g: 600, drag: 1.5, size: [2, 5], kind: 'spark', color: 'rgba(255,90,90,1)', wrap: false });
  if (!vis(0, W)) return;
  const p = S1.power(t);
  drawText(g, S1.head, (it) => ({ alpha: clamp(0.12 + 0.88 * p), s: 1 + 0.025 * hitIn(t, SN(7) + it.wi * 0.02, 7), dy: -20 * bounceIn(t, SN(7) + it.wi * 0.03, 16, 7) }));
  drawSprite(g, S1.sub, 540, 760, { alpha: 0.95 });
  card(g, 540 - 70, 790, 140, 52, 26, C.red); popText(g, 'FREE', 540, 818, F8, 30, '#ffffff');
  const nudge = 14 * decay(t % BEAT, 7);
  drawSprite(g, S1.swipe, 830, 1232, {});
  for (let i = 0; i < 3; i++) drawSprite(g, S1.chev, 915 + i * 30 + nudge, 1236, { alpha: 0.35 + 0.65 * decay(wrapT(t - i * 0.08) % BEAT, 5) });
  chrome(g, 0, t);
};

// ================================================================== 02 · THE OLD STORY — four lines, each gets stamped with a red X
const S2 = {
  shakes: [[SN(1), 5], [SN(2), 5], [SN(3), 5], [SN(4), 5], [SN(7), 9]], zooms: [[SN(7), 0.015]], flashes: [],
  spikes: [[SN(1), 0.35], [SN(2), 0.35], [SN(3), 0.35], [SN(4), 0.35], [SN(7), 0.9]],
  LINES: ['Declining energy is just aging.', 'Weight gain is inevitable after 40.', 'Losing drive comes with age.', 'Your best years are behind you.'],
  TOP: 420, RH: 132,
};
S2.build = () => {
  S2.title = glyph('THE OLD STORY', F8, 96, TX.white);
  S2.end = layoutText('None of it was yours.', F8, 70, 960, TX.white, { top: 975, styleFor: (w) => (w === 'yours.' ? TX.red : null) });
};
S2.xT = (i) => SN(1 + i);
S2.mid = (g, t) => {
  if (!vis(0, W)) return;
  S2.LINES.forEach((s, i) => {
    const y = S2.TOP + i * S2.RH, tx = S2.xT(i), x = E.outBack(seg(t, tx, tx + 0.18), 2.4) * RESET(t), dim = clamp(x);
    card(g, 90, y, 900, S2.RH - 22, 16, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.12)');
    popText(g, s, 520, y + (S2.RH - 22) / 2 + 2, F7, 38, dim > 0.5 ? 'rgba(255,255,255,0.55)' : '#ffffff');
    if (x > 0.01) { // the X
      const cy = y + (S2.RH - 22) / 2; g.font = fstr(F7, 38); const tw = g.measureText(s).width;
      g.save(); g.globalAlpha = clamp(x); g.fillStyle = C.red; g.fillRect(520 - tw / 2 - 10, cy - 4, (tw + 20) * clamp(x), 8);
      g.translate(945, cy); g.scale(x, x); g.fillStyle = C.red; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(-11, -11); g.lineTo(11, 11); g.moveTo(-11, 11); g.lineTo(11, -11); g.stroke(); g.restore();
    }
    burst(g, t, tx, { n: 10, seed: 20 + i, x: 540, y: y + 55, sx: 700, sy: 40, ang: [-PI, 0], spd: [200, 500], life: [0.3, 0.6], g: 1200, drag: 1.2, size: [2, 4], kind: 'spark', color: 'rgba(255,80,80,1)', wrap: false });
  });
};
S2.front = (g, t) => {
  if (!vis(0, W)) return;
  // the title tears like an old page each time a line gets stamped
  const tear = [0, 1, 2, 3].reduce((m, i) => Math.max(m, hitIn(t, S2.xT(i), 14)), 0);
  drawSprite(g, S2.title, 540 - 8 * tear, 320, {}); if (tear > 0.05) drawSprite(g, S2.title, 540 + 8 * tear, 320, { alpha: 0.4 * tear, comp: 'lighter' });
  drawText(g, S2.end, (it) => ({ dy: -16 * bounceIn(t, SN(7) + it.wi * 0.05, 16, 7), s: 1 + 0.06 * hitIn(t, SN(7), 5) }));
  chrome(g, 1, t);
};

// ================================================================== 03 · THE REAL PROBLEM — slot reel spins AGE out, lands PROTOCOL
const S3 = {
  shakes: [[SN(5), 16]], zooms: [[SN(5), 0.025]], flashes: [[SN(5), 0.18, '230,30,40']],
  spikes: [[SN(5), 1.0], [SN(1), 0.4]],
  REEL: ['AGE', 'GENES', 'LUCK', 'TIME', 'PROTOCOL'], WX: 110, WY: 470, WW: 860, WH: 220,
};
S3.build = () => {
  S3.w = S3.REEL.map((s, i) => { const sz = fitSize(s, F8, 150, 780); return glyph(s, F8, sz, i === 0 ? TX.white : i === 4 ? TX.red : { fill: '#6a6a6a' }); });
  S3.topA = glyph('YOU DON’T HAVE AN', F7, 54, TX.plain); S3.topB = glyph('YOU HAVE A', F7, 54, TX.plain);
  S3.prob = glyph('PROBLEM.', F8, 110, TX.white);
  S3.body = layoutText('The right nutrition strategy for your current physiology changes everything.', F5, 34, 860, TX.grey, { top: 900, lh: 1.42 });
};
S3.idx = (t) => { // reel position, 0 = AGE, 4 = PROTOCOL; wraps back to AGE (5 = 0)
  if (t < SN(3)) return 0;
  if (t < 7.25) return 4 * E.outBack(seg(t, SN(3), SN(5)), 1.15);
  return 4 + E.ioS(seg(t, 7.25, 7.9));
};
S3.mid = (g, t) => {
  if (!vis(0, W)) return;
  const { WX, WY, WW, WH } = S3, id = S3.idx(t), n = S3.REEL.length, sp = t > SN(3) && t < SN(5) ? 1 - seg(t, SN(3), SN(5)) : 0;
  card(g, WX, WY, WW, WH, 22, '#0c0c0c', C.red, 6);
  g.save(); g.beginPath(); rrect(g, WX + 6, WY + 6, WW - 12, WH - 12, 18); g.clip();
  for (let k = Math.floor(id) - 1; k <= Math.floor(id) + 2; k++) {
    const G = S3.w[((k % n) + n) % n], dy = (k - id) * WH;
    drawSprite(g, G, 540, WY + WH / 2 + G.cap / 2 + dy, { alpha: 1 - 0.5 * sp });
    if (sp > 0.2) drawSprite(g, G, 540, WY + WH / 2 + G.cap / 2 + dy - 40 * sp, { alpha: 0.25 * sp });
  }
  // strike through AGE before the spin
  const st = E.outC(seg(t, SN(1), SN(1) + 0.3)) * (t < SN(3) ? 1 : 0);
  if (st > 0) { g.fillStyle = C.red; const ww = S3.w[0].w * 0.8; g.fillRect(540 - ww / 2, WY + WH / 2 - 6, ww * st, 12); }
  g.fillStyle = LG(g, 'reelshade', 0, WY, 0, WY + WH, [[0, 'rgba(0,0,0,0.85)'], [0.25, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]); g.fillRect(WX, WY, WW, WH);
  g.restore();
  // lever on the right that pulls on the snare
  const pull = E.outQ(seg(t, SN(3) - 0.25, SN(3))) * (1 - E.outBack(seg(t, SN(3), SN(3) + 0.4), 2));
  g.strokeStyle = '#bdbdbd'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(WX + WW + 6, WY + WH / 2); g.lineTo(WX + WW + 40, WY + WH / 2 - 90 + 160 * pull); g.stroke();
  g.fillStyle = C.red; g.beginPath(); g.arc(WX + WW + 40, WY + WH / 2 - 90 + 160 * pull, 20, 0, TAU); g.fill();
  ring(g, t, SN(5), 540, WY + WH / 2, { r0: 300, r1: 760, dur: 0.8, w: 7, flat: 0.4, color: 'rgba(230,30,40,1)', alpha: 0.7 });
};
S3.front = (g, t) => {
  if (!vis(0, W)) return;
  const id = S3.idx(t), b = id > 2.5 && id < 4.5 ? 1 : 0, mixB = b ? seg(t, SN(5) - 0.1, SN(5) + 0.15) : 0;
  drawSprite(g, S3.topA, 540, 430, { alpha: 1 - mixB }); drawSprite(g, S3.topB, 540, 430, { alpha: mixB, s: 1 + 0.1 * hitIn(t, SN(5), 6) });
  drawSprite(g, S3.prob, 540, 830, { dy: -14 * bounceIn(t, SN(5) + 0.05, 16, 7) });
  drawText(g, S3.body); chrome(g, 2, t);
};

// ================================================================== 04 · THE SIX PILLARS — an ecosystem lights up node by node
const S4 = {
  shakes: [[SN(7), 10]], zooms: [[SN(7), 0.02]], flashes: [[SN(7), 0.14, '230,30,40']],
  spikes: [[SN(7), 1.0], [SN(1), 0.3], [SN(4), 0.3]],
  P: ['BODY', 'MIND', 'PURPOSE', 'FINANCES', 'RELATIONSHIPS', 'BROTHERHOOD'], CX: 540, CY: 770, R: 255,
};
S4.build = () => {
  S4.title = glyph('THE SIX PILLARS', F8, 88, TX.white);
  S4.sub = layoutText('Fix one, and the others get easier.', F5, 36, 900, TX.grey, { top: 352 });
};
S4.pos = (i) => { const a = -PI / 2 + (i / 6) * TAU; return [S4.CX + Math.cos(a) * S4.R, S4.CY + Math.sin(a) * S4.R, a]; };
S4.on = (i, t) => popIn(t, SN(1 + i), 0.3, 2.6) * RESET(t);
S4.mid = (g, t) => {
  if (!vis(0, W)) return;
  const { CX, CY } = S4;
  // rim and spokes
  for (let i = 0; i < 6; i++) {
    const [x, y] = S4.pos(i), [x2, y2] = S4.pos((i + 1) % 6), on = clamp(S4.on(i, t)), on2 = clamp(S4.on((i + 1) % 6, t));
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    const p = Math.min(on, on2); if (p > 0) { g.strokeStyle = C.red; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(lerp(x, x2, p), lerp(y, y2, p)); g.stroke(); }
    const sp = E.outC(seg(t, SN(7), SN(7) + 0.35)) * RESET(t);
    g.strokeStyle = sp > 0 ? `rgba(230,30,40,${0.3 + 0.6 * sp})` : 'rgba(255,255,255,0.08)'; g.lineWidth = 3; g.beginPath(); g.moveTo(CX, CY); g.lineTo(lerp(CX, x, Math.max(sp, 1)), lerp(CY, y, Math.max(sp, 1))); g.stroke();
  }
  // centre hub
  const hub = 1 + 0.2 * hitIn(t, SN(7), 5);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * hitIn(t, SN(7), 2) + 0.15; g.drawImage(SPR.red, CX - 160, CY - 160, 320, 320); g.restore();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(CX, CY, 46 * hub, 0, TAU); g.fill(); popText(g, 'YOU', CX, CY + 2, F8, 26 * hub, C.ink);
  ring(g, t, SN(7), CX, CY, { r0: 50, r1: 420, dur: 0.8, w: 7, color: 'rgba(230,30,40,1)', alpha: 0.8 });
  // nodes
  for (let i = 0; i < 6; i++) {
    const [x, y, a] = S4.pos(i), on = S4.on(i, t), s = 1 + 0.18 * (on > 0 ? kick(t - SN(1 + i), 14, 6) : 0), r = 54 * s;
    g.fillStyle = on > 0.5 ? C.red : '#262626'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = on > 0.5 ? '#ffffff' : 'rgba(255,255,255,0.4)'; g.lineWidth = 3; g.stroke();
    popText(g, String(i + 1).padStart(2, '0'), x, y + 2, F8, 36, '#ffffff');
    const lx = x + Math.cos(a) * 92, ly = y + Math.sin(a) * 78;
    monoText(g, S4.P[i], lx, ly, 20, on > 0.5 ? '#ffffff' : 'rgba(255,255,255,0.65)', Math.abs(Math.cos(a)) < 0.2 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right');
  }
};
S4.front = (g, t) => {
  if (!vis(0, W)) return;
  drawSprite(g, S4.title, 540, 300, { s: 1 + 0.05 * hitIn(t, SN(7), 5) });
  drawText(g, S4.sub, (it) => ({ alpha: 0.9 }));
  chrome(g, 3, t);
};

// ================================================================== 05 · BODY FIRST — column 01 slams up, the other five follow like dominoes
const S5 = {
  shakes: [[SN(3), 18]], zooms: [[SN(3), 0.03]], flashes: [[SN(3), 0.16, '230,30,40']],
  spikes: [[SN(3), 1.0], [SN(5), 0.4]], spikeX: 160,
  P: ['BODY', 'MIND', 'PURPOSE', 'FINANCES', 'RELATIONSHIPS', 'BROTHERHOOD'], X0: 120, CW: 118, GAP: 26, HMAX: 360,
};
S5.build = () => {
  S5.head = layoutText('', F8, 124, 980, TX.white, { top: 215, lh: 1.0, lines: [['BODY'], ['FIRST.']], styleFor: (w) => (w === 'BODY' ? TX.red : null) });
  S5.body = layoutText('', F7, 42, 960, TX.plain, { top: 520, lh: 1.25, lines: [['You', 'can’t', 'think', 'your', 'way', 'to', 'a', 'comeback.'], ['You', 'have', 'to', 'earn', 'it.']] });
};
S5.h = (i, t) => { // column height 0..1
  const down = E.inBack(seg(t, 0.35, 0.75), 1.4), lo = 0.12;
  if (t < 0.35) return 1;
  const tu = i === 0 ? SN(3) - 0.12 : SN(3) + 0.1 + i * 0.13;
  const up = i === 0 ? E.outQuart(seg(t, tu, SN(3))) : E.outBack(seg(t, tu, tu + 0.28), 2.2);
  return lerp(lerp(1, lo, down), 1, up) + (i === 0 ? 0.06 * kick(t - SN(3), 18, 6) : 0);
};
S5.mid = (g, t) => {
  if (!vis(0, W)) return;
  const base = LINE - 6, { X0, CW, GAP, HMAX } = S5, red0 = RESET(t);
  for (let i = 0; i < 6; i++) {
    const x = X0 + i * (CW + GAP), h = HMAX * clamp(S5.h(i, t), 0, 1.2), isBody = i === 0;
    const fill = isBody && t >= SN(3) - 0.12 ? (red0 > 0.5 ? C.red : '#3a3a3a') : (t >= SN(3) + 0.1 + i * 0.13 && red0 > 0.5 ? '#e9e9e9' : '#3a3a3a');
    card(g, x, base - h, CW, h, 10, fill);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + CW * 0.7, base - h + 6, CW * 0.22, Math.max(0, h - 12));
    if (h > 120) {
      g.save(); g.translate(x + CW / 2, base - 20); g.rotate(-PI / 2); g.beginPath(); g.rect(0, -CW / 2, h - 30, CW); g.clip();
      g.font = fstr(F8, 30); g.fillStyle = fill === '#e9e9e9' ? C.ink : '#ffffff'; g.textBaseline = 'middle'; g.fillText(S5.P[i], 6, 2); g.restore();
    }
    popText(g, String(i + 1).padStart(2, '0'), x + CW / 2, base - h - 30, F8, 30, isBody ? C.red : 'rgba(255,255,255,0.6)');
  }
  ring(g, t, SN(3), X0 + CW / 2, base - 10, { r0: 40, r1: 1100, dur: 1.0, w: 8, flat: 0.12, color: 'rgba(230,30,40,1)', alpha: 0.8 });
  burst(g, t, SN(3), { n: 26, seed: 51, x: X0 + CW / 2, y: base - S5.HMAX, sx: CW, ang: [-PI * 0.9, -PI * 0.1], spd: [300, 900], life: [0.4, 0.9], g: 1500, drag: 1.3, size: [2, 5], kind: 'spark', color: 'rgba(255,90,90,1)', wrap: false });
};
S5.front = (g, t) => {
  if (!vis(0, W)) return;
  drawText(g, S5.head, (it) => (it.w === 'BODY' ? { s: 1 + 0.14 * hitIn(t, SN(3), 6), dy: -18 * bounceIn(t, SN(3), 16, 7) } : { dy: 10 * bounceIn(t, SN(3) + 0.08, 16, 7) }));
  drawText(g, S5.body);
  chrome(g, 4, t);
};

// ================================================================== 06 · THE ASSESSMENT — the needle sweeps your four zones and locks
const S6 = {
  shakes: [[SN(7), 14]], zooms: [[SN(7), 0.02]], flashes: [[SN(7), 0.12, '230,30,40']],
  spikes: [[SN(7), 1.0], [SN(3), 0.4]],
  CX: 540, CY: 1050, R: 330, ZONES: [[0, 25, 'DANGER ZONE', '#d7141e'], [26, 42, 'CROSSROADS', '#8a1016'], [43, 56, 'MAINTAINING', '#6a6a6a'], [57, 70, 'AHEAD', '#e9e9e9']],
};
S6.build = () => {
  S6.head = layoutText('', F8, 82, 960, TX.white, { top: 215, lh: 1.04, lines: [['WHERE', 'ARE', 'YOU'], ['RIGHT', 'NOW?']] });
  S6.sub = glyph('Score yourself out of 70.', F7, 40, TX.plain);
};
S6.score = (t) => {
  if (t < 0.3) return 0;
  if (t < SN(3)) return 70 * E.outC(seg(t, 0.3, SN(3)));
  if (t < SN(5)) return lerp(70, 18, E.ioS(seg(t, SN(3), SN(5))));
  if (t < 7.2) return lerp(18, 38, E.outC(seg(t, SN(5), SN(7)))) + (t > SN(7) ? 4 * damp(t - SN(7), 30, 6) : 0);
  return 38 * (1 - E.ioS(seg(t, 7.2, 7.9)));
};
S6.ang = (s) => PI + (s / 70) * PI;
S6.mid = (g, t) => {
  if (!vis(0, W)) return;
  const { CX, CY, R } = S6, s = S6.score(t);
  // zone arcs
  S6.ZONES.forEach(([a, b, nm, col], i) => {
    const a0 = S6.ang(a === 0 ? 0 : a - 0.5), a1 = S6.ang(b + 0.5), inZone = s >= a - 0.5 && s < b + 0.5 && t > SN(7) && t < 7.2;
    g.strokeStyle = col; g.globalAlpha = inZone ? 1 : 0.75; g.lineWidth = inZone ? 64 : 50; g.lineCap = 'butt';
    g.beginPath(); g.arc(CX, CY, R, a0 + 0.01, a1 - 0.01); g.stroke(); g.globalAlpha = 1;
    const am = (a0 + a1) / 2, lx = CX + Math.cos(am) * (R + 70), ly = CY + Math.sin(am) * (R + 52);
    monoText(g, nm, lx, ly, inZone ? 22 : 18, inZone ? '#ffffff' : 'rgba(255,255,255,0.6)', 'center');
    if (inZone) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * hitIn(t, SN(7), 2); g.drawImage(SPR.red, lx - 120, ly - 60, 240, 120); g.restore(); }
  });
  // ticks
  for (let k = 0; k <= 70; k += 5) { const a = S6.ang(k), r0 = R - 40, r1 = R - (k % 10 === 0 ? 62 : 52); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); g.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); g.stroke(); }
  // needle with motion ghosts while sweeping
  const a = S6.ang(s), spd = Math.abs(S6.score(t) - S6.score(t - 0.04));
  for (let k = 1; k <= 4 && spd > 0.6; k++) { const ag = S6.ang(S6.score(t - k * 0.03)); g.strokeStyle = `rgba(255,255,255,${0.12 * (5 - k) / 4})`; g.lineWidth = 8; g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX + Math.cos(ag) * (R - 70), CY + Math.sin(ag) * (R - 70)); g.stroke(); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(CX - Math.cos(a) * 30, CY - Math.sin(a) * 30); g.lineTo(CX + Math.cos(a) * (R - 70), CY + Math.sin(a) * (R - 70)); g.stroke();
  g.fillStyle = C.red; g.beginPath(); g.arc(CX, CY, 22, 0, TAU); g.fill();
  // score readout
  popText(g, String(Math.round(clamp(s, 0, 70))), CX, CY - 120, F8, 96, '#ffffff'); monoText(g, '/ 70', CX, CY - 56, 22, 'rgba(255,255,255,0.6)', 'center');
  ring(g, t, SN(7), CX, CY, { r0: 60, r1: 520, dur: 0.8, w: 7, flat: 0.5, color: 'rgba(230,30,40,1)', alpha: 0.7 });
};
S6.front = (g, t) => {
  if (!vis(0, W)) return;
  drawText(g, S6.head, (it) => ({ dy: -8 * bounceIn(t, SN(7) + it.wi * 0.04, 18, 8) }));
  drawSprite(g, S6.sub, 540, 470);
  chrome(g, 5, t);
};

// ================================================================== 07 · CTA — THE MIDLIFE COMEBACK BLUEPRINT · FREE (red slide, the wolf howls)
const S7 = {
  shakes: [[SN(1), 14], [SN(3), 10]], zooms: [[SN(1), 0.03]], flashes: [[SN(1), 0.18, '255,255,255']],
  spikes: [[SN(1), 0.9], [SN(3), 0.6]],
  SY: 290, SW: 250,
};
S7.build = () => {
  S7.t1 = word('THE MIDLIFE', F8, 92, { fill: C.white, ext: [6, '#5a050a'], extX: 0 }, 3);
  S7.t2 = word('COMEBACK', F8, 120, { fill: C.white, ext: [7, '#5a050a'], extX: 0 }, 3);
  S7.t3 = word('BLUEPRINT', F8, 120, { fill: C.white, ext: [7, '#5a050a'], extX: 0 }, 3);
  S7.sub = glyph('From fade-out to full power in 90 days.', F5, 36, { fill: 'rgba(255,255,255,0.94)' });
  S7.btn = glyph('LINK IN BIO', F8, 44, { fill: C.red });
  S7.arrow = glyph('↓', F8, 44, { fill: C.red });
  S7.handle = glyph('@midlifebrotherhood', FM, 24, { fill: 'rgba(255,255,255,0.85)' });
};
S7.back = (g, t) => {
  if (!vis(0, W)) return;
  g.save(); g.translate(540, S7.SY); g.rotate(t * OM(1) / 8); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.fillStyle = 'rgba(255,255,255,0.035)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -900); g.lineTo(90, -900); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalAlpha = 0.5; g.drawImage(SPR.dark, -200, 820, W + 400, 900); g.restore();
};
S7.mid = (g, t) => {
  if (!vis(0, W)) return;
  const pre = E.inQ(seg(t, 0.3, SN(1))), s = t < SN(1) ? 1 - 0.08 * pre : 1 + 0.1 * damp(t - SN(1), 20, 7);
  drawLogo(g, 'shield', 540, S7.SY - 6 * Math.sin(t * OM(2)), S7.SW * s, { eye: 0.35 + 1.4 * hitIn(t, SN(1), 1.6) + 0.4 * hitIn(t, SN(7), 3) });
  const mx = 540 - 60, my = S7.SY - 95;
  for (let k = 0; k < 4; k++) {
    const dt = t - SN(1) - k * 0.14; if (dt < 0 || dt > 1.4) continue; const p = dt / 1.4;
    g.save(); g.strokeStyle = `rgba(255,255,255,${0.75 * (1 - p)})`; g.lineWidth = 6 * (1 - p) + 1.5; g.lineCap = 'round';
    g.beginPath(); g.arc(mx, my, 40 + 200 * E.outC(p), -PI * 0.95, -PI * 0.6); g.stroke(); g.restore();
  }
};
S7.front = (g, t) => {
  if (!vis(0, W)) return;
  const wave = (Wd, base, amp, dl) => { const left = 540 - Wd.width / 2; Wd.items.forEach((it, i) => { let dy = 0; for (const tb of [SN(1), SN(5), SN(9)]) dy -= amp * bounceIn(t, tb + dl + i * 0.035, 16, 7); drawLetter(g, it, left, base, { dy, piv: 1 }); }); };
  wave(S7.t1, 560, 14, 0.04); wave(S7.t2, 690, 20, 0.08); wave(S7.t3, 815, 20, 0.12);
  // FREE stamp slams onto the title on the second snare
  const fs = t < SN(3) - 0.25 ? 1 : t < SN(3) ? lerp(2.4, 1, E.inQ(seg(t, SN(3) - 0.25, SN(3)))) : 1 - 0.07 * damp(t - SN(3), 30, 8);
  g.save(); g.translate(835, 300); g.rotate(-0.16); g.scale(fs, fs); card(g, -95, -40, 190, 80, 12, '#ffffff'); popText(g, 'FREE', 0, 3, F8, 50, C.red); g.restore();
  drawSprite(g, S7.sub, 540, 885);
  const b = decay(t % BEAT, 6), s = 1 + 0.05 * b, by = 1010;
  g.save(); g.translate(540, by); g.scale(s, s); g.fillStyle = '#ffffff'; g.beginPath(); rrect(g, -220, -46, 440, 92, 46); g.fill(); g.restore();
  drawSprite(g, S7.btn, 510, by + 16, { s });
  drawSprite(g, S7.arrow, 690, by + 16 + 8 * Math.sin(t * OM(12)), { s });
  drawSprite(g, S7.handle, 540, 1225);
  chrome(g, N - 1, t);
};

function fallY(t, t0, t1, h0, bounce = 0.06) {
  if (t < t0) return { vis: false, y: h0 };
  if (t < t1) { const u = (t - t0) / (t1 - t0); return { vis: true, y: h0 * (1 - u * u) }; }
  const dt = t - t1, T = t1 - t0, hb = h0 * bounce, tb = 2 * T * Math.sqrt(bounce);
  let y = 0; if (dt < tb) { const v = dt / tb; y = hb * 4 * v * (1 - v); }
  return { vis: true, y };
}

const SL = [S1, S2, S3, S4, S5, S6, S7];
