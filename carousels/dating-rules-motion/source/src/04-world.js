// ================================================================== THE WORLD (continuous across all nine slides)
const BGK = [ // [top, bottom] per slide: charcoal family, neighbours never match, CTA goes brand red
  ['#1f1f1f', '#0b0b0b'], ['#251315', '#0c0808'], ['#15181b', '#08090a'],
  ['#202020', '#0f0f0f'], ['#271113', '#0b0707'], ['#16191c', '#09090a'],
  ['#22201e', '#0e0d0c'], ['#1c0b0d', '#060404'], ['#c8121d', '#7a0910'],
];
const BAND = [260, 260, 260, 260, 260, 260, 260, 210];
let BGC = null;
function bakeBG() {
  const sc = 6, w = Math.ceil(WORLD / sc), h = Math.ceil(H / sc);
  BGC = mk(w, h); const g = BGC.getContext('2d'), im = g.createImageData(w, h);
  const T = BGK.map(([a, b]) => [hex2rgb(a), hex2rgb(b)]);
  for (let x = 0; x < w; x++) {
    const xw = (x + 0.5) * sc, top = T[0][0].slice(), bot = T[0][1].slice();
    for (let s = 1; s < N; s++) {
      const k = smooth(s * W - BAND[s - 1], s * W + BAND[s - 1], xw); if (k <= 0) continue;
      for (let c = 0; c < 3; c++) { top[c] = lerp(top[c], T[s][0][c], k); bot[c] = lerp(bot[c], T[s][1][c], k); }
    }
    for (let y = 0; y < h; y++) {
      const v = (((y + 0.5) * sc) / H) ** 1.2, i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) im.data[i + c] = lerp(top[c], bot[c], v);
      im.data[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
}
const worldLight = () => 1;
const redness = (xw) => smooth(8 * W - 260, 8 * W + 60, xw); // 0 = charcoal world, 1 = red CTA slide

// ---------------------------------------------------------------- seam bridges: ash shards + red sparks floating across every edge
const FG = {};
function buildFG() {
  const shard = (seed, red) => {
    const c = mk(120, 120), g = c.getContext('2d'); g.translate(60, 60); g.beginPath();
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + hash(seed, k) * 0.9, r = 26 + 26 * hash(seed, k + 9); k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath();
    const gr = g.createLinearGradient(-40, -40, 40, 40);
    gr.addColorStop(0, red ? '#ff4a50' : '#5a5a5a'); gr.addColorStop(0.5, red ? '#b80f17' : '#2c2c2c'); gr.addColorStop(1, red ? '#5a0408' : '#141414');
    g.fillStyle = gr; g.fill(); g.strokeStyle = red ? 'rgba(255,140,140,0.8)' : 'rgba(200,200,200,0.35)'; g.lineWidth = 2; g.stroke();
    return soften(c, 0.6);
  };
  FG.ash = [shard(3, false), shard(7, false), shard(11, false)];
  FG.red = [shard(5, true), shard(9, true)];
  FG.ashB = blurred(shard(13, false), 5);
  SPR.ash = radial(64, [[0, 'rgba(225,225,225,0.9)'], [0.35, 'rgba(190,190,190,0.35)'], [1, 'rgba(160,160,160,0)']]);
}
// [set, index, xWorld, y, scale]: straddling each edge, mid-height, in the side margins (text never reaches x < 90 or > 990)
const FLOAT = [];
for (let s = 1; s < 9; s++) {
  const r = (j) => hash(s, j);
  FLOAT.push(['ash', s % 3, s * W - 20 + 40 * r(1), 620 + 120 * r(2), 0.7 + 0.3 * r(3)]);
  FLOAT.push([s === 8 ? 'ash' : 'red', s % 2, s * W + 10 - 40 * r(4), 860 + 140 * r(5), 0.45 + 0.2 * r(6)]);
}

// ---------------------------------------------------------------- the pulse line: one red line through all nine slides
// A heartbeat blip runs along it once per bar (3 per loop) and crosses every edge at the same instant,
// and each slide's big moments spike it in place (SL[k].spikes = [[time, amp]]).
const LINE = PROJECT.floor;
function ecg(u) { // u = distance from centre in units of ~60 px
  return 0.10 * Math.exp(-((u + 2.6) ** 2) * 2.2) - 0.22 * Math.exp(-((u + 0.55) ** 2) * 18) + 1.0 * Math.exp(-(u ** 2) * 26)
    - 0.34 * Math.exp(-((u - 0.5) ** 2) * 18) + 0.18 * Math.exp(-((u - 2.4) ** 2) * 2.4);
}
const BLIP_SPD = (3 * W) / LOOP; // px/s: crosses one slide per bar
function lineY(xw, t) {
  let y = 0;
  // travelling blip (one per slide width, seamless across edges and across the loop)
  const ph = frac((t * 3) / LOOP) * W, j0 = Math.floor((xw - ph) / W);
  for (let j = j0 - 1; j <= j0 + 1; j++) { const bx = j * W + ph; const u = (xw - bx) / 30; if (Math.abs(u) < 5) y += 46 * ecg(u); }
  // in-place spikes from each slide's big moments
  const k = clamp(Math.floor(xw / W), 0, N - 1);
  for (let kk = Math.max(0, k - 1); kk <= Math.min(N - 1, k + 1); kk++) {
    const S = SL[kk]; if (!S || !S.spikes) continue;
    const xc = kk * W + (S.spikeX || 540), u = (xw - xc) / 62; if (Math.abs(u) > 5) continue;
    for (const [te, a] of S.spikes) { const dt = wrapT(t - te); if (dt < 1.4) y += 170 * a * ecg(u) * decay(dt, 3.2) * (0.75 + 0.25 * Math.cos(dt * 28)); }
  }
  return LINE - y;
}
function blipX(t) { return frac((t * 3) / LOOP) * W; } // local x of the blip head in every slide
function drawLine(g, t, x0, x1) {
  const step = 5, a0 = Math.floor(x0 / step) * step, pts = [];
  for (let x = a0; x <= x1 + step; x += step) pts.push([x, lineY(x, t)]);
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  // colour runs: red on charcoal, white on the red CTA slide
  const run = (w, alpha, comp) => {
    g.globalCompositeOperation = comp; g.lineWidth = w;
    for (let i = 0; i < pts.length - 1;) {
      const r = redness(pts[i][0]) > 0.5, j0 = i; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]);
      while (i < pts.length - 1 && (redness(pts[i][0]) > 0.5) === r) { i++; g.lineTo(pts[i][0], pts[i][1]); }
      g.strokeStyle = r ? `rgba(255,255,255,${alpha})` : `rgba(230,24,34,${alpha})`; g.stroke(); if (i === j0) i++;
    }
  };
  run(16, 0.10, 'lighter'); run(4.5, 0.95, 'source-over');
  // glowing blip heads with a short comet tail
  g.globalCompositeOperation = 'lighter';
  const ph = blipX(t);
  for (let j = Math.floor(x0 / W) - 1; j <= Math.floor(x1 / W) + 1; j++) {
    const bx = j * W + ph; if (bx < x0 - 200 || bx > x1 + 200) continue;
    const by = lineY(bx, t);
    for (let q = 0; q < 6; q++) { const xx = bx - q * 34, s = 70 - q * 9; g.globalAlpha = 0.5 * (1 - q / 6); g.drawImage(redness(xx) > 0.5 ? SPR.glow : SPR.red, xx - s, lineY(xx, t) - s, s * 2, s * 2); }
    g.globalAlpha = 0.9; g.drawImage(SPR.glow, bx - 16, by - 16, 32, 32);
  }
  g.restore();
}

