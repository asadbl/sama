// Scroll-scrubbed films. Each <section class="film" data-film="name"> plays its image sequence
// (assets/film/<name>/{d,m}/NNNN.webp) as the visitor scrolls through it. Captions inside carry
// data-in / data-out as fractions of the section's scroll and fade in and out on their own.
window.SamaFilm = (() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const films = [];

  function coarseToFine(n) {
    const order = [];
    const seen = new Uint8Array(n);
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < n; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
    }
    if (!seen[n - 1]) order.push(n - 1);
    return order;
  }

  function setup(section, info) {
    const name = section.dataset.film;
    const canvas = section.querySelector(".film-canvas");
    const ctx = canvas.getContext("2d");
    const poster = section.querySelector(".film-poster");
    const bar = section.querySelector(".film-progress i");
    const caps = [...section.querySelectorAll(".film-cap")].map((el) => ({
      el, a: +el.dataset.in, b: +el.dataset.out
    }));
    // Portrait screens get the centre crop; large high-density screens get the 2880 px tier.
    const tiers = info.tiers || ["d", "m"];
    const px = innerWidth * Math.min(devicePixelRatio || 1, 2);
    const key = innerHeight > innerWidth ? "m" : px > 2200 && tiers.includes("x") ? "x" : "d";
    const n = info.count;
    const frames = new Array(n);
    let started = false, last = -1, progress = 0, done = 0;

    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      last = -1;
      draw();
    }

    function nearest(i) {
      for (let d = 0; d < n; d++) {
        if (frames[i - d]?.complete && frames[i - d].naturalWidth) return i - d;
        if (frames[i + d]?.complete && frames[i + d].naturalWidth) return i + d;
      }
      return -1;
    }

    function draw() {
      const want = Math.round(progress * (n - 1));
      const i = nearest(want);
      if (i < 0) return;
      if (i === last) return;
      last = i;
      const img = frames[i];
      const cw = canvas.width, ch = canvas.height;
      ctx.imageSmoothingQuality = "high";
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      if (poster && !poster.hidden) poster.hidden = true;
    }

    function load() {
      if (started) return;
      started = true;
      const queue = coarseToFine(n);
      let active = 0;
      const next = () => {
        while (active < 6 && queue.length) {
          const i = queue.shift();
          const img = new Image();
          img.decoding = "async";
          active++;
          img.onload = img.onerror = () => { active--; done++; if (Math.abs(i - progress * (n - 1)) < 20) { last = -1; draw(); } next(); };
          img.src = `assets/film/${name}/${key}/${String(i).padStart(4, "0")}.webp`;
          frames[i] = img;
        }
      };
      next();
    }

    function update(p) {
      progress = clamp(p);
      if (bar) bar.style.transform = `scaleX(${progress})`;
      for (const c of caps) {
        const fade = 0.05;
        const kin = c.a <= 0 ? 1 : clamp((progress - c.a) / fade);
        const kout = c.b >= 1 ? 1 : clamp((c.b - progress) / fade);
        const kk = kin * kout;
        c.el.style.opacity = kk;
        c.el.style.transform = `translateY(${(1 - kk) * 24}px)`;
        c.el.style.visibility = kk > 0.01 ? "visible" : "hidden";
      }
      draw();
    }

    new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && load()), { rootMargin: "150% 0px" }).observe(section);
    addEventListener("resize", size);
    size();
    update(0);

    if (!reduce) {
      ScrollTrigger.create({
        trigger: section, start: "top top", end: "bottom bottom",
        onUpdate: (self) => update(self.progress)
      });
    }
    films.push({ section, update, load, loaded: () => done / n });
  }

  async function init() {
    if (reduce) document.documentElement.classList.add("film-static");
    let manifest = {};
    try { manifest = await (await fetch("assets/film/manifest.json")).json(); } catch (e) {}
    document.querySelectorAll(".film").forEach((s) => {
      const info = manifest[s.dataset.film];
      if (info && !reduce) setup(s, info);
      else s.classList.add("is-static");
    });
  }

  // preload() and loaded() let tools/record.mjs fetch every frame before it starts filming.
  const preload = () => films.forEach((f) => f.load());
  const loaded = () => Math.min(1, ...films.map((f) => f.loaded()));
  return { init, preload, loaded };
})();
