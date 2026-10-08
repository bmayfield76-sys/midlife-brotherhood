// ================================================================== SLIDES · 7 Dating Rules I Learned The Hard Way
// 8 s loops = 3 bars at 90 BPM. Big hits land on snares: SN(1)=0.67, SN(3)=2.0, SN(5)=3.33, SN(7)=4.67, SN(9)=6.0, SN(11)=7.33.
// Text is fully readable at frame 0 and settles back to the same state by the loop end.
const hitIn = (t, te, d = 9) => (t >= te ? decay(t - te, d) : 0);
const bounceIn = (t, te, f = 20, d = 8) => kick(t - te, f, d);
// fall from h0 px above rest between t0..t1, then little bounces
function fallY(t, t0, t1, h0, bounce = 0.06) {
  if (t < t0) return { vis: false, y: h0 };
  if (t < t1) { const u = (t - t0) / (t1 - t0); return { vis: true, y: h0 * (1 - u * u) }; }
  const dt = t - t1, T = t1 - t0, hb = h0 * bounce, tb = 2 * T * Math.sqrt(bounce);
  let y = 0; if (dt < tb) { const v = dt / tb; y = hb * 4 * v * (1 - v); }
  return { vis: true, y };
}

// ================================================================== 01 · COVER
const S1 = {
  shakes: [[SN(1), 20], [SN(7), 7], [SN(11), 6]],
  zooms: [[SN(1), 0.04], [SN(7), 0.012]],
  flashes: [[SN(1), 0.32, '230,30,40'], [SN(7), 0.12, '230,30,40']],
  spikes: [[SN(1), 1.0], [SN(7), 0.55]],
};
S1.build = () => {
  S1.seven = glyph('7', F8, 560, { fill: [[0, '#ff444a'], [1, '#b80d16']], glow: ['rgba(215,20,30,0.6)', 40], ext: [10, '#2a0204'], extX: 0 });
  S1.title = layoutText('', F8, 100, 940, TX.white, {
    top: 660, lh: 1.04, lines: [['DATING', 'RULES', 'I'], ['LEARNED', 'THE'], ['HARD', 'WAY']],
    styleFor: (w) => (w === 'HARD' || w === 'WAY' ? TX.red : null),
  });
  S1.sub = glyph('After divorce.', F5, 42, TX.grey);
  S1.swipe = glyph('SWIPE', FM, 26, { fill: C.white });
  S1.chev = glyph('>', F8, 44, { fill: C.red });
};
S1.sevenS = (t) => { // anticipation (pull toward camera) then slam, settles to 1
  const pre = E.inQ(seg(t, 0.25, SN(1)));
  return t < SN(1) ? 1 + 0.22 * pre : 1 - 0.13 * damp(t - SN(1), 24, 7.5);
};
S1.back = (g, t) => {
  if (!vis(0, W)) return;
  // the wolf, huge and dim, breathing behind the type
  const bob = 14 * Math.sin(t * OM(1));
  drawLogo(g, 'wolf', 700, 520 + bob, 640, { alpha: 0.085 + 0.05 * hitIn(t, SN(7), 2.5) });
  // red heat behind the 7
  const p = 0.32 + 0.4 * hitIn(t, SN(1), 3) + 0.12 * (hitIn(t, SN(3), 6) + hitIn(t, SN(5), 6) + hitIn(t, SN(9), 6) + hitIn(t, SN(11), 6));
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = p; g.drawImage(SPR.red, 540 - 420, 400 - 380, 840, 760); g.restore();
};
S1.mid = (g, t) => {
  if (!vis(0, W)) return;
  const s = S1.sevenS(t), dy = t < SN(1) ? -30 * E.inQ(seg(t, 0.25, SN(1))) : 0;
  drawSprite(g, S1.seven, 540, 600 + dy, { s, alpha: t < SN(1) ? 1 - 0.25 * E.inQ(seg(t, 0.25, SN(1))) : 1 });
  ring(g, t, SN(1), 540, 420, { r0: 120, r1: 760, dur: 0.9, w: 10, color: 'rgba(230,30,40,1)', alpha: 0.8 });
  ring(g, t, SN(1) + 0.06, 540, 420, { r0: 80, r1: 560, dur: 0.8, w: 4, color: 'rgba(255,255,255,1)', alpha: 0.4 });
};
S1.front = (g, t) => {
  burst(g, t, SN(1), { n: 40, seed: 11, x: 540, y: 600, sx: 300, sy: 40, ang: [-PI * 0.95, -PI * 0.05], spd: [500, 1500], life: [0.5, 1.3], g: 1500, drag: 1.4, size: [2, 5], kind: 'spark', color: 'rgba(255,90,90,1)', wrap: false });
  burst(g, t, SN(1), { n: 18, seed: 12, x: 540, y: 600, sx: 380, sy: 30, ang: [-PI, 0], spd: [100, 380], life: [0.9, 1.7], g: -60, drag: 1.2, size: [70, 150], kind: 'puff', sprites: SPR.smoke, alpha: 0.4, comp: 'source-over', wrap: false });
  if (vis(0, W)) {
    drawText(g, S1.title, (it) => {
      const dy = -30 * bounceIn(t, SN(1) + 0.05 + it.wi * 0.035, 18, 8) - 8 * bounceIn(t, SN(7) + it.wi * 0.03, 18, 9);
      const flick = (it.w === 'HARD' || it.w === 'WAY') && t > SN(9) && t < SN(9) + 0.35 ? (Math.floor(t * 30) % 2 ? 0.35 : 1) : 1;
      return { dy, alpha: flick };
    });
    drawSprite(g, S1.sub, 540, 1015, { alpha: 0.95 });
    // swipe cue pointing at the next slide
    const b = (t % BEAT) / BEAT, nudge = 14 * decay(b * BEAT, 7);
    drawSprite(g, S1.swipe, 812, 1098, {});
    for (let i = 0; i < 3; i++) drawSprite(g, S1.chev, 900 + i * 30 + nudge, 1102, { alpha: 0.35 + 0.65 * decay(wrapT(t - i * 0.08) % BEAT, 5) });
    chrome(g, 0, t);
  }
};

