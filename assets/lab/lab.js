/* Playskin · Play Your Skin
   Tek bir WebGL sahnesi sayfa boyunca yaşar. Kaydırma (doğrudan, gecikmesiz) bir zaman
   çizelgesini sürer; her bölüm sahnenin parametrelerini belirler ve bölümler arasında bu
   parametreler yumuşakça karışır. Sahne kaydırmayla birebir senkron olduğu için yazılar ve
   3D katman arasında kayma (titreme hissi) oluşmaz.
   Açılış: parlak zeminde dev Pink Mist ve mist püskürmesi.
   Ürünlerin dünyası: Pink Mist → Vitamin C → NAD⁺ → CC Cream, ışık geçişiyle.
   Doku: düşen serum damlası, krem, mist. Formül: lipozom kesiti.
   LED: video kaydırmayla oynar. */

const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (v, a, b) => clamp((v - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const bell = (v, a, m, b) => (v <= a || v >= b) ? 0 : (v < m ? ease((v - a) / (m - a)) : ease((b - v) / (b - m)));

const mqPhone = matchMedia('(max-width: 760px)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let isPhone = mqPhone.matches;

/* ------------------------------------------------------------------ */
/* Kaydırma modeli                                                     */
/* ------------------------------------------------------------------ */
const SECS = ['acilis', 'dunyalar', 'kampanya', 'doku', 'formul', 'galeri', 'yeni', 'rutin', 'tanis', 'led'];
const S = {};
SECS.forEach((id) => { const el = document.getElementById(id); S[id] = { el, top: 0, h: 0, pin: el.classList.contains('pin') }; });
let vh = innerHeight, docH = 1;
function measure() {
  vh = innerHeight;
  for (const id of SECS) { const s = S[id]; s.top = s.el.getBoundingClientRect().top + scrollY; s.h = s.el.offsetHeight; }
  docH = Math.max(1, document.documentElement.scrollHeight - vh);
  measureGallery();
}
const prog = (id, y) => { const s = S[id]; return s.pin ? (y - s.top) / Math.max(1, s.h - vh) : (y - s.top + vh) / (s.h + vh); };
const ENTER = { led: [0.35, 0.05], kampanya: [0.6, 0.0], yeni: [0.6, 0.0] };
const enter = (id, y) => { const s = S[id]; const e = ENTER[id] || [0.75, 0.1]; return ease(seg(y, s.top - vh * e[0], s.top + vh * e[1])); };

const overlays = $$('.ov').map((el) => ({ el, sec: el.dataset.sec, a: parseFloat(el.dataset.in), b: parseFloat(el.dataset.out), bp: el.dataset.outPhone ? parseFloat(el.dataset.outPhone) : null, k: -1 }));
function updateOverlays(y) {
  for (const o of overlays) {
    const p = prog(o.sec, y);
    const b = isPhone && o.bp !== null ? o.bp : o.b;
    const k = Math.round(seg(p, o.a - 0.03, o.a + 0.03) * (1 - seg(p, b - 0.03, b + 0.03)) * 200) / 200;
    if (k === o.k) continue;
    o.k = k;
    o.el.style.opacity = k;
    o.el.style.transform = k > 0.999 ? '' : 'translate3d(0,' + ((1 - k) * 20).toFixed(1) + 'px,0)';
    o.el.style.visibility = k < 0.005 ? 'hidden' : '';
  }
}

/* ------------------------------------------------------------------ */
/* Videolar: görününce yükle ve oynat                                  */
/* ------------------------------------------------------------------ */
const srcFor = (v) => v.dataset.src || (isPhone ? v.dataset.srcPhone : v.dataset.srcDesktop);
function ensureSrc(v) { if (!v.getAttribute('src')) { const s = srcFor(v); if (s) { v.src = s; if (isPhone && v.dataset.srcPhone && v.poster.includes('neon')) v.poster = v.poster.replace('neon', 'story'); } } }
const autoVideos = $$('.auto-video');
const vio = new IntersectionObserver((ents) => {
  for (const e of ents) {
    const v = e.target;
    if (e.isIntersecting) { ensureSrc(v); if (!reduce) v.play().catch(() => {}); } else v.pause();
  }
}, { rootMargin: '200px 0px' });
autoVideos.forEach((v) => vio.observe(v));

/* ------------------------------------------------------------------ */
/* Kampanya slider                                                     */
/* ------------------------------------------------------------------ */
(function carousel() {
  const car = $('[data-car]'); if (!car) return;
  const track = $('.car-track', car), slides = $$('.slide', car), dotsBox = $('.car-dots', car);
  const DUR = 6000;
  let i = 0, t0 = performance.now(), paused = false, inView = false;
  const dots = slides.map((s, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'car-dot'; b.setAttribute('aria-label', (k + 1) + '. slayt');
    b.innerHTML = '<span><i></i></span>';
    b.addEventListener('click', () => go(k));
    dotsBox.append(b); return b;
  });
  const sv = $('.sv-video', car);
  function go(k) {
    i = (k + slides.length) % slides.length; t0 = performance.now();
    track.style.transform = 'translate3d(' + (-100 * i) + '%,0,0)';
    slides.forEach((s, n) => { s.setAttribute('aria-current', n === i ? 'true' : 'false'); s.inert = n !== i; });
    dots.forEach((d, n) => d.setAttribute('aria-current', n === i ? 'true' : 'false'));
    if (sv) { if (slides[i].contains(sv) && inView) { ensureSrc(sv); if (!reduce) sv.play().catch(() => {}); } else sv.pause(); }
  }
  $('[data-car-prev]').addEventListener('click', () => go(i - 1));
  $('[data-car-next]').addEventListener('click', () => go(i + 1));
  car.addEventListener('pointerenter', () => { paused = true; });
  car.addEventListener('pointerleave', () => { paused = false; t0 = performance.now(); });
  car.addEventListener('focusin', () => { paused = true; });
  car.addEventListener('focusout', () => { paused = false; });
  let sx = null, sy0 = 0, swiped = false;
  car.addEventListener('pointerdown', (e) => { sx = e.clientX; sy0 = e.clientY; swiped = false; });
  car.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(e.clientY - sy0)) { swiped = true; go(dx < 0 ? i + 1 : i - 1); } sx = null; });
  car.addEventListener('click', (e) => { if (swiped) { e.preventDefault(); swiped = false; } }, true);
  car.addEventListener('dragstart', (e) => e.preventDefault());
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; t0 = performance.now(); go(i); }, { threshold: 0.35 }).observe(car);
  go(0);
  (function tick(now) {
    const k = (paused || !inView || reduce) ? null : (now - t0) / DUR;
    if (k !== null && k >= 1) go(i + 1);
    const d = dots[i]; if (d) d.style.setProperty('--k', reduce || paused ? 1 : clamp(k ?? 1).toFixed(3));
    requestAnimationFrame(tick);
  })(performance.now());
})();

