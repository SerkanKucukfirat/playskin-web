/* Playskin · Play Your Skin
   Tek bir WebGL sahnesi bütün sayfa boyunca yaşar. Kaydırma bir zaman çizelgesini sürer;
   her bölüm sahnenin parametrelerini (kamera, ürün, damla, atmosfer) belirler ve bölümler
   arasında bu parametreler yumuşakça karışır. Damla tüm bölümlerde eşlik eder:
   açılışta cam damla, ürün dünyalarında mercek, dokuda serum damlası, formülde lipozom
   çekirdeği, rutinde ışık küresi, LED bölümünde koyu mercek. */

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
const SECS = ['acilis', 'dunyalar', 'doku', 'formul', 'rutin', 'tanis', 'led'];
const S = {};
SECS.forEach((id) => { S[id] = { el: document.getElementById(id), top: 0, h: 0, pin: document.getElementById(id).classList.contains('pin') }; });
let vh = innerHeight, docH = 1;
function measure() {
  vh = innerHeight;
  for (const id of SECS) {
    const s = S[id];
    s.top = s.el.getBoundingClientRect().top + scrollY;
    s.h = s.el.offsetHeight;
  }
  docH = Math.max(1, document.documentElement.scrollHeight - vh);
}
let target = scrollY, sy = scrollY;
const prog = (id, y) => { const s = S[id]; return s.pin ? (y - s.top) / Math.max(1, s.h - vh) : (y - s.top + vh) / (s.h + vh); };
const ENTER = { led: [0.3, 0.1] };
const enter = (id, y) => { const s = S[id]; const e = ENTER[id] || [0.75, 0.12]; return ease(seg(y, s.top - vh * e[0], s.top + vh * e[1])); };

/* Bölümlere bağlı yazılar */
const overlays = $$('.ov').map((el) => ({ el, sec: el.dataset.sec, a: parseFloat(el.dataset.in), b: parseFloat(el.dataset.out), bp: el.dataset.outPhone ? parseFloat(el.dataset.outPhone) : null }));
function updateOverlays(y) {
  for (const o of overlays) {
    const p = prog(o.sec, y);
    const b = isPhone && o.bp !== null ? o.bp : o.b;
    const k = seg(p, o.a - 0.035, o.a + 0.035) * (1 - seg(p, b - 0.035, b + 0.035));
    o.el.style.opacity = k.toFixed(3);
    o.el.style.transform = k > 0.999 ? '' : 'translate3d(0,' + ((1 - k) * 22).toFixed(1) + 'px,0)';
    o.el.style.visibility = k < 0.002 ? 'hidden' : '';
  }
}

/* ------------------------------------------------------------------ */
/* Rutin ve ürün odağı (WebGL'den bağımsız çalışır)                    */
/* ------------------------------------------------------------------ */
const NEEDS = [
  { id: 'nem', label: 'Nem', sub: 'Kuru ve hassas cilt', color: '#6FAEE0', steps: [['Temizle', 1915], ['Tonikle', 1925], ['Serum', 1418], ['Nemlendir', 2745], ['Koru', 1459]] },
  { id: 'denge', label: 'Denge', sub: 'Yağlı ve akneye eğilimli', color: '#2FA796', steps: [['Temizle', 1273], ['Serum', 1429], ['Nemlendir', 2754], ['Koru', 1934]] },
  { id: 'siki', label: 'Sıkılık', sub: 'Yaşlanma belirtileri', color: '#8A97C4', steps: [['Temizle', 1300], ['Serum', 2778], ['Göz', 1540], ['Nemlendir', 2773], ['Koru', 2784]] },
  { id: 'ton', label: 'Eşit ton', sub: 'Leke görünümü', color: '#E88A1A', steps: [['Temizle', 1396], ['Serum', 1444], ['Bakım', 1468], ['Koru', 1459]] },
  { id: 'isilti', label: 'Işıltı', sub: 'Mat ve yorgun görünüm', color: '#F0569B', steps: [['Temizle', 1392], ['Serum', 1441], ['Nemlendir', 1919], ['Koru', 2784]] },
  { id: 'sakin', label: 'Sakinlik', sub: 'İşlem sonrası hassasiyet', color: '#D9957A', steps: [['Temizle', 1392], ['Onar', 2788], ['Nemlendir', 1919], ['Koru', 1934]] }
];
let PRODUCTS = null;
let needColor = '#F0569B';
let shelfIds = [1396, 1444, 2778];
let focusId = 2778;

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
  const box = $('.needs');
  box.replaceChildren(...NEEDS.map((n) => h('button', { type: 'button', class: 'need', 'aria-pressed': 'false', 'data-need': n.id, onclick: () => pickNeed(n.id) }, [h('b', { text: n.label }), h('small', { text: n.sub })])));
  $('.routine').replaceChildren(h('p', { class: 'small muted', text: 'Bir ihtiyaç seç; ürünler ekranın ortasında bir rutin olarak dizilsin.' }));
}