// ================================================================== 02 · RULE 01 · the scale (WANTED vs NEEDED)
const S2 = {
  shakes: [[SN(3), 16], [SN(5), 4]], zooms: [[SN(3), 0.02]], flashes: [[SN(3), 0.1, '230,30,40']],
  spikes: [[SN(3), 1.0], [SN(7), 0.35]], spikeX: 760,
  PX: 540, PY: 880, ARM: 290, HANG: 105,
};
S2.build = () => {
  S2.R = ruleText('01', '', 'Ask her to be exclusive on date four and she hears "please don’t send me back to that empty apartment."', {
    numBase: 222, numSize: 130, headSize: 68, lines: [['Being', 'wanted', 'is', 'flattering.'], ['Being', 'needed', 'is', 'a', 'job.']],
    styleFor: (w) => (w === 'job.' ? TX.red : null), bodySize: 33,
  });
  S2.wanted = glyph('WANTED', FM, 26, { fill: C.white });
  S2.block = glyph('NEEDED', F8, 40, { fill: C.white });
};
S2.drop = (t) => fallY(t, SN(3) - 0.26, SN(3), 190, 0.05);
S2.ang = (t) => { // beam tilt: right side down when NEEDED lands; back to level by the loop end
  const hit = t >= SN(3) ? 0.3 * (1 - 0.55 * damp(t - SN(3), 13, 4.2)) : 0;
  const back = 1 - E.ioS(seg(t, 7.15, 7.85));
  return (hit * back) + 0.025 * Math.sin(t * OM(2)) * (1 - 0.8 * seg(t, SN(3) - 0.2, SN(3)));
};
S2.blockA = (t) => clamp(seg(t, 1.35, 1.6)) * (1 - seg(t, 7.1, 7.5));
S2.back = (g, t) => {
  if (!vis(0, W)) return;
  // post + base
  g.fillStyle = '#3a3a3a'; g.fillRect(S2.PX - 6, S2.PY, 12, LINE - S2.PY); g.fillStyle = '#4a4a4a'; g.beginPath(); rrect(g, S2.PX - 90, LINE - 16, 180, 16, 6); g.fill();
  g.save(); g.globalAlpha = 0.6; g.drawImage(SPR.dark, S2.PX - 260, LINE - 30, 520, 60); g.restore();
};
S2.pan = (g, x, y, label, t, heavy) => {
  g.strokeStyle = 'rgba(200,200,200,0.55)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(x, y - S2.HANG); g.lineTo(x - 82, y); g.moveTo(x, y - S2.HANG); g.lineTo(x + 82, y); g.stroke();
  g.fillStyle = LG(g, 'pan' + heavy, 0, y, 0, y + 22, [[0, '#6a6a6a'], [1, '#2a2a2a']]);
  g.beginPath(); g.moveTo(x - 96, y); g.lineTo(x + 96, y); g.lineTo(x + 70, y + 22); g.lineTo(x - 70, y + 22); g.closePath(); g.fill();
};
S2.mid = (g, t) => {
  if (!vis(0, W)) return;
  const a = S2.ang(t), ca = Math.cos(a), sa = Math.sin(a);
  const L = [S2.PX - S2.ARM * ca, S2.PY - S2.ARM * sa], Rr = [S2.PX + S2.ARM * ca, S2.PY + S2.ARM * sa];
  // beam
  g.save(); g.translate(S2.PX, S2.PY); g.rotate(a);
  g.fillStyle = LG(g, 'beam', 0, -8, 0, 8, [[0, '#8a8a8a'], [1, '#3a3a3a']]); g.beginPath(); rrect(g, -S2.ARM - 10, -7, S2.ARM * 2 + 20, 14, 7); g.fill();
  g.restore();
  g.fillStyle = C.red; g.beginPath(); g.arc(S2.PX, S2.PY, 13, 0, TAU); g.fill();
  const ly = L[1] + S2.HANG, ry = Rr[1] + S2.HANG;
  S2.pan(g, L[0], ly, 'WANTED', t, 0); S2.pan(g, Rr[0], ry, 'NEEDED', t, 1);
  // WANTED: light as a feather, hearts drifting off it
  drawSprite(g, S2.wanted, L[0], ly - 14, { dy: -4 * Math.sin(t * OM(4)) });
  for (let i = 0; i < 6; i++) {
    const u = frac(t / 2 + i / 6), x = L[0] - 50 + 100 * hash(i, 3) + 20 * Math.sin(u * 6 + i), y = ly - 60 - 170 * u, s = 9 + 7 * hash(i, 4);
    g.save(); g.globalAlpha = 0.7 * Math.sin(PI * u); g.fillStyle = i % 2 ? C.red : '#e8e8e8'; heart(g, x, y, s); g.fill(); g.restore();
  }
  // NEEDED: a heavy block that drops onto the right pan
  const ba = S2.blockA(t);
  if (ba > 0.003) {
    const d = S2.drop(t), hov = t < SN(3) - 0.26 ? 3 * Math.sin(t * 60) : 0;
    const bx = Rr[0] + hov, base = ry - 2 - (t < SN(3) - 0.26 ? 190 : d.y);
    const sq = t >= SN(3) ? 0.18 * damp(t - SN(3), 26, 9) : 0;
    g.save(); g.globalAlpha = ba; g.translate(bx, base); g.scale(1 + sq, 1 - sq);
    g.fillStyle = LG(g, 'blk', 0, -92, 0, 0, [[0, '#2b2b2b'], [1, '#0c0c0c']]); g.beginPath(); rrect(g, -88, -92, 176, 92, 8); g.fill();
    g.strokeStyle = C.red; g.lineWidth = 3; g.stroke();
    g.fillStyle = C.red; g.fillRect(-88, -92, 176, 10);
    g.restore();
    drawSprite(g, S2.block, bx, base - 26, { alpha: ba, sx: 1 + sq, sy: 1 - sq });
  }
  ring(g, t, SN(3), Rr[0], LINE - 6, { r0: 40, r1: 420, dur: 0.8, w: 8, flat: 0.18, color: 'rgba(230,30,40,1)', alpha: 0.8 });
};
S2.front = (g, t) => {
  const Rx = S2.PX + S2.ARM * Math.cos(0.3);
  burst(g, t, SN(3), { n: 26, seed: 21, x: Rx, y: S2.PY + 190, sx: 160, ang: [-PI * 0.95, -PI * 0.05], spd: [300, 900], life: [0.5, 1.1], g: 1700, drag: 1.2, size: [2.5, 6], kind: 'dot', color: 'rgba(170,170,170,1)', comp: 'source-over', wrap: false });
  burst(g, t, SN(3), { n: 12, seed: 22, x: Rx, y: LINE - 20, sx: 200, ang: [-PI, 0], spd: [60, 260], life: [0.9, 1.5], g: -40, drag: 1.3, size: [80, 150], kind: 'puff', sprites: SPR.smoke, alpha: 0.35, comp: 'source-over', wrap: false });
  if (!vis(0, W)) return;
  const R = S2.R, rec = (it) => ({ dy: 22 * bounceIn(t, SN(3) + 0.02 + (it.x / W) * 0.08, 22, 9) * (0.4 + it.x / W) });
  drawSprite(g, R.num, 540, R.numBase, { dy: 14 * bounceIn(t, SN(3), 22, 9) });
  drawText(g, R.head, rec); underline(g, 540, R.ul, 90);
  drawText(g, R.body);
  chrome(g, 1, t);
};

