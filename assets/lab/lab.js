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
let ledColor = [0.69, 0.3, 1];
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
    if (idx >= 0) { const n = parseInt(ledItems[idx].c.trim().slice(1), 16); ledColor = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
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
    px: 17, py: 3, ps: 0.72, prot: -12, pvis: 1,
    dropPos: [0, 0, 0], dropS: [0.3, 0.3, 0.3], sph: 0.2, dropOn: 0, tint: C.serum, thick: 1,
    top: C.white, bot: C.silver, acc: C.pink, glow: 0.3, rays: 0, caustic: 0, dark: 0,
    pA: 0.7, pCol: C.pinkP, pSpeed: 1,
    surf: 0, rip: 0, cream: 0, mist: 0,
    // Lipozom her bölümde eşlik eder: lanch 1 = ekrana sabit küçük eşlikçi, 0 = sahnede (formül)
    lipo: 1, build: 1, cut: 1, lanch: 1, lsp: isPhone ? [0.56, 0.66] : [0.8, 0.6], ld: 6, lsc: isPhone ? 0.2 : 0.24, emis: [0, 0, 0]
  };
}
const companion = (P, desk, phone, size) => { P.lanch = 1; P.lsp = isPhone ? phone : desk; P.lsc = size * (isPhone ? 0.8 : 1); return P; };
function S1(p) {
  const P = base();
  const a = ease(seg(p, 0, 0.72));
  P.cam = isPhone ? [0, lerp(0.9, 0.25, a), lerp(10.5, 4.9, a)] : [0, lerp(0.9, 0.25, a), lerp(11.5, 3.8, a)];
  P.look = [0, lerp(0.2, 0.3, a), 0];
  P.bx = isPhone ? 0 : lerp(1.7, 0, ease(seg(p, 0.04, 0.6)));
  P.by = isPhone ? lerp(0.9, 0, a) : 0;
  P.brot = lerp(-0.6, 0, ease(seg(p, 0.04, 0.72)));
  P.spray = (0.45 + 0.55 * bell(p, 0.04, 0.3, 0.62)) * (1 - seg(p, 0.58, 0.7));
  if (isPhone) { P.px = 0; P.py = lerp(-8, 9, a); P.ps = lerp(0.62, 1.55, a); }
  else { P.px = lerp(17, 0, ease(seg(p, 0.04, 0.6))); P.py = lerp(3, 12, a); P.ps = lerp(0.72, 2.0, a); }
  P.prot = lerp(-12, 0, ease(seg(p, 0.04, 0.72)));
  P.top = mixArr(C.white, C.pinkTop, a); P.bot = mixArr(C.silver, C.pinkBot, a);
  P.glow = 0.3 + 0.3 * a; P.pA = 0.55 + 0.3 * a;
  return P;
}
function S2(p) {
  const P = base();
  P.cam = isPhone ? [0, 0.3, 9.4] : [0, 0.25, 6.8]; P.look = [0, isPhone ? 0.55 : 0.05, 0];
  P.bx = isPhone ? 0 : 1.2; P.by = isPhone ? 1.25 : 0;
  P.brot = Math.sin(p * Math.PI * 4) * 0.16;
  P.prot = Math.sin(p * Math.PI * 4) * 5;
  if (isPhone) { P.px = 0; P.py = -17; P.ps = 0.6; } else { P.px = 17; P.py = 2; P.ps = 0.95; }
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
  return companion(P, [0.8, 0.6], [0.6, 0.66], 0.2);
}
function CALM() {
  const P = base();
  P.cam = [0, 0, 8]; P.look = [0, 0, 0]; P.by = 0; P.d0 = 1; P.floor = 0; P.pvis = 0; P.ps = 0.9; P.px = isPhone ? 0 : 17; P.py = isPhone ? -17 : 2; P.prot = 0;
  P.top = C.white; P.bot = hex('#E9E9EB'); P.acc = C.pink; P.glow = 0.18; P.pA = 0.2; P.pCol = hex('#E6C9D6'); P.pSpeed = 0.4;
  return companion(P, [-0.8, -0.62], [0.62, 0.7], 0.26);
}
function RUT() {
  return companion(CALM(), [0.8, 0.42], [0.62, 0.72], 0.34);
}
function S3() {
  // Doku bölümü fotoğraflarla anlatılır; 3D sahne arkada sakin kalır
  const P = CALM(); P.lipo = 0;
  return P;
}
function S4(p) {
  const P = CALM();
  const orbit = p * 0.9;
  P.cam = [Math.sin(orbit) * 1.2, 0.35 * Math.cos(orbit * 1.3), 6.8 - 0.6 * ease(seg(p, 0.2, 0.7))];
  P.look = [isPhone ? 0 : 0.3, isPhone ? -0.5 : 0, 0];
  const s = lerp(0.3, 1.02, ease(seg(p, 0, 0.16)));
  P.dropPos = [0, isPhone ? -0.2 : 0, 0]; P.dropS = [s, s, s]; P.dropOn = 0;
  P.lipo = ease(seg(p, 0, 0.12)); P.build = 1; P.cut = 1;
  P.lanch = 0; P.lsc = lerp(0.4, isPhone ? 0.52 : 1, ease(seg(p, 0, 0.2)));
  P.top = hex('#F7F7F8'); P.bot = hex('#D9DADF'); P.acc = hex('#E9E3F2'); P.glow = 0.35; P.pA = 0.12; P.pCol = hex('#D6D8E2');
  return P;
}
function LEDP() {
  const P = CALM();
  P.top = hex('#0B0B0D'); P.bot = hex('#050506'); P.acc = ledColor; P.dark = 1; P.glow = 0.4; P.pA = 0;
  P.emis = ledColor.map((v) => v * 0.45);
  return companion(P, [-0.12, -0.42], [0.6, 0.7], 0.36);
}
function timeline(y) {
  let P = S1(clamp(prog('acilis', y)));
  P = blend(P, S2(clamp(prog('dunyalar', y))), enter('dunyalar', y));
  P = blend(P, CALM(), enter('kampanya', y));
  P = blend(P, S3(), enter('doku', y));
  P = blend(P, S4(clamp(prog('formul', y))), enter('formul', y));
  P = blend(P, CALM(), enter('galeri', y));
  P = blend(P, RUT(), enter('rutin', y));
  P = blend(P, LEDP(), enter('led', y));
  return P;
}