function pickNeed(id) {
  const n = NEEDS.find((x) => x.id === id);
  needColor = n.color;
  $$('.need').forEach((b) => b.setAttribute('aria-pressed', b.dataset.need === id ? 'true' : 'false'));
  const box = $('.routine');
  box.style.setProperty('--need', n.color);
  box.replaceChildren(...n.steps.map(([step, pid], i) => {
    const p = PRODUCTS[pid];
    const card = h('button', { type: 'button', class: 'rcard', style: 'animation-delay:' + (i * 0.09).toFixed(2) + 's', onclick: () => { setFocus(pid); document.getElementById('tanis').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } }, [
      h('span', { class: 'step', text: String(i + 1).padStart(2, '0') + ' · ' + step.toLocaleUpperCase('tr-TR') }),
      h('span', { class: 'ph' }, [h('img', { src: p.img, alt: '', loading: 'lazy' })]),
      h('span', { class: 'nm', text: p.name }),
      h('span', { class: 'more', text: 'Ürünle tanış →' })
    ]);
    return card;
  }));
  shelfIds = n.steps.map((s) => s[1]).filter((v, i, a) => a.indexOf(v) === i);
  setFocus(n.steps.find((s) => s[0] === 'Serum' || s[0] === 'Onar')?.[1] || shelfIds[0], false);
}

function setFocus(pid, anim = true) {
  focusId = pid;
  const p = PRODUCTS[pid];
  const tabs = [];
  if (p.usage && p.usage.length) tabs.push(['Kullanım', () => p.usage.map((t) => h('p', { text: t }))]);
  if (p.ingredients && p.ingredients.length) tabs.push(['İçerik', () => [h('dl', {}, p.ingredients.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]))]]);
  tabs.push(['Detay', () => [p.desc, ...(p.more || [])].filter(Boolean).slice(0, 6).map((t) => h('p', { text: t })).concat(h('p', {}, [h('a', { href: p.link, class: 'link', text: "playskin.com.tr'de gör" })]))]);
  const panel = h('div', { class: 'panel', role: 'tabpanel', id: 'fpanel', tabindex: '0' });
  const tabBtns = tabs.map(([label, fill], i) => h('button', {
    type: 'button', role: 'tab', class: 'tab', id: 'ftab' + i, 'aria-controls': 'fpanel', 'aria-selected': i === 0 ? 'true' : 'false',
    onclick: (e) => { tabBtns.forEach((b) => b.setAttribute('aria-selected', b === e.currentTarget ? 'true' : 'false')); panel.setAttribute('aria-labelledby', e.currentTarget.id); panel.replaceChildren(...fill()); }
  }, [label]));
  panel.setAttribute('aria-labelledby', 'ftab0');
  panel.replaceChildren(...tabs[0][1]());
  const meta = [p.cat, p.skin].filter(Boolean).map((t) => h('span', { text: t.replace(/\.$/, '') }));
  $('.focus').replaceChildren(
    h('div', { class: 'fimg' }, [h('img', { src: p.img, alt: p.name })]),
    h('div', { class: 'ftext' }, [h('h3', { class: 'h2', text: p.name }), h('div', { class: 'fmeta' }, meta), h('p', { class: 'lead', text: p.desc }), h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Ürün bilgisi' }, tabBtns), panel])
  );
  $('.shelf').replaceChildren(...shelfIds.map((id) => h('button', { type: 'button', class: 'thumb', 'aria-label': PRODUCTS[id].name, 'aria-current': id === pid ? 'true' : 'false', onclick: () => setFocus(id) }, [h('img', { src: PRODUCTS[id].img, alt: '' })])));
  if (!anim) $$('.fimg img, .ftext').forEach((el) => { el.style.animation = 'none'; });
}

fetch('assets/lab/products.json').then((r) => r.json()).then((d) => { PRODUCTS = d; renderNeeds(); setFocus(focusId, false); }).catch(() => {
  $('.routine').replaceChildren(h('p', { class: 'small muted', text: 'Ürün bilgileri yüklenemedi. Tüm ürünler için Ürünler sayfasına göz at.' }));
});

/* ------------------------------------------------------------------ */
/* Ana döngü (WebGL hazır olmasa da yazılar ve ilerleme çalışır)      */
/* ------------------------------------------------------------------ */
let mx = 0, my = 0, tmx = 0, tmy = 0;
addEventListener('pointermove', (e) => { tmx = (e.clientX / innerWidth) * 2 - 1; tmy = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
addEventListener('scroll', () => { target = scrollY; }, { passive: true });
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { isPhone = mqPhone.matches; measure(); if (GL) GL.resize(); }, 80); });
addEventListener('load', measure);
measure();