// ================================================================== 03 · RULE 02 · dial-up terminal
const S3 = {
  shakes: [[SN(7), 10]], zooms: [[SN(7), 0.015]], flashes: [[SN(7), 0.14, '230,30,40']],
  spikes: [[SN(7), 0.9], [SN(9), 0.4]],
  BX: 120, BY: 812, BW: 840, BH: 300,
};
S3.build = () => {
  S3.R = ruleText('02', '', 'Ten years of marriage taught you one move: lock it in. The game changed while you were inside. Update the software before you play.', {
    numBase: 222, numSize: 130, headSize: 70, lines: [['You’re', 'running', 'dial-up'], ['in', 'a', 'broadband', 'world.']], bodySize: 32,
  });
  S3.Rc = layoutText('', F8, 70, 900, { fill: 'rgba(0,255,255,0.75)' }, { top: S3.R.numBase + 34, lh: 1.1, lines: [['You’re', 'running', 'dial-up'], ['in', 'a', 'broadband', 'world.']] });
  S3.Rr = layoutText('', F8, 70, 900, { fill: 'rgba(255,30,40,0.85)' }, { top: S3.R.numBase + 34, lh: 1.1, lines: [['You’re', 'running', 'dial-up'], ['in', 'a', 'broadband', 'world.']] });
  S3.lines = ['> dialing 2026 ...', '> handshake: LOCK IT IN', '> connecting'];
  S3.err = glyph('OUTDATED SOFTWARE', FM, 30, { fill: '#ffffff' });
  S3.upd = glyph('UPDATE REQUIRED', F8, 34, { fill: '#ffffff' });
};
S3.type = (t, i) => { const t0 = 0.3 + i * 0.75; return Math.floor(clamp((t - t0) / 0.035, 0, 40)); };
S3.prog = (t) => (t < 2.6 ? 0 : 0.99 * E.outC(seg(t, 2.6, 3.4))) * (1 - seg(t, 7.3, 7.6));
S3.glitch = (t) => Math.max(t >= SN(7) && t < SN(7) + 0.45 ? 1 : 0, t >= SN(3) && t < SN(3) + 0.12 ? 0.6 : 0, t >= SN(9) && t < SN(9) + 0.16 ? 0.7 : 0);
S3.mid = (g, t) => {
  if (!vis(0, W)) return;
  const { BX, BY, BW, BH } = S3, gl = S3.glitch(t), fade = 1 - seg(t, 7.35, 7.75);
  g.save(); if (gl) g.translate(10 * (hash(Math.floor(t * 40), 1) - 0.5) * gl * 4, 0);
  g.fillStyle = 'rgba(8,10,11,0.94)'; g.beginPath(); rrect(g, BX, BY, BW, BH, 18); g.fill();
  g.strokeStyle = 'rgba(160,160,160,0.35)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); rrect(g, BX, BY, BW, 44, 18); g.fill();
  [C.red, '#5a5a5a', '#5a5a5a'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(BX + 30 + i * 26, BY + 22, 7, 0, TAU); g.fill(); });
  g.font = fstr(FM, 27); g.textBaseline = 'alphabetic';
  S3.lines.forEach((ln, i) => {
    const n = S3.type(t, i), s = ln.slice(0, n); if (!n) return;
    g.globalAlpha = fade; g.fillStyle = i === 1 ? '#ff5a5f' : 'rgba(235,235,235,0.9)'; g.fillText(s, BX + 34, BY + 92 + i * 44);
    if (i === 2 && n >= ln.length) { // dots + caret
      const d = '.'.repeat(1 + (Math.floor(t / BEAT) % 3)); g.fillText(d, BX + 34 + g.measureText(s).width, BY + 92 + i * 44);
    }
  });
  // progress bar stuck at 99%
  const p = S3.prog(t), py = BY + 232;
  g.globalAlpha = fade; g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(BX + 34, py, BW - 200, 22);
  g.fillStyle = C.red; g.fillRect(BX + 34, py, (BW - 200) * p, 22);
  if (p > 0.01) { g.fillStyle = (p > 0.98 && Math.floor(t / (BEAT / 2)) % 2) ? 'rgba(235,235,235,0.35)' : 'rgba(235,235,235,0.95)'; g.fillText(`${Math.round(p * 100)}%`, BX + BW - 140, py + 21); }
  g.globalAlpha = 1;
  // error banner on the glitch, update button after it
  if (t >= SN(7) && t < 7.6) {
    const s = E.outBack(seg(t, SN(7), SN(7) + 0.25), 2.4) * (1 - seg(t, 7.35, 7.6));
    g.save(); g.translate(540, BY + 150); g.scale(s, s); g.fillStyle = C.red; g.beginPath(); rrect(g, -250, -34, 500, 68, 10); g.fill(); g.restore();
    drawSprite(g, S3.err, 540, BY + 161, { s });
  }
  if (t >= SN(9) - 0.2 && t < 7.6) {
    const s = E.outBack(seg(t, SN(9) - 0.2, SN(9) + 0.1), 2) * (1 - seg(t, 7.35, 7.6)) * (1 + 0.06 * hitIn(t, SN(11) - 1.33, 7));
    g.save(); g.translate(540, BY + BH + 4); g.scale(s, s); g.fillStyle = '#ffffff'; g.beginPath(); rrect(g, -190, -30, 380, 60, 30); g.fill(); g.restore();
    drawSprite(g, S3.upd, 540, BY + BH + 17, { s, alpha: 1 });
  }
  // scanlines + tear slices when glitching
  if (gl) {
    for (let i = 0; i < 6; i++) { const y = BY + hash(Math.floor(t * 30), i) * BH, h = 6 + 20 * hash(i, Math.floor(t * 30) + 3); g.fillStyle = `rgba(230,30,40,${0.35 * gl})`; g.fillRect(BX, y, BW, h); }
  }
  g.restore();
};
S3.front = (g, t) => {
  if (!vis(0, W)) return;
  const R = S3.R, gl = S3.glitch(t);
  drawSprite(g, R.num, 540, R.numBase);
  if (gl) { // RGB split + horizontal slices
    const o = 14 * gl;
    drawText(g, S3.Rr, () => ({ dx: -o, comp: 'lighter' })); drawText(g, S3.Rc, () => ({ dx: o, comp: 'lighter' }));
    drawText(g, R.head, (it) => ({ dx: (hash(it.wi, Math.floor(t * 30)) - 0.5) * 40 * gl }));
  } else drawText(g, R.head);
  underline(g, 540, R.ul, 90); drawText(g, R.body);
  chrome(g, 2, t);
};