/* ------------------------------------------------------------------ */
/* Galeri: kaydırdıkça yana akar                                       */
/* ------------------------------------------------------------------ */
const galTrack = $('.gal-track');
let galShift = 0;
function measureGallery() { if (galTrack) galShift = Math.max(0, galTrack.scrollWidth - innerWidth); }

/* ------------------------------------------------------------------ */
/* LED: video kaydırmayla oynar                                        */
/* ------------------------------------------------------------------ */
const ledVideo = $('.led-video');
const ledItems = $$('.led-list li').map((el) => ({ el, t0: parseFloat(el.dataset.t0), t1: parseFloat(el.dataset.t1), c: el.style.getPropertyValue('--c') }));
const ledMedia = $('.led-media');
let ledUnlocked = false;
function unlockLed() {
  if (ledUnlocked || !ledVideo) return; ledUnlocked = true;
  ensureSrc(ledVideo);
  const p = ledVideo.play(); if (p) p.then(() => ledVideo.pause()).catch(() => {});
}
new IntersectionObserver((es) => { if (es[0].isIntersecting) { ensureSrc(ledVideo); unlockLed(); } }, { rootMargin: '150% 0px' }).observe(S.led.el);
['touchstart', 'pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, unlockLed, { once: true, passive: true }));
let ledLast = -1;
function updateLed(y) {
  if (!ledVideo) return;
  const p = prog('led', y);
  if (p < -0.4 || p > 1.3) return;
  const dur = ledVideo.duration || 10;
  const t = seg(p, 0.02, 0.94) * (dur - 0.05);
  if (ledVideo.readyState >= 1 && !ledVideo.seeking && Math.abs(ledVideo.currentTime - t) > 0.035) {
    try { if (typeof ledVideo.fastSeek === 'function' && Math.abs(ledVideo.currentTime - t) > 1.5) ledVideo.fastSeek(t); else ledVideo.currentTime = t; } catch (e) {}
  }
  const idx = ledItems.findIndex((l) => t >= l.t0 && t < l.t1);
  if (idx !== ledLast) {
    ledLast = idx;
    ledItems.forEach((l, n) => l.el.classList.toggle('on', n === idx && p > -0.05));
    if (ledMedia && idx >= 0) ledMedia.style.setProperty('--led-glow', ledItems[idx].c.trim() + '66');
  }
}

/* ------------------------------------------------------------------ */
/* Rutin ve ürün odağı                                                 */
/* ------------------------------------------------------------------ */
const NEEDS = [
  { id: 'nem', label: 'Nem', sub: 'Kuru ve hassas cilt', color: '#6FAEE0', steps: [['Temizle', 1915], ['Tonikle', 1925], ['Serum', 1418], ['Nemlendir', 2745], ['Koru', 1459]] },
  { id: 'denge', label: 'Denge', sub: 'Yağlı ve akneye eğilimli', color: '#2FA796', steps: [['Temizle', 1273], ['Serum', 1429], ['Nemlendir', 2754], ['Koru', 1934]] },
  { id: 'siki', label: 'Sıkılık', sub: 'Yaşlanma belirtileri', color: '#8A97C4', steps: [['Temizle', 1300], ['Serum', 2778], ['Göz', 1540], ['Nemlendir', 2773], ['Koru', 2784]] },
  { id: 'ton', label: 'Eşit ton', sub: 'Leke görünümü', color: '#E88A1A', steps: [['Temizle', 1396], ['Serum', 1444], ['Bakım', 1468], ['Koru', 1459]] },
  { id: 'isilti', label: 'Işıltı', sub: 'Mat ve yorgun görünüm', color: '#F0569B', steps: [['Temizle', 1392], ['Serum', 1441], ['Nemlendir', 1919], ['Koru', 2784]] },
  { id: 'sakin', label: 'Sakinlik', sub: 'İşlem sonrası hassasiyet', color: '#D9957A', steps: [['Temizle', 1392], ['Onar', 2788], ['Nemlendir', 1919], ['Koru', 1934]] }
];
const EDITORIAL = { 2784: 'assets/lab/gallery/cc-light.webp', 2788: 'assets/lab/gallery/derma-water.webp' };
let PRODUCTS = null;
let shelfIds = [2784, 1396, 1444, 2778];
let focusId = 2784;

function h(tag, attrs = {}, kids = []) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'text') el.textContent = attrs[k];
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  for (const c of [].concat(kids)) if (c) el.append(c);
  return el;
}
function renderNeeds() {
  $('.needs').replaceChildren(...NEEDS.map((n) => h('button', { type: 'button', class: 'need', 'aria-pressed': 'false', 'data-need': n.id, onclick: () => pickNeed(n.id) }, [h('b', { text: n.label }), h('small', { text: n.sub })])));
  $('.routine').replaceChildren(h('p', { class: 'small muted', text: 'Bir ihtiyaç seç; ürünler ekranın ortasında bir rutin olarak dizilsin.' }));
}
function pickNeed(id) {
  const n = NEEDS.find((x) => x.id === id);
  $$('.need').forEach((b) => b.setAttribute('aria-pressed', b.dataset.need === id ? 'true' : 'false'));
  const box = $('.routine');
  box.style.setProperty('--need', n.color);
  box.replaceChildren(...n.steps.map(([step, pid], i) => {
    const p = PRODUCTS[pid];
    return h('button', { type: 'button', class: 'rcard', style: 'animation-delay:' + (i * 0.09).toFixed(2) + 's', onclick: () => { setFocus(pid); document.getElementById('tanis').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } }, [
      h('span', { class: 'step', text: String(i + 1).padStart(2, '0') + ' · ' + step.toLocaleUpperCase('tr-TR') }),
      h('span', { class: 'ph' }, [h('img', { src: p.img, alt: '', loading: 'lazy' })]),
      h('span', { class: 'nm', text: p.name }),
      h('span', { class: 'more', text: 'Ürünle tanış →' })
    ]);
  }));
  shelfIds = n.steps.map((s) => s[1]).filter((v, i, a) => a.indexOf(v) === i);
  setFocus(n.steps.find((s) => s[0] === 'Serum' || s[0] === 'Onar')?.[1] || shelfIds[0], false);
  requestAnimationFrame(measure);
}
function setFocus(pid, anim = true) {
  focusId = pid;
  const p = PRODUCTS[pid];
  const tabs = [];
  if (p.usage && p.usage.length) tabs.push(['Kullanım', () => p.usage.map((t) => h('p', { text: t }))]);
  if (p.ingredients && p.ingredients.length) tabs.push(['İçerik', () => [h('dl', {}, p.ingredients.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]))]]);
  tabs.push(['Detay', () => [p.desc, ...(p.more || [])].filter(Boolean).slice(0, 6).map((t) => h('p', { text: t })).concat(h('p', {}, [h('a', { href: p.link, class: 'link', text: "playskin.com.tr'de gör" })]))]);
  const panel = h('div', { class: 'panel', role: 'tabpanel', id: 'fpanel', tabindex: '0', 'aria-labelledby': 'ftab0' });
  const tabBtns = tabs.map(([label, fill], i) => h('button', {
    type: 'button', role: 'tab', class: 'tab', id: 'ftab' + i, 'aria-controls': 'fpanel', 'aria-selected': i === 0 ? 'true' : 'false',
    onclick: (e) => { tabBtns.forEach((b) => b.setAttribute('aria-selected', b === e.currentTarget ? 'true' : 'false')); panel.setAttribute('aria-labelledby', e.currentTarget.id); panel.replaceChildren(...fill()); }
  }, [label]));
  panel.replaceChildren(...tabs[0][1]());
  const meta = [p.cat, p.skin].filter(Boolean).map((t) => h('span', { text: t.replace(/\.$/, '') }));
  const ed = EDITORIAL[pid];
  $('.focus').replaceChildren(
    h('div', { class: 'fimg' + (ed ? ' editorial' : '') }, [h('img', { src: ed || p.img, alt: p.name })]),
    h('div', { class: 'ftext' }, [h('h3', { class: 'h2', text: p.name }), h('div', { class: 'fmeta' }, meta), h('p', { class: 'lead', text: p.desc }), h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Ürün bilgisi' }, tabBtns), panel])
  );
  $('.shelf').replaceChildren(...shelfIds.map((id) => h('button', { type: 'button', class: 'thumb', 'aria-label': PRODUCTS[id].name, 'aria-current': id === pid ? 'true' : 'false', onclick: () => setFocus(id) }, [h('img', { src: PRODUCTS[id].img, alt: '' })])));
  if (!anim) $$('.fimg img, .ftext').forEach((el) => { el.style.animation = 'none'; });
}
fetch('assets/lab/products.json').then((r) => r.json()).then((d) => { PRODUCTS = d; renderNeeds(); setFocus(focusId, false); requestAnimationFrame(measure); }).catch(() => {
  $('.routine').replaceChildren(h('p', { class: 'small muted', text: 'Ürün bilgileri yüklenemedi. Tüm ürünler için Ürünler sayfasına göz at.' }));
});

/* ------------------------------------------------------------------ */
/* Zaman çizelgesi                                                     */
/* ------------------------------------------------------------------ */
const hex = (s) => { const n = parseInt(s.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const mixArr = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function blend(A, B, t) {
  if (t <= 0) return A;
  if (t >= 1) return B;
  const o = {};
  for (const k in A) { const a = A[k], b = B[k]; o[k] = Array.isArray(a) ? mixArr(a, b, t) : lerp(a, b, t); }
  return o;
}
const C = {
  white: hex('#FFFFFF'), silver: hex('#E2E3E6'),
  pinkTop: hex('#FFF6FA'), pinkBot: hex('#EEDFE6'), pink: hex('#FF6FAE'), pinkP: hex('#FF8FBE'),
  orTop: hex('#FFF8EE'), orBot: hex('#F2E3CF'), orange: hex('#FF9A2E'), orP: hex('#FFB65E'),
  tlTop: hex('#F4F8F9'), tlBot: hex('#DCE5E8'), teal: hex('#3AA6B5'), tlP: hex('#A9D8DF'),
  rgTop: hex('#FBF4EF'), rgBot: hex('#EBDACD'), rose: hex('#D49478'), rgP: hex('#E9BFA6'),
  skinTop: hex('#FBF7F4'), skinBot: hex('#E8DFD8'), peach: hex('#F2B8A0'), serum: hex('#FFD8A0'),
  water: hex('#CFE6FF'), blue: hex('#A9C7E8')
};
function base() {
  return {
    cam: [0, 0.9, 11.5], look: [0, 0.15, 0],
    bx: 0, by: 0, brot: -0.6, d0: 0, d1: 1, d2: 1, d3: 1, mode: [0, 1, 1, 1], sweep: 0, swOn: 0, spray: 0, floor: 1,
    dropPos: [0, 0, 0], dropS: [0.3, 0.3, 0.3], sph: 0.2, dropOn: 0, tint: C.serum, thick: 1,
    top: C.white, bot: C.silver, acc: C.pink, glow: 0.3, rays: 0, caustic: 0, dark: 0,
    pA: 0.7, pCol: C.pinkP, pSpeed: 1,
    surf: 0, rip: 0, cream: 0, mist: 0,
    lipo: 0, build: 0, cut: 0
  };
}
function S1(p) {
  const P = base();
  const a = ease(seg(p, 0, 0.72));
  P.cam = isPhone ? [0, lerp(0.9, 0.25, a), lerp(10.5, 4.9, a)] : [0, lerp(0.9, 0.25, a), lerp(11.5, 3.8, a)];
  P.look = [0, lerp(0.2, 0.3, a), 0];
  P.bx = isPhone ? 0 : lerp(1.7, 0, ease(seg(p, 0.04, 0.6)));
  P.by = isPhone ? lerp(0.9, 0, a) : 0;
  P.brot = lerp(-0.6, 0, ease(seg(p, 0.04, 0.72)));
  P.spray = (0.45 + 0.55 * bell(p, 0.04, 0.3, 0.62)) * (1 - seg(p, 0.58, 0.7));
  P.top = mixArr(C.white, C.pinkTop, a); P.bot = mixArr(C.silver, C.pinkBot, a);
  P.glow = 0.3 + 0.3 * a; P.pA = 0.55 + 0.3 * a;
  return P;
}
function S2(p) {
  const P = base();
  P.cam = isPhone ? [0, 0.3, 9.4] : [0, 0.25, 6.8]; P.look = [0, isPhone ? 0.55 : 0.05, 0];
  P.bx = isPhone ? 0 : 1.2; P.by = isPhone ? 1.25 : 0;
  P.brot = Math.sin(p * Math.PI * 4) * 0.16;
  P.d0 = seg(p, 0.15, 0.23);
  P.d1 = Math.max(1 - seg(p, 0.235, 0.315), seg(p, 0.42, 0.5));
  P.d2 = Math.max(1 - seg(p, 0.505, 0.585), seg(p, 0.68, 0.76));
  P.d3 = 1 - seg(p, 0.765, 0.845);
  P.mode = [0, p < 0.37 ? 1 : 0, p < 0.63 ? 1 : 0, 1];
  const win = [[0.14, 0.33], [0.41, 0.6], [0.67, 0.86]];
  for (const [a, b] of win) { const k = seg(p, a, b); if (k > 0 && k < 1) { P.sweep = k; P.swOn = bell(p, a, (a + b) / 2, b); } }
  const w1 = ease(seg(p, 0.18, 0.3)), w2 = ease(seg(p, 0.44, 0.56)), w3 = ease(seg(p, 0.7, 0.82));
  const pick = (a, b, c, d) => mixArr(mixArr(mixArr(a, b, w1), c, w2), d, w3);
  P.top = pick(C.pinkTop, C.orTop, C.tlTop, C.rgTop); P.bot = pick(C.pinkBot, C.orBot, C.tlBot, C.rgBot);
  P.acc = pick(C.pink, C.orange, C.teal, C.rose); P.pCol = pick(C.pinkP, C.orP, C.tlP, C.rgP);
  P.glow = 0.55; P.rays = (w1 - w2) * 0.9 + w3 * 0.35; P.caustic = 0.18 + (w1 - w2) * 0.35 + (w2 - w3) * 0.2;
  P.pA = 0.85;
  return P;
}
function CALM() {
  const P = base();
  P.cam = [0, 0, 8]; P.look = [0, 0, 0]; P.by = 0; P.d0 = 1; P.floor = 0;
  P.top = C.white; P.bot = hex('#E9E9EB'); P.acc = C.pink; P.glow = 0.18; P.pA = 0.2; P.pCol = hex('#E6C9D6'); P.pSpeed = 0.4;
  return P;
}
function S3(p) {
  const P = CALM();
  const z = ease(seg(p, 0.36, 0.86));
  P.cam = [0, lerp(2.6, 1.6, z), lerp(5.6, 4.1, z)]; P.look = [0, lerp(-1.05, -1.3, z), 0];
  const f = seg(p, 0.08, 0.36), i = seg(p, 0.36, 0.4);
  P.dropPos = [0, lerp(0.95, -1.35, f * f), 0];
  const s = 0.3;
  P.dropS = [s * (1 + 0.9 * i), s * (1 + 0.25 * f) * (1 - 0.8 * i), s * (1 + 0.9 * i)];
  P.sph = 0.12; P.thick = 0.5; P.dropOn = seg(p, 0.01, 0.07) * (1 - i); P.tint = C.serum;
  P.surf = seg(p, 0, 0.1); P.rip = seg(p, 0.36, 0.64); P.cream = easeOut(seg(p, 0.44, 0.8)) * 0.62; P.mist = seg(p, 0.72, 1);
  P.top = C.skinTop; P.bot = C.skinBot; P.acc = C.peach; P.glow = 0.3; P.pA = 0.2; P.pCol = hex('#F4C9B5');
  return P;
}
function S4(p) {
  const P = CALM();
  const orbit = p * 0.9;
  P.cam = [Math.sin(orbit) * 1.2, 0.35 * Math.cos(orbit * 1.3), 6.8 - 0.6 * ease(seg(p, 0.2, 0.7))];
  P.look = [isPhone ? 0 : 0.3, isPhone ? -0.5 : 0, 0];
  const s = lerp(0.3, 1.02, ease(seg(p, 0, 0.16)));
  P.dropPos = [0, isPhone ? 0.4 : 0, 0]; P.dropS = [s, s, s]; P.sph = 1; P.thick = 1.4; P.tint = C.water; P.dropOn = 1;
  P.lipo = seg(p, 0.04, 0.14); P.build = seg(p, 0.06, 0.32); P.cut = ease(seg(p, 0.16, 0.44));
  P.top = C.white; P.bot = hex('#E1E4E9'); P.acc = C.blue; P.glow = 0.35; P.pA = 0.12; P.pCol = hex('#B9D3EE');
  return P;
}
function LEDP() {
  const P = CALM();
  P.top = hex('#0B0B0D'); P.bot = hex('#050506'); P.acc = hex('#7A3BFF'); P.dark = 1; P.glow = 0.4; P.pA = 0;
  return P;
}
function timeline(y) {
  let P = S1(clamp(prog('acilis', y)));
  P = blend(P, S2(clamp(prog('dunyalar', y))), enter('dunyalar', y));
  P = blend(P, CALM(), enter('kampanya', y));
  P = blend(P, S3(clamp(prog('doku', y))), enter('doku', y));
  P = blend(P, S4(clamp(prog('formul', y))), enter('formul', y));
  P = blend(P, CALM(), enter('galeri', y));
  P = blend(P, LEDP(), enter('led', y));
  return P;
}

/* ------------------------------------------------------------------ */
/* Ana döngü                                                           */
/* ------------------------------------------------------------------ */
let GL = null, running = true, lastW = innerWidth, lastH = innerHeight;
const bar = $('.progress span');
const counterEl = $('.counter-now');
addEventListener('resize', () => {
  isPhone = mqPhone.matches;
  const big = Math.abs(innerWidth - lastW) > 2 || Math.abs(innerHeight - lastH) > 140;
  measure();
  if (big) { lastW = innerWidth; lastH = innerHeight; if (GL) GL.resize(); }
});
addEventListener('load', measure);
if (document.fonts) document.fonts.ready.then(measure);
measure();
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(loop); });

function loop(now) {
  if (!running) return;
  const y = scrollY;
  updateOverlays(y);
  bar.style.transform = 'scaleX(' + clamp(y / docH).toFixed(4) + ')';
  const pd = prog('dunyalar', y), wi = pd < 0.25 ? '01' : pd < 0.51 ? '02' : pd < 0.77 ? '03' : '04';
  if (counterEl.textContent !== wi) counterEl.textContent = wi;
  if (galTrack) { const pg = clamp(prog('galeri', y)); galTrack.style.transform = 'translate3d(' + (-pg * galShift).toFixed(1) + 'px,0,0)'; }
  updateLed(y);
  if (GL) GL.frame(timeline(y), now / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ------------------------------------------------------------------ */
/* WebGL                                                               */
/* ------------------------------------------------------------------ */
const NOISE = /* glsl */`
float hash2(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash2(i), hash2(i + vec2(1., 0.)), u.x), mix(hash2(i + vec2(0., 1.)), hash2(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
`;
const FLOOR_Y = -1.6;

async function initGL() {
  let THREE, RoomEnvironment;
  try {
    THREE = await import('three');
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
  } catch (e) { root.classList.add('no-gl'); return; }
  const canvas = $('#gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { root.classList.add('no-gl'); return; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 200);
  scene.add(camera);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const col = (arr, target) => target.setRGB(arr[0], arr[1], arr[2], THREE.SRGBColorSpace);

  /* Arka plan */
  const bgU = { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uAcc: { value: new THREE.Color() }, uGlow: { value: 0 }, uRays: { value: 0 }, uCaustic: { value: 0 }, uDark: { value: 0 }, uTime: { value: 0 } };
  const bg = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 32), new THREE.ShaderMaterial({
    uniforms: bgU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uTop, uBot, uAcc; uniform float uGlow, uRays, uCaustic, uDark, uTime; varying vec3 vDir;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        vec3 c = mix(uBot, uTop, smoothstep(-0.55, 0.75, d.y));
        c += vec3(0.06) * exp(-pow((d.y + 0.05) * 7., 2.)) * (1. - uDark);
        vec3 fc = normalize(vec3(0.12, 0.1, -1.));
        float dist = distance(d, fc);
        float g = exp(-dist * dist * 5.) * uGlow;
        c = mix(c, uAcc, g * 0.5) + uAcc * g * 0.1;
        vec2 q = d.xy - vec2(0.55, 0.65);
        float rays = pow(max(0., sin(atan(q.y, q.x) * 13. + uTime * 0.1) * 0.5 + 0.5), 6.) * exp(-length(q) * 1.6);
        c += uAcc * rays * uRays * 0.3 + vec3(1.) * rays * uRays * 0.1;
        float cs = fbm(d.xy * 6. + vec2(uTime * 0.03, -uTime * 0.025));
        c += uAcc * pow(1. - abs(sin(cs * 9.)), 8.) * uCaustic * 0.16 * smoothstep(1.2, 0.2, dist);
        c *= 1. - 0.18 * uDark * smoothstep(0.2, 1.4, dist);
        c += (hash2(gl_FragCoord.xy) - 0.5) / 255.;
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`
  }));
  bg.renderOrder = -10;
  scene.add(bg);

  /* Ürünler (ambalaj görseli birebir; silindire sarılı ya da düz) */
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const shelf = new THREE.Group();
  scene.add(shelf);
  function dissolveMat(tex, u, side) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, toneMapped: false, side });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDis = u.uDis; sh.uniforms.uEdge = u.uEdge; sh.uniforms.uMode = u.uMode;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uDis, uMode; uniform vec3 uEdge;\n' + NOISE)
        .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
          float nD = mix(vMapUv.y, 1. - vMapUv.y, uMode) + (vnoise(vec2(vMapUv.x * 6., 0.)) - 0.5) * 0.025;
          float kD = uDis * 1.12 - 0.06;
          if (nD < kD) discard;
          float eD = (1. - smoothstep(kD, kD + 0.035, nD)) * step(0.001, uDis) * step(uDis, 0.999);
          diffuseColor.rgb = mix(diffuseColor.rgb, uEdge * 0.6 + 0.55, eD * 0.85);`);
    };
    return mat;
  }
  function makeBottle(url, aspect, height, edgeHex, flat) {
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    let geo;
    if (flat) geo = new THREE.PlaneGeometry(height * aspect, height, 1, 1);
    else {
      const r = (height * aspect) / 2, m = 0.4;
      geo = new THREE.CylinderGeometry(r, r, height, 128, 1, true, -(Math.PI / 2 + m), Math.PI + 2 * m);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const th = clamp(Math.atan2(pos.getX(i), pos.getZ(i)), -Math.PI / 2, Math.PI / 2);
        uv.setX(i, clamp(0.5 + 0.5 * Math.sin(th), 0.012, 0.988));
      }
    }
    const u = { uDis: { value: 0 }, uMode: { value: 0 }, uEdge: { value: new THREE.Color(edgeHex) } };
    const mesh = new THREE.Mesh(geo, dissolveMat(tex, u, THREE.FrontSide));
    const mirror = new THREE.Mesh(geo, dissolveMat(tex, u, THREE.DoubleSide));
    mirror.scale.y = -1; mirror.position.y = -height;
    const sheenU = { map: { value: tex }, uBand: { value: 0.5 }, uK: { value: 1 }, uFlat: { value: flat ? 1 : 0 }, uSweep: { value: 0 }, uDis: u.uDis, uMode: u.uMode };
    const sheen = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: sheenU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D map; uniform float uBand, uK, uFlat, uSweep, uDis, uMode; varying vec3 vN; varying vec2 vUv;
        void main(){ float a = texture2D(map, vUv).a; if (a < 0.5) discard;
          if (mix(vUv.y, 1. - vUv.y, uMode) < uDis * 1.12 - 0.06 + 0.02) discard;
          float x = vN.x + (vUv.x - 0.5) * 1.5 * uFlat;
          float b = exp(-pow((x - uBand) * 6.5, 2.)) * (0.26 + uSweep * 0.3) + exp(-pow((x + 0.62) * 11., 2.)) * 0.12 * (1. - uFlat);
          float rim = pow(1. - abs(vN.z), 3.) * 0.16 * (1. - uFlat);
          gl_FragColor = vec4(vec3(b + rim) * uK, 1.); }`
    }));
    sheen.renderOrder = 2;
    const g = new THREE.Group(); g.add(mesh, mirror, sheen); g.position.y = height / 2;
    shelf.add(g);
    return { g, u, sheenU, height };
  }
  const bottles = [
    makeBottle('assets/lab/pink-mist.webp', 504 / 2048, 3.2, '#FF8CC0', false),
    makeBottle('assets/lab/vitamin-c.webp', 636 / 1524, 2.5, '#FFB04A', true),
    makeBottle('assets/lab/nad-serum.webp', 635 / 1456, 2.45, '#7FD3DE', true),
    makeBottle('assets/lab/cc-cream.webp', 273 / 1367, 3.1, '#E9B79C', false)
  ];

  /* Parlak zemin: yansımayı yumuşatır, temas gölgesi verir */
  const floorU = { uCol: { value: new THREE.Color() }, uFar: { value: new THREE.Color() }, uVis: { value: 1 } };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 1, 1), new THREE.ShaderMaterial({
    uniforms: floorU, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uCol, uFar; uniform float uVis; varying vec2 vP;
      void main(){ float r = length(vP * vec2(1., 1.5));
        float a = mix(0.74, 0.93, smoothstep(0.7, 9., r)) * (1. - smoothstep(11., 26., r));
        vec3 c = mix(uCol, uFar, smoothstep(1.5, 10., r));
        c *= 1. - 0.12 * exp(-r * r * 1.6);
        gl_FragColor = vec4(c, a * uVis);
        #include <colorspace_fragment>
      }`
  }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1;
  scene.add(floor);

  /* Pink Mist püskürmesi */
  const SN = isPhone ? 260 : 620;
  const sR = new Float32Array(SN * 4);
  for (let i = 0; i < SN * 4; i++) sR[i] = Math.random();
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
  sGeo.setAttribute('aR', new THREE.BufferAttribute(sR, 4));
  const sprayU = { uTime: { value: 0 }, uAmt: { value: 0 }, uPR: { value: 1 }, uH: { value: 800 }, uNoz: { value: new THREE.Vector3(0, 1.39, 0.12) } };
  const spray = new THREE.Points(sGeo, new THREE.ShaderMaterial({
    uniforms: sprayU, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aR; uniform float uTime, uAmt, uPR, uH; uniform vec3 uNoz; varying float vA; varying float vR;
      void main(){
        float t = fract(uTime * 0.42 * (0.7 + aR.x * 0.6) + aR.y);
        vec3 dir = normalize(vec3(0.9, 0.28, 0.42));
        vec3 j = (aR.yzw * 2. - 1.);
        vec3 p = uNoz + dir * t * (2.4 + aR.z * 1.8) + j * t * t * 1.1 + vec3(0., -t * t * 0.45, 0.);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.02 + aR.w * 0.06) * (0.35 + t * 1.8) * uH * uPR / -mv.z;
        vA = uAmt * (1. - t) * smoothstep(0., 0.06, t); vR = aR.w;
      }`,
    fragmentShader: `varying float vA; varying float vR;
      void main(){ vec2 c = gl_PointCoord - .5; float r = length(c) * 2.; if (r > 1.) discard;
        float body = smoothstep(1., .7, r); float hl = exp(-dot(c + vec2(.15), c + vec2(.15)) * 60.);
        vec3 col = mix(vec3(1., .78, .88), vec3(1.), hl);
        gl_FragColor = vec4(col, (body * .55 + hl * .6) * vA);
        #include <colorspace_fragment>
      }`
  }));
  spray.frustumCulled = false;
  bottles[0].g.add(spray);

  /* Doku / formül damlası */
  const N = 72, dropPts = [], spherePts = [];
  for (let i = 0; i <= N; i++) {
    const t = Math.PI - (i / N) * Math.PI;
    dropPts.push(new THREE.Vector2(Math.max(1e-4, Math.sin(t) * Math.pow(Math.sin(t / 2), 1.15) * 1.22), Math.cos(t) * 1.12 + 0.12));
    spherePts.push(new THREE.Vector2(Math.max(1e-4, Math.sin(t)), Math.cos(t)));
  }
  const dropGeo = new THREE.LatheGeometry(dropPts, 96);
  const sphGeo = new THREE.LatheGeometry(spherePts, 96);
  dropGeo.morphAttributes.position = [sphGeo.attributes.position];
  dropGeo.morphAttributes.normal = [sphGeo.attributes.normal];
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 1, thickness: 1, ior: 1.34, envMapIntensity: 1.3, clearcoat: 1, clearcoatRoughness: 0.04, attenuationColor: new THREE.Color('#FFD8A0'), attenuationDistance: 3 });
  const drop = new THREE.Mesh(dropGeo, dropMat);
  drop.morphTargetInfluences = [0];
  scene.add(drop);

  /* Ortam zerrecikleri */
  const PN = isPhone ? 420 : 1200;
  const pPos = new Float32Array(PN * 3), pRnd = new Float32Array(PN);
  for (let i = 0; i < PN; i++) { pPos[i * 3] = (Math.random() * 2 - 1) * 7.5; pPos[i * 3 + 1] = (Math.random() * 2 - 1) * 4.8; pPos[i * 3 + 2] = Math.random(); pRnd[i] = Math.random(); }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aRnd', new THREE.BufferAttribute(pRnd, 1));
  const pU = { uTime: { value: 0 }, uFly: { value: 0 }, uCol: { value: new THREE.Color() }, uA: { value: 1 }, uPR: { value: 1 }, uH: { value: 800 } };
  const parts = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    uniforms: pU, transparent: true, depthWrite: false,
    vertexShader: `attribute float aRnd; uniform float uTime, uFly, uPR, uH; varying float vA;
      void main(){
        vec3 p = position;
        float z = fract(p.z + uFly * (0.6 + aRnd * 0.8) + uTime * 0.004 * (0.5 + aRnd));
        p.z = -1.4 - z * 15.;
        p.x += sin(uTime * 0.2 + aRnd * 40.) * 0.15; p.y += cos(uTime * 0.16 + aRnd * 30.) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.016 + pow(aRnd, 3.) * 0.05) * uH * uPR / -mv.z;
        vA = smoothstep(16.4, 12., -mv.z) * smoothstep(1.4, 3.2, -mv.z);
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vA;
      void main(){ vec2 c = gl_PointCoord - .5; float r = length(c) * 2.; if (r > 1.) discard;
        float body = smoothstep(1., .82, r); float rim = smoothstep(.55, .95, r) * body;
        float hl = exp(-dot(c - vec2(-.16, -.18), c - vec2(-.16, -.18)) * 90.);
        gl_FragColor = vec4(uCol * (.55 + .6 * rim) + vec3(1.) * hl, body * (.16 + .5 * rim + hl) * vA * uA);
        #include <colorspace_fragment>
      }`
  }));
  parts.frustumCulled = false;
  camera.add(parts);

  /* Doku yüzeyi */
  const surfU = { uBg: { value: new THREE.Color() }, uRip: { value: 0 }, uCream: { value: 0 }, uVis: { value: 0 } };
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(18, 18, 1, 1), new THREE.ShaderMaterial({
    uniforms: surfU,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uBg; uniform float uRip, uCream, uVis; varying vec2 vP;
      ${NOISE}
      float creamMask(vec2 p){ float r = length(p), a = atan(p.y, p.x);
        float e = uCream * 2.3 * (0.82 + 0.3 * fbm(vec2(a * 1.6, uCream * 2.) + 3.));
        return smoothstep(e, e - 0.14, r) * step(0.001, uCream); }
      float H(vec2 p){
        float pores = smoothstep(0.72, 0.95, vnoise(p * 34.));
        float h = fbm(p * 16.) * 0.012 - pores * 0.008 + fbm(vec2(p.x * 4. + p.y * 2., p.y * 18.)) * 0.0035;
        float r = length(p), R = uRip * 3.4;
        h += sin((r - R) * 24.) * exp(-pow((r - R) * 2.6, 2.)) * (1. - uRip) * 0.03 * step(0.001, uRip);
        float m = creamMask(p), a = atan(p.y, p.x);
        h += m * (0.05 + fbm(p * 2.6 + a) * 0.03 + sin(r * 13. - a * 3. + fbm(p * 1.8) * 7.) * 0.009);
        return h; }
      void main(){
        vec2 p = vP; float e = 0.008;
        vec3 n = normalize(vec3(H(p - vec2(e, 0.)) - H(p + vec2(e, 0.)), H(p - vec2(0., e)) - H(p + vec2(0., e)), 2. * e));
        vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
        float dif = clamp(dot(n, L), 0., 1.);
        float spec = pow(clamp(dot(reflect(-L, n), vec3(0., 0., 1.)), 0., 1.), 40.);
        vec3 skin = mix(vec3(0.86, 0.68, 0.58), vec3(0.93, 0.79, 0.70), fbm(p * 3.));
        float m = creamMask(p);
        vec3 c = mix(skin, vec3(0.98, 0.95, 0.93), m) * (0.55 + 0.55 * dif) + spec * mix(0.15, 0.6, m);
        gl_FragColor = vec4(mix(uBg, c, smoothstep(8., 2.8, length(p)) * uVis), 1.);
        #include <colorspace_fragment>
      }`
  }));
  surface.rotation.x = -Math.PI / 2; surface.position.y = -1.5;
  scene.add(surface);

  /* Mist bulutu */
  const BN = isPhone ? 260 : 700;
  const bDir = new Float32Array(BN * 3), bR = new Float32Array(BN);
  for (let i = 0; i < BN; i++) { const a = Math.random() * Math.PI * 2, u = Math.random(); bDir[i * 3] = Math.cos(a) * (0.4 + u); bDir[i * 3 + 1] = 0.6 + Math.random() * 1.6; bDir[i * 3 + 2] = Math.sin(a) * (0.4 + u); bR[i] = Math.random(); }
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.BufferAttribute(bDir, 3));
  bGeo.setAttribute('aRnd', new THREE.BufferAttribute(bR, 1));
  const bU = { uMist: { value: 0 }, uPR: { value: 1 }, uH: { value: 800 }, uTime: { value: 0 } };
  const burst = new THREE.Points(bGeo, new THREE.ShaderMaterial({
    uniforms: bU, transparent: true, depthWrite: false,
    vertexShader: `attribute float aRnd; uniform float uMist, uPR, uH, uTime; varying float vA;
      void main(){ float t = uMist;
        vec3 p = vec3(position.x * t * 2.2, position.y * t * 0.75 - 1.35 + sin(uTime * .4 + aRnd * 20.) * .05 * t, position.z * t * 2.2);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.08 + aRnd * 0.3) * (0.5 + t) * uH * uPR / -mv.z;
        vA = smoothstep(0., .15, t) * (1. - smoothstep(.75, 1., t) * .6); }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float r = length(c) * 2.; if (r > 1.) discard;
      gl_FragColor = vec4(vec3(0.92, 0.74, 0.80), (1. - r) * (1. - r) * .85 * vA);
      #include <colorspace_fragment>
    }`
  }));
  burst.frustumCulled = false;
  scene.add(burst);

  /* Lipozom */
  const lipo = new THREE.Group();
  scene.add(lipo);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 3);
  const R = 1.6;
  const fib = (n, r) => { const out = []; const g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2; const rr = Math.sqrt(1 - y * y); const th = g * i; out.push(new THREE.Vector3(Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r)); } return out; };
  const outerN = isPhone ? 520 : 1150, innerN = isPhone ? 380 : 820;
  const heads = [...fib(outerN, R), ...fib(innerN, R - 0.44)];
  const headMat = new THREE.MeshPhysicalMaterial({ color: 0xF3F1F4, metalness: 0.25, roughness: 0.22, clearcoat: 1, clippingPlanes: [clipPlane] });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xC7CBD4, metalness: 0.4, roughness: 0.4, clippingPlanes: [clipPlane] });
  const buildU = { value: 0 };
  const addBuild = (mat) => { mat.onBeforeCompile = (sh) => { sh.uniforms.uBuild = buildU; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uBuild; attribute float aDelay;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed *= smoothstep(aDelay, aDelay + 0.25, uBuild);'); }; };
  addBuild(headMat); addBuild(tailMat);
  const headGeo = new THREE.SphereGeometry(0.058, 12, 8);
  const tailGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.17, 5, 1); tailGeo.translate(0, -0.1, 0);
  const headIM = new THREE.InstancedMesh(headGeo, headMat, heads.length);
  const tailIM = new THREE.InstancedMesh(tailGeo, tailMat, heads.length * 2);
  const delays = new Float32Array(heads.length), tDelays = new Float32Array(heads.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  heads.forEach((v, i) => {
    const outer = i < outerN;
    m4.makeTranslation(v.x, v.y, v.z); headIM.setMatrixAt(i, m4);
    const d = (0.5 - 0.5 * v.clone().normalize().y) * 0.55 + Math.random() * 0.2;
    delays[i] = d;
    q.setFromUnitVectors(up, v.clone().normalize().multiplyScalar(outer ? 1 : -1));
    for (let k = 0; k < 2; k++) { const off = new THREE.Vector3((k ? 1 : -1) * 0.02, 0, 0).applyQuaternion(q); m4.compose(v.clone().add(off), q, one); tailIM.setMatrixAt(i * 2 + k, m4); tDelays[i * 2 + k] = d + 0.05; }
  });
  headGeo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1));
  tailGeo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(tDelays, 1));
  lipo.add(headIM, tailIM);
  const mkActives = (n, rMin, rMax, color, size) => {
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(lerp(rMin, rMax, Math.cbrt(Math.random()))); a.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const u = { uCol: { value: new THREE.Color(color) }, uA: { value: 0 }, uPR: { value: 1 }, uH: { value: 800 }, uS: { value: size }, uTime: { value: 0 } };
    lipo.add(new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uPR, uH, uS, uTime; void main(){ vec3 p = position * (1. + sin(uTime + position.x * 9.) * .015); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uS * uH * uPR / -mv.z; }`,
      fragmentShader: `uniform vec3 uCol; uniform float uA; void main(){ vec2 c = gl_PointCoord - .5; float r = length(c) * 2.; if (r > 1.) discard; gl_FragColor = vec4(uCol * (1. - r * .6), (1. - r) * uA);
        #include <colorspace_fragment>
      }`
    })));
    return u;
  };
  const actIn = mkActives(isPhone ? 90 : 180, 0.1, 0.92, '#5FB6FF', 0.06);
  const actMid = mkActives(isPhone ? 120 : 260, R - 0.36, R - 0.1, '#FFA94D', 0.045);
  const anchors = [new THREE.Vector3(-R * 0.72, R * 0.66, 0.25), new THREE.Vector3(-0.15, -0.25, 0.2), new THREE.Vector3(R * 0.62, -R * 0.62, 0.3), new THREE.Vector3(R * 0.98, 0.2, 0)];

  const leaders = $('.leaders');
  const lbls = $$('.lbl');
  const svgNS = 'http://www.w3.org/2000/svg';
  const lines = lbls.map(() => { const l = document.createElementNS(svgNS, 'line'); const c = document.createElementNS(svgNS, 'circle'); c.setAttribute('r', '3.5'); leaders.append(l, c); return { l, c }; });
  const OFFS = [[-300, -120], [-320, 110], [70, 120], [70, -140]];
  const tmpV = new THREE.Vector3();
  function placeLabels() {
    if (isPhone) return;
    const w = innerWidth, hgt = innerHeight;
    lbls.forEach((el, i) => {
      tmpV.copy(anchors[i]).applyMatrix4(lipo.matrixWorld).project(camera);
      const ax = Math.round((tmpV.x * 0.5 + 0.5) * w), ay = Math.round((-tmpV.y * 0.5 + 0.5) * hgt);
      const lx = Math.round(clamp(ax + OFFS[i][0], 16, w - 250)), ly = Math.round(clamp(ay + OFFS[i][1], 90, hgt - 120));
      el.style.left = lx + 'px'; el.style.top = ly + 'px';
      const ex = OFFS[i][0] < 0 ? lx + 230 : lx, ey = ly + 22, op = el.style.opacity || '0';
      lines[i].l.setAttribute('x1', ax); lines[i].l.setAttribute('y1', ay); lines[i].l.setAttribute('x2', ex); lines[i].l.setAttribute('y2', ey);
      lines[i].c.setAttribute('cx', ax); lines[i].c.setAttribute('cy', ay);
      lines[i].l.style.opacity = op; lines[i].c.style.opacity = op;
    });
  }

  function resize() {
    const pr = Math.min(devicePixelRatio || 1, isPhone ? 1.5 : 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 0.8 ? 46 : 35;
    camera.updateProjectionMatrix();
    for (const u of [pU, bU, actIn, actMid, sprayU]) { u.uPR.value = pr; u.uH.value = innerHeight; }
  }
  resize();

  let lastKey = '';
  function frame(P, t) {
    const idle = reduce ? 0 : 1;
    // Ekran tamamen sabit ve görünmezken (LED videosu tam ekran, footer) çizimi atla
    const key = P.dark > 0.999 ? 'dark' : '';
    if (key && key === lastKey) return;
    lastKey = key;

    camera.position.set(P.cam[0], P.cam[1], P.cam[2]);
    camera.lookAt(P.look[0], P.look[1], P.look[2]);
    col(P.top, bgU.uTop.value); col(P.bot, bgU.uBot.value); col(P.acc, bgU.uAcc.value);
    bgU.uGlow.value = P.glow; bgU.uRays.value = P.rays; bgU.uCaustic.value = P.caustic; bgU.uDark.value = P.dark; bgU.uTime.value = t;

    const showShelf = P.floor > 0.01;
    shelf.visible = showShelf; floor.visible = showShelf;
    if (showShelf) {
      shelf.position.set(P.bx, FLOOR_Y + P.by, 0);
      shelf.rotation.y = P.brot;
      floor.position.set(P.bx, FLOOR_Y + P.by + 0.001, 0);
      col(mixArr(P.bot, P.top, 0.5), floorU.uCol.value); col(mixArr(P.bot, P.top, 0.42).map((v) => Math.min(1, v + 0.06)), floorU.uFar.value); floorU.uVis.value = P.floor;
      const band = lerp(0.45 - P.brot * 0.9, lerp(-1.6, 1.6, P.sweep), P.swOn);
      [P.d0, P.d1, P.d2, P.d3].forEach((d, i) => {
        const b = bottles[i];
        b.u.uDis.value = d; b.u.uMode.value = P.mode[i] > 0.5 ? 1 : 0; b.g.visible = d < 0.995;
        b.sheenU.uBand.value = band; b.sheenU.uK.value = 1; b.sheenU.uSweep.value = P.swOn;
      });
      sprayU.uAmt.value = P.spray * idle + P.spray * 0.4 * (1 - idle); sprayU.uTime.value = t;
      spray.visible = P.spray > 0.01 && P.d0 < 0.5;
    }

    const on = P.dropOn;
    drop.visible = on > 0.01;
    if (drop.visible) {
      drop.position.set(P.dropPos[0], P.dropPos[1], P.dropPos[2]);
      drop.scale.set(P.dropS[0] * on, P.dropS[1] * on, P.dropS[2] * on);
      drop.morphTargetInfluences[0] = P.sph;
      col(P.tint, dropMat.attenuationColor); dropMat.thickness = P.thick;
    }

    parts.visible = P.pA > 0.01;
    col(P.pCol, pU.uCol.value); pU.uA.value = P.pA; pU.uTime.value = t * idle; pU.uFly.value = scrollY * 0.00022 * P.pSpeed;

    surface.visible = P.surf > 0.002;
    if (surface.visible) { col(P.bot, surfU.uBg.value); surfU.uVis.value = P.surf; surfU.uRip.value = P.rip; surfU.uCream.value = P.cream; }
    burst.visible = P.mist > 0.002 && P.surf > 0.2; bU.uMist.value = P.mist; bU.uTime.value = t;

    lipo.visible = P.lipo > 0.01;
    if (lipo.visible) {
      lipo.position.copy(drop.position);
      lipo.scale.setScalar(lerp(0.001, isPhone ? 0.72 : 1, ease(P.lipo)));
      lipo.rotation.set(0.25, scrollY * 0.0004, 0.1);
      buildU.value = P.build * 1.3;
      clipPlane.constant = lerp(2.4, -0.1, P.cut);
      actIn.uA.value = 0.9 * P.lipo * P.cut; actMid.uA.value = 0.8 * P.lipo * P.build;
      actIn.uTime.value = t; actMid.uTime.value = t;
      lipo.updateMatrixWorld();
      placeLabels();
    }
    renderer.render(scene, camera);
  }
  GL = { frame, resize };
  root.classList.add('gl-ready');
}
initGL();
