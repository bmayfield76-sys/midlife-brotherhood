// ================================================================== SLIDES · 8 Rules for the First 30 Days After a Layoff
// 8 s loops = 3 bars at 90 BPM. Big hits land on snares: SN(1)=0.67, SN(3)=2.0, SN(5)=3.33, SN(7)=4.67, SN(9)=6.0, SN(11)=7.33.
// Text is fully readable at frame 0 and settles back to the same state by the loop end.
const hitIn = (t, te, d = 9) => (t >= te ? decay(t - te, d) : 0);
const bounceIn = (t, te, f = 20, d = 8) => kick(t - te, f, d);
const popIn = (t, a, d = 0.3, s = 2.2) => E.outBack(seg(t, a, a + d), s);
const RESET = (t) => 1 - E.ioS(seg(t, 7.15, 7.85)); // 1 during the loop, eases to 0 so frame 0 = frame end
const VZ = 700; // top of the visual zone on rule slides
function card(g, x, y, w, h, r, fill, stroke) { g.beginPath(); rrect(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } }
function monoText(g, s, x, y, size, col, align = 'left') { g.font = fstr(FM, size); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); g.textAlign = 'left'; }
function popText(g, s, x, y, font, size, col, align = 'center') { g.font = fstr(font, size); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); g.textAlign = 'left'; }
const RT = (num, head, body, o = {}) => ruleText(num, head, body, Object.assign({ numBase: 222, numSize: 130, headSize: 76, bodySize: 33 }, o));
function ruleFront(g, R, k, t, headFx) { drawSprite(g, R.num, 540, R.numBase); drawText(g, R.head, headFx); underline(g, 540, R.ul, 90); drawText(g, R.body); chrome(g, k, t); }

// ================================================================== 01 · COVER — severance envelope slams, DAY 01
const S1 = {
  shakes: [[SN(1), 20], [SN(3), 12]], zooms: [[SN(1), 0.04], [SN(3), 0.015]],
  flashes: [[SN(1), 0.3, '230,30,40']], spikes: [[SN(1), 1.0], [SN(3), 0.7]], spikeX: 380,
};
S1.build = () => {
  S1.eight = glyph('8', F8, 470, { fill: [[0, '#ff444a'], [1, '#b80d16']], glow: ['rgba(215,20,30,0.6)', 40], ext: [10, '#2a0204'], extX: 0 });
  S1.title = layoutText('', F8, 90, 960, TX.white, {
    top: 560, lh: 1.04, lines: [['RULES', 'FOR', 'THE'], ['FIRST', '30', 'DAYS'], ['AFTER', 'A', 'LAYOFF']],
    styleFor: (w) => (w === 'LAYOFF' ? TX.red : null),
  });
  S1.swipe = glyph('SWIPE', FM, 26, { fill: C.white });
  S1.chev = glyph('>', F8, 44, { fill: C.red });
};
S1.s8 = (t) => (t < SN(1) ? 1 + 0.22 * E.inQ(seg(t, 0.25, SN(1))) : 1 - 0.13 * damp(t - SN(1), 24, 7.5));
S1.env = (t) => { // envelope falls onto the line at SN(3); lifts away at the end
  const f = fallY(t, SN(3) - 0.3, SN(3), 340, 0.05), out = E.inQ(seg(t, 7.2, 7.8));
  return { y: (t < SN(3) - 0.3 ? 340 : f.y) + 420 * out, a: seg(t, SN(3) - 0.42, SN(3) - 0.3) * (1 - out), sq: t >= SN(3) ? 0.1 * damp(t - SN(3), 26, 8) : 0 };
};
S1.back = (g, t) => {
  if (!vis(0, W)) return;
  drawLogo(g, 'wolf', 760, 470 + 14 * Math.sin(t * OM(1)), 560, { alpha: 0.08 });
  const p = 0.3 + 0.45 * hitIn(t, SN(1), 3) + 0.1 * (hitIn(t, SN(5), 6) + hitIn(t, SN(9), 6));
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = p; g.drawImage(SPR.red, 120, 0, 840, 640); g.restore();
};
S1.mid = (g, t) => {
  if (!vis(0, W)) return;
  const s = S1.s8(t);
  drawSprite(g, S1.eight, 540, 505 + (t < SN(1) ? -26 * E.inQ(seg(t, 0.25, SN(1))) : 0), { s });
  ring(g, t, SN(1), 540, 340, { r0: 110, r1: 700, dur: 0.9, w: 10, color: 'rgba(230,30,40,1)', alpha: 0.8 });
  // severance envelope
  const e = S1.env(t);
  if (e.a > 0.003) {
    g.save(); g.globalAlpha = e.a; g.translate(380, LINE - 6 - e.y); g.scale(1 + e.sq, 1 - e.sq); g.rotate(-0.05);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-150, -6, 300, 10);
    card(g, -150, -170, 300, 170, 8, '#e9e4da'); g.strokeStyle = '#b9b2a4'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-150, -170); g.lineTo(0, -90); g.lineTo(150, -170); g.stroke();
    g.save(); g.translate(0, -58); g.rotate(-0.12); g.strokeStyle = C.red; g.lineWidth = 5; g.strokeRect(-112, -24, 224, 48);
    popText(g, 'SEVERANCE', 0, 2, F8, 34, C.red); g.restore();
    g.restore();
  }
  // DAY 01 flip counter (flips on every bar)
  const fx = 760, fy = LINE - 100;
  card(g, fx - 120, fy - 70, 240, 140, 14, '#151515', 'rgba(255,255,255,0.18)');
  const fl = [0, SN(4), SN(8)].reduce((m, tb) => Math.max(m, t >= tb && t < tb + 0.28 ? Math.sin(PI * (t - tb) / 0.28) : 0), 0);
  monoText(g, 'DAY', fx, fy - 38, 20, 'rgba(255,255,255,0.6)', 'center');
  g.save(); g.translate(fx, fy + 18); g.scale(1, 1 - 0.95 * fl);
  popText(g, '01', 0, 0, F8, 74, C.white); g.restore();
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(fx - 118, fy + 16, 236, 3);
  monoText(g, '/ 30', fx + 78, fy + 40, 18, 'rgba(255,255,255,0.45)', 'center');
};
S1.front = (g, t) => {
  burst(g, t, SN(1), { n: 40, seed: 11, x: 540, y: 520, sx: 260, sy: 40, ang: [-PI * 0.95, -PI * 0.05], spd: [500, 1500], life: [0.5, 1.3], g: 1500, drag: 1.4, size: [2, 5], kind: 'spark', color: 'rgba(255,90,90,1)', wrap: false });
  burst(g, t, SN(3), { n: 14, seed: 12, x: 380, y: LINE - 10, sx: 300, ang: [-PI, 0], spd: [60, 260], life: [0.9, 1.5], g: -40, drag: 1.3, size: [80, 150], kind: 'puff', sprites: SPR.smoke, alpha: 0.35, comp: 'source-over', wrap: false });
  if (!vis(0, W)) return;
  drawText(g, S1.title, (it) => ({ dy: -28 * bounceIn(t, SN(1) + 0.05 + it.wi * 0.035, 18, 8) - 10 * bounceIn(t, SN(3) + it.wi * 0.02, 20, 9) }));
  const nudge = 14 * decay(t % BEAT, 7);
  drawSprite(g, S1.swipe, 830, 1232, {});
  for (let i = 0; i < 3; i++) drawSprite(g, S1.chev, 915 + i * 30 + nudge, 1236, { alpha: 0.35 + 0.65 * decay(wrapT(t - i * 0.08) % BEAT, 5) });
  chrome(g, 0, t);
};