// ================================================================== 04 · RULE 03 · attention stack + the key you never got
const S4 = {
  shakes: [[SN(7) + 0.42, 9]], zooms: [[SN(7) + 0.42, 0.012]], flashes: [],
  spikes: [[SN(1), 0.5], [SN(7) + 0.42, 0.9]], spikeX: 700,
  NOTI: ['She liked your story', '"haha you’re funny"', '"you up?"', 'She viewed your profile'],
};
S4.build = () => {
  S4.R = ruleText('03', '', 'Chemistry is not character. Access is not reciprocity. She let you into the building. She never gave you a key.', {
    numBase: 222, numSize: 130, headSize: 84, lines: [['Attention', 'is'], ['not', 'commitment.']], bodySize: 33,
  });
  S4.notWord = S4.R.head.items.find((it) => it.w === 'not');
  S4.bub = S4.NOTI.map((s) => {
    SCR.font = fstr(F5, 28); const tw = SCR.measureText(s).width, w = tw + 120, h = 76;
    const c = mk(w + 8, h + 8), g = c.getContext('2d'); g.translate(4, 4);
    g.fillStyle = 'rgba(40,40,40,0.96)'; g.beginPath(); rrect(g, 0, 0, w, h, 22); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = C.red; g.beginPath(); g.arc(40, h / 2, 18, 0, TAU); g.fill(); g.fillStyle = '#fff'; heart(g, 40, h / 2 + 3, 9); g.fill();
    g.font = SCR.font; g.fillStyle = '#f0f0f0'; g.textBaseline = 'middle'; g.fillText(s, 76, h / 2 + 2);
    return c;
  });
};
S4.tIn = (i) => SN(1) + i * BEAT; // one notification per beat
S4.out = (t) => seg(t, 7.0, 7.55);
S4.keyT = SN(7); // key starts falling
S4.key = (t) => { // falls, hits the line, bounces, slides off into slide 5
  const t0 = S4.keyT, tl = t0 + 0.42; if (t < t0 - 0.3) return null;
  if (t < t0) return { x: 800, y: 760, r: -0.3 + 0.05 * Math.sin(t * 40), a: seg(t, t0 - 0.3, t0) };
  if (t < tl) { const u = (t - t0) / 0.42; return { x: 800 + 30 * u, y: 760 + (LINE - 30 - 760) * u * u, r: -0.3 + 3.2 * u, a: 1 }; }
  const dt = t - tl, x = 830 + 760 * dt + 120 * dt * dt, hb = 120 * Math.exp(-dt * 2.2) * Math.abs(Math.sin(dt * 7.5));
  return { x, y: LINE - 30 - hb, r: 2.9 + dt * 9, a: 1 };
};
S4.mid = (g, t) => {
  // the key (crosses into slide 5 after it bounces; unguarded on purpose)
  const k = S4.key(t);
  if (k && k.x < W + 300) {
    g.save(); g.globalAlpha = k.a; g.translate(k.x, k.y); g.rotate(k.r);
    keyPath(g, 1); g.fillStyle = LG(g, 'key', 0, -34, 0, 34, [[0, '#f2f2f2'], [0.5, '#9a9a9a'], [1, '#4a4a4a']]); g.fill('evenodd');
    g.restore();
    if (k.x > 800) burst(g, t, S4.keyT + 0.42, { n: 16, seed: 41, x: 830, y: LINE - 10, sx: 40, ang: [-PI * 0.9, -PI * 0.1], spd: [300, 800], life: [0.3, 0.7], g: 1800, drag: 1, size: [1.5, 3], kind: 'spark', color: 'rgba(255,255,255,1)', wrap: false });
  }
  if (!vis(0, W)) return;
  // notification stack: newest pushes the rest up
  const o = S4.out(t), base = 1105;
  for (let i = 0; i < 4; i++) {
    const ti = S4.tIn(i); if (t < ti) continue;
    let y = base; for (let j = i + 1; j < 4; j++) y -= 88 * E.outBack(seg(t, S4.tIn(j), S4.tIn(j) + 0.3), 1.6);
    const s = E.outBack(seg(t, ti, ti + 0.3), 2.2), c = S4.bub[i];
    const a = (1 - o) * (1 - 0.45 * seg(t, S4.keyT + 0.42, S4.keyT + 0.9)) * (y < 820 ? 0 : 1);
    g.save(); g.globalAlpha = clamp(a); g.translate(120 + c.width / 2, y - 38); g.scale(s, s); g.drawImage(c, -c.width / 2, -c.height / 2); g.restore();
  }
};
S4.front = (g, t) => {
  if (!vis(0, W)) return;
  const R = S4.R, it = S4.notWord;
  drawSprite(g, R.num, 540, R.numBase);
  // marker sweep behind "not" (on the first snare, unwiped at the end)
  const sw = E.outQuart(seg(t, SN(1), SN(1) + 0.3)) * (1 - E.inQ(seg(t, 7.3, 7.7)));
  if (sw > 0.001) { const x0 = it.left - 14, w = (it.width + 28) * sw; g.save(); g.fillStyle = C.red; g.transform(1, 0, -0.12, 1, 0, 0); g.fillRect(x0 + (it.base - 60) * 0.12, it.base - R.head.cap - 10, w, R.head.cap + 24); g.restore(); }
  drawText(g, R.head, (w) => (w === it ? { dy: -10 * bounceIn(t, SN(1), 20, 8) } : {}));
  underline(g, 540, R.ul, 90); drawText(g, R.body);
  chrome(g, 3, t);
};