const bar = $('.progress span');
const flashEl = $('.flash');
const ledTint = $('.led-tint');
const ledFace = $('.led-face');
const counterEl = $('.counter-now');
let GL = null;
let last = performance.now();
let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(loop); } });

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  sy = reduce ? target : sy + (target - sy) * (1 - Math.pow(0.0009, dt));
  if (Math.abs(target - sy) < 0.1) sy = target;
  mx += (tmx - mx) * (1 - Math.pow(0.02, dt)); my += (tmy - my) * (1 - Math.pow(0.02, dt));
  updateOverlays(sy);
  bar.style.transform = 'scaleX(' + clamp(sy / docH).toFixed(4) + ')';
  const P = timeline(sy);
  flashEl.style.opacity = P.flash.toFixed(3);
  flashEl.style.transform = 'scale(' + (0.6 + P.flash * 1.4).toFixed(3) + ')';
  const pl = prog('led', sy);
  if (ledFace) ledFace.style.opacity = (seg(pl, -0.02, 0.1) * (1 - seg(pl, 0.98, 1.08))).toFixed(3);
  if (ledTint) ledTint.style.background = P.ledHex;
  const pd = prog('dunyalar', sy), wi = pd < 0.27 ? '01' : pd < 0.67 ? '02' : '03';
  if (counterEl.textContent !== wi) counterEl.textContent = wi;
  if (GL) GL.frame(P, now / 1000, dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ------------------------------------------------------------------ */
/* Zaman çizelgesi                                                     */
/* ------------------------------------------------------------------ */
const hex = (s) => { const n = parseInt(s.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const mixArr = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function blend(A, B, t) {
  if (t <= 0) return A;
  if (t >= 1) return B;
  const o = {};
  for (const k in A) {
    const a = A[k], b = B[k];
    o[k] = Array.isArray(a) ? mixArr(a, b, t) : (typeof a === 'number' ? lerp(a, b, t) : (t < 0.5 ? a : b));
  }
  return o;
}
const toHex = (c) => '#' + c.map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0')).join('');

const C = {
  white: hex('#FFFFFF'), silver: hex('#E3E4E7'),
  pinkTop: hex('#FFF5F9'), pinkBot: hex('#EBDCE3'), pink: hex('#FF6FAE'), pinkP: hex('#FF7DB3'), pinkT: hex('#FFC4DD'),
  orTop: hex('#FFF8EE'), orBot: hex('#F1E0C8'), orange: hex('#FF9A2E'), orP: hex('#FFB458'), orT: hex('#FFD49A'),
  tlTop: hex('#F3F8F9'), tlBot: hex('#D9E3E7'), teal: hex('#3AA6B5'), tlP: hex('#A7D7DF'), tlT: hex('#CFF0F4'),
  skinTop: hex('#FBF7F4'), skinBot: hex('#E8DFD8'), peach: hex('#F2B8A0'), serum: hex('#FFD8A0'),
  water: hex('#CFE6FF'), blue: hex('#A9C7E8'), ink: hex('#1A1A1E')
};
const LEDS = ['#FF3B3B', '#FFB13B', '#3BFF8A', '#3B8BFF'].map(hex);

function base() {
  return {
    cam: [0, 0.15, 10.5], look: [0, 0, 0],
    bx: 0, by: 0, brot: -0.55, d0: 0, d1: 1, d2: 1,
    dropPos: [0, 0.05, 0], dropS: [2.05, 2.05, 2.05], sph: 0.45, dropOn: 1, tint: C.pinkT, thick: 1.6,
    top: C.white, bot: C.silver, acc: C.pink, glow: 0.25, rays: 0, caustic: 0, dark: 0, led: LEDS[0],
    pA: 0.85, pCol: C.pinkP, pSpeed: 1,
    surf: 0, rip: 0, cream: 0, mist: 0,
    lipo: 0, build: 0, cut: 0,
    ring: 0, flash: 0
  };
}

function S1(p) {
  const P = base();
  const a = ease(seg(p, 0, 0.62)), b = seg(p, 0.55, 0.88);
  P.cam = [0, 0.15 * (1 - a), lerp(10.5, 3.5, a) - 0.6 * ease(b)];
  P.brot = lerp(-0.55, 0, ease(seg(p, 0.04, 0.7)));
  P.sph = lerp(0.45, 1, ease(b));
  const s = 2.05 * (1 + b * b * 3.4);
  P.dropS = [s, s, s];
  P.dropOn = 1 - seg(p, 0.85, 0.9);
  P.flash = bell(p, 0.7, 0.84, 0.95) * 0.9;
  P.glow = 0.25 + 0.35 * a;
  P.caustic = 0.15 * b;
  P.top = mixArr(C.white, C.pinkTop, a); P.bot = mixArr(C.silver, C.pinkBot, a);
  return P;
}

function S2(p) {
  const P = base();
  const bx = isPhone ? 0 : 1.15, by = isPhone ? 1.35 : 0;
  P.cam = [0, 0, isPhone ? 8.4 : 6.4]; P.look = [0, isPhone ? 0.35 : 0, 0];
  P.bx = bx; P.by = by;
  P.brot = Math.sin(p * Math.PI * 3) * 0.22;
  P.d0 = seg(p, 0.18, 0.34);
  P.d1 = Math.max(1 - seg(p, 0.22, 0.38), seg(p, 0.58, 0.74));
  P.d2 = 1 - seg(p, 0.62, 0.78);
  const L = p < 0.48 ? seg(p, 0.12, 0.42) : seg(p, 0.52, 0.82);
  const on = seg(L, 0, 0.1) * (1 - seg(L, 0.9, 1));
  const rest = [bx - (isPhone ? 0.9 : 1.35), by - 1.2, 1.1];
  const sweep = [bx + lerp(3.2, -3.2, L), by + 0.15, 1.7];
  P.dropPos = mixArr(rest, sweep, on);
  const s = lerp(0.32, 0.95, on); P.dropS = [s, s, s];
  P.sph = lerp(0.2, 1, on); P.dropOn = 1; P.thick = lerp(0.6, 2.2, on);
  const w1 = ease(seg(p, 0.2, 0.36)), w2 = ease(seg(p, 0.6, 0.76));
  const pick = (a, b, c) => mixArr(mixArr(a, b, w1), c, w2);
  P.top = pick(C.pinkTop, C.orTop, C.tlTop); P.bot = pick(C.pinkBot, C.orBot, C.tlBot);
  P.acc = pick(C.pink, C.orange, C.teal); P.pCol = pick(C.pinkP, C.orP, C.tlP); P.tint = pick(C.pinkT, C.orT, C.tlT);
  P.glow = 0.62; P.rays = lerp(0.1, 1, w1) * (1 - w2) + 0.12 * w2; P.caustic = lerp(0.25, 0.7, w1) * (1 - w2) + 0.4 * w2;
  P.pA = 0.92;
  return P;
}

function S3(p) {
  const P = base();
  const z = ease(seg(p, 0.36, 0.86));
  P.cam = [0, lerp(2.6, 1.6, z), lerp(5.6, 4.1, z)]; P.look = [0, lerp(-1.05, -1.3, z), 0];
  P.bx = 0; P.by = 3.2; P.d0 = 1; P.d1 = 1; P.d2 = 1;
  const f = seg(p, 0.08, 0.36), i = seg(p, 0.36, 0.4);
  const y = lerp(0.95, -1.5 + 0.15, f * f);
  P.dropPos = [0, y, 0];
  const s = 0.3;
  P.dropS = [s * (1 + 0.9 * i), s * (1 + 0.25 * f) * (1 - 0.8 * i), s * (1 + 0.9 * i)];
  P.sph = 0.12; P.thick = 0.5;
  P.dropOn = seg(p, 0.01, 0.07) * (1 - i);
  P.tint = C.serum;
  P.surf = seg(p, 0, 0.1); P.rip = seg(p, 0.36, 0.64); P.cream = easeOut(seg(p, 0.44, 0.8)) * 0.62; P.mist = seg(p, 0.72, 1);
  P.top = C.skinTop; P.bot = C.skinBot; P.acc = C.peach; P.glow = 0.3; P.pA = 0.25; P.pCol = hex('#F4C9B5');
  return P;
}

function S4(p) {
  const P = base();
  const orbit = p * 0.9;
  P.cam = [Math.sin(orbit) * 1.2, 0.35 * Math.cos(orbit * 1.3), 6.8 - 0.6 * ease(seg(p, 0.2, 0.7))];
  P.look = [isPhone ? 0 : 0.3, isPhone ? -0.5 : 0, 0];
  P.by = 3.2; P.d0 = 1; P.d1 = 1; P.d2 = 1;
  const g = ease(seg(p, 0, 0.16));
  const s = lerp(0.3, 1.02, g);
  P.dropPos = [0, isPhone ? 0.4 : 0, 0]; P.dropS = [s, s, s]; P.sph = 1; P.thick = 1.4; P.tint = C.water; P.dropOn = 1;
  P.lipo = seg(p, 0.04, 0.14); P.build = seg(p, 0.06, 0.32); P.cut = ease(seg(p, 0.16, 0.44));
  P.top = C.white; P.bot = hex('#E1E4E9'); P.acc = C.blue; P.glow = 0.35; P.pA = 0.12; P.pCol = hex('#B9D3EE');
  return P;
}

function S5() {
  const P = base();
  const nc = hex(needColor);
  P.cam = [0, 0, 7.5]; P.by = 3.2; P.d0 = 1; P.d1 = 1; P.d2 = 1;
  P.dropPos = [0, isPhone ? 1.2 : 0.4, -1.8]; P.dropS = [1.25, 1.25, 1.25]; P.sph = 1; P.tint = mixArr(nc, C.white, 0.55);
  P.top = C.white; P.bot = hex('#E8E8EA'); P.acc = nc; P.glow = 0.45; P.pA = 0.3; P.pCol = mixArr(nc, C.white, 0.3); P.pSpeed = 0.6;
  return P;
}

function S6() {
  const P = S5();
  P.dropPos = [isPhone ? 0 : -2.3, isPhone ? 1.6 : 0.1, -1.2]; P.dropS = [1.55, 1.55, 1.55];
  P.glow = 0.22; P.pA = 0.14; P.pSpeed = 0.18;
  return P;
}

function S7(p) {
  const P = base();
  P.cam = [0, 0, 7]; P.by = 3.2; P.d0 = 1; P.d1 = 1; P.d2 = 1;
  const k = clamp(p * 4.4 - 0.35, 0, 3);
  const i = Math.floor(k), f = ease(clamp((k - i - 0.7) / 0.3));
  const led = mixArr(LEDS[i], LEDS[Math.min(3, i + 1)], f);
  P.led = led; P.dark = 1; P.ring = seg(p, 0.02, 0.1);
  P.dropPos = [isPhone ? 0 : -0.15, isPhone ? -0.55 : -0.35, 0]; P.dropS = isPhone ? [0.8, 0.8, 0.8] : [0.95, 0.95, 0.95]; P.sph = 1; P.tint = mixArr(led, C.ink, 0.6); P.thick = 2.4;
  P.top = hex('#0B0B0D'); P.bot = hex('#050506'); P.acc = led; P.glow = 0.75; P.pA = 0.5; P.pCol = led; P.pSpeed = 0.5;
  return P;
}

function timeline(y) {
  let P = S1(clamp(prog('acilis', y)));
  P = blend(P, S2(clamp(prog('dunyalar', y))), enter('dunyalar', y));
  P = blend(P, S3(clamp(prog('doku', y))), enter('doku', y));
  P = blend(P, S4(clamp(prog('formul', y))), enter('formul', y));
  P = blend(P, S5(), enter('rutin', y));
  P = blend(P, S6(), enter('tanis', y));
  P = blend(P, S7(clamp(prog('led', y))), enter('led', y));
  P.ledHex = toHex(P.led);
  return P;
}

/* ------------------------------------------------------------------ */
/* WebGL                                                               */
/* ------------------------------------------------------------------ */
const NOISE = /* glsl */`
float hash2(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash2(i), hash2(i + vec2(1., 0.)), u.x), mix(hash2(i + vec2(0., 1.)), hash2(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
`;

async function initGL() {
  let THREE, RoomEnvironment;
  try {
    THREE = await import('three');
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
  } catch (e) { root.classList.add('no-gl'); return; }

  const canvas = $('#gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isPhone, powerPreference: 'high-performance' });
  } catch (e) { root.classList.add('no-gl'); return; }
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

  /* Arka plan: optik beyaz, gümüş ufuk, ürün rengi ışık, ışık huzmeleri, kostik, karanlık */
  const bgU = {
    uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uAcc: { value: new THREE.Color() },
    uGlow: { value: 0 }, uRays: { value: 0 }, uCaustic: { value: 0 }, uDark: { value: 0 }, uTime: { value: 0 }
  };
  const bg = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 32), new THREE.ShaderMaterial({
    uniforms: bgU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uTop, uBot, uAcc; uniform float uGlow, uRays, uCaustic, uDark, uTime; varying vec3 vDir;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        float t = smoothstep(-0.55, 0.75, d.y);
        vec3 c = mix(uBot, uTop, t);
        c += vec3(0.07) * exp(-pow((d.y + 0.08) * 7., 2.)) * (1. - uDark);
        vec3 fc = normalize(vec3(0.12, 0.08, -1.));
        float dist = distance(d, fc);
        float g = exp(-dist * dist * 5.) * uGlow;
        c = mix(c, uAcc, g * 0.55) + uAcc * g * 0.12;
        vec2 q = d.xy - vec2(0.55, 0.65);
        float ang = atan(q.y, q.x);
        float rays = pow(max(0., sin(ang * 13. + uTime * 0.12) * 0.5 + 0.5), 6.) * exp(-length(q) * 1.6);
        c += uAcc * rays * uRays * 0.35 + vec3(1.) * rays * uRays * 0.12;
        float cs = fbm(d.xy * 7. + vec2(uTime * 0.05, -uTime * 0.04));
        float cl = pow(1. - abs(sin(cs * 9.)), 8.);
        c += uAcc * cl * uCaustic * 0.18 * smoothstep(1.2, 0.2, dist);
        c *= 1. - 0.18 * uDark * smoothstep(0.2, 1.4, dist);
        c += (hash2(gl_FragCoord.xy) - 0.5) / 255.;
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`
  }));
  bg.renderOrder = -10;
  scene.add(bg);

  /* Ürünler: ambalaj fotoğrafı silindire sarılır; döndükçe etiket kıvrılarak kameraya gelir */
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const bottleGroup = new THREE.Group();
  scene.add(bottleGroup);
  function makeBottle(url, aspect, height, edgeHex) {
    const tex = loader.load(url, () => { tex.needsUpdate = true; });
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    const r = (height * aspect) / 2, m = 0.4;
    const geo = new THREE.CylinderGeometry(r, r, height, 128, 1, true, -(Math.PI / 2 + m), Math.PI + 2 * m);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const th = clamp(Math.atan2(pos.getX(i), pos.getZ(i)), -Math.PI / 2, Math.PI / 2);
      uv.setX(i, clamp(0.5 + 0.5 * Math.sin(th), 0.012, 0.988));
    }
    const u = { uDis: { value: 0 }, uEdge: { value: new THREE.Color(edgeHex) } };
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, toneMapped: false });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDis = u.uDis; sh.uniforms.uEdge = u.uEdge;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uDis; uniform vec3 uEdge;\n' + NOISE)
        .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
          float nD = fbm(vMapUv * vec2(5., 15.));
          float kD = uDis * 1.25 - 0.12;
          if (nD < kD) discard;
          float eD = (1. - smoothstep(kD, kD + 0.045, nD)) * step(0.001, uDis);
          diffuseColor.rgb = mix(diffuseColor.rgb, uEdge * 1.4 + 0.25, eD);`);
    };
    const mesh = new THREE.Mesh(geo, mat);
    const sheenU = { map: { value: tex }, uBand: { value: 0.5 }, uK: { value: 1 } };
    const sheen = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: sheenU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D map; uniform float uBand, uK; varying vec3 vN; varying vec2 vUv;
        void main(){ float a = texture2D(map, vUv).a; if (a < 0.5) discard;
          float b = exp(-pow((vN.x - uBand) * 6.5, 2.)) * 0.32 + exp(-pow((vN.x + 0.62) * 11., 2.)) * 0.14;
          float rim = pow(1. - abs(vN.z), 3.) * 0.18;
          gl_FragColor = vec4(vec3(b + rim) * uK, 1.); }`
    }));
    sheen.renderOrder = 2;
    const g = new THREE.Group(); g.add(mesh, sheen);
    bottleGroup.add(g);
    return { g, u, sheenU };
  }
  const bottles = [
    makeBottle('assets/lab/pink-mist.webp', 504 / 2048, 3.2, '#FF8CC0'),
    makeBottle('assets/lab/vitamin-c.webp', 636 / 1548, 2.5, '#FFB04A'),
    makeBottle('assets/lab/nad-serum.webp', 635 / 1456, 2.45, '#7FD3DE')
  ];

  /* İmza damla: damla ⇄ küre biçim geçişli, gerçek kırılma yapan cam */
  const N = 72, dropPts = [], spherePts = [];
  for (let i = 0; i <= N; i++) {
    const t = Math.PI - (i / N) * Math.PI;
    dropPts.push(new THREE.Vector2(Math.max(1e-4, Math.sin(t) * Math.pow(Math.sin(t / 2), 1.15) * 1.22), Math.cos(t) * 1.12 + 0.12));
    spherePts.push(new THREE.Vector2(Math.max(1e-4, Math.sin(t)), Math.cos(t)));
  }
  const dropGeo = new THREE.LatheGeometry(dropPts, 112);
  const sphGeo = new THREE.LatheGeometry(spherePts, 112);
  dropGeo.morphAttributes.position = [sphGeo.attributes.position];
  dropGeo.morphAttributes.normal = [sphGeo.attributes.normal];
  const dropMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 1.6, ior: 1.34,
    envMapIntensity: 1.35, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1,
    attenuationColor: new THREE.Color('#FFC4DD'), attenuationDistance: 3.2, iridescence: 0.22, iridescenceIOR: 1.3
  });
  const drop = new THREE.Mesh(dropGeo, dropMat);
  drop.morphTargetInfluences = [0];
  scene.add(drop);

  /* LED halkası */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.022, 16, 240), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.006, 8, 240), ring.material);
  ring.add(ring2);
  scene.add(ring);

  /* Zerrecikler: kameraya bağlı; kaydırdıkça içlerinden geçilir */
  const PN = isPhone ? 520 : 1500;
  const pPos = new Float32Array(PN * 3), pRnd = new Float32Array(PN);
  for (let i = 0; i < PN; i++) { pPos[i * 3] = (Math.random() * 2 - 1) * 7.5; pPos[i * 3 + 1] = (Math.random() * 2 - 1) * 4.8; pPos[i * 3 + 2] = Math.random(); pRnd[i] = Math.random(); }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aRnd', new THREE.BufferAttribute(pRnd, 1));
  const pU = { uTime: { value: 0 }, uFly: { value: 0 }, uCol: { value: new THREE.Color() }, uA: { value: 1 }, uPR: { value: 1 }, uH: { value: 800 } };
  const parts = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    uniforms: pU, transparent: true, depthWrite: false,
    vertexShader: `attribute float aRnd; uniform float uTime, uFly, uPR, uH; varying float vA; varying float vR;
      void main(){
        vec3 p = position;
        float z = fract(p.z + uFly * (0.6 + aRnd * 0.8) + uTime * 0.006 * (0.5 + aRnd));
        p.z = -1.2 - z * 15.;
        p.x += sin(uTime * 0.25 + aRnd * 40.) * 0.18; p.y += cos(uTime * 0.2 + aRnd * 30.) * 0.14 + sin(uTime * .05 + aRnd * 9.) * .3;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float size = (0.018 + pow(aRnd, 3.) * 0.07);
        gl_PointSize = size * uH * uPR / -mv.z;
        vA = smoothstep(16.2, 11., -mv.z) * smoothstep(1.2, 2.6, -mv.z);
        vR = aRnd;
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vA; varying float vR;
      void main(){
        vec2 c = gl_PointCoord - .5; float r = length(c) * 2.; if (r > 1.) discard;
        float body = smoothstep(1., .82, r);
        float rim = smoothstep(.55, .95, r) * body;
        float hl = exp(-dot(c - vec2(-.16, -.18), c - vec2(-.16, -.18)) * 90.);
        vec3 col = uCol * (.55 + .6 * rim) + vec3(1.) * hl * 1.2;
        float a = body * (.18 + .55 * rim + hl) * vA * uA;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`
  }));
  parts.frustumCulled = false;
  camera.add(parts);

  /* Doku yüzeyi: cilt makrosu, damla dalgası, yayılan krem */
  const surfU = { uBg: { value: new THREE.Color() }, uRip: { value: 0 }, uCream: { value: 0 }, uVis: { value: 0 }, uTime: { value: 0 } };
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(18, 18, 1, 1), new THREE.ShaderMaterial({
    uniforms: surfU,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uBg; uniform float uRip, uCream, uVis, uTime; varying vec2 vP;
      ${NOISE}
      float creamMask(vec2 p){
        float r = length(p), a = atan(p.y, p.x);
        float e = uCream * 2.3 * (0.82 + 0.3 * fbm(vec2(a * 1.6, uCream * 2.) + 3.));
        return smoothstep(e, e - 0.14, r) * step(0.001, uCream);
      }
      float H(vec2 p){
        float pores = smoothstep(0.72, 0.95, vnoise(p * 34.));
        float lines = fbm(vec2(p.x * 4. + p.y * 2., p.y * 18.)) * 0.0035;
        float h = fbm(p * 16.) * 0.012 - pores * 0.008 + lines;
        float r = length(p), R = uRip * 3.4;
        h += sin((r - R) * 24.) * exp(-pow((r - R) * 2.6, 2.)) * (1. - uRip) * 0.03 * step(0.001, uRip);
        float m = creamMask(p);
        float a = atan(p.y, p.x);
        h += m * (0.05 + fbm(p * 2.6 + a) * 0.03 + sin(r * 13. - a * 3. + fbm(p * 1.8) * 7.) * 0.009);
        return h;
      }
      void main(){
        vec2 p = vP; float e = 0.008;
        vec3 n = normalize(vec3(H(p - vec2(e, 0.)) - H(p + vec2(e, 0.)), H(p - vec2(0., e)) - H(p + vec2(0., e)), 2. * e));
        vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
        float dif = clamp(dot(n, L), 0., 1.);
        float spec = pow(clamp(dot(reflect(-L, n), vec3(0., 0., 1.)), 0., 1.), 40.);
        vec3 skin = mix(vec3(0.86, 0.68, 0.58), vec3(0.93, 0.79, 0.70), fbm(p * 3.));
        float m = creamMask(p);
        vec3 cream = vec3(0.98, 0.95, 0.93);
        vec3 base = mix(skin, cream, m);
        vec3 c = base * (0.55 + 0.55 * dif) + spec * mix(0.15, 0.6, m);
        float f = smoothstep(8., 2.8, length(p)) * uVis;
        gl_FragColor = vec4(mix(uBg, c, f), 1.);
        #include <colorspace_fragment>
      }`
  }));
  surface.rotation.x = -Math.PI / 2; surface.position.y = -1.5;
  scene.add(surface);

  /* İnce mist bulutu */
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
      void main(){
        float t = uMist;
        vec3 p = vec3(position.x * t * 2.2, position.y * t * 0.75 - 1.35 + sin(uTime * .4 + aRnd * 20.) * .05 * t, position.z * t * 2.2);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.08 + aRnd * 0.3) * (0.5 + t) * uH * uPR / -mv.z;
        vA = smoothstep(0., .15, t) * (1. - smoothstep(.75, 1., t) * .6);
      }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float r = length(c) * 2.; if (r > 1.) discard;
      gl_FragColor = vec4(vec3(0.92, 0.74, 0.80), (1. - r) * (1. - r) * .85 * vA);
      #include <colorspace_fragment>
    }`
  }));
  burst.frustumCulled = false;
  scene.add(burst);

  /* Lipozom: fosfolipit çift katman, su çekirdeği, aktifler, kesit */
  const lipo = new THREE.Group();
  scene.add(lipo);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 3);
  const R = 1.6;
  const fib = (n, r) => { const out = []; const g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2; const rr = Math.sqrt(1 - y * y); const th = g * i; out.push(new THREE.Vector3(Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r)); } return out; };
  const outerN = isPhone ? 520 : 1150, innerN = isPhone ? 380 : 820;
  const heads = [...fib(outerN, R), ...fib(innerN, R - 0.44)];
  const headMat = new THREE.MeshPhysicalMaterial({ color: 0xF3F1F4, metalness: 0.25, roughness: 0.22, clearcoat: 1, clippingPlanes: [clipPlane], clipShadows: true });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xC7CBD4, metalness: 0.4, roughness: 0.4, clippingPlanes: [clipPlane] });
  const buildU = { value: 0 };
  const addBuild = (mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uBuild = buildU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uBuild; attribute float aDelay;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat kB = smoothstep(aDelay, aDelay + 0.25, uBuild);\ntransformed *= kB;');
    };
  };
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
    const dir = v.clone().normalize().multiplyScalar(outer ? 1 : -1);
    q.setFromUnitVectors(up, dir);
    for (let k = 0; k < 2; k++) {
      const off = new THREE.Vector3((k ? 1 : -1) * 0.02, 0, 0).applyQuaternion(q);
      m4.compose(v.clone().add(off), q, one); tailIM.setMatrixAt(i * 2 + k, m4); tDelays[i * 2 + k] = d + 0.05;
    }
  });
  headGeo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1));
  tailGeo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(tDelays, 1));
  lipo.add(headIM, tailIM);
  const mkActives = (n, rMin, rMax, color, size) => {
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(lerp(rMin, rMax, Math.cbrt(Math.random()))); a.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const u = { uCol: { value: new THREE.Color(color) }, uA: { value: 0 }, uPR: { value: 1 }, uH: { value: 800 }, uS: { value: size }, uTime: { value: 0 } };
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uPR, uH, uS, uTime; void main(){ vec3 p = position * (1. + sin(uTime + position.x * 9.) * .015); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uS * uH * uPR / -mv.z; }`,
      fragmentShader: `uniform vec3 uCol; uniform float uA; void main(){ vec2 c = gl_PointCoord - .5; float r = length(c) * 2.; if (r > 1.) discard; gl_FragColor = vec4(uCol * (1. - r * .6), (1. - r) * uA);
      #include <colorspace_fragment>
    }`
    }));
    lipo.add(pts);
    return u;
  };
  const actIn = mkActives(isPhone ? 90 : 180, 0.1, 0.92, '#5FB6FF', 0.06);
  const actMid = mkActives(isPhone ? 120 : 260, R - 0.36, R - 0.1, '#FFA94D', 0.045);
  const anchors = [new THREE.Vector3(-R * 0.72, R * 0.66, 0.25), new THREE.Vector3(-0.15, -0.25, 0.2), new THREE.Vector3(R * 0.62, -R * 0.62, 0.3), new THREE.Vector3(R * 0.98, 0.2, 0)];

  /* Kesit etiketleri */
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
      const ax = (tmpV.x * 0.5 + 0.5) * w, ay = (-tmpV.y * 0.5 + 0.5) * hgt;
      const lx = clamp(ax + OFFS[i][0], 16, w - 250), ly = clamp(ay + OFFS[i][1], 90, hgt - 120);
      el.style.left = lx + 'px'; el.style.top = ly + 'px';
      const ex = OFFS[i][0] < 0 ? lx + 230 : lx, ey = ly + 22;
      const op = el.style.opacity || '0';
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
    for (const u of [pU, bU, actIn, actMid]) { u.uPR.value = pr; u.uH.value = innerHeight; }
  }
  resize();

  const tc = new THREE.Color();
  function frame(P, t, dt) {
    const idle = reduce ? 0 : 1;
    camera.position.set(P.cam[0] + mx * 0.18 * idle, P.cam[1] - my * 0.1 * idle, P.cam[2]);
    camera.lookAt(P.look[0], P.look[1], P.look[2]);

    col(P.top, bgU.uTop.value); col(P.bot, bgU.uBot.value); col(P.acc, bgU.uAcc.value);
    bgU.uGlow.value = P.glow; bgU.uRays.value = P.rays; bgU.uCaustic.value = P.caustic; bgU.uDark.value = P.dark; bgU.uTime.value = t;

    bottleGroup.position.set(P.bx, P.by + Math.sin(t * 0.8) * 0.04 * idle, 0);
    bottleGroup.rotation.y = P.brot + Math.sin(t * 0.5) * 0.03 * idle;
    const band = 0.45 - P.brot * 0.9;
    [P.d0, P.d1, P.d2].forEach((d, i) => {
      const b = bottles[i];
      b.u.uDis.value = d; b.g.visible = d < 0.995 && P.by < 3.1;
      b.sheenU.uBand.value = band; b.sheenU.uK.value = 1 - d;
    });

    const on = P.dropOn;
    drop.visible = on > 0.01;
    drop.position.set(P.dropPos[0], P.dropPos[1] + Math.sin(t * 0.9) * 0.03 * idle * (P.surf > 0.5 ? 0 : 1), P.dropPos[2]);
    drop.scale.set(P.dropS[0] * on, P.dropS[1] * on, P.dropS[2] * on);
    drop.rotation.y = t * 0.15 * idle;
    drop.morphTargetInfluences[0] = P.sph;
    col(P.tint, dropMat.attenuationColor);
    dropMat.thickness = P.thick;

    ring.visible = P.ring > 0.01;
    if (ring.visible) {
      ring.position.copy(drop.position); ring.scale.setScalar(0.85 + 0.15 * P.ring);
      ring.rotation.set(Math.sin(t * 0.3) * 0.25, t * 0.2, 0);
      col(P.led, ring.material.color); ring.material.opacity = P.ring;
    }

    col(P.pCol, pU.uCol.value); pU.uA.value = P.pA; pU.uTime.value = t;
    pU.uFly.value = sy * 0.00022 * P.pSpeed;

    surface.visible = P.surf > 0.002;
    if (surface.visible) { col(P.bot, surfU.uBg.value); surfU.uVis.value = P.surf; surfU.uRip.value = P.rip; surfU.uCream.value = P.cream; surfU.uTime.value = t; }
    burst.visible = P.mist > 0.002 && P.surf > 0.2; bU.uMist.value = P.mist; bU.uTime.value = t;

    lipo.visible = P.lipo > 0.01;
    if (lipo.visible) {
      lipo.position.copy(drop.position);
      lipo.scale.setScalar(lerp(0.001, isPhone ? 0.72 : 1, ease(P.lipo)));
      lipo.rotation.set(0.25, t * 0.06 * idle + sy * 0.0004, 0.1);
      buildU.value = P.build * 1.3;
      clipPlane.constant = lerp(2.4, -0.1, P.cut) + lipo.position.z * 0;
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
