// Film the site scrolling from top to bottom as a 4K MP4 (3840 × 2160, 30 fps, no sound).
// The page sits under a browser bar with its address, a pointer hovers and clicks real elements,
// a scrollbar shows the page moving, and "Asad" is watermarked in the bottom-right corner.
// Frames are captured one at a time on a virtual clock, so the motion stays smooth however long
// each 4K screenshot takes.
//   node tools/record.mjs [url] [out.mp4]
//   PREVIEW=1 node tools/record.mjs   → walks the same path, saves every 15th frame to video/preview
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const url = process.argv[2] || 'http://127.0.0.1:8642/'
const out = path.resolve(process.argv[3] || path.join(ROOT, 'video', 'sama-website-4k.mp4'))
const PREVIEW = !!process.env.PREVIEW
const FPS = 30, W = 1920, BAR = 80, H = 1080 - BAR, DSF = 2
const ADDRESS = new URL(url).host
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(path.dirname(out), { recursive: true })

// ---------- Chrome over CDP ----------
const port = 9700 + Math.floor(Math.random() * 100)
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars', '--mute-audio',
  `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, '--no-first-run', '--user-data-dir=/tmp/cdp-rec-' + port, '--use-angle=metal', 'about:blank'], { stdio: 'ignore' })
let wsUrl
for (let i = 0; i < 80; i++) { try { const t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); if (t) { wsUrl = t.webSocketDebuggerUrl; break } } catch {} await sleep(250) }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r))
let frame = 0, sy = 0, cx = 1720, cy = 860
let id = 0; const pending = new Map(); const errors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  else if (m.method === 'Inspector.targetCrashed') { console.error('page crashed at frame', frame); process.exit(1) }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
}
const send = (method, params = {}) => new Promise((r, j) => {
  const i = ++id
  const t = setTimeout(() => j(new Error(`no reply to ${method} at frame ${frame}`)), 60000)
  pending.set(i, (m) => { clearTimeout(t); r(m) }); ws.send(JSON.stringify({ id: i, method, params }))
})
const ev = async (expr) => {
  const m = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || expr)
  return m.result?.result?.value
}
const until = async (expr, tries = 240) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return; await sleep(250) } throw new Error('timed out: ' + expr) }
await send('Page.enable'); await send('Runtime.enable'); await send('Inspector.enable')

// ---------- Overlays: browser bar and watermark ----------
async function snap(html, w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: DSF, mobile: false })
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') })
  await until('document.readyState === "complete"')
  await ev('document.fonts.ready.then(() => true)')
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  return Buffer.from(shot.result.data, 'base64')
}
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&display=swap" rel="stylesheet">'
const icon = (d) => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`
const barHTML = `<!doctype html><meta charset="utf-8">${FONTS}<style>
  body { margin: 0; width: ${W}px; height: ${BAR}px; background: #1f2023; color: #e8eaed; overflow: hidden;
    font: 13px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; }
  .tabs { height: 40px; display: flex; align-items: flex-end; padding-inline-start: 86px; position: relative; }
  .lights { position: absolute; left: 18px; top: 15px; display: flex; gap: 8px; }
  .lights i { width: 12px; height: 12px; border-radius: 50%; display: block; }
  .tab { height: 33px; width: 268px; background: #35363a; border-radius: 10px 10px 0 0; display: flex; align-items: center; gap: 9px; padding: 0 12px; box-sizing: border-box; }
  .fav { width: 16px; height: 16px; border-radius: 4px; background: #0a0f1c; display: grid; place-items: center; color: #c9a15b; font: italic 500 12px Fraunces, serif; }
  .title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
  .close { color: #9aa0a6; font-size: 14px; }
  .plus { margin: 0 0 9px 12px; color: #9aa0a6; font-size: 19px; }
  .bar { height: 40px; background: #35363a; display: flex; align-items: center; gap: 16px; padding: 0 14px; box-sizing: border-box; border-bottom: 1px solid #2a2b2e; }
  svg { width: 18px; height: 18px; fill: none; stroke: #c4c7c5; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; display: block; }
  .omni { flex: 1; height: 30px; border-radius: 15px; background: #202124; display: flex; align-items: center; gap: 10px; padding: 0 14px; font-size: 14px; }
  .omni svg { width: 15px; height: 15px; }
  .omni .host { color: #e8eaed; }
  .dim { opacity: .45; }
</style>
<div class="tabs"><div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
  <div class="tab"><span class="fav">S</span><span class="title">Sama · Rooftop Kitchen, Café Bar &amp; Shisha · Dubai</span><span class="close">✕</span></div><span class="plus">+</span></div>
<div class="bar">
  ${icon('M15 5l-7 7 7 7')}<span class="dim">${icon('M9 5l7 7-7 7')}</span>${icon('M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5')}
  <div class="omni">${icon('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01')}<span class="host">${ADDRESS}</span></div>
  ${icon('M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z')}${icon('M12 5v.01M12 12v.01M12 19v.01')}
</div>`
const markHTML = `<!doctype html><meta charset="utf-8">${FONTS}<style>
  body { margin: 0; width: 240px; height: 64px; display: flex; align-items: center; justify-content: flex-end; }
  .m { display: flex; align-items: center; gap: 12px; font: italic 500 31px Fraunces, serif; color: rgb(242 232 213 / .82); text-shadow: 0 1px 14px rgb(0 0 0 / .6); padding-inline-end: 4px; }
  .m i { width: 30px; height: 1px; background: #c9a15b; box-shadow: 0 0 10px rgb(0 0 0 / .5); }
</style><div class="m"><i></i>Asad</div>`
const dir = path.join(ROOT, 'video')
writeFileSync(path.join(dir, '.bar.png'), await snap(barHTML, W, BAR))
writeFileSync(path.join(dir, '.mark.png'), await snap(markHTML, 240, 64))
await send('Emulation.setDefaultBackgroundColorOverride', {})