// ================================================================== 05 · RULE 04 · the question flips
const S5 = {
  shakes: [[SN(3) + 0.42, 12]], zooms: [[SN(3) + 0.42, 0.02]], flashes: [[SN(3) + 0.42, 0.12, '255,255,255']],
  spikes: [[SN(3) + 0.42, 0.9], [SN(9), 0.4]],
  CY: 470,
};
S5.build = () => {
  S5.num = glyph('04', F8, 130, TX.num);
  S5.qa = layoutText('', F8, 104, 940, { fill: '#8a8a8a', ext: [5, '#050505'], extX: 0 }, { top: S5.CY - 120, lh: 1.05, lines: [['DOES', 'SHE'], ['LIKE', 'ME?']] });
  S5.qb = layoutText('', F8, 104, 940, TX.white, { top: S5.CY - 120, lh: 1.05, lines: [['DO', 'I'], ['LIKE', 'HER?']], styleFor: (w) => (w === 'HER?' ? TX.red : null) });
  S5.head = layoutText('Stop asking if she likes you. Ask if you like her.', F7, 52, 900, TX.white, { top: 720, lh: 1.18 });
  S5.body = layoutText('Am I attracted to her, or to being wanted? Do I like her, or do I like not being alone on a Thursday? Ask it on every drive home.', F5, 32, 860, TX.grey, { top: S5.head.bottom + 50, lh: 1.42 });
  S5.q = glyph('?', F8, 900, { fill: 'rgba(255,255,255,0.05)' });
};
S5.flip = (t) => { // 0 = question A, 1 = question B (card turns over twice per loop)
  const a = E.ioBack(seg(t, SN(3), SN(3) + 0.42), 1.1), b = E.ioBack(seg(t, SN(11), SN(11) + 0.5), 1.1);
  return a - b;
};
S5.back = (g, t) => {
  if (!vis(0, W)) return;
  drawSprite(g, S5.q, 800 + 20 * Math.sin(t * OM(1)), 1040, { rot: 0.12 * Math.sin(t * OM(1)) + 0.15 });
  // mirror light sweep
  const u = frac(t / (LOOP / 2)), x = -200 + 1480 * u;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.08; g.translate(x, S5.CY); g.rotate(0.35); g.fillStyle = '#ffffff'; g.fillRect(-40, -500, 80, 1000); g.restore();
};
S5.mid = (g, t) => {
  if (!vis(0, W)) return;
  const f = S5.flip(t), ang = f * PI, cy = S5.CY - 10;
  const sy = Math.cos(ang), front = sy >= 0, L = front ? S5.qa : S5.qb;
  const land = 0.06 * damp(t - SN(3) - 0.42, 22, 7) + 0.06 * damp(t - SN(11) - 0.5, 22, 7);
  // card
  g.save(); g.translate(540, cy); g.scale(1 + land, Math.abs(sy) * (1 - land) + 0.001);
  g.fillStyle = front ? 'rgba(255,255,255,0.04)' : 'rgba(215,20,30,0.16)'; g.strokeStyle = front ? 'rgba(255,255,255,0.18)' : 'rgba(230,30,40,0.8)'; g.lineWidth = 3;
  g.beginPath(); rrect(g, -440, -190, 880, 380, 26); g.fill(); g.stroke();
  g.restore();
  g.save(); g.translate(540, cy); g.scale(1 + land, Math.abs(sy) * (1 - land) + 0.001); g.translate(-540, -cy);
  drawText(g, L, (it) => (front && t < SN(3) ? { dx: 3 * Math.sin(t * 9 + it.wi) } : {})); // A trembles (needy), B sits still
  g.restore();
  // strike on "ME?" just before it flips
  if (front && t > SN(1) && t < SN(3) + 0.1) {
    const it = S5.qa.items[3], p = E.outC(seg(t, SN(1), SN(1) + 0.3));
    g.save(); g.translate(540, cy); g.scale(1, Math.abs(sy)); g.translate(-540, -cy);
    g.fillStyle = C.red; g.fillRect(it.left - 10, it.base - S5.qa.cap * 0.5 - 5, (it.width + 20) * p, 10); g.restore();
  }
  ring(g, t, SN(3) + 0.42, 540, cy, { r0: 300, r1: 760, dur: 0.8, w: 6, flat: 0.45, color: 'rgba(230,30,40,1)', alpha: 0.7 });
};
S5.front = (g, t) => {
  burst(g, t, SN(3) + 0.42, { n: 30, seed: 51, x: 540, y: S5.CY, sx: 860, sy: 340, ang: [0, TAU], spd: [100, 500], life: [0.5, 1.2], g: 300, drag: 1.5, size: [2, 4], kind: 'dot', color: 'rgba(255,255,255,0.9)', comp: 'source-over', wrap: false });
  if (!vis(0, W)) return;
  drawSprite(g, S5.num, 540, 222);
  drawText(g, S5.head, (it) => ({ dy: -8 * bounceIn(t, SN(9) + it.wi * 0.03, 18, 8) }));
  underline(g, 540, S5.head.bottom + 26, 90);
  drawText(g, S5.body);
  chrome(g, 4, t);
};

