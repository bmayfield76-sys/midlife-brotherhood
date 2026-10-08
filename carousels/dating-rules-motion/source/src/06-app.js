// ================================================================== APP: preview strip, single slide, swipe, record, export
const NAMES = PROJECT.slides;
const Q = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);
const state = {
  mode: Q.get('mode') || 'strip', slide: clamp(parseInt(Q.get('slide') || '1', 10) - 1, 0, N - 1),
  playing: Q.get('paused') !== '1', t: parseFloat(Q.get('t') || '0') % LOOP, clean: Q.get('clean') === '1',
  big: false, camX: 0, camFrom: 0, camTo: 0, camT0: -1, drag: null, exporting: false,
};
state.camX = state.camTo = state.slide * W;
let view, vg, last = 0, ready = false;

async function boot() {
  const fams = [FONT.anton, FONT.wide, FONT.blk, FONT.mono];
  try { await Promise.all(fams.map((f) => document.fonts.load(`40px ${f}`, 'AB&$1Ñ'))); } catch (e) { /* fall back */ }
  await loadAssets();
  buildBaseSprites(); projectBuild();
  for (const S of SL) if (S.build) S.build();
  if (SL.length !== N) console.error(`PROJECT.slides has ${N} names but SL has ${SL.length} slides`);
  view = $('#view'); vg = view.getContext('2d');
  buildUI(); wireUI(); layout(); ready = true;
  document.body.classList.add('ready');
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- page chrome generated from PROJECT
function buildUI() {
  document.title = `${PROJECT.brand} · ${PROJECT.title}`;
  $('#p-brand').textContent = PROJECT.brand; $('#p-title').textContent = PROJECT.title;
  $('#p-meta').textContent = `live carousel · ${N} × ${W}×${H} · ${LOOP} s seamless loops`;
  const pad = (n) => String(n).padStart(2, '0');
  $('#nums').innerHTML = NAMES.map((_, k) => `<button data-slide="${k}">${k + 1}</button>`).join('');
  $('#strip-labels').innerHTML = NAMES.map((nm, k) => `<button data-k="${k}"><i>${pad(k + 1)}</i> ${nm}</button>`).join('');
  const sc = $('#scrub'); sc.max = String(LOOP);
}

// ---------------------------------------------------------------- layout & sizing
function layout() {
  const stage = $('#stage'), clean = state.clean;
  document.body.classList.toggle('clean', clean);
  document.body.dataset.mode = state.mode;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (state.mode === 'strip' && !clean) {
    const sw = stage.clientWidth - 2, sh = stage.clientHeight - 64;
    let cw = sw, ch = cw / (WORLD / H);
    if (state.big) { ch = Math.max(ch, sh); cw = ch * (WORLD / H); }
    else if (ch > sh) { ch = sh; cw = ch * (WORLD / H); }
    view.style.width = `${cw}px`; view.style.height = `${ch}px`;
    const bw = Math.min(Math.round(cw * dpr), Math.round(WORLD * 0.72));
    view.width = bw; view.height = Math.round(bw * (H / WORLD));
    state.sc = bw / WORLD;
    $('#strip-labels').style.width = `${cw}px`;
  } else {
    const sw = clean ? innerWidth : stage.clientWidth - 2, sh = clean ? innerHeight : stage.clientHeight - 52;
    let ch = sh, cw = ch * (W / H); if (cw > sw) { cw = sw; ch = cw * (H / W); }
    view.style.width = `${cw}px`; view.style.height = `${ch}px`;
    const bw = clean ? W : Math.min(W, Math.round(cw * dpr));
    view.width = bw; view.height = Math.round(bw * (H / W));
    state.sc = bw / W;
  }
  syncUI();
}
function syncUI() {
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === state.mode));
  document.querySelectorAll('[data-slide]').forEach((b) => b.classList.toggle('on', +b.dataset.slide === state.slide));
  $('#play').textContent = state.playing ? 'Pause' : 'Play';
  $('#big').classList.toggle('on', state.big);
  $('#slide-name').textContent = `${String(state.slide + 1).padStart(2, '0')} · ${NAMES[state.slide]}`;
}