// ================================================================== 02 · RULE 01 — the battery recharges (headline fills like a charge bar)
const S2 = {
  shakes: [[SN(7), 8]], zooms: [[SN(7), 0.015]], flashes: [[SN(7), 0.16, '255,255,255']],
  spikes: [[SN(7), 1.0], [SN(3), 0.4]],
  BX: 300, BY: 800, BW: 440, BH: 200, SEGS: [SN(3), SN(4), SN(5), SN(6), SN(7)],
};
S2.build = () => {
  S2.R = RT('01', 'Take care of yourself first.', 'Rest, exercise, eat. The company that let you go couldn’t care less about your well-being. So you have to.', { lines: [['Take', 'care', 'of'], ['yourself', 'first.']], headSize: 80 });
  S2.Rdim = layoutText('', F8, 80, 900, { fill: '#8c8c8c', ext: [5, '#050505'], extX: 0 }, { top: S2.R.numBase + 34, lh: 1.1, lines: [['Take', 'care', 'of'], ['yourself', 'first.']] });
};
S2.level = (t) => { let n = 0; for (const tb of S2.SEGS) n += E.outBack(seg(t, tb, tb + 0.18), 2); return (0.05 + 0.95 * n / 5) * RESET(t) + 0.05 * (1 - RESET(t)); };
S2.mid = (g, t) => {
  if (!vis(0, W)) return;
  const { BX, BY, BW, BH } = S2, lv = S2.level(t), low = lv < 0.12, full = t >= SN(7) && RESET(t) > 0.5;
  const sh = 1 + 0.04 * hitIn(t, SN(7), 6);
  g.save(); g.translate(BX + BW / 2, BY + BH / 2); g.scale(sh, sh); g.translate(-(BX + BW / 2), -(BY + BH / 2));
  card(g, BX, BY, BW, BH, 26, 'rgba(255,255,255,0.03)'); g.strokeStyle = '#e8e8e8'; g.lineWidth = 9; g.stroke();
  g.fillStyle = '#e8e8e8'; g.beginPath(); rrect(g, BX + BW + 6, BY + BH / 2 - 36, 26, 72, 8); g.fill();
  // segments
  const ix = BX + 22, iy = BY + 22, iw = BW - 44, ih = BH - 44, sw = (iw - 4 * 10) / 5;
  if (low) { const bl = Math.floor(t / (BEAT / 2)) % 2 ? 1 : 0.35; g.globalAlpha = bl; card(g, ix, iy, iw * 0.06, ih, 8, C.red); g.globalAlpha = 1; }
  else for (let i = 0; i < 5; i++) {
    const f = clamp((lv - 0.05) / 0.95 * 5 - i); if (f <= 0) continue;
    g.save(); g.translate(ix + i * (sw + 10), iy + ih); g.scale(1, f); card(g, 0, -ih, sw, ih, 8, full ? '#ffffff' : (i < 2 ? C.red : '#e8e8e8')); g.restore();
  }
  // bolt
  if (!low && !full) { g.save(); g.translate(BX + BW / 2, BY + BH / 2); g.globalAlpha = 0.5 + 0.5 * decay(t % BEAT, 5); g.fillStyle = C.ink; g.beginPath(); g.moveTo(12, -60); g.lineTo(-30, 8); g.lineTo(0, 8); g.lineTo(-12, 60); g.lineTo(30, -8); g.lineTo(0, -8); g.closePath(); g.fill(); g.restore(); }
  g.restore();
  if (full) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * hitIn(t, SN(7), 2); g.drawImage(SPR.glow, BX - 60, BY - 60, BW + 120, BH + 120); g.restore(); }
  const pct = Math.round(lv * 100);
  popText(g, `${pct}%`, 540, BY + BH + 70, F8, 54, low ? C.red : C.white);
  monoText(g, low ? 'LOW BATTERY' : full ? 'FULLY CHARGED' : 'CHARGING', 540, BY + BH + 122, 20, 'rgba(255,255,255,0.6)', 'center');
  ring(g, t, SN(7), 540, BY + BH / 2, { r0: 240, r1: 640, dur: 0.8, w: 6, flat: 0.5, color: 'rgba(255,255,255,1)', alpha: 0.5 });
};
S2.front = (g, t) => {
  if (!vis(0, W)) return;
  const R = S2.R, lv = S2.level(t);
  // charge-fill typography: dim copy underneath, white headline revealed left-to-right with the battery
  drawText(g, S2.Rdim);
  const x1 = lerp(60, 1020, clamp((lv - 0.05) / 0.95));
  g.save(); g.beginPath(); g.rect(0, R.head.top - 40, x1, R.head.bottom - R.head.top + 80); g.clip(); drawText(g, R.head); g.restore();
  drawSprite(g, R.num, 540, R.numBase); underline(g, 540, R.ul, 90); drawText(g, R.body); chrome(g, 1, t);
};