// ================================================================== 06 · RULE 05 · slow the clock down
const S6 = {
  shakes: [[SN(3), 12]], zooms: [[SN(3), 0.018]], flashes: [],
  spikes: [[SN(3), 0.9], [SN(7), 0.45]], spikeX: 540,
  CX: 540, CY: 925, R: 140, A1: -PI / 2, D: TAU / 40,
  TICKS: [4, 5, 6, 7, 8, 9, 10].map(SN), // slow ticks between the brake (2.0) and the next rush (7.33)
};
S6.build = () => {
  S6.R0 = ruleText('05', '', 'At four dates you know her presentation, not her. Watch her handle something going wrong first.', {
    numBase: 222, numSize: 130, headSize: 70, lines: [['Slow', 'the', 'exclusivity'], ['clock', 'all', 'the', 'way'], ['down.']], bodySize: 32,
  });
  S6.down = S6.R0.head.items.find((it) => it.w === 'down.');
  S6.lab = ['DATE 1', 'DATE 2', 'DATE 3', 'DATE 4'].map((s) => glyph(s, FM, 18, { fill: 'rgba(240,240,240,0.75)' }));
  S6.nope = glyph('NOT YET', F8, 30, { fill: '#ffffff' });
};
S6.ang = (t) => {
  const steps = (tt) => S6.TICKS.reduce((s, tb) => s + E.outBack(seg(tt, tb, tb + 0.14), 3), 0);
  const A7 = S6.A1 + 7 * S6.D, u = wrapT(t - SN(11)); // rush phase: 7.33 -> 8 -> 2.0 (one bar), 5 full turns, braking hard
  if (u < SN(4)) return A7 + (5 * TAU - 7 * S6.D) * E.outQuart(u / SN(4));
  return S6.A1 + steps(t) * S6.D;
};
S6.speed = (t) => { const u = wrapT(t - SN(11)); return u < SN(4) ? 1 - E.outQuart(u / SN(4)) : 0; };
S6.mid = (g, t) => {
  if (!vis(0, W)) return;
  const { CX, CY, R } = S6, a = S6.ang(t), sp = S6.speed(t);
  g.save(); g.globalAlpha = 0.6; g.drawImage(SPR.dark, CX - R * 1.6, CY - R * 1.4, R * 3.2, R * 3.2); g.restore();
  g.fillStyle = RG(g, 'face', CX - 40, CY - 50, 10, CX, CY, R, [[0, '#2e2e2e'], [1, '#141414']]); g.beginPath(); g.arc(CX, CY, R, 0, TAU); g.fill();
  g.strokeStyle = '#d9d9d9'; g.lineWidth = 6; g.stroke();
  for (let i = 0; i < 40; i++) { const q = (i / 40) * TAU, r0 = i % 10 === 0 ? R - 26 : R - 14; g.strokeStyle = i % 10 === 0 ? C.red : 'rgba(220,220,220,0.5)'; g.lineWidth = i % 10 === 0 ? 5 : 2; g.beginPath(); g.moveTo(CX + Math.cos(q - PI / 2) * r0, CY + Math.sin(q - PI / 2) * r0); g.lineTo(CX + Math.cos(q - PI / 2) * (R - 6), CY + Math.sin(q - PI / 2) * (R - 6)); g.stroke(); }
  S6.lab.forEach((G, i) => { const q = (i / 4) * TAU - PI / 2, r = R + 44; drawSprite(g, G, CX + Math.cos(q) * r, CY + Math.sin(q) * r + 7); });
  // motion-blur ghosts while rushing
  if (sp > 0.02) for (let k = 1; k <= 6; k++) { const aa = a - k * 0.16 * sp * 4; g.strokeStyle = `rgba(230,30,40,${0.22 * sp * (1 - k / 7)})`; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX + Math.cos(aa) * (R - 30), CY + Math.sin(aa) * (R - 30)); g.stroke(); }
  g.strokeStyle = C.red; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(CX - Math.cos(a) * 24, CY - Math.sin(a) * 24); g.lineTo(CX + Math.cos(a) * (R - 30), CY + Math.sin(a) * (R - 30)); g.stroke();
  g.fillStyle = '#f0f0f0'; g.beginPath(); g.arc(CX, CY, 12, 0, TAU); g.fill();
  // heavy tick pulses
  for (const tb of S6.TICKS) ring(g, t, tb, CX, CY, { r0: R, r1: R + 50, dur: 0.4, w: 3, color: 'rgba(255,255,255,1)', alpha: 0.35 });
  // NOT YET on the second beat
  const s = E.outBack(seg(t, SN(7), SN(7) + 0.3), 2.4) * (1 - seg(t, 7.0, 7.3));
  if (s > 0.01) { g.save(); g.translate(CX + 250, CY - 90); g.rotate(-0.08); g.scale(s, s); g.fillStyle = C.red; g.beginPath(); rrect(g, -100, -30, 200, 60, 8); g.fill(); g.restore(); drawSprite(g, S6.nope, CX + 250, CY - 80, { s, rot: -0.08 }); }
};
S6.front = (g, t) => {
  burst(g, t, SN(3), { n: 22, seed: 61, x: S6.CX, y: S6.CY, sx: 40, sy: 40, ang: [0, TAU], spd: [500, 1100], life: [0.3, 0.7], g: 400, drag: 1.6, size: [2, 4], kind: 'spark', color: 'rgba(255,80,80,1)', wrap: false });
  if (!vis(0, W)) return;
  const R = S6.R0, br = 0.5 + 0.5 * Math.sin(t * OM(1) - PI / 2); // slow breath: 0 at loop start/end
  drawSprite(g, R.num, 540, R.numBase);
  drawText(g, R.head, (it) => {
    const cx = 540, spread = 1 + 0.035 * br; // words drift apart in slow motion
    const o = { dx: (it.x - cx) * (spread - 1) };
    if (it === S6.down) o.dy = 16 * br + 10 * bounceIn(t, SN(3), 16, 6);
    return o;
  });
  underline(g, 540, R.ul, 90 + 160 * br); drawText(g, R.body);
  chrome(g, 5, t);
};