// ---------------------------------------------------------------- frame loop
function loop(now) {
  requestAnimationFrame(loop);
  if (!ready) return;
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
  if (state.playing && !state.drag) state.t = (state.t + dt) % LOOP;
  if (state.camT0 >= 0) {
    const p = clamp((now - state.camT0) / 520);
    state.camX = lerp(state.camFrom, state.camTo, E.outQuart(p));
    if (p >= 1) state.camT0 = -1;
  }
  draw();
  $('#time').textContent = `${state.t.toFixed(2)}s`;
  const sc = $('#scrub'); if (document.activeElement !== sc) sc.value = state.t.toFixed(3);
}
function draw() {
  if (state.mode === 'strip' && !state.clean) renderView(vg, state.t, 0, WORLD, state.sc, { grain: false });
  else renderView(vg, state.t, state.camX, state.camX + W, state.sc, { grain: state.sc > 0.6 });
}

// ---------------------------------------------------------------- navigation
function goSlide(k, animate = true) {
  k = clamp(k, 0, N - 1); state.slide = k;
  if (animate && state.mode !== 'strip') { state.camFrom = state.camX; state.camTo = k * W; state.camT0 = performance.now(); }
  else { state.camX = state.camTo = k * W; state.camT0 = -1; }
  syncUI();
}
function setMode(m) { state.mode = m; state.camX = state.camTo = state.slide * W; layout(); }
function restart() { state.t = 0; last = 0; }

function wireUI() {
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.querySelectorAll('[data-slide]').forEach((b) => b.addEventListener('click', () => { if (state.mode === 'strip') setMode('single'); goSlide(+b.dataset.slide, false); }));
  $('#play').addEventListener('click', () => { state.playing = !state.playing; syncUI(); });
  $('#restart').addEventListener('click', restart);
  $('#big').addEventListener('click', () => { state.big = !state.big; layout(); });
  $('#clean').addEventListener('click', () => { if (state.mode === 'strip') state.mode = 'single'; state.clean = true; state.camX = state.slide * W; restart(); layout(); });
  $('#export').addEventListener('click', () => exportSlide(state.slide));
  $('#export-all').addEventListener('click', async () => { for (let k = 0; k < N; k++) await exportSlide(k); });
  $('#prev').addEventListener('click', () => goSlide(state.slide - 1));
  $('#next').addEventListener('click', () => goSlide(state.slide + 1));
  const sc = $('#scrub');
  sc.addEventListener('input', () => { state.t = parseFloat(sc.value); state.playing = false; syncUI(); });
  document.querySelectorAll('#strip-labels button').forEach((b) => b.addEventListener('click', () => { setMode('single'); goSlide(+b.dataset.k, false); }));
  window.addEventListener('resize', layout);
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
    if (e.key === 'ArrowRight') { if (state.mode === 'strip' && !state.clean) setMode('single'); goSlide(state.slide + 1, !state.clean); }
    else if (e.key === 'ArrowLeft') { if (state.mode === 'strip' && !state.clean) setMode('single'); goSlide(state.slide - 1, !state.clean); }
    else if (e.key >= '1' && e.key <= '6') { if (state.mode === 'strip' && !state.clean) setMode('single'); goSlide(+e.key - 1, false); }
    else if (e.key === ' ') { state.playing = !state.playing; syncUI(); e.preventDefault(); }
    else if (e.key === 'r' || e.key === 'R') restart();
    else if (e.key === 's' || e.key === 'S') { state.clean = false; setMode('strip'); }
    else if (e.key === 'f' || e.key === 'F') { state.clean = !state.clean; if (state.clean && state.mode === 'strip') state.mode = 'single'; restart(); layout(); }
    else if (e.key === 'Escape' && state.clean) { state.clean = false; layout(); }
    else if (e.key === 'e' || e.key === 'E') exportSlide(state.slide);
  });
  // drag to swipe between slides (single view)
  view.addEventListener('pointerdown', (e) => {
    if (state.mode === 'strip' && !state.clean) return;
    state.drag = { x: e.clientX, cam: state.camX, t0: performance.now() }; state.camT0 = -1; view.setPointerCapture(e.pointerId);
  });
  view.addEventListener('pointermove', (e) => {
    if (!state.drag) return;
    const k = W / view.getBoundingClientRect().width;
    state.camX = clamp(state.drag.cam - (e.clientX - state.drag.x) * k, -120, (N - 1) * W + 120);
  });
  const end = (e) => {
    if (!state.drag) return;
    const moved = state.camX - state.drag.cam, fast = Math.abs(moved) > 60 && performance.now() - state.drag.t0 < 300;
    let k = Math.round(state.camX / W); if (fast) k = state.slide + Math.sign(moved);
    state.drag = null; goSlide(k);
  };
  view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
  let hideT = 0;
  window.addEventListener('mousemove', () => { document.body.classList.remove('nocursor'); clearTimeout(hideT); hideT = setTimeout(() => document.body.classList.add('nocursor'), 1600); });
}

