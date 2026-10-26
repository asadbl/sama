(() => {
  const D = window.SAMA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const IMG = "assets/img/";

  let lang = "en";
  try { lang = localStorage.getItem("sama-lang") || "en"; } catch (e) {}
  const t = (obj) => (obj ? obj[lang] ?? obj.en : "");
  const other = () => (lang === "en" ? "ar" : "en");
  const num = (n) => (lang === "ar" ? n.toLocaleString("ar-EG") : String(n));
  const price = (n) => (n === 0 ? t(D.included) : `<small>${t(D.ui.aed)}</small>${num(n)}`);

  gsap.registerPlugin(ScrollTrigger);

  // ---------- Smooth scroll ----------
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0 });
    else (typeof target === "number" ? window.scrollTo({ top: target }) : target.scrollIntoView());
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href").length < 2) return;
    const el = document.querySelector(a.getAttribute("href"));
    if (!el) return;
    e.preventDefault();
    scrollTo(el);
  });

  // ---------- Nav ----------
  const nav = $("#nav");
  const onScrollNav = () => nav.classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  // ---------- Static copy ----------
  function applyCopy() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => {
      const v = D.ui[el.dataset.i18n];
      if (v) el.textContent = t(v);
    });
    $("#viewWord").textContent = t(D.ui["view.word"]);
    $("#langToggle").setAttribute("aria-label", lang === "en" ? "التبديل إلى العربية" : "Switch to English");
  }

  // ---------- Hero ----------
  const hero = {
    i: 0,
    stage: $(".hero-stage"),
    plate: $(".hero-plate"),
    imgs: $$(".plate-img"),
    word: $(".hero-word"),
    ghost: $(".hero-ghost"),
    glow: $(".hero-glow"),
    index: $(".hero-index"),
    bits: [],
    st: null
  };
  const N = D.hero.length;

  const SHAPES = [
    '<svg width="14" height="10" viewBox="0 0 14 10"><ellipse cx="7" cy="5" rx="6.5" ry="4.5" fill="currentColor"/></svg>',
    '<svg width="26" height="14" viewBox="0 0 26 14"><path d="M1 7C6 0 18 0 25 7 18 14 6 14 1 7Z" fill="currentColor"/><path d="M3 7h20" stroke="rgba(0,0,0,.25)" stroke-width="1"/></svg>',
    '<svg width="22" height="4" viewBox="0 0 22 4"><rect width="22" height="3" rx="1.5" fill="currentColor"/></svg>',
    '<svg width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="4.5" fill="currentColor"/></svg>'
  ];

  function buildBits() {
    const box = $(".particles");
    box.innerHTML = "";
    hero.bits = [];
    for (let k = 0; k < 16; k++) {
      const b = document.createElement("span");
      b.className = "bit";
      b.innerHTML = `<span class="bit-in">${SHAPES[k % SHAPES.length]}</span>`;
      box.appendChild(b);
      hero.bits.push(b);
      if (!reduce) {
        gsap.to(b.firstChild, {
          y: gsap.utils.random(-18, 18), x: gsap.utils.random(-10, 10), rotation: gsap.utils.random(-40, 40),
          duration: gsap.utils.random(2.4, 4.2), repeat: -1, yoyo: true, ease: "sine.inOut"
        });
      }
    }
  }

  function scatterBits(d, animate) {
    const r = hero.plate.getBoundingClientRect();
    const s = hero.stage.getBoundingClientRect();
    const cx = r.left - s.left + r.width / 2;
    const cy = r.top - s.top + r.height / 2;
    hero.bits.forEach((b, k) => {
      const ang = (k / hero.bits.length) * Math.PI * 2 + gsap.utils.random(-.25, .25);
      const rad = r.width * gsap.utils.random(.5, .78);
      const to = {
        left: 0, top: 0,
        x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad * .85,
        rotation: gsap.utils.random(0, 360), scale: gsap.utils.random(.7, 1.6),
        color: d.bits[k % d.bits.length], opacity: k % 5 === 0 ? .55 : 1
      };
      if (animate) {
        gsap.fromTo(b, { x: cx, y: cy, scale: 0 }, { ...to, duration: gsap.utils.random(1, 1.6), ease: "expo.out", delay: .08 + k * .012, overwrite: true });
      } else {
        gsap.set(b, to);
      }
    });
  }

  function wordHTML(text, splitChars) {
    if (!splitChars) return `<span class="mask"><span class="ch">${text}</span></span>`;
    return [...text].map((c) => `<span class="mask"><span class="ch">${c === " " ? "&nbsp;" : c}</span></span>`).join("");
  }

  function renderIndex() {
    hero.index.innerHTML = D.hero.map((d, k) =>
      `<li><button type="button" data-k="${k}" ${k === hero.i ? 'aria-current="true"' : ""}>${t(d.word)}</button></li>`
    ).join("");
  }

  function setInfo(d) {
    $(".count-now").textContent = num(hero.i + 1);
    $(".count-total").textContent = num(N);
    $(".hero-cat").textContent = t(d.cat);
    $(".hero-name").textContent = t(d.name);
    $(".hero-alt").textContent = d.name[other()];
    $(".hero-alt").lang = other();
    $(".hero-desc").textContent = t(d.desc);
    $(".hero-price").innerHTML = price(d.price);
    hero.ghost.textContent = d.word[other()];
    hero.glow.style.setProperty("--hue", d.bits[0]);
    $$("button", hero.index).forEach((b, k) => (k === hero.i ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
  }

  let wordTl = null;
  function setSlide(k, dir = 1, instant = false) {
    const prev = hero.i;
    hero.i = k;
    const d = D.hero[k];
    const split = lang === "en";

    // plate
    const incoming = hero.imgs.find((im) => !im.classList.contains("is-on")) || hero.imgs[1];
    const outgoing = hero.imgs.find((im) => im !== incoming);
    if (instant) {
      outgoing.classList.remove("is-on");
      gsap.set(outgoing, { opacity: 0 });
      incoming.src = IMG + d.img;
      incoming.style.objectPosition = d.pos;
      incoming.classList.add("is-on");
      gsap.set(incoming, { opacity: 1, scale: 1, rotation: 0 });
    } else if (prev !== k) {
      incoming.src = IMG + d.img;
      incoming.style.objectPosition = d.pos;
      incoming.classList.add("is-on");
      outgoing.classList.remove("is-on");
      gsap.fromTo(incoming, { opacity: 0, scale: 1.25, rotation: -40 * dir }, { opacity: 1, scale: 1, rotation: 0, duration: 1.2, ease: "expo.out", overwrite: true });
      gsap.to(outgoing, { opacity: 0, scale: .82, rotation: 40 * dir, duration: .7, ease: "power2.in", overwrite: true });
    }

    // big word
    if (wordTl) wordTl.kill();
    if (instant || reduce) {
      hero.word.innerHTML = wordHTML(t(d.word), split);
    } else {
      wordTl = gsap.timeline();
      const old = $$(".ch", hero.word);
      if (old.length) wordTl.to(old, { yPercent: -110 * dir, opacity: 0, duration: .3, stagger: .015, ease: "power2.in" });
      wordTl.add(() => { hero.word.innerHTML = wordHTML(t(d.word), split); });
      wordTl.add(() => {
        gsap.fromTo($$(".ch", hero.word), { yPercent: 110 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .9, stagger: .035, ease: "expo.out" });
      });
    }

    // copy
    setInfo(d);
    if (!instant && !reduce) {
      gsap.fromTo([".hero-cat", ".hero-name", ".hero-alt", ".hero-desc", ".hero-buy"],
        { y: 18 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .05, ease: "power3.out", overwrite: true });
      gsap.fromTo(hero.ghost, { opacity: 0, scale: .94 }, { opacity: .09, scale: 1, duration: 1.2, ease: "power2.out", overwrite: true });
    }
    scatterBits(d, !instant && !reduce);
  }

  function initHeroScroll() {
    if (reduce) return;
    hero.st = ScrollTrigger.create({
      trigger: ".hero",
      start: "top top",
      end: () => "+=" + window.innerHeight * .85 * (N - 1),
      pin: true,
      anticipatePin: 1,
      refreshPriority: 10,
      snap: { snapTo: 1 / (N - 1), duration: { min: .25, max: .7 }, delay: .06, ease: "power2.inOut" },
      onUpdate(self) {
        const k = Math.round(self.progress * (N - 1));
        if (k !== hero.i) setSlide(k, k > hero.i ? 1 : -1);
        gsap.set(".hero-progress i", { scaleX: self.progress });
        gsap.set(hero.plate, { rotation: self.progress * 90 });
      }
    });
  }

  hero.index.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]");
    if (!b) return;
    const k = +b.dataset.k;
    if (hero.st) {
      scrollTo(hero.st.start + (hero.st.end - hero.st.start) * (k / (N - 1)));
    } else {
      setSlide(k, k > hero.i ? 1 : -1);
    }
  });
  hero.plate.addEventListener("click", () => {
    if (!hero.st) setSlide((hero.i + 1) % N, 1);
  });

  // intro: the one orchestrated page-load moment, on the opening film's title
  function intro() {
    if (reduce) return;
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .from(".film-poster", { scale: 1.12, duration: 2.4, ease: "power2.out" })
      .from(".cap-brand > *", { yPercent: 60, opacity: 0, duration: 1.4, stagger: .12 }, "<.2")
      .from([".cap-lead", ".cap-hint", ".nav"], { y: 20, opacity: 0, duration: 1, stagger: .08 }, "<.5");
  }

  // ---------- Marquee ----------
  function renderMarquee() {
    const row = (arr) => {
      const one = arr.map((w) => `<span>${w}</span><span class="star">✦</span>`).join("");
      return one + one;
    };
    $("#mqEn").innerHTML = row(D.marquee.en);
    $("#mqAr").innerHTML = row(D.marquee.ar);
  }

  // ---------- Story ----------
  let storyTween = null;
  function renderStory() {
    const p = $("#storyText");
    p.innerHTML = t(D.ui["story.text"]).split(" ").map((w) => `<span class="w">${w}</span>`).join(" ");
    if (storyTween) { storyTween.scrollTrigger.kill(); storyTween.kill(); }
    if (reduce) return;
    storyTween = gsap.to($$(".w", p), {
      opacity: 1, stagger: .12, ease: "none",
      scrollTrigger: { trigger: ".story", start: "top 70%", end: "bottom 65%", scrub: true }
    });
  }

  // ---------- View ----------
  function initView() {
    if (reduce) return;
    gsap.timeline({
      scrollTrigger: { trigger: ".view", start: "top top", end: "+=160%", pin: ".view-pin", scrub: true, refreshPriority: 5 }
    })
      .fromTo(".view-word", { scale: 1 }, { scale: 14, ease: "power2.in", duration: 1 })
      .fromTo(".view-img", { scale: 1.25 }, { scale: 1, ease: "none", duration: 1.3 }, 0)
      .to(".view-mask", { opacity: 0, duration: .35 }, .7)
      .to(".view-caption", { opacity: 1, duration: .3 }, 1);
  }

  // ---------- Seating ----------
  function renderSeating() {
    $("#seatList").innerHTML = D.seating.map((s) => `
      <article class="seat">
        <div class="seat-orb"><figure><img src="${IMG + s.img}" alt="${t(s.name)}" loading="lazy"></figure></div>
        <h3>${t(s.name)}</h3>
        <p>${t(s.text)}</p>
        <p class="meta">${t(s.meta)}</p>
      </article>`).join("");
    $("#seatChips").innerHTML = D.seating.map((s, k) => `
      <label><input type="radio" name="seat" value="${s.name.en}" ${k === 0 ? "checked" : ""}><span>${t(s.name)}</span></label>`).join("");
    if (!reduce) {
      $$(".seat img").forEach((img) => {
        gsap.fromTo(img, { yPercent: -10 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    }
  }

  // ---------- Café ----------
  const cafeImg = $("#cafeImg");
  let cafeSrc = cafeImg.getAttribute("src");
  function showCafe(src) {
    if (src === cafeSrc) return;
    cafeSrc = src;
    cafeImg.classList.add("is-fading");
    setTimeout(() => { cafeImg.src = src; cafeImg.onload = () => cafeImg.classList.remove("is-fading"); }, 200);
  }
  function renderCafe() {
    $("#cafeList").innerHTML = D.cafe.map((g) => `
      <div class="cafe-group">
        <h3>${t(g.group)}</h3>
        ${g.items.map((it) => `
          <div class="drink" tabindex="0" data-img="${IMG + it.img}">
            <p class="drink-name">${t(it.name)} <span class="drink-alt" lang="${other()}">${it.name[other()]}</span></p>
            <p class="drink-note">${t(it.note)}</p>
            <p class="drink-price">${price(it.price)}</p>
          </div>`).join("")}
      </div>`).join("");
  }
  ["mouseover", "focusin"].forEach((ev) => $("#cafeList").addEventListener(ev, (e) => {
    const row = e.target.closest(".drink");
    if (!row) return;
    $$(".drink").forEach((r) => r.classList.toggle("is-active", r === row));
    showCafe(row.dataset.img);
  }));

  // ---------- Shisha ----------
  function renderFlavours() {
    $("#flavourList").innerHTML = D.flavours.map((f) => `
      <li class="flavour" style="--c:${f.c}">
        <span class="dot" aria-hidden="true"></span>
        <h3>${t(f.name)} <span class="alt" lang="${other()}">${f.name[other()]}</span></h3>
        <span class="price">${price(f.price)}</span>
        <p>${t(f.note)}</p>
      </li>`).join("");
  }

  // ---------- Menu ----------
  let menuTab = D.menu[0].id;
  function renderMenu() {
    $("#menuTabs").innerHTML = D.menu.map((c) =>
      `<button type="button" role="tab" data-id="${c.id}" aria-selected="${c.id === menuTab}">${t(c.tab)}</button>`).join("");
    const cat = D.menu.find((c) => c.id === menuTab);
    $("#menuRows").innerHTML = cat.items.map((it) => `
      <div class="menu-row" data-img="${IMG + it.img}">
        <p class="menu-name">${t(it.name)}<span class="alt" lang="${other()}">${it.name[other()]}</span></p>
        <p class="menu-desc">${t(it.desc)}</p>
        <p class="menu-tags">${it.tags.map((g) => `<span>${t(D.tagNames[g])}</span>`).join("")}</p>
        <p class="menu-price">${price(it.price)}</p>
      </div>`).join("");
    if (!reduce) gsap.from("#menuRows .menu-row", { opacity: 0, y: 14, duration: .5, stagger: .04, ease: "power2.out" });
  }
  $("#menuTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b || b.dataset.id === menuTab) return;
    menuTab = b.dataset.id;
    renderMenu();
    ScrollTrigger.refresh();
  });

  const follow = $(".menu-follow");
  const followImg = $("#followImg");
  const fx = gsap.quickTo(follow, "x", { duration: .5, ease: "power3" });
  const fy = gsap.quickTo(follow, "y", { duration: .5, ease: "power3" });
  $("#menuRows").addEventListener("mousemove", (e) => {
    fx(e.clientX - follow.offsetWidth / 2);
    fy(e.clientY - follow.offsetHeight / 2);
    const row = e.target.closest(".menu-row");
    if (row && followImg.dataset.src !== row.dataset.img) {
      followImg.src = row.dataset.img;
      followImg.dataset.src = row.dataset.img;
    }
    follow.classList.toggle("is-on", !!row);
  });
  $("#menuRows").addEventListener("mouseleave", () => follow.classList.remove("is-on"));

  // ---------- Booking ----------
  function renderForm() {
    const time = $("#fTime");
    const keep = time.value;
    const slots = [];
    for (let m = 16 * 60; m <= 26 * 60 + 30; m += 30) {
      const h = Math.floor(m / 60) % 24, mm = m % 60;
      const v = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      const label = new Date(2000, 0, 1, h, mm).toLocaleTimeString(lang === "ar" ? "ar-AE" : "en-AE", { hour: "numeric", minute: "2-digit" });
      slots.push(`<option value="${v}">${label}</option>`);
    }
    time.innerHTML = slots.join("");
    time.value = keep || "19:00";

    const g = $("#fGuests");
    const keepG = g.value;
    g.innerHTML = Array.from({ length: 14 }, (_, k) => `<option value="${k + 1}">${num(k + 1)}</option>`).join("");
    g.value = keepG || "2";

    const d = $("#fDate");
    const today = new Date();
    const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    d.min = iso;
    if (!d.value) d.value = iso;
  }
  $("#bookForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const msg = $("#formMsg");
    let ok = true;
    ["name", "phone", "date"].forEach((n) => {
      const el = f.elements[n];
      const bad = !el.value.trim();
      el.setAttribute("aria-invalid", bad);
      if (bad) ok = false;
    });
    msg.className = "form-msg " + (ok ? "ok" : "err");
    msg.textContent = t(D.ui[ok ? "f.ok" : "f.err"]);
    if (ok) f.querySelector('button[type="submit"]').disabled = true;
  });

  // ---------- Language ----------
  function render(first) {
    applyCopy();
    renderIndex();
    renderMarquee();
    renderStory();
    renderSeating();
    renderCafe();
    renderFlavours();
    renderMenu();
    renderForm();
    setSlide(hero.i, 1, true);
    if (!first) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }
  }
  $("#langToggle").addEventListener("click", () => {
    lang = other();
    try { localStorage.setItem("sama-lang", lang); } catch (e) {}
    // seating parallax triggers are recreated in render
    ScrollTrigger.getAll().forEach((st) => { if (st.trigger && st.trigger.closest && st.trigger.closest(".seat")) st.kill(); });
    render(false);
  });

  // ---------- Boot ----------
  buildBits();
  render(true);
  initHeroScroll();
  initView();
  intro();
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  window.SamaFilm.init().then(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
  window.samaLenis = lenis;
  window.addEventListener("resize", () => scatterBits(D.hero[hero.i], false));
  // fonts change metrics after load
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