/* ------------------------------------------------------------------ */
/* Ürünler: net görsel katmanı (yansıma, gölge, parlama, tarama)       */
/* ------------------------------------------------------------------ */
const plEls = $$('.pl').map((el) => ({ el, body: $('.pl-body', el), refl: $('.pl-refl', el), line: $('.pl-line', el), sheen: $('.pl-sheen', el), last: '' }));
const prodLayer = $('.prod-layer');
const pinkImg = $('.pl[data-pl="0"] .pl-img');
function updateProducts(P) {
  if (!prodLayer) return;
  const show = P.pvis > 0.01;
  prodLayer.style.visibility = show ? '' : 'hidden';
  if (!show) return;
  prodLayer.style.opacity = P.pvis.toFixed(3);
  const band = lerp(30 - P.prot * 2, lerp(-25, 125, P.sweep), P.swOn);
  const tf = 'translate(-50%,-50%) translate(' + P.px.toFixed(2) + 'vw,' + P.py.toFixed(2) + 'vh) scale(' + P.ps.toFixed(4) + ') rotateY(' + P.prot.toFixed(2) + 'deg)';
  [P.d0, P.d1, P.d2, P.d3].forEach((d, i) => {
    const o = plEls[i]; if (!o) return;
    const vis = d < 0.995;
    o.el.style.visibility = vis ? '' : 'hidden';
    if (!vis) return;
    o.el.style.transform = tf;
    const incoming = P.mode[i] > 0.5;
    const cut = (d * 100).toFixed(2) + '%';
    o.body.style.clipPath = d < 0.001 ? '' : (incoming ? 'inset(' + cut + ' 0 0 0)' : 'inset(0 0 ' + cut + ' 0)');
    o.line.style.top = incoming ? cut : ((1 - d) * 100).toFixed(2) + '%';
    o.line.style.opacity = d > 0.01 && d < 0.99 ? 1 : 0;
    o.refl.style.opacity = (0.2 * (1 - d)).toFixed(3);
    o.sheen.style.setProperty('--b', band.toFixed(1));
    o.sheen.style.opacity = (0.55 + 0.45 * P.swOn).toFixed(2);
  });
}