// ================================================================== 03 · RULE 02 — WIFE cuts the line to the top of the call list
const S3 = {
  shakes: [[SN(3) + 0.3, 8], [SN(7), 12]], zooms: [[SN(7), 0.02]], flashes: [[SN(7), 0.12, '230,30,40']],
  spikes: [[SN(3) + 0.3, 0.7], [SN(7), 0.9]], spikeX: 420,
  NAMES: ['RECRUITER', 'LINKEDIN', 'THE GUYS', 'WIFE'], LX: 120, LW: 560, RH: 92,
};
S3.build = () => {
  S3.R = RT('02', 'Tell your wife first.', 'She’s on your team, and this moment can make or break a marriage. Single? Stay your ass away from dating. Your aura is off.', { headSize: 80 });
};
S3.up = (t) => E.ioBack(seg(t, SN(3) - 0.2, SN(3) + 0.3), 1.2) * RESET(t); // 0 = WIFE last, 1 = WIFE first
S3.mid = (g, t) => {
  if (!vis(0, W)) return;
  const u = S3.up(t), { LX, LW, RH } = S3, top = VZ + 30;
  S3.NAMES.forEach((nm, i) => {
    const isW = nm === 'WIFE', slot = isW ? lerp(3, 0, u) : i + u, y = top + slot * RH;
    const lift = isW ? Math.sin(PI * clamp(u)) * 18 : 0;
    g.save(); g.translate(isW ? 22 * Math.sin(PI * clamp(u)) : 0, -lift);
    card(g, LX, y, LW, RH - 14, 16, isW ? 'rgba(215,20,30,0.92)' : 'rgba(255,255,255,0.06)', isW ? null : 'rgba(255,255,255,0.12)');
    g.fillStyle = isW ? '#ffffff' : '#5a5a5a'; g.beginPath(); g.arc(LX + 42, y + (RH - 14) / 2, 20, 0, TAU); g.fill();
    if (isW) { g.fillStyle = C.red; heart(g, LX + 42, y + (RH - 14) / 2 + 4, 10); g.fill(); }
    popText(g, nm, LX + 82, y + (RH - 14) / 2 + 2, F8, 30, '#ffffff', 'left');
    monoText(g, isW && u > 0.5 ? 'CALL FIRST' : `#${Math.round(slot) + 1}`, LX + LW - 24, y + (RH - 14) / 2, 20, isW ? '#ffffff' : 'rgba(255,255,255,0.45)', 'right');
    g.restore();
  });
  // dating app tile + LOCKED stamp
  const tx = 760, ty = VZ + 70, ts = 200;
  g.save(); g.globalAlpha = 1 - 0.5 * seg(t, SN(7), SN(7) + 0.3) * RESET(t);
  card(g, tx, ty, ts, ts, 44, '#2a2a2a', 'rgba(255,255,255,0.15)'); g.fillStyle = '#f0f0f0'; heart(g, tx + ts / 2, ty + ts / 2 + 18, 48); g.fill();
  g.restore(); monoText(g, 'DATING', tx + ts / 2, ty + ts + 30, 20, 'rgba(255,255,255,0.6)', 'center');
  const ls = t < SN(7) - 0.3 ? 0 : (t < SN(7) ? lerp(2.4, 1, E.inQ(seg(t, SN(7) - 0.3, SN(7)))) : 1 - 0.06 * damp(t - SN(7), 30, 8));
  const la = seg(t, SN(7) - 0.3, SN(7) - 0.2) * (1 - seg(t, 7.2, 7.5));
  if (la > 0.01) {
    g.save(); g.globalAlpha = la; g.translate(tx + ts / 2, ty + ts / 2); g.rotate(-0.18); g.scale(ls, ls);
    g.strokeStyle = C.red; g.lineWidth = 8; g.strokeRect(-120, -36, 240, 72); popText(g, 'LOCKED', 0, 3, F8, 48, C.red); g.restore();
  }
  ring(g, t, SN(7), tx + ts / 2, ty + ts / 2, { r0: 100, r1: 360, dur: 0.6, w: 6, color: 'rgba(230,30,40,1)', alpha: 0.7 });
};
S3.front = (g, t) => {
  if (!vis(0, W)) return;
  ruleFront(g, S3.R, 2, t, (it) => ({ dy: -16 * bounceIn(t, SN(3) + 0.25 + it.wi * 0.06, 18, 7), s: it.w === 'wife' ? 1 + 0.12 * hitIn(t, SN(3) + 0.25, 4) : 1 }));
};

