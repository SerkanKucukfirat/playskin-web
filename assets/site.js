/* Playskin web sitesi: imleç, mıknatıslı butonlar, kaydırma efektleri, menü, formlar, filtreler ve ana sayfadaki WebGL sahnesi. */
(function () {
  'use strict';

  var doc = document;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var q = function (s) { return doc.querySelector(s); };
  var qa = function (s) { return Array.prototype.slice.call(doc.querySelectorAll(s)); };
  var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };

  /* ---------- Menü ---------- */
  var menu = q('[data-menu]');
  var menuButtons = qa('[data-act="menu-toggle"]');
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    menuButtons.forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    doc.documentElement.style.overflow = open ? 'hidden' : '';
  }
  menuButtons.forEach(function (b) { b.addEventListener('click', function () { setMenu(menu && menu.hidden); }); });
  qa('[data-act="menu-close"]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false); });

  /* ---------- Formlar (bülten ve iletişim) ---------- */
  qa('form[data-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = f.closest('[data-formbox]');
      if (!box) return;
      var a = box.querySelector('[data-if="form"]');
      var b = box.querySelector('[data-if="done"]');
      if (a) a.hidden = true;
      if (b) b.hidden = false;
    });
  });

  /* ---------- Ürün filtresi ---------- */
  var chips = qa('[data-cat]');
  if (chips.length) {
    var cards = qa('[data-series]');
    var count = q('[data-count]');
    var pick = function (cat) {
      var n = 0;
      chips.forEach(function (c) {
        var on = c.getAttribute('data-cat') === cat;
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
        c.style.background = on ? '#1E1E22' : 'transparent';
        c.style.color = on ? '#ECEAE7' : '#1E1E22';
        c.style.borderColor = on ? '#1E1E22' : 'rgba(30,30,34,.25)';
      });
      cards.forEach(function (card) {
        var show = cat === 'Tümü' || card.getAttribute('data-series') === cat;
        card.hidden = !show;
        if (show) {
          card.style.animationDelay = (n * 0.04).toFixed(2) + 's';
          card.classList.remove('gi'); void card.offsetWidth; card.classList.add('gi');
          n++;
        }
      });
      if (count) count.textContent = n + ' ÜRÜN';
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { pick(c.getAttribute('data-cat')); }); });
  }

  /* ---------- Bileşen seçici (ürün detay) ---------- */
  var ings = qa('[data-ing]');
  if (ings.length) {
    var selNo = q('[data-sel="no"]'), selName = q('[data-sel="name"]'), selText = q('[data-sel="text"]'), selBox = q('[data-sel="box"]');
    var choose = function (i) {
      ings.forEach(function (b, j) {
        var on = j === i;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.style.background = on ? '#FF6A4D' : '#1C1C20';
        b.style.color = on ? '#1E1E22' : '#ECEAE7';
        b.style.borderColor = on ? '#FF6A4D' : 'rgba(236,234,231,.35)';
      });
      var b = ings[i];
      if (selNo) selNo.textContent = '0' + (i + 1) + ' / 0' + ings.length;
      if (selName) selName.textContent = b.getAttribute('data-name');
      if (selText) selText.textContent = b.getAttribute('data-text');
      if (selBox) { selBox.classList.remove('swap'); void selBox.offsetWidth; selBox.classList.add('swap'); }
    };
    ings.forEach(function (b, i) { b.addEventListener('click', function () { choose(i); }); });
  }

  /* ---------- İmleç, mıknatıs, eğim ---------- */
  var cur = { x: -100, y: -100, tx: -100, ty: -100, s: 1, ts: 1 };
  var ring = q('.ps2-cur'), dot = q('.ps2-dot');
  var mouse = { x: 0.2, y: -0.3, tx: 0.2, ty: -0.3, press: 0, pt: 0 };
  var vp = { x: 0, y: 0, tx: 0, ty: 0 };
  var hero = q('.ps2-hero');
  var par = q('[data-par]');
  var prev = q('.prev'), prevImg = q('.prev-img'), pv = { x: -400, y: -400 };
  var lastMag = null, lastTilt = null;

  window.addEventListener('pointermove', function (e) {
    cur.tx = e.clientX; cur.ty = e.clientY;
    vp.tx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
    vp.ty = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
    var t = e.target && e.target.closest ? e.target : null;
    cur.ts = t && t.closest('a,button,input,textarea,label') ? 2.4 : 1;
    if (hero) {
      var hr = hero.getBoundingClientRect();
      if (hr.width > 0 && hr.height > 0) {
        mouse.tx = ((e.clientX - hr.left) / hr.width) * 2 - 1;
        mouse.ty = -(((e.clientY - hr.top) / hr.height) * 2 - 1);
      }
    }
    var mag = t ? t.closest('.ps2-mag') : null;
    if (lastMag && lastMag !== mag) { lastMag.style.setProperty('--mx', '0'); lastMag.style.setProperty('--my', '0'); }
    if (mag) {
      var r = mag.getBoundingClientRect();
      mag.style.setProperty('--mx', ((e.clientX - (r.left + r.width / 2)) * 0.3).toFixed(1));
      mag.style.setProperty('--my', ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1));
    }
    lastMag = mag;
    var tl = t ? t.closest('.ps2-tilt') : null;
    if (lastTilt && lastTilt !== tl) { lastTilt.style.setProperty('--rx', '0'); lastTilt.style.setProperty('--ry', '0'); }
    if (tl) {
      var rt = tl.getBoundingClientRect();
      var px = (e.clientX - rt.left) / rt.width, py = (e.clientY - rt.top) / rt.height;
      tl.style.setProperty('--ry', ((px - 0.5) * 13).toFixed(2));
      tl.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2));
      tl.style.setProperty('--sx', (px * 100).toFixed(1));
      tl.style.setProperty('--sy', (py * 100).toFixed(1));
    }
    lastTilt = tl;
    var row = t ? t.closest('.ps2-row') : null;
    if (row) row.style.setProperty('--bx', (e.clientX - row.getBoundingClientRect().left).toFixed(0));
    if (prev) {
      var post = t ? t.closest('.post') : null;
      if (post) {
        var src = post.getAttribute('data-img');
        if (prevImg && src && prevImg.getAttribute('src') !== src) prevImg.setAttribute('src', src);
        prev.classList.add('on');
      } else {
        prev.classList.remove('on');
      }
    }
  }, { passive: true });
  window.addEventListener('pointerdown', function () { mouse.pt = 1; }, { passive: true });
  window.addEventListener('pointerup', function () { mouse.pt = 0; }, { passive: true });

  /* ---------- Kaydırmaya bağlı efektler ---------- */
  var sps = qa('[data-sp]');
  var st = q('.ps2-statement'), gal = q('.ps2-gallery'), track = q('.ps2-track'), lipo = q('.ps2-lipo'), heroIn = q('.ps2-hero-in');
  function prog(el, inner, vh) {
    var r = el.getBoundingClientRect();
    var range = r.height - Math.min(vh, inner);
    return range > 0 ? clamp01(-r.top / range) : 0;
  }

  /* ---------- WebGL (ana sayfa) ---------- */
  var gl = null, cv = null, U = null, t0 = 0, glVisible = true, drawn = false, hp = 0;
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uScroll; uniform float uPress; uniform vec2 uCenter; uniform float uScale;',
    'float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'vec3 bpos(float i,float t){float a=t*(0.22+0.04*i)+i*2.1;return vec3(cos(a)*(0.95+0.3*sin(t*0.27+i)),sin(a*1.31+i)*0.72,sin(a*0.83)*0.65);}',
    'float cluster(vec3 q){float t=uTime;float d=length(q-bpos(0.0,t))-0.72;d=smin(d,length(q-bpos(1.0,t))-0.52,0.6);d=smin(d,length(q-bpos(2.0,t))-0.44,0.6);d=smin(d,length(q-bpos(3.0,t))-0.34,0.55);d=smin(d,length(q-bpos(4.0,t))-0.27,0.5);float s=length(q-vec3(1.95*cos(t*0.4),1.15*sin(t*0.31),0.4*sin(t*0.5)))-0.17;s=min(s,length(q-vec3(-1.75*sin(t*0.33+1.0),-1.05*cos(t*0.27),0.5*cos(t*0.45)))-0.12);return smin(d,s,0.28);}',
    'float map(vec3 p){vec3 q=(p-vec3(uCenter,0.0))/uScale;q.xz=rot(uScroll*2.4+uTime*0.05)*q.xz;q.xy=rot(uScroll*0.9)*q.xy;float d=cluster(q)*uScale;float mk=(4.1+uScroll*1.4)/1.7*0.5;vec3 m=vec3(uMouse.x*(uRes.x/uRes.y)*mk,uMouse.y*mk,0.9);d=smin(d,length(p-m)-(0.24+0.08*uPress),0.6);return d;}',
    'vec3 calcN(vec3 p){vec2 e=vec2(0.0015,-0.0015);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}',
    'float calcAO(vec3 p,vec3 n){float o=0.0,s=1.0;for(int i=1;i<=4;i++){float h=0.06*float(i);o+=(h-map(p+n*h))*s;s*=0.6;}return clamp(1.0-2.0*o,0.0,1.0);}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;',
    ' vec3 ro=vec3(0.0,0.0,5.0+uScroll*1.4); vec3 rd=normalize(vec3(uv,-1.7));',
    ' float t=0.0; float md=10.0; bool hit=false;',
    ' for(int i=0;i<84;i++){vec3 p=ro+rd*t; float d=map(p); md=min(md,d); if(d<0.0015){hit=true;break;} t+=d*0.9; if(t>10.0)break;}',
    ' if(hit){',
    '  vec3 p=ro+rd*t; vec3 n=calcN(p); vec3 v=-rd;',
    '  float ndv=max(dot(n,v),0.0); float fr=pow(1.0-ndv,4.0);',
    '  vec3 l1=normalize(vec3(-0.5,0.85,0.6)); vec3 rf=reflect(rd,n);',
    '  vec3 env=mix(vec3(0.22,0.22,0.24),vec3(0.93,0.93,0.94),smoothstep(-0.5,0.35,rf.y));',
    '  env=mix(env,vec3(1.0),smoothstep(0.55,0.92,rf.y));',
    '  env+=vec3(1.0)*smoothstep(0.8,0.97,rf.x)*0.7;',
    '  env-=vec3(0.28)*(1.0-smoothstep(0.0,0.14,abs(rf.y+0.04)));',
    '  float dif=max(dot(n,l1),0.0);',
    '  vec3 film=0.5+0.5*cos(6.28318*(vec3(0.0,0.33,0.67)+fr*1.3+dot(n,vec3(0.25,0.55,0.2))+uTime*0.03));',
    '  vec3 col=env*0.86+vec3(0.74,0.74,0.76)*dif*0.14;',
    '  col=mix(col,film,0.06+fr*0.14);',
    '  col+=vec3(1.0)*pow(max(dot(n,normalize(l1+v)),0.0),120.0)*1.4;',
    '  col*=mix(0.82,1.0,calcAO(p,n));',
    '  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);',
    ' } else { float g=0.2*exp(-md*7.0); gl_FragColor=vec4(vec3(g),g); }',
    '}'
  ].join('\n');

  function initGL() {
    cv = q('.ps2-gl');
    if (!cv) return;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    if (!gl) return;
    var mk = function (type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[playskin] shader', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    var v = mk(gl.VERTEX_SHADER, 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}');
    var f = mk(gl.FRAGMENT_SHADER, FRAG);
    if (!v || !f) { gl = null; return; }
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn('[playskin] link', gl.getProgramInfoLog(pr)); gl = null; return; }
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    U = {};
    ['uRes', 'uTime', 'uMouse', 'uScroll', 'uPress', 'uCenter', 'uScale'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    var resize = function () {
      var r = cv.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.85;
      var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h); drawn = false;
    };
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { glVisible = es[es.length - 1].isIntersecting; }).observe(cv);
    t0 = performance.now();
    cv.style.opacity = '1';
  }
  function draw(now) {
    var wide = cv.width / cv.height > 1.15;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform1f(U.uTime, reduce ? 6 : (now - t0) / 1000 + 6);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform1f(U.uScroll, hp);
    gl.uniform1f(U.uPress, mouse.press);
    gl.uniform2f(U.uCenter, wide ? 0.25 : 0.0, wide ? -0.62 : -0.85);
    gl.uniform1f(U.uScale, wide ? 0.5 : 0.42);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  initGL();

  /* ---------- Ana döngü ---------- */
  function frame(now) {
    var vh = window.innerHeight || 800;
    mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06; mouse.press += (mouse.pt - mouse.press) * 0.1;
    vp.x += (vp.tx - vp.x) * 0.06; vp.y += (vp.ty - vp.y) * 0.06;
    if (hero) {
      var hr = hero.getBoundingClientRect();
      hp = clamp01(-hr.top / Math.max(1, hr.height));
      hero.style.setProperty('--cx', mouse.x.toFixed(3));
      hero.style.setProperty('--cy', mouse.y.toFixed(3));
      if (heroIn) heroIn.style.setProperty('--hp', hp.toFixed(3));
    }
    if (par && par !== hero) { par.style.setProperty('--cx', vp.x.toFixed(3)); par.style.setProperty('--cy', vp.y.toFixed(3)); }
    if (st) st.style.setProperty('--p', prog(st, 760, vh).toFixed(3));
    if (gal && track) {
      var dist = Math.max(0, track.scrollWidth - (track.parentElement ? track.parentElement.clientWidth : window.innerWidth));
      track.style.setProperty('--hx', (prog(gal, 880, vh) * dist).toFixed(1));
    }
    if (lipo) lipo.style.setProperty('--lp', prog(lipo, 880, vh).toFixed(3));
    for (var i = 0; i < sps.length; i++) {
      var el = sps[i], inner = parseFloat(el.getAttribute('data-sp')), p;
      if (inner > 0) p = prog(el, inner, vh);
      else { var r = el.getBoundingClientRect(); p = clamp01((vh - r.top) / (vh * 0.9)); }
      el.style.setProperty('--p', p.toFixed(3));
    }
    cur.x += (cur.tx - cur.x) * 0.16; cur.y += (cur.ty - cur.y) * 0.16; cur.s += (cur.ts - cur.s) * 0.14;
    if (ring) ring.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0) scale(' + cur.s.toFixed(3) + ')';
    if (dot) dot.style.transform = 'translate3d(' + cur.tx + 'px,' + cur.ty + 'px,0)';
    if (prev) {
      pv.x += (cur.tx + 170 - pv.x) * 0.1; pv.y += (cur.ty - pv.y) * 0.1;
      prev.style.left = pv.x.toFixed(1) + 'px'; prev.style.top = pv.y.toFixed(1) + 'px';
    }
    if (gl && glVisible && (!reduce || !drawn)) { draw(now); drawn = true; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