/* ------------------------------------------------------------------ */
/* Doku: fotoğraflar arasında geçiş, düşen damla, halka                */
/* ------------------------------------------------------------------ */
const dkFrames = $$('.dk-frame');
const dkDrop = $('.dk-drop'), dkRing = $('.dk-ring');
function updateDoku(y) {
  if (!dkFrames.length) return;
  const p = prog('doku', y);
  if (p < -0.6 || p > 1.4) return;
  const q = clamp(p);
  const w = [1 - seg(q, 0.4, 0.48), seg(q, 0.4, 0.48) * (1 - seg(q, 0.7, 0.78)), seg(q, 0.7, 0.78)];
  const z = [seg(q, 0, 0.48), seg(q, 0.4, 0.78), seg(q, 0.7, 1)];
  dkFrames.forEach((el, i) => { el.style.opacity = w[i].toFixed(3); el.style.transform = 'scale(' + (1.08 - 0.08 * z[i]).toFixed(4) + ')'; });
  const t = seg(q, 0.06, 0.3), imp = seg(q, 0.3, 0.335);
  dkDrop.style.opacity = (seg(q, 0.02, 0.06) * (1 - imp)).toFixed(3);
  dkDrop.style.transform = 'translate(-50%,' + lerp(-14, isPhone ? 52 : 58, t * t).toFixed(2) + 'vh) scale(' + (1 + 0.5 * imp).toFixed(3) + ',' + (1 - 0.55 * imp).toFixed(3) + ')';
  const r = seg(q, 0.3, 0.52);
  dkRing.style.opacity = (r > 0 && r < 1 ? (1 - r) : 0).toFixed(3);
  dkRing.style.transform = 'translate(-50%,-50%) scale(' + (0.2 + r * 6).toFixed(3) + ', ' + (0.06 + r * 1.6).toFixed(3) + ')';
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
  const P = timeline(y);
  updateProducts(P);
  updateDoku(y);
  if (GL) GL.frame(P, now / 1000);
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

  /* Pink Mist püskürmesi */
  const SN = isPhone ? 260 : 620;
  const sR = new Float32Array(SN * 4);
  for (let i = 0; i < SN * 4; i++) sR[i] = Math.random();
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
  sGeo.setAttribute('aR', new THREE.BufferAttribute(sR, 4));
  const sprayU = { uTime: { value: 0 }, uAmt: { value: 0 }, uPR: { value: 1 }, uH: { value: 800 }, uNoz: { value: new THREE.Vector3(0, 0, 0) } };
  const spray = new THREE.Points(sGeo, new THREE.ShaderMaterial({
    uniforms: sprayU, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aR; uniform float uTime, uAmt, uPR, uH; uniform vec3 uNoz; varying float vA; varying float vR;
      void main(){
        float t = fract(uTime * 0.42 * (0.7 + aR.x * 0.6) + aR.y);
        vec3 dir = normalize(vec3(0.95, 0.3, 0.12));
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
  scene.add(spray);

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
  const outerN = isPhone ? 420 : 860, innerN = isPhone ? 300 : 600;
  const heads = [...fib(outerN, R), ...fib(innerN, R - 0.44)];
  const headMat = new THREE.MeshPhysicalMaterial({ color: 0xFBFAF8, metalness: 0.05, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 1, sheenColor: new THREE.Color('#FFE9F1'), sheenRoughness: 0.35, clippingPlanes: [clipPlane], clipShadows: true });
  const tailMat = new THREE.MeshPhysicalMaterial({ color: 0xF1F2F5, metalness: 0.0, roughness: 0.25, clearcoat: 0.6, clippingPlanes: [clipPlane] });
  const buildU = { value: 0 };
  const addBuild = (mat) => { mat.onBeforeCompile = (sh) => { sh.uniforms.uBuild = buildU; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uBuild; attribute float aDelay;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed *= smoothstep(aDelay, aDelay + 0.25, uBuild);'); }; };
  addBuild(headMat); addBuild(tailMat);
  const headGeo = new THREE.SphereGeometry(0.074, 18, 12);
  const tailGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.22, 6, 1); tailGeo.translate(0, -0.13, 0);
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
  // İnci çekirdek (dergideki lipozom kesiti gibi)
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.5, 64, 48), new THREE.MeshPhysicalMaterial({ color: 0xFBFAF7, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.8, sheenColor: new THREE.Color('#FFEFF5'), sheenRoughness: 0.4 }));
  lipo.add(core);
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
  const actIn = mkActives(isPhone ? 40 : 80, R * 0.52, R * 0.62, '#F6D7E4', 0.05);
  const actMid = mkActives(isPhone ? 80 : 160, R - 0.36, R - 0.1, '#FFFFFF', 0.035);
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

  const vR = new THREE.Vector3(), vU = new THREE.Vector3(), vF = new THREE.Vector3(), vS = new THREE.Vector3(), vW = new THREE.Vector3(), vN = new THREE.Vector3();
  function frame(P, t) {
    const idle = reduce ? 0 : 1;
    camera.position.set(P.cam[0], P.cam[1], P.cam[2]);
    camera.lookAt(P.look[0], P.look[1], P.look[2]);
    camera.updateMatrixWorld();
    col(P.top, bgU.uTop.value); col(P.bot, bgU.uBot.value); col(P.acc, bgU.uAcc.value);
    bgU.uGlow.value = P.glow; bgU.uRays.value = P.rays; bgU.uCaustic.value = P.caustic; bgU.uDark.value = P.dark; bgU.uTime.value = t;

    // Mist püskürmesi: Pink Mist görselinin ağzına ekran koordinatıyla bağlanır
    const e0 = camera.matrixWorld.elements;
    vR.set(e0[0], e0[1], e0[2]); vU.set(e0[4], e0[5], e0[6]); vF.set(-e0[8], -e0[9], -e0[10]);
    const tanH0 = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    spray.visible = P.spray > 0.01 && P.pvis > 0.5 && P.d0 < 0.5 && !!pinkImg;
    if (spray.visible) {
      const r = pinkImg.getBoundingClientRect();
      const nx = ((r.left + r.width * 0.5) / innerWidth) * 2 - 1, ny = -(((r.top + r.height * 0.075) / innerHeight) * 2 - 1);
      const d = 5;
      spray.position.copy(vF).addScaledVector(vR, nx * tanH0 * camera.aspect).addScaledVector(vU, ny * tanH0).multiplyScalar(d).add(camera.position);
      spray.quaternion.copy(camera.quaternion);
      spray.scale.setScalar(0.45 * P.ps * (isPhone ? 0.8 : 1));
      sprayU.uAmt.value = P.spray * (reduce ? 0.4 : 1); sprayU.uTime.value = t;
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
      // Ekrana sabit eşlikçi konumu ile sahnedeki (formül) konum arasında karışım
      const e = camera.matrixWorld.elements;
      vR.set(e[0], e[1], e[2]); vU.set(e[4], e[5], e[6]); vF.set(-e[8], -e[9], -e[10]);
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      vS.copy(vF).addScaledVector(vR, P.lsp[0] * tanH * camera.aspect).addScaledVector(vU, P.lsp[1] * tanH).multiplyScalar(P.ld).add(camera.position);
      vW.set(P.dropPos[0], P.dropPos[1], P.dropPos[2]);
      lipo.position.copy(vW).lerp(vS, P.lanch);
      const breathe = 1 + 0.03 * Math.sin(t * 1.3) * idle;
      lipo.scale.setScalar(Math.max(0.001, P.lsc * P.lipo * breathe));
      lipo.rotation.set(0.25, scrollY * 0.0003, 0.1 + t * 0.12 * idle * P.lanch);
      buildU.value = P.build * 1.3;
      if (P.cut > 0.002) {
        // Kesit kameraya hafif açıyla bakar: halka derinlikli görünür
        vN.copy(camera.position).sub(lipo.position).normalize().applyAxisAngle(vU, 0.38).applyAxisAngle(vR, -0.16).normalize();
        clipPlane.normal.copy(vN).negate();
        clipPlane.constant = vN.dot(lipo.position) + lerp(2.4, 0.0, P.cut) * lipo.scale.x;
      } else { clipPlane.normal.set(0, 0, -1); clipPlane.constant = 1e5; }
      col(P.emis, headMat.emissive); col(P.emis.map((v) => v * 0.6), tailMat.emissive);
      actIn.uA.value = 0.7 * P.cut; actMid.uA.value = 0.6 * P.build;
      actIn.uTime.value = t; actMid.uTime.value = t;
      lipo.updateMatrixWorld();
      if (P.lanch < 0.5) placeLabels();
    }
    renderer.render(scene, camera);
  }
  GL = { frame, resize };
  root.classList.add('gl-ready');
}
initGL();