// ================================================================== 04 · RULE 03 — sun to moon, goals checked, one carried over
const S4 = {
  shakes: [[SN(7) + 0.3, 6]], zooms: [], flashes: [],
  spikes: [[SN(3), 0.45], [SN(4), 0.45], [SN(5), 0.45], [SN(7) + 0.3, 0.8]], spikeX: 760,
  GOALS: ['Gratitude journal', 'Send 5 resumes', 'Call 2 contacts', 'Update LinkedIn'],
  CX: 560, CY: VZ + 20, CW: 400, RH: 74,
};
S4.build = () => {
  S4.R = RT('03', '', 'Gratitude journal every morning. Three to five goals for tomorrow every night, and carry over what you didn’t finish.', {
    headSize: 68, lines: [['Wake', 'up', 'grateful.'], ['Go', 'to', 'sleep', 'accomplished.']],
  });
  S4.acc = S4.R.head.items.find((it) => it.w === 'accomplished.'); S4.gra = S4.R.head.items.find((it) => it.w === 'grateful.');
};
S4.checkT = [SN(3), SN(4), SN(5)];
S4.carry = (t) => E.inBack(seg(t, SN(7), SN(7) + 0.55), 1.2) * (t < 7.3 ? 1 : 0);
S4.mid = (g, t) => {
  if (!vis(-200, W + 200)) return;
  // sky arc: the sun crosses and becomes the moon (one day per loop)
  const u = t / LOOP, ang = PI + PI * u, ax = 270 + Math.cos(ang) * 190, ay = 1080 + Math.sin(ang) * 260, night = smooth(0.45, 0.6, u) * (1 - smooth(0.92, 1, u));
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.setLineDash([6, 10]); g.beginPath(); g.arc(270, 1080, 190, PI, TAU); g.stroke(); g.setLineDash([]);
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(60, 1080); g.lineTo(480, 1080); g.stroke();
  g.save(); g.beginPath(); g.rect(0, 0, W, 1080); g.clip();
  if (night < 1) { g.globalAlpha = 1 - night; g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(SPR.red, ax - 110, ay - 110, 220, 220); g.restore();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ax, ay, 44, 0, TAU); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; for (let i = 0; i < 10; i++) { const q = (i / 10) * TAU + t * 0.6; g.beginPath(); g.moveTo(ax + Math.cos(q) * 58, ay + Math.sin(q) * 58); g.lineTo(ax + Math.cos(q) * 74, ay + Math.sin(q) * 74); g.stroke(); } }
  if (night > 0) { g.globalAlpha = night; g.fillStyle = '#d8d8d8'; g.beginPath(); g.arc(ax, ay, 42, 0, TAU); g.fill(); g.fillStyle = BGK[3][1]; g.beginPath(); g.arc(ax + 18, ay - 12, 38, 0, TAU); g.fill(); }
  g.restore(); g.globalAlpha = 1;
  monoText(g, night > 0.5 ? 'PM: SET 3-5 GOALS' : 'AM: GRATITUDE', 270, 1112, 18, 'rgba(255,255,255,0.6)', 'center');
  // checklist card
  const { CX, CY, CW, RH } = S4, ch = RH * 4 + 70;
  card(g, CX, CY, CW, ch, 18, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.14)');
  monoText(g, 'TOMORROW', CX + 24, CY + 34, 20, C.red);
  S4.GOALS.forEach((s, i) => {
    let x = CX + 24, y = CY + 70 + i * RH + RH / 2, a = 1;
    if (i === 3) { const c = S4.carry(t); x += c * 760; a = (1 - seg(c, 0.45, 0.9)) * (t < 7.3 ? 1 : seg(t, 7.4, 7.9)); }
    const done = i < 3 && t >= S4.checkT[i] && RESET(t) > 0.5, s1 = i < 3 ? popIn(t, S4.checkT[i], 0.25, 3) * RESET(t) : 0;
    g.save(); g.globalAlpha = a;
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.strokeRect(x, y - 16, 32, 32);
    if (s1 > 0.01) { g.save(); g.translate(x + 16, y); g.scale(s1, s1); g.strokeStyle = C.red; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-2, 9); g.lineTo(13, -11); g.stroke(); g.restore(); }
    popText(g, s, x + 52, y + 2, F5, 28, done ? 'rgba(255,255,255,0.5)' : '#ffffff', 'left');
    if (done) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = fstr(F5, 28); g.fillRect(x + 52, y + 1, g.measureText(s).width * s1, 3); }
    if (i === 3 && t > SN(7) - 0.5 && t < 7.4) monoText(g, 'CARRY OVER →', x + 52, y + 34, 16, C.red);
    g.restore();
  });
};
S4.front = (g, t) => {
  if (!vis(0, W)) return;
  const R = S4.R;
  ruleFront(g, R, 3, t, (it) => (it === S4.gra ? { s: 1 + 0.06 * hitIn(t, SN(1), 4) } : {}));
  // hand-drawn red strokes under the two key words
  const stroke = (it, a0) => { const p = E.outC(seg(t, a0, a0 + 0.4)) * RESET(t); if (p <= 0) return; g.save(); g.strokeStyle = C.red; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); const x0 = it.left, x1 = it.left + it.width * p, y = it.base + 14; g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y + 8, x1, y + 2); g.stroke(); g.restore(); };
  stroke(S4.gra, SN(1)); stroke(S4.acc, SN(5));
};

// ================================================================== 05 · RULE 04 — plates slam onto the bar (slide in across both edges), lockout
const S5 = {
  shakes: [[SN(1), 6], [SN(2), 6], [SN(3), 9], [SN(9), 14]], zooms: [[SN(9), 0.02]], flashes: [[SN(9), 0.1, '230,30,40']],
  spikes: [[SN(3), 0.6], [SN(9), 1.0]], spikeX: 540,
  BY: 1010, PL: [{ w: 34, h: 250, c: C.red, t: SN(1) }, { w: 30, h: 200, c: '#3a3a3a', t: SN(2) }, { w: 26, h: 150, c: '#d9d9d9', t: SN(3) }],
};
S5.build = () => {
  S5.R = RT('04', '', 'For me it was the gym. Don’t lose yourself in the BS.', { headSize: 80, lines: [['Keep', 'one', 'thing'], ['that’s', 'yours.']] });
  S5.yours = S5.R.head.items.find((it) => it.w === 'yours.');
};
S5.lift = (t) => E.outBack(seg(t, SN(7), SN(7) + 0.6), 1.3) * (1 - E.inQ(seg(t, SN(9) - 0.25, SN(9))));
S5.mid = (g, t) => {
  // plates come in from the neighbouring slides, so this runs unguarded
  const ly = S5.BY - 150 * S5.lift(t), bend = 10 * S5.lift(t) * (1 + 0.5 * Math.sin(t * 30) * decay(t - SN(7) - 0.6, 4));
  if (vis(0, W)) {
    // uprights / rack
    g.fillStyle = '#2d2d2d'; g.fillRect(170, 860, 22, LINE - 860); g.fillRect(888, 860, 22, LINE - 860);
    g.fillStyle = '#444'; g.fillRect(160, 1000, 42, 16); g.fillRect(878, 1000, 42, 16);
  }
  // bar
  g.strokeStyle = '#cfcfcf'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(40, ly + bend); g.quadraticCurveTo(540, ly - bend, 1040, ly + bend); g.stroke();
  g.fillStyle = '#9a9a9a'; g.fillRect(150, ly - 14 + bend * 0.7, 18, 28); g.fillRect(912, ly - 14 + bend * 0.7, 18, 28);
  // plates: each pair slides in from off-slide and slams against the collar
  let off = 0;
  S5.PL.forEach((p, i) => {
    const inn = E.inQ(seg(t, p.t - 0.32, p.t)), out = E.inQ(seg(t, 7.2 + i * 0.08, 7.65 + i * 0.08)), k = (1 - inn) + out;
    if (k >= 0.999) { off += p.w + 4; return; } // parked off-stage: not drawn, so it never shows in a neighbour
    const rec = 8 * damp(t - p.t, 30, 9) * (t >= p.t ? 1 : 0);
    for (const sd of [-1, 1]) {
      const xr = sd < 0 ? 140 - off - p.w : 940 + off, x = xr + sd * k * 620 + sd * rec;
      g.fillStyle = p.c; card(g, x, ly - p.h / 2 + bend * 0.7, p.w, p.h, 6, p.c);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + p.w * 0.6, ly - p.h / 2 + bend * 0.7 + 6, p.w * 0.3, p.h - 12);
    }
    off += p.w + 4;
  });
  if (vis(0, W)) for (const p of S5.PL) for (const sd of [-1, 1]) burst(g, t, p.t, { n: 8, seed: 50 + p.w + sd, x: sd < 0 ? 140 : 940, y: S5.BY, sx: 10, sy: 120, ang: sd < 0 ? [-PI * 0.9, -PI * 0.6] : [-PI * 0.4, -PI * 0.1], spd: [200, 500], life: [0.2, 0.5], g: 900, drag: 1.4, size: [1.5, 3], kind: 'spark', color: 'rgba(255,255,255,1)', wrap: false });
};
S5.front = (g, t) => {
  if (!vis(0, W)) return;
  const y = S5.yours;
  ruleFront(g, S5.R, 4, t, (it) => {
    let dy = 0; for (const p of S5.PL) dy += 10 * bounceIn(t, p.t + it.wi * 0.02, 22, 9);
    return it === y ? { dy: dy - 12 * S5.lift(t), dx: it.width * 0.05 * S5.lift(t), s: 1 + 0.06 * S5.lift(t) } : { dy };
  });
};