// ---------- The site on a virtual clock ----------
const INIT = `(() => {
  let now = 0, q = [], id = 0;
  const base = Date.now();
  performance.now = () => now;
  Date.now = () => base + now;
  window.requestAnimationFrame = (cb) => (q.push([++id, cb]), id);
  window.cancelAnimationFrame = (i) => { q = q.filter((e) => e[0] !== i); };
  const flush = () => { const run = q; q = []; for (const [, cb] of run) { try { cb(now); } catch (e) { console.error(e); } } };
  let cur, ring, thumb, lastY = 0, show = 0;
  addEventListener('DOMContentLoaded', () => {
    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    layer.innerHTML = '<div id="__thumb" style="position:absolute;right:3px;top:0;width:8px;border-radius:4px;background:rgb(255 255 255 / .42);opacity:0"></div>'
      + '<div id="__ring" style="position:absolute;left:0;top:0;width:44px;height:44px;border-radius:50%;border:2px solid rgb(255 255 255 / .9);opacity:0"></div>'
      + '<svg id="__cur" width="27" height="40" viewBox="0 0 18 27" style="position:absolute;left:0;top:0;filter:drop-shadow(0 2px 3px rgb(0 0 0 / .45))">'
      + '<path d="M1 1v20.5l5.2-5 3.4 8.2 3.3-1.4-3.3-7.9h7.3z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(layer);
    cur = layer.querySelector('#__cur'); ring = layer.querySelector('#__ring'); thumb = layer.querySelector('#__thumb');
  });
  window.__rec = {
    flush,
    frame(y, x, cy) {
      window.samaLenis.scrollTo(y, { immediate: true, force: true });
      window.ScrollTrigger && ScrollTrigger.update();
      cur.style.transform = 'translate(' + (x - 1) + 'px,' + (cy - 1) + 'px)';
      ring.style.left = (x - 22) + 'px'; ring.style.top = (cy - 22) + 'px';
      const doc = document.documentElement.scrollHeight, vh = innerHeight, h = Math.max(40, vh * vh / doc);
      show = Math.abs(y - lastY) > .5 ? 1 : Math.max(0, show - .04); lastY = y;
      thumb.style.height = h + 'px'; thumb.style.transform = 'translateY(' + (y / (doc - vh)) * (vh - h) + 'px)';
      thumb.style.opacity = Math.min(1, show * 1.6);
    },
    ripple() { ring.animate([{ transform: 'scale(.35)', opacity: .9 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.2,.7,.3,1)' }); },
    step(dt) {
      now += dt; flush();
      for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (a.currentTime || 0) + dt; }
    }
  };
})();`
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DSF, mobile: false })
await send('Page.addScriptToEvaluateOnNewDocument', { source: INIT })
await send('Page.navigate', { url })
await until('!!(window.samaLenis && window.SamaFilm && window.__rec && document.readyState === "complete")')
await ev('document.fonts.ready.then(() => true)')
await sleep(1200)
await ev('SamaFilm.preload(), true')
await until('SamaFilm.loaded() >= 1', 1200)
await ev('__rec.flush(), ScrollTrigger.refresh(), true')
console.log('film frames loaded; recording')