// ================================================================== 07 · RULE 06 · the calendar keeps its plans
const S7 = {
  shakes: [[SN(3), 18]], zooms: [[SN(3), 0.025]], flashes: [[SN(3), 0.16, '230,30,40']],
  spikes: [[SN(3), 1.0], [SN(7), 0.4], [SN(8), 0.4], [SN(9), 0.4]],
  TOP: 830, CELLS: [['MON', 'TRAINING', '6 AM'], ['WED', 'POKER', 'NIGHT'], ['FRI', 'DINNER', 'WITH MY KID']],
};
S7.build = () => {
  S7.R = ruleText('06', '', 'Keep the training session, the poker night, dinner with your kid. A man who clears his calendar for a third date just told her how much life he has.', {
    numBase: 222, numSize: 130, headSize: 76, lines: [['Don’t', 'cancel', 'your'], ['life', 'for', 'a', 'maybe.']], bodySize: 31,
  });
  S7.maybeW = S7.R.head.items.find((it) => it.w === 'maybe.');
  S7.maybeInk = glyph('maybe.', F8, 76, { fill: [[0, '#ff3a40'], [1, '#c10f18']] });
  S7.cell = S7.CELLS.map(([d, a, b]) => ({ d: glyph(d, FM, 20, { fill: C.red }), a: glyph(a, F8, 30, { fill: C.white }), b: glyph(b, F5, 22, { fill: C.grey }) }));
  S7.stamp = (() => { const c = mk(360, 150), g = c.getContext('2d'); g.strokeStyle = C.red; g.lineWidth = 9; g.beginPath(); rrect(g, 10, 10, 340, 130, 14); g.stroke(); g.font = fstr(F8, 86); g.fillStyle = C.red; g.textAlign = 'center'; g.fillText('MAYBE', 180, 108);
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 260; i++) { g.globalAlpha = 0.5 * hash(i, 7); g.fillRect(hash(i, 8) * 360, hash(i, 9) * 150, 2 + 5 * hash(i, 10), 2 + 3 * hash(i, 11)); } return c; })();
  S7.check = glyph('KEPT', FM, 20, { fill: '#ffffff' });
};
S7.st = (t) => { // stamp: slams down at 2.0, gets rejected, flies off up-right across the edge
  const t0 = SN(3) - 0.35, t1 = SN(3), t2 = SN(3) + 0.3;
  if (t < t0 || t > t2 + 1.4) return null;
  if (t < t1) { const u = E.inQ((t - t0) / 0.35); return { x: 540, y: S7.TOP + 120, s: lerp(2.6, 1, u), r: -0.12, a: seg(t, t0, t0 + 0.1) }; }
  if (t < t2) return { x: 540, y: S7.TOP + 120, s: 1 - 0.06 * damp(t - t1, 30, 8), r: -0.12, a: 1 };
  const dt = t - t2; return { x: 540 + 980 * dt, y: S7.TOP + 120 - 900 * dt + 900 * dt * dt, s: 1 - 0.2 * dt, r: -0.12 + 5 * dt, a: 1 - seg(dt, 1.0, 1.4) };
};
S7.mid = (g, t) => {
  if (vis(0, W)) {
    const top = S7.TOP, cw = 268, gap = 18, x0 = 540 - (cw * 3 + gap * 2) / 2;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (cw + gap), rec = 16 * bounceIn(t, SN(3) + i * 0.03, 26, 8) * (i === 1 ? 1.3 : 0.8), C1 = S7.cell[i];
      g.save(); g.translate(0, rec);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2; g.beginPath(); rrect(g, x, top, cw, 250, 16); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 2, top + 2, cw - 4, 50);
      drawSprite(g, C1.d, x + cw / 2, top + 36); drawSprite(g, C1.a, x + cw / 2, top + 130); drawSprite(g, C1.b, x + cw / 2, top + 172);
      // KEPT check, one per beat after the stamp is rejected
      const kt = SN(7 + i), s = E.outBack(seg(t, kt, kt + 0.28), 2.6) * (1 - seg(t, 7.2, 7.5));
      if (s > 0.01) { g.save(); g.translate(x + cw / 2, top + 218); g.scale(s, s); g.fillStyle = C.red; g.beginPath(); rrect(g, -60, -18, 120, 36, 18); g.fill(); g.restore(); drawSprite(g, S7.check, x + cw / 2, top + 225, { s }); }
      g.restore();
    }
    ring(g, t, SN(3), 540, S7.TOP + 125, { r0: 180, r1: 640, dur: 0.7, w: 8, flat: 0.5, color: 'rgba(230,30,40,1)', alpha: 0.7 });
  }
  const p = S7.st(t); // the stamp leaves the slide (unguarded so it crosses the edge)
  if (p) { g.save(); g.globalAlpha = clamp(p.a); g.translate(p.x, p.y); g.rotate(p.r); g.scale(p.s, p.s); g.drawImage(S7.stamp, -180, -75); g.restore(); }
};
S7.front = (g, t) => {
  burst(g, t, SN(3), { n: 30, seed: 71, x: 540, y: S7.TOP + 120, sx: 320, sy: 120, ang: [-PI, 0], spd: [300, 900], life: [0.4, 0.9], g: 1600, drag: 1.2, size: [3, 7], kind: 'drop', color: 'rgba(200,16,26,1)', hi: 'rgba(255,160,160,0.5)', comp: 'source-over', wrap: false });
  if (!vis(0, W)) return;
  const R = S7.R, m = S7.maybeW;
  drawSprite(g, R.num, 540, R.numBase);
  drawText(g, R.head, (it) => (it === m ? { alpha: 0 } : {}));
  // "maybe." as a red ink stamp that jolts on the hit
  const j = bounceIn(t, SN(3), 30, 7);
  drawSprite(g, S7.maybeInk, m.x + 16, m.base, { rot: -0.05 + 0.12 * j, s: 0.96 + 0.12 * j });
  underline(g, 540, R.ul, 90); drawText(g, R.body);
  chrome(g, 6, t);
};

// ================================================================== 08 · RULE 07 · options (paths light up, the wolf rises)
const S8 = {
  shakes: [[SN(7), 10]], zooms: [[SN(7), 0.015]], flashes: [[SN(7), 0.1, '230,30,40']],
  spikes: [[SN(7), 0.9], [SN(1), 0.45]],
  HZ: 905, ENDS: [120, 330, 540, 750, 960],
};
S8.build = () => {
  S8.R = ruleText('07', '', 'A performance of abundance is just neediness in a costume. Build a life you’d genuinely pick over her approval.', {
    numBase: 222, numSize: 130, headSize: 80, lines: [['You', 'can’t', 'fake'], ['having', 'options.']], bodySize: 32,
  });
  S8.fake = S8.R.head.items.find((it) => it.w === 'fake');
  S8.opt = S8.R.head.items.find((it) => it.w === 'options.');
  S8.ghost = glyph('options.', F8, 80, { fill: 'rgba(230,30,40,0.9)' });
  S8.scr = 'ABCDEFGHJKMNPRSTUVWXYZ#%&?'.split('').map((ch) => glyph(ch, F8, 80, TX.white));
  S8.fk = word('fake', F8, 80, TX.white);
};
S8.lit = (i, t) => seg(t, SN(3) + i * BEAT * 0.5, SN(3) + i * BEAT * 0.5 + 0.25) * (1 - seg(t, 7.2, 7.7));
S8.rise = (t) => E.outBack(seg(t, SN(7) - 0.4, SN(7)), 1.4) * (1 - E.inBack(seg(t, 7.1, 7.7), 1.2));
S8.back = (g, t) => {
  if (!vis(0, W)) return;
  // the wolf rising behind the horizon, clipped to the sky
  const r = S8.rise(t); if (r <= 0.002) return;
  g.save(); g.beginPath(); g.rect(0, 0, W, S8.HZ); g.clip();
  const hgt = 300, y = S8.HZ + hgt / 2 - hgt * 0.88 * r;
  drawLogo(g, 'wolf', 540, y, (hgt * 425) / 665, { alpha: 0.9, eye: hitIn(t, SN(9), 3) * 1.4 + 0.25 * r });
  g.restore();
};
S8.mid = (g, t) => {
  if (!vis(0, W)) return;
  // horizon + five paths fanning out from one road
  g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2; g.beginPath(); g.moveTo(80, S8.HZ); g.lineTo(1000, S8.HZ); g.stroke();
  const bx = 540, by = LINE;
  S8.ENDS.forEach((ex, i) => {
    const L = S8.lit(i, t), mx = lerp(bx, ex, 0.5), my = lerp(by, S8.HZ, 0.62);
    g.beginPath(); g.moveTo(bx - 40, by); g.quadraticCurveTo(mx - 10, my, ex - 6, S8.HZ); g.lineTo(ex + 6, S8.HZ); g.quadraticCurveTo(mx + 10, my, bx + 40, by); g.closePath();
    g.fillStyle = L > 0.01 ? `rgba(215,20,30,${0.25 + 0.6 * L})` : 'rgba(255,255,255,0.06)'; g.fill();
    if (L > 0.01) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * L; g.drawImage(SPR.red, ex - 50, S8.HZ - 50, 100, 100); g.restore(); }
    // a pulse travelling up each lit path, once per beat
    if (L > 0.5) { const u = frac((t - i * 0.13) / BEAT), px = lerp(lerp(bx, mx, u), lerp(mx, ex, u), u), py = lerp(lerp(by, my, u), lerp(my, S8.HZ, u), u); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(PI * u); g.drawImage(SPR.glow, px - 14, py - 14, 28, 28); g.restore(); }
  });
};
S8.front = (g, t) => {
  if (!vis(0, W)) return;
  const R = S8.R, fk = S8.fake, op = S8.opt;
  drawSprite(g, R.num, 540, R.numBase);
  // decode/scramble on "fake" (on the first snare and the big hit)
  const scr = (t >= SN(1) && t < SN(1) + 0.5) || (t >= SN(7) && t < SN(7) + 0.5);
  drawText(g, R.head, (it) => (it === fk && scr ? { alpha: 0 } : {}));
  if (scr) {
    const left = fk.left, f = Math.floor(t * 24);
    S8.fk.items.forEach((li, i) => { const done = frac((t - (t >= SN(7) ? SN(7) : SN(1))) / 0.5) > 0.25 + i * 0.18; drawLetter(g, li, left, fk.base, done ? {} : { spr: S8.scr[Math.floor(hash(f, i) * S8.scr.length)] }); });
  }
  // ghost echoes of "options." fan out on every snare (more options, not fake ones)
  for (const tb of [SN(1), SN(3), SN(5), SN(7), SN(9), SN(11)]) {
    const dt = t - tb; if (dt < 0 || dt > 0.6) continue;
    for (let k = -2; k <= 2; k++) { if (!k) continue; const p = E.outC(dt / 0.6); drawSprite(g, S8.ghost, op.x + k * 26 * p, op.base + Math.abs(k) * 16 * p, { alpha: 0.5 * (1 - p), rot: k * 0.05 * p, comp: 'lighter' }); }
  }
  underline(g, 540, R.ul, 90); drawText(g, R.body);
  chrome(g, 7, t);
};