// ================================================================== 06 · RULE 05 — the network lights up to HIRED
const S6 = {
  shakes: [[SN(7), 10]], zooms: [[SN(7), 0.02]], flashes: [[SN(7), 0.16, '230,30,40']],
  spikes: [[SN(1), 0.4], [SN(5), 0.5], [SN(7), 1.0]], spikeX: 540,
  N: [
    { id: 'YOU', x: 540, y: 1070, r: 46, t: 0 },
    { id: 'BUDDY', x: 200, y: 930, r: 30, t: SN(1), from: 0 }, { id: 'EX-BOSS', x: 400, y: 900, r: 30, t: SN(2), from: 0 },
    { id: 'NEIGHBOR', x: 680, y: 900, r: 30, t: SN(3), from: 0 }, { id: 'GYM', x: 880, y: 930, r: 30, t: SN(4), from: 0 },
    { id: 'A GUY', x: 300, y: 770, r: 28, t: SN(5), from: 2 }, { id: 'WHO KNOWS', x: 600, y: 760, r: 28, t: SN(6), from: 5 },
    { id: 'HIRED', x: 860, y: 760, r: 44, t: SN(7), from: 6 },
  ],
};
S6.build = () => {
  S6.R = RT('05', 'NETWORK. Seriously.', 'Talk to everyone you know. I got my current job through networking, not a job board.', { headSize: 82, lines: [['NETWORK.'], ['Seriously.']] });
  S6.net = S6.R.head.items[0];
  S6.nw = word('NETWORK.', F8, 82, TX.white); S6.scr = '#%&@$*+=?/<>'.split('').map((ch) => glyph(ch, F8, 82, TX.white));
};
S6.mid = (g, t) => {
  // edges out to the neighbours (the network keeps going past the slide)
  for (const [x0, y0, x1, y1] of [[200, 930, -260, 860], [880, 930, W + 260, 880], [300, 770, -200, 700], [860, 760, W + 200, 720]]) {
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.setLineDash([4, 10]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
  }
  if (!vis(0, W)) return;
  const N = S6.N, R = RESET(t);
  N.forEach((n) => { if (n.from == null) return; const a = N[n.from], p = E.outC(seg(t, n.t - 0.25, n.t)) * R; if (p <= 0) return;
    const hot = n.id === 'HIRED' || (t > SN(7) && ['YOU', 'EX-BOSS', 'A GUY', 'WHO KNOWS'].includes(n.id) && ['YOU', 'EX-BOSS', 'A GUY'].includes(a.id));
    g.strokeStyle = hot ? C.red : 'rgba(255,255,255,0.45)'; g.lineWidth = hot ? 5 : 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(lerp(a.x, n.x, p), lerp(a.y, n.y, p)); g.stroke();
    if (p >= 1) { const q = frac((t - n.t) / BEAT); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(PI * q) * 0.9; g.drawImage(hot ? SPR.red : SPR.glow, lerp(a.x, n.x, q) - 14, lerp(a.y, n.y, q) - 14, 28, 28); g.restore(); }
  });
  N.forEach((n) => {
    const s = n.from == null ? 1 : popIn(t, n.t, 0.3, 2.6) * R; if (s <= 0.01) return;
    const hired = n.id === 'HIRED', you = n.id === 'YOU', r = n.r * s * (1 + (hired ? 0.15 * hitIn(t, SN(7), 4) : 0));
    if (hired) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7; g.drawImage(SPR.red, n.x - r * 3, n.y - r * 3, r * 6, r * 6); g.restore(); }
    g.fillStyle = hired ? C.red : you ? '#ffffff' : '#2b2b2b'; g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.fill();
    g.strokeStyle = hired || you ? '#ffffff' : 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.stroke();
    if (you) popText(g, 'YOU', n.x, n.y + 2, F8, 26, C.ink);
    else if (hired) popText(g, 'HIRED', n.x, n.y + 2, F8, 22, '#ffffff');
    else monoText(g, n.id, n.x, n.y + n.r + 22, 17, 'rgba(255,255,255,0.75)', 'center');
  });
  ring(g, t, SN(7), 860, 760, { r0: 50, r1: 380, dur: 0.8, w: 7, color: 'rgba(230,30,40,1)', alpha: 0.8 });
};
S6.front = (g, t) => {
  if (!vis(0, W)) return;
  const R = S6.R, n = S6.net, scr = (t >= SN(1) && t < SN(1) + 0.55) || (t >= SN(7) && t < SN(7) + 0.55);
  drawSprite(g, R.num, 540, R.numBase);
  drawText(g, R.head, (it) => (it === n && scr ? { alpha: 0 } : {}));
  if (scr) { const t0 = t >= SN(7) ? SN(7) : SN(1), f = Math.floor(t * 24); S6.nw.items.forEach((li, i) => { const done = (t - t0) / 0.55 > 0.15 + i * 0.1; drawLetter(g, li, n.left, n.base, done || li.ch === '.' ? {} : { spr: S6.scr[Math.floor(hash(f, i) * S6.scr.length)] }); }); }
  underline(g, 540, R.ul, 90); drawText(g, R.body); chrome(g, 5, t);
};