// ---------- Layout helpers (read live, so they hold after the language switch) ----------
const el = (s) => ev(`(() => { const r = document.querySelector(${JSON.stringify(s)}).getBoundingClientRect(); return [r.top + scrollY, r.height]; })()`)
const trig = (s) => ev(`(() => { const t = document.querySelector(${JSON.stringify(s)});
  const all = ScrollTrigger.getAll().filter((x) => x.trigger === t || x.pin === t).sort((a, b) => (b.end - b.start) - (a.end - a.start));
  return [all[0].start, all[0].end]; })()`)
const center = (s) => ev(`(() => { const r = document.querySelector(${JSON.stringify(s)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`)
const at = ([a, b], k) => a + (b - a) * k
const vh = H
const docEnd = () => ev('document.documentElement.scrollHeight - innerHeight')

// ---------- Encoder ----------
let ff
if (!PREVIEW) {
  ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(dir, '.bar.png'), '-i', path.join(dir, '.mark.png'),
    '-filter_complex', `[0:v]pad=3840:2160:0:${BAR * DSF}:color=black[a];[a][1:v]overlay=0:0[b];[b][2:v]overlay=W-w-56:H-h-44,format=yuv420p[v]`,
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '5.2',
    '-tag:v', 'avc1', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
} else {
  rmSync(path.join(dir, 'preview'), { recursive: true, force: true }); mkdirSync(path.join(dir, 'preview'))
}

// ---------- Director ----------
const sine = (t) => -(Math.cos(Math.PI * t) - 1) / 2
const cubic = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
async function render() {
  await ev(`__rec.frame(${sy.toFixed(2)}, ${cx.toFixed(1)}, ${cy.toFixed(1)})`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy })
  await ev(`__rec.step(${1000 / FPS})`)
  if (!PREVIEW || frame % 15 === 0) {
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 93 })
    const buf = Buffer.from(shot.result.data, 'base64')
    if (PREVIEW) writeFileSync(path.join(dir, 'preview', String(frame).padStart(5, '0') + '.jpg'), buf)
    else if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
  }
  frame++
  if (frame % 150 === 0) console.log(`${(frame / FPS).toFixed(0)} s`, PREVIEW ? await ev('performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + " MB heap" : ""') : '')
}
async function go({ to = sy, cursor = null, dur, ease = cubic, click = false }) {
  const n = Math.max(1, Math.round(dur * FPS))
  const [y0, x0, c0] = [sy, cx, cy]
  const [tx, ty] = !cursor ? [cx, cy] : typeof cursor === 'string' ? await center(cursor) : cursor
  for (let i = 1; i <= n; i++) {
    const k = i / n
    sy = y0 + (to - y0) * ease(k)
    cx = x0 + (tx - x0) * cubic(k); cy = c0 + (ty - c0) * cubic(k)
    await render()
  }
  if (click) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 })
    await ev('__rec.ripple()')
  }
}
const hold = (dur) => go({ dur })

// Arrival: the rooftop film, pausing on each caption
const A = await trig('#arrival')
await hold(0.4)
await go({ cursor: [1260, 720], dur: 2.2 })
await go({ to: at(A, .38), dur: 5, ease: sine })
await hold(1.5)
await go({ to: at(A, .68), dur: 4.4, ease: sine, cursor: [760, 560] })
await hold(1.5)
await go({ to: at(A, .95), dur: 4, ease: sine })
await go({ cursor: '.cap-finale .btn, .cap-finale a, .cap-finale button', dur: 1.1 })
await hold(1.1)