// ---------------------------------------------------------------- export one exact loop (MediaRecorder, native 1080×1350)
function exportSlide(k) {
  if (state.exporting || !window.MediaRecorder) { if (!window.MediaRecorder) alertBox('This browser cannot record canvas video. Use Chrome, or screen-record Record mode.'); return Promise.resolve(); }
  return new Promise((resolve) => {
    state.exporting = true;
    const c = mk(W, H); c.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(c);
    const g = c.getContext('2d');
    const types = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    const mime = types.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const stream = c.captureStream(60), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 18e6 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const badge = $('#rec'); badge.hidden = false;
    renderView(g, 0, k * W, (k + 1) * W, 1, { grain: true });
    let t0 = 0;
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime || 'video/webm' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `${(PROJECT.brand + '-' + PROJECT.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(k + 1).padStart(2, '0')}.${ext}`; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); c.remove(); }, 4000);
      badge.hidden = true; state.exporting = false; resolve();
    };
    rec.start();
    const step = (now) => {
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      if (t >= LOOP) { renderView(g, LOOP - 0.0001, k * W, (k + 1) * W, 1, { grain: true }); setTimeout(() => rec.stop(), 60); return; }
      renderView(g, t, k * W, (k + 1) * W, 1, { grain: true });
      badge.textContent = `● Recording slide ${k + 1} — ${t.toFixed(1)} / ${LOOP}s`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function alertBox(msg) { const b = $('#rec'); b.hidden = false; b.textContent = msg; setTimeout(() => (b.hidden = true), 4200); }

// ---------------------------------------------------------------- automation hooks (frame-exact rendering for headless capture)
const RC = mk(W, H), RG_ = RC.getContext('2d');
window.EB = {
  W, H, N, LOOP, ready: () => ready,
  frame(k, t, type = 'image/jpeg', q = 0.94) { renderView(RG_, wrapT(t), k * W, (k + 1) * W, 1, { grain: true }); return RC.toDataURL(type, q); },
  bench(n = 30, strip = true, sc = 0.4) { const c = mk(strip ? WORLD * sc : W * sc * 2.5, H * sc * (strip ? 1 : 2.5)), g = c.getContext('2d'); const t0 = performance.now(); for (let i = 0; i < n; i++) strip ? renderView(g, i * 0.27, 0, WORLD, sc, {}) : renderView(g, i * 0.27, 2 * W, 3 * W, 1, { grain: true }); g.getImageData(0, 0, 1, 1); return (performance.now() - t0) / n; },
  strip(t, scale = 0.25) { const c = mk(WORLD * scale, H * scale), g = c.getContext('2d'); renderView(g, wrapT(t), 0, WORLD, scale, {}); return c.toDataURL('image/jpeg', 0.9); },
};
boot();