// ================================================================== 07 · RULE 06 — resources lock into the crate, idleness gets crushed
const S7 = {
  shakes: [[SN(1), 6], [SN(2), 6], [SN(3), 6], [SN(7), 16]], zooms: [[SN(7), 0.025]], flashes: [[SN(7), 0.14, '230,30,40']],
  spikes: [[SN(3), 0.5], [SN(7), 1.0]], spikeX: 540,
  TAGS: [{ s: 'CREDITORS', t: SN(1), fx: -300, fy: 760 }, { s: 'LOANS', t: SN(2), fx: W + 300, fy: 760 }, { s: 'SIDE INCOME', t: SN(3), fx: 540, fy: VZ - 40 }],
  CX: 540, CT: 1000, CWd: 400,
};
S7.build = () => {
  S7.R = RT('06', 'Gather every resource you can.', 'Call every creditor, defer the loans, find side income. Idleness is the enemy.', { headSize: 76, lines: [['Gather', 'every'], ['resource', 'you', 'can.']] });
  S7.tag = S7.TAGS.map((d) => { SCR.font = fstr(F8, 30); const w = SCR.measureText(d.s).width + 56; const c = mk(w + 8, 68), g = c.getContext('2d'); g.translate(4, 4); card(g, 0, 0, w, 60, 12, '#f2f2f2'); g.fillStyle = C.red; g.fillRect(0, 0, 12, 60); g.font = SCR.font; g.fillStyle = C.ink; g.textBaseline = 'middle'; g.fillText(d.s, 32, 32); return c; });
};
S7.mid = (g, t) => {
  const { CX, CT, CWd } = S7, R = RESET(t);
  // tags fly in from the neighbours and drop into the crate
  S7.TAGS.forEach((d, i) => {
    const p = E.inQ(seg(t, d.t - 0.4, d.t)), out = E.inQ(seg(t, 7.2 + i * 0.06, 7.7 + i * 0.06)), c = S7.tag[i];
    const rx = CX - 90 + i * 90, ry = CT + 40 - i * 20;
    let x = lerp(d.fx, rx, p), y = lerp(d.fy, ry, p) - Math.sin(PI * p) * 120;
    x = lerp(x, d.fx, out); y = lerp(y, d.fy, out);
    if (t < d.t - 0.4 || out >= 0.999) return;
    g.save(); g.translate(x, y + 6 * bounceIn(t, d.t, 24, 8)); g.rotate((i - 1) * 0.12 + (1 - p) * 1.5 * (i % 2 ? 1 : -1)); g.drawImage(c, -c.width / 2, -c.height / 2); g.restore();
  });
  if (!vis(0, W)) return;
  // crate front (drawn after tags so they sit inside)
  g.fillStyle = '#3a2a22'; g.fillRect(CX - CWd / 2, CT, CWd, LINE - CT - 4);
  g.strokeStyle = '#1a120e'; g.lineWidth = 4; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(CX - CWd / 2, CT + k * 50); g.lineTo(CX + CWd / 2, CT + k * 50); g.stroke(); }
  g.strokeStyle = C.red; g.lineWidth = 6; g.strokeRect(CX - CWd / 2, CT, CWd, LINE - CT - 4);
  popText(g, 'RESOURCES', CX, CT + 76, F8, 30, 'rgba(255,255,255,0.85)');
  // IDLENESS hovers, then the lid slams it flat
  const sm = t >= SN(7) ? 1 : 0, ia = (1 - seg(t, SN(7) + 0.05, SN(7) + 0.25)) * (t > 0.2 ? 1 : seg(t, 0, 0.2));
  if (ia > 0.01) {
    const hov = CT - 120 + 8 * Math.sin(t * OM(4)), sq = t < SN(7) ? 1 : lerp(1, 0.08, seg(t, SN(7), SN(7) + 0.06));
    g.save(); g.globalAlpha = clamp(ia); g.translate(CX, hov + 40); g.scale(1 + (1 - sq) * 0.6, sq); card(g, -130, -40, 260, 80, 10, '#555555'); popText(g, 'IDLENESS', 0, 2, F8, 36, '#bdbdbd'); g.restore();
  }
  const lidA = t < SN(7) - 0.3 ? -1.2 : t < SN(7) ? lerp(-1.2, 0, E.inQ(seg(t, SN(7) - 0.3, SN(7)))) : -0.04 * damp(t - SN(7), 28, 7);
  const lidOpen = lidA + (-1.2 - lidA) * E.ioS(seg(t, 7.2, 7.8)) * sm;
  g.save(); g.translate(CX - CWd / 2, CT); g.rotate(lidOpen); g.fillStyle = '#4a362b'; g.fillRect(0, -18, CWd + 10, 18); g.strokeStyle = C.red; g.lineWidth = 4; g.strokeRect(0, -18, CWd + 10, 18); g.restore();
  burst(g, t, SN(7), { n: 30, seed: 71, x: CX, y: CT - 20, sx: 300, ang: [-PI, 0], spd: [300, 900], life: [0.4, 1.0], g: 1600, drag: 1.2, size: [3, 7], kind: 'dot', color: 'rgba(150,150,150,1)', comp: 'source-over', wrap: false });
};
S7.front = (g, t) => {
  if (!vis(0, W)) return;
  // magnetised headline: words jitter while resources are loose, lock with a snap at the slam
  const loose = t < SN(7) ? 1 : 0;
  ruleFront(g, S7.R, 6, t, (it) => ({ dx: loose * 3 * Math.sin(t * 40 + it.wi * 2), dy: loose * 2 * Math.cos(t * 37 + it.wi) - 12 * bounceIn(t, SN(7), 24, 8) }));
};