// Story, then the signature dishes carousel
const S = await el('.story')
await go({ to: S[0] - vh * .05, dur: 2.2, cursor: [1520, 640] })
await go({ to: S[0] + S[1] - vh * .8, dur: 4.6, ease: sine })
const G = await trig('#signature')
await go({ to: G[0], dur: 1.8 })
await go({ to: G[1], dur: 8.5, ease: sine })

// Marquee and the Burj view
const V = await trig('.view')
await go({ to: V[0], dur: 2.6 })
await go({ to: V[1], dur: 5, ease: sine })
await hold(0.6)

// Seating: hover each round photo
const L = await el('#seatList')
await go({ to: L[0] + L[1] / 2 - vh / 2 + 40, dur: 2.6, cursor: [960, 820] })
for (const k of [1, 2, 3]) { await go({ cursor: `.seat:nth-child(${k}) .seat-orb`, dur: .8 }); await hold(.9) }

// Coffee film
const C = await trig('#coffee')
await go({ to: C[0], dur: 2.4, cursor: [1500, 640] })
await go({ to: at(C, .14), dur: 1.8 })
await hold(1)
await go({ to: at(C, .53), dur: 4.4, ease: sine })
await hold(1.3)
await go({ to: at(C, .9), dur: 4.2, ease: sine })
await hold(1.3)

// Café bar: hover a few drinks to swap the photo
const F = await el('#cafe')
await go({ to: F[0] - 30, dur: 2.6 })
for (const s of ['.cafe-group:nth-child(1) .drink:nth-of-type(1)', '.cafe-group:nth-child(1) .drink:nth-of-type(2)', '.cafe-group:nth-child(2) .drink:nth-of-type(1)']) {
  await go({ cursor: s, dur: .8 }); await hold(1)
}

// Shisha film
const Sh = await trig('#shishaFilm')
await go({ to: Sh[0], dur: 2.4, cursor: [1500, 640] })
await go({ to: at(Sh, .14), dur: 1.8 })
await hold(1)
await go({ to: at(Sh, .52), dur: 4.4, ease: sine })
await hold(1.3)
await go({ to: at(Sh, .9), dur: 4.2, ease: sine })
await hold(1.3)

// Flavours
const Fl = await el('#shisha')
await go({ to: Fl[0], dur: 2.6 })
await go({ cursor: '#flavourList li:nth-child(2)', dur: .9 })
await hold(1.2)

// Menu: change tab, hover dishes, switch to Arabic and back
const M = await el('#menu')
await go({ to: M[0] - 20, dur: 2.6 })
await go({ cursor: '#menuTabs button:nth-child(2)', dur: 1, click: true })
await hold(1.3)
await go({ cursor: '#menuRows .menu-row:nth-child(2) .menu-name', dur: .9 })
await hold(1)
await go({ cursor: '#menuRows .menu-row:nth-child(4) .menu-desc', dur: .9 })
await hold(.8)
await go({ cursor: '#langToggle', dur: 1.1, click: true })
await hold(1.6)
await go({ cursor: '#menuRows .menu-row:nth-child(3) .menu-name', dur: 1 })
await hold(1.4)
await go({ cursor: '#langToggle', dur: 1.1, click: true })
await hold(1)

// Booking and footer
const B = await el('#book')
await go({ to: B[0] - 40, dur: 2.6, cursor: [1250, 640] })
await go({ cursor: '#bookForm button[type="submit"], #bookForm .btn', dur: 1 })
await hold(1.4)
await go({ to: await docEnd(), dur: 2.4, cursor: [1300, 520] })
await hold(2.4)

console.log(`frames: ${frame} (${(frame / FPS).toFixed(1)} s)`)
console.log('errors:', errors.length ? errors.join('\n') : 'none')
if (ff) { ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('wrote', out) }
ws.close(); chrome.kill()