// ================================================================== 09 · CTA · be a man with options (red slide, the wolf howls)
const S9 = {
  shakes: [[SN(1), 14], [SN(7), 6]], zooms: [[SN(1), 0.03], [SN(7), 0.01]], flashes: [[SN(1), 0.18, '255,255,255']],
  spikes: [[SN(1), 0.9], [SN(7), 0.5]],
  SY: 330, SW: 300,
};
S9.build = () => {
  S9.t1 = word('BE A MAN WITH', F8, fitSize('BE A MAN WITH', F8, 96, 940, 2), { fill: C.white, ext: [6, '#5a050a'], extX: 0 }, 2);
  S9.t2 = word('OPTIONS.', F8, 132, { fill: C.white, ext: [8, '#5a050a'], extX: 0 }, 4);
  S9.sub = layoutText('', F5, 36, 900, { fill: 'rgba(255,255,255,0.94)' }, { top: 862, lh: 1.38, lines: [['A', 'life', 'full', 'of', 'them.', 'Not', 'a', 'phone.'], ['Full', 'story', '+', 'The', 'Comeback', 'Code:']] });
  S9.btn = glyph('LINK IN BIO', F8, 44, { fill: C.red });
  S9.arrow = glyph('↓', F8, 44, { fill: C.red });
  S9.handle = glyph('@midlifebrotherhood', FM, 24, { fill: 'rgba(255,255,255,0.85)' });
};
S9.back = (g, t) => {
  if (!vis(0, W)) return;
  // slow rotating rays behind the shield
  g.save(); g.translate(540, S9.SY); g.rotate(t * OM(1) / 8); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.fillStyle = 'rgba(255,255,255,0.035)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -900); g.lineTo(90, -900); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalAlpha = 0.5; g.drawImage(SPR.dark, -200, 800, W + 400, 900); g.restore();
};
S9.mid = (g, t) => {
  if (!vis(0, W)) return;
  // shield: settled at frame 0; rears back then punches on the first snare (the howl)
  const pre = E.inQ(seg(t, 0.3, SN(1))), s = t < SN(1) ? 1 - 0.08 * pre : 1 + 0.1 * damp(t - SN(1), 20, 7);
  const howl = hitIn(t, SN(1), 1.6);
  g.save(); g.globalAlpha = 0.55; g.drawImage(SPR.dark, 540 - 260, S9.SY + 120, 520, 140); g.restore();
  drawLogo(g, 'shield', 540, S9.SY - 6 * Math.sin(t * OM(2)), S9.SW * s, { eye: 0.35 + 1.4 * howl + 0.4 * hitIn(t, SN(7), 3), sx: 1, sy: 1 });
  // howl rings from the wolf's mouth, up and to the left
  const mx = 540 - S9.SW * 0.5 + 0.5067 * S9.SW - 70, my = S9.SY - 110;
  for (let k = 0; k < 4; k++) {
    const dt = t - SN(1) - k * 0.14; if (dt < 0 || dt > 1.4) continue; const p = dt / 1.4;
    g.save(); g.strokeStyle = `rgba(255,255,255,${0.75 * (1 - p)})`; g.lineWidth = 6 * (1 - p) + 1.5; g.lineCap = 'round';
    g.beginPath(); g.arc(mx, my, 40 + 230 * E.outC(p), -PI * 0.95, -PI * 0.6); g.stroke(); g.restore();
  }
};
S9.front = (g, t) => {
  if (!vis(0, W)) return;
  // per-letter wave on the snares
  const wave = (Wd, base, amp, dl) => { const left = 540 - Wd.width / 2; Wd.items.forEach((it, i) => { let dy = 0; for (const tb of [SN(1), SN(5), SN(9)]) dy -= amp * bounceIn(t, tb + dl + i * 0.035, 16, 7); drawLetter(g, it, left, base, { dy, piv: 1 }); }); };
  wave(S9.t1, 650, 18, 0.05); wave(S9.t2, 800, 26, 0.12);
  drawText(g, S9.sub);
  // button: pulses every beat, arrow points down at the bio
  const b = decay((t % BEAT), 6), s = 1 + 0.05 * b, by = 1052;
  g.save(); g.translate(540, by); g.scale(s, s); g.fillStyle = '#ffffff'; g.beginPath(); rrect(g, -220, -46, 440, 92, 46); g.fill(); g.restore();
  drawSprite(g, S9.btn, 510, by + 16, { s });
  drawSprite(g, S9.arrow, 690, by + 16 + 8 * Math.sin(t * OM(12)), { s });
  drawSprite(g, S9.handle, 540, 1225);
  chrome(g, 8, t);
};

const SL = [S1, S2, S3, S4, S5, S6, S7, S8, S9];