// ================================================================== 08 · RULE 07 — the VOLUNTEER badge flips to NEW HIRE
const S8 = {
  shakes: [[SN(1), 8], [SN(5) + 0.45, 8]], zooms: [[SN(5) + 0.45, 0.02]], flashes: [[SN(5) + 0.45, 0.12, '255,255,255']],
  spikes: [[SN(1), 0.6], [SN(5) + 0.45, 1.0]], spikeX: 540,
};
S8.build = () => {
  S8.R = RT('07', 'Volunteer.', 'You’ll feel like a person again, and you may meet the person who hires you.', { headSize: 110 });
  S8.wv = word('Volunteer.', F8, 110, TX.white);
  S8.head = S8.R.head.items[0];
};
S8.flip = (t) => E.ioBack(seg(t, SN(5), SN(5) + 0.45), 1.1) - E.ioBack(seg(t, SN(11) - 0.2, SN(11) + 0.3), 1.1);
S8.mid = (g, t) => {
  if (!vis(0, W)) return;
  const sw = 0.12 * Math.sin(t * OM(2)) + 0.18 * kick(t - SN(1), 9, 2.5) + 0.12 * kick(t - SN(5) - 0.45, 9, 2.5);
  const ay = VZ - 40, len = 110 + 14 * kick(t - SN(1), 14, 5);
  g.save(); g.translate(540, ay); g.rotate(sw);
  g.strokeStyle = C.red; g.lineWidth = 10; g.beginPath(); g.moveTo(-50, -40); g.lineTo(0, len); g.lineTo(50, -40); g.stroke();
  g.translate(0, len);
  const fl = S8.flip(t), sx = Math.cos(fl * PI), front = sx >= 0;
  g.scale(Math.abs(sx) + 0.001, 1);
  card(g, -150, 0, 300, 360, 18, '#f4f2ee'); g.fillStyle = '#9a9a9a'; g.fillRect(-26, 12, 52, 10);
  g.fillStyle = front ? C.red : C.ink; g.beginPath(); rrect(g, -150, 36, 300, 74, 0); g.fill();
  popText(g, front ? 'VOLUNTEER' : 'NEW HIRE', 0, 75, F8, front ? 38 : 44, '#ffffff');
  g.fillStyle = '#c8c8c8'; g.beginPath(); g.arc(0, 180, 44, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, 280, 80, 50, 0, PI, TAU); g.fill();
  popText(g, front ? 'HERE TO HELP' : 'STARTS MONDAY', 0, 325, F7, 24, C.ink);
  g.restore();
  ring(g, t, SN(5) + 0.45, 540, ay + 290, { r0: 160, r1: 520, dur: 0.8, w: 6, flat: 0.6, color: 'rgba(230,30,40,1)', alpha: 0.7 });
};
S8.front = (g, t) => {
  if (!vis(0, W)) return;
  const R = S8.R, h = S8.head;
  drawSprite(g, R.num, 540, R.numBase);
  // per-letter rolling wave, once per bar
  S8.wv.items.forEach((li, i) => { let dy = 0; for (const tb of [0, SN(4), SN(8)]) dy -= 16 * Math.sin(PI * clamp((t - tb - i * 0.045) / 0.35)); drawLetter(g, li, h.left, h.base, { dy, piv: 1 }); });
  underline(g, 540, R.ul, 90); drawText(g, R.body); chrome(g, 7, t);
};

// ================================================================== 09 · RULE 08 — tabs close, the laptop slams shut, CLOSED TODAY
const S9 = {
  shakes: [[SN(7), 16]], zooms: [[SN(7), 0.025]], flashes: [],
  spikes: [[SN(7), 1.0], [SN(9), 0.4]], spikeX: 540,
  TABS: ['JOB BOARD', 'APPLY', 'INBOX', 'GHOSTED', 'REJECTED'], LX: 250, LW: 580, SH: 330,
};
S9.build = () => {
  S9.R = RT('08', 'Take one day off from all of it.', 'Job hunting burns you out fast. F*** the job search, just for one day.', { headSize: 74, lines: [['Take', 'one', 'day', 'off'], ['from', 'all', 'of', 'it.']] });
};
S9.lid = (t) => { // 1 open, 0 shut
  if (t < SN(7) - 0.3) return 1;
  if (t < SN(7)) return 1 - E.inQ(seg(t, SN(7) - 0.3, SN(7)));
  return E.ioS(seg(t, 7.25, 7.9)) + 0.03 * Math.abs(kick(t - SN(7), 30, 9));
};
S9.mid = (g, t) => {
  if (!vis(0, W)) return;
  const { LX, LW, SH } = S9, base = LINE - 30, lid = S9.lid(t);
  // base
  g.fillStyle = '#3a3a3a'; g.beginPath(); g.moveTo(LX - 40, base); g.lineTo(LX + LW + 40, base); g.lineTo(LX + LW + 10, base - 22); g.lineTo(LX - 10, base - 22); g.closePath(); g.fill();
  // screen: perspective-squashed as the lid closes
  const sh = SH * lid; if (sh > 2) {
    const top = base - 22 - sh;
    card(g, LX, top, LW, sh, 12, '#141414', '#5a5a5a');
    if (lid > 0.6) {
      g.save(); g.beginPath(); g.rect(LX, top, LW, sh); g.clip(); g.translate(0, top - (base - 22 - SH)); g.globalAlpha = (lid - 0.6) / 0.4;
      const sy = base - 22 - SH;
      let x = LX + 14;
      S9.TABS.forEach((s, i) => {
        const tc = SN(1) + i * BEAT * 0.75, gone = E.inBack(seg(t, tc, tc + 0.22), 2) * RESET(t), w = 104 * (1 - gone);
        if (w > 2) { card(g, x, sy + 14, w - 6, 40, 8, '#262626'); g.save(); g.beginPath(); g.rect(x, sy + 14, w - 6, 40); g.clip(); monoText(g, s, x + 10, sy + 34, 13, 'rgba(255,255,255,0.75)');
          g.fillStyle = C.red; g.beginPath(); g.arc(x + w - 22, sy + 24, 9, 0, TAU); g.fill(); monoText(g, String(3 + i * 4), x + w - 22, sy + 25, 10, '#fff', 'center'); g.restore(); }
        x += w;
      });
      card(g, LX + 30, sy + 80, LW - 60, 30, 6, '#1f1f1f'); for (let k = 0; k < 4; k++) card(g, LX + 30, sy + 130 + k * 44, (LW - 60) * (0.5 + 0.4 * hash(k, 3)), 22, 6, '#1f1f1f');
      g.restore();
    }
  }
  // CLOSED TODAY sign swings down on a string
  const sp = popIn(t, SN(9) - 0.2, 0.4, 1.6) * RESET(t);
  if (sp > 0.01) {
    const sw = 0.25 * kick(t - SN(9), 7, 1.8) + 0.04 * Math.sin(t * OM(4)), py = VZ - 20;
    g.save(); g.translate(820, py); g.rotate(sw); g.globalAlpha = clamp(sp);
    g.strokeStyle = '#bdbdbd'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(-70, 120 * sp); g.moveTo(0, 0); g.lineTo(70, 120 * sp); g.stroke();
    g.translate(0, 120 * sp); card(g, -120, 0, 240, 110, 10, C.red); popText(g, 'CLOSED', 0, 40, F8, 44, '#fff'); popText(g, 'TODAY', 0, 82, F8, 28, '#fff');
    g.restore();
  }
  burst(g, t, SN(7), { n: 22, seed: 91, x: 540, y: base - 26, sx: LW, ang: [-PI, 0], spd: [150, 600], life: [0.4, 0.9], g: 900, drag: 1.4, size: [80, 150], kind: 'puff', sprites: SPR.smoke, alpha: 0.3, comp: 'source-over', wrap: false });
};
S9.front = (g, t) => {
  if (!vis(0, W)) return;
  // lights-out typography: the headline dims when the lid slams, relights a beat later
  const dim = (t >= SN(7) && t < SN(8) + 0.2) ? 0.35 + 0.65 * seg(t, SN(8) - 0.1, SN(8) + 0.2) : 1;
  const flick = t > SN(8) - 0.1 && t < SN(8) + 0.2 ? (Math.floor(t * 40) % 2 ? 0.4 : 1) : 1;
  ruleFront(g, S9.R, 8, t, () => ({ alpha: dim * flick }));
};

