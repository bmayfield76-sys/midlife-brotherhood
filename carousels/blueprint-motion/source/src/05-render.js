// ================================================================== RENDERER (engine — no project code here)
// camera impacts per slide, flashes/vignette/grain, and the strip/slide renderer.
function camera(k, t) {
  const S = SL[k]; let x = 0, y = 0, r = 0, z = 1;
  for (const [ti, a] of S.shakes || []) {
    const dt = t - ti; if (dt < 0 || dt > 0.8) continue;
    const e = a * Math.exp(-dt * 7.5);
    x += e * Math.sin(dt * 73 + ti * 13); y += e * Math.cos(dt * 61 + ti * 7); r += e * 0.0011 * Math.sin(dt * 47 + ti);
  }
  for (const [ti, a] of S.zooms || []) { const dt = t - ti; if (dt < 0 || dt > 1.2) continue; z += a * Math.exp(-dt * 6) * Math.cos(dt * 10); }
  return { x, y, r, z };
}
function post(g, k, t, opt) {
  const S = SL[k]; let fl = 0, col = '255,200,150';
  for (const [ti, a, c] of S.flashes || []) { const dt = t - ti; if (dt >= 0 && dt < 0.6) { const v = a * Math.exp(-dt * 9); if (v > fl) { fl = v; col = c; } } }
  const x = k * W;
  if (fl > 0.01) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(${col},${fl})`; g.fillRect(x, 0, W, H); g.restore(); }
  g.fillStyle = LG(g, 'vigT', 0, 0, 0, 280, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x, 0, W, 280);
  g.fillStyle = LG(g, 'vigB', 0, H - 220, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(x, H - 220, W, 220);
  if (opt && opt.grain) {
    const c = gcache(g); if (!c.grain) c.grain = g.createPattern(SPR.grain, 'repeat');
    const f = Math.floor(t * 30), ox = Math.floor(hash(f, 5) * 256), oy = Math.floor(hash(f, 6) * 256);
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.55; g.translate(-ox, -oy); g.fillStyle = c.grain; g.fillRect(x + ox, oy, W, H); g.restore();
  }
}
const LAYERS = ['back', 'mid', 'front'];
// Render world range [vx0, vx1] at scale sc into context g (canvas origin = vx0).
function renderView(g, t, vx0, vx1, sc, opt = {}) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.setTransform(sc, 0, 0, sc, -vx0 * sc, 0);
  const k0 = clamp(Math.floor(vx0 / W), 0, N - 1), k1 = clamp(Math.floor((vx1 - 0.01) / W), 0, N - 1);
  for (let k = k0; k <= k1; k++) {
    const c0 = Math.max(vx0, k * W), c1 = Math.min(vx1, (k + 1) * W); if (c1 <= c0) continue;
    g.save(); g.beginPath(); g.rect(c0, 0, c1 - c0, H); g.clip();
    const cam = camera(k, t), cx = k * W + W / 2;
    g.translate(cx + cam.x, H / 2 + cam.y); g.rotate(cam.r); g.scale(cam.z, cam.z); g.translate(-cx, -H / 2);
    drawWorldBack(g, t, c0 - 60, c1 + 60);
    for (const layer of LAYERS) {
      for (let j = Math.max(0, k - 1); j <= Math.min(N - 1, k + 1); j++) {
        VIS.x0 = c0 - j * W; VIS.x1 = c1 - j * W;
        const fn = SL[j] && SL[j][layer]; if (!fn) continue;
        g.save(); g.translate(j * W, 0); fn(g, t); g.restore();
      }
    }
    VIS.x0 = c0; VIS.x1 = c1;
    drawWorldFront(g, t, c0 - 60, c1 + 60);
    g.restore();
    g.save(); g.beginPath(); g.rect(c0, 0, c1 - c0, H); g.clip(); post(g, k, t, opt); g.restore();
  }
}