function drawWorldBack(g, t, x0, x1) {
  g.fillStyle = '#0a0a0a'; g.fillRect(x0 - 300, -300, x1 - x0 + 600, H + 600);
  g.drawImage(BGC, 0, 0, WORLD, H);
  // below the line: a darker band, like a floor
  g.fillStyle = LG(g, 'floor', 0, LINE, 0, H, [[0, 'rgba(0,0,0,0.0)'], [0.15, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.55)']]);
  g.fillRect(x0 - 300, LINE, x1 - x0 + 600, H - LINE + 300);
  // slow grey dust bokeh
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const u = frac(t / LOOP + hash(i, 701)), xb = hash(i, 702) * WORLD, x = xb + 40 * Math.sin(u * TAU + i);
    if (x < x0 - 80 || x > x1 + 80) continue;
    const y = H + 60 - (H + 120) * u, s = 18 + 40 * hash(i, 703);
    g.globalAlpha = (0.04 + 0.06 * hash(i, 704)) * Math.sin(PI * u);
    g.drawImage(hash(i, 705) < 0.25 ? SPR.red : SPR.ash, x - s, y - s, s * 2, s * 2);
  }
  g.restore();
}
function drawWorldFront(g, t, x0, x1) {
  for (const [set, idx, x, y, s] of FLOAT) {
    const img = FG[set][idx % FG[set].length], i = x * 0.01 + y * 0.003, ww = img.width * s, hh = img.height * s;
    if (x + ww < x0 || x - ww > x1) continue;
    const px = x + 8 * Math.sin(t * OM(1) + i), py = y + 16 * Math.sin(t * OM(1) + i * 2.1);
    g.save(); g.translate(px, py); g.rotate(0.5 * Math.sin(t * OM(1) + i * 3) + i); g.drawImage(img, -ww / 2, -hh / 2, ww, hh); g.restore();
  }
  // big out-of-focus shards drifting in the foreground
  for (let i = 0; i < 6; i++) {
    const u = frac(t / LOOP + hash(i, 811)), x = hash(i, 812) * WORLD + 160 * Math.sin(u * TAU), s = 0.9 + 0.7 * hash(i, 813);
    if (x + 200 < x0 || x - 200 > x1) continue;
    const y = H + 200 - (H + 400) * u;
    g.save(); g.globalAlpha = 0.5 * Math.sin(PI * u); g.translate(x, y); g.rotate(u * 3 + i); g.drawImage(FG.ashB, -FG.ashB.width * s / 2, -FG.ashB.height * s / 2, FG.ashB.width * s, FG.ashB.height * s); g.restore();
  }
  drawLine(g, t, x0, x1);
  // ash rising + a few red sparks, everywhere
  embers(g, t, { n: 90, seed: 740, life: 2, x0: -200, x1: WORLD + 200, y0: H + 30, y1: H - 160, rise: 1300, wind: 70, size: [2, 6], alpha: 0.55, wig: 40, spr: SPR.ash });
  embers(g, t, { n: 40, seed: 760, life: 4, x0: -200, x1: WORLD + 200, y0: H + 30, y1: H - 160, rise: 1500, wind: 60, size: [2, 5], alpha: 0.8, wig: 30, streak: true, spr: SPR.red });
}
function projectBuild() { bakeBG(); buildFG(); buildChrome(); }