// ================================================================== 10 · CTA — LAID OFF? START HERE. (red slide, the wolf howls)
const S10 = {
  shakes: [[SN(1), 14], [SN(7), 6]], zooms: [[SN(1), 0.03], [SN(7), 0.01]], flashes: [[SN(1), 0.18, '255,255,255']],
  spikes: [[SN(1), 0.9], [SN(7), 0.5]],
  SY: 320, SW: 290,
};
S10.build = () => {
  S10.t1 = word('LAID OFF?', F8, 112, { fill: C.white, ext: [6, '#5a050a'], extX: 0 }, 3);
  S10.t2 = word('START HERE.', F8, fitSize('START HERE.', F8, 124, 940, 3), { fill: C.white, ext: [8, '#5a050a'], extX: 0 }, 3);
  S10.sub = layoutText('', F5, 34, 920, { fill: 'rgba(255,255,255,0.94)' }, { top: 860, lh: 1.38, lines: [['Get', 'the', 'free', 'Layoff', 'Comeback', 'Kit:'], ['ATS', 'resume', 'builder,', 'cover', 'letter,'], ['interview', 'cheat', 'sheet.']] });
  S10.btn = glyph('LINK IN BIO', F8, 44, { fill: C.red });
  S10.arrow = glyph('↓', F8, 44, { fill: C.red });
  S10.handle = glyph('@midlifebrotherhood', FM, 24, { fill: 'rgba(255,255,255,0.85)' });
};
S10.back = (g, t) => {
  if (!vis(0, W)) return;
  g.save(); g.translate(540, S10.SY); g.rotate(t * OM(1) / 8); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.fillStyle = 'rgba(255,255,255,0.035)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -900); g.lineTo(90, -900); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalAlpha = 0.5; g.drawImage(SPR.dark, -200, 800, W + 400, 900); g.restore();
};
S10.mid = (g, t) => {
  if (!vis(0, W)) return;
  const pre = E.inQ(seg(t, 0.3, SN(1))), s = t < SN(1) ? 1 - 0.08 * pre : 1 + 0.1 * damp(t - SN(1), 20, 7);
  const howl = hitIn(t, SN(1), 1.6);
  g.save(); g.globalAlpha = 0.55; g.drawImage(SPR.dark, 540 - 250, S10.SY + 110, 500, 130); g.restore();
  drawLogo(g, 'shield', 540, S10.SY - 6 * Math.sin(t * OM(2)), S10.SW * s, { eye: 0.35 + 1.4 * howl + 0.4 * hitIn(t, SN(7), 3) });
  const mx = 540 - 70, my = S10.SY - 105;
  for (let k = 0; k < 4; k++) {
    const dt = t - SN(1) - k * 0.14; if (dt < 0 || dt > 1.4) continue; const p = dt / 1.4;
    g.save(); g.strokeStyle = `rgba(255,255,255,${0.75 * (1 - p)})`; g.lineWidth = 6 * (1 - p) + 1.5; g.lineCap = 'round';
    g.beginPath(); g.arc(mx, my, 40 + 230 * E.outC(p), -PI * 0.95, -PI * 0.6); g.stroke(); g.restore();
  }
};
S10.front = (g, t) => {
  if (!vis(0, W)) return;
  const wave = (Wd, base, amp, dl) => { const left = 540 - Wd.width / 2; Wd.items.forEach((it, i) => { let dy = 0; for (const tb of [SN(1), SN(5), SN(9)]) dy -= amp * bounceIn(t, tb + dl + i * 0.035, 16, 7); drawLetter(g, it, left, base, { dy, piv: 1 }); }); };
  wave(S10.t1, 650, 18, 0.05); wave(S10.t2, 800, 24, 0.12);
  drawText(g, S10.sub);
  const b = decay(t % BEAT, 6), s = 1 + 0.05 * b, by = 1080;
  g.save(); g.translate(540, by); g.scale(s, s); g.fillStyle = '#ffffff'; g.beginPath(); rrect(g, -220, -46, 440, 92, 46); g.fill(); g.restore();
  drawSprite(g, S10.btn, 510, by + 16, { s });
  drawSprite(g, S10.arrow, 690, by + 16 + 8 * Math.sin(t * OM(12)), { s });
  drawSprite(g, S10.handle, 540, 1225);
  chrome(g, N - 1, t);
};

// fall from h0 px above rest between t0..t1, then little bounces
function fallY(t, t0, t1, h0, bounce = 0.06) {
  if (t < t0) return { vis: false, y: h0 };
  if (t < t1) { const u = (t - t0) / (t1 - t0); return { vis: true, y: h0 * (1 - u * u) }; }
  const dt = t - t1, T = t1 - t0, hb = h0 * bounce, tb = 2 * T * Math.sqrt(bounce);
  let y = 0; if (dt < tb) { const v = dt / tb; y = hb * 4 * v * (1 - v); }
  return { vis: true, y };
}

const SL = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
