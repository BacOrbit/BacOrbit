/* ============================================================
   BacOrbit — reader.js
   قارئ موحّد لملفات PDF والصور التعليمية. يُحمَّل عند الحاجة فقط عبر
   window.bacOpenReader(...) المعرّفة في script.js، ويُنشئ واجهته بنفسه
   (CSS مضمّن، يعتمد على متغيرات style.css فيتبع الوضع الداكن/الفاتح).

   الاستعمال:
     BacReader.open({ type:'pdf',    src:'path.pdf', title:'…', fileName:'…pdf' })
     BacReader.open({ type:'images', sources:[{src:'a.jpg'},…], start:0, title:'…', fileName:'…pdf' })

   - PDF: يُرسم عبر pdf.js (cdnjs، نفس النسخة المستعملة في المكتبة) صفحةً صفحة
     عند الاقتراب منها فقط، وتُفرَّغ الصفحات البعيدة لتوفير الذاكرة. 
   - الصور: تُعرض كصفحات متتابعة بنفس ترتيبها، مع تنزيلها مجتمعة في ملف PDF
     (يُبنى داخل المتصفح دون أي مكتبة).
   ============================================================ */
(function () {
'use strict';
if (window.BacReader) return;

var PDFJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
var PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
var MIN_Z = 0.4, MAX_Z = 4, MAX_BASE = 1000;

var histPushed = false;
var root = null, el = {}, S = null, seq = 0, pdfLoading = null, prevOverflow = '';

/* ---------------------------------------------------------
   الأنماط
   --------------------------------------------------------- */
var CSS =
'.bac-rd{position:fixed;inset:0;z-index:10500;display:none;flex-direction:column;background:var(--bg);color:var(--text);font-family:Arial,sans-serif;direction:rtl}' +
'.bac-rd.open{display:flex}' +
'.bac-rd *{box-sizing:border-box}' +
'.bac-rd-head{display:flex;align-items:center;gap:10px;padding:8px 12px;padding-top:max(8px,env(safe-area-inset-top));background:var(--header-bg);border-bottom:1px solid var(--border);flex-shrink:0}' +
'.bac-rd.focus .bac-rd-head{display:none}' +
'.bac-rd-title{flex:1;min-width:0;font-size:14px;font-weight:bold;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
'.bac-rd-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;padding:8px 10px;background:var(--card-bg);border-bottom:1px solid var(--empty-border);flex-shrink:0}' +
'.bac-rd-grp{display:flex;align-items:center;gap:6px;padding:3px;border:1px solid var(--empty-border);border-radius:12px;background:var(--bg)}' +
'.bac-rd-btn{min-width:36px;height:36px;padding:0 10px;border-radius:9px;border:1.5px solid var(--accent);background:var(--bg);color:var(--accent);font-family:inherit;font-size:14px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap;transition:background-color .2s ease}' +
'.bac-rd-btn:hover{background:var(--accent-glow)}' +
'.bac-rd-btn:focus-visible,.bac-rd-in:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
'.bac-rd-btn.on{background:var(--accent);color:#000}' +
'.bac-rd-btn:disabled{opacity:.5;cursor:default}' +
'.bac-rd-x{border-color:var(--danger);color:var(--danger)}' +
'.bac-rd-x:hover{background:var(--danger-bg)}' +
'.bac-rd-zv{min-width:60px;direction:ltr}' +
'.bac-rd-in{width:56px;height:36px;border-radius:9px;border:1.5px solid var(--empty-border);background:var(--bg);color:var(--text);text-align:center;font-family:inherit;font-size:14px;direction:ltr}' +
'.bac-rd-of{color:var(--text-secondary);font-size:13px;direction:ltr;white-space:nowrap}' +
'.bac-rd-body{position:relative;flex:1;min-height:0}' +
'.bac-rd-scroll{position:absolute;inset:0;overflow:auto;direction:ltr;background:var(--track-bg);padding:14px 12px 48px;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;outline:none}' +
'.bac-rd-pages{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;width:max-content;min-width:100%}' +
'.bac-rd-page{position:relative;flex-shrink:0;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.3);overflow:hidden}' +
'.bac-rd-page.ld{background:var(--card-bg)}' +
'.bac-rd-page.er{display:flex;align-items:center;justify-content:center;color:var(--danger);background:var(--danger-bg);font-size:13px;direction:rtl}' +
'.bac-rd-page canvas,.bac-rd-page img{display:block;width:100%;height:100%}' +
'.bac-rd-page img{object-fit:contain}' +
'.bac-rd-msg{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:24px;text-align:center;color:var(--text-secondary);font-size:15px;line-height:1.9;pointer-events:none}' +
'.bac-rd-msg.show{display:flex}' +
'.bac-rd-msg a,.bac-rd-msg button{pointer-events:auto}' +
'.bac-rd-msg.err{color:var(--danger)}' +
'.bac-rd-spin{width:30px;height:30px;border-radius:50%;border:3px solid var(--empty-border);border-top-color:var(--accent);animation:bacRdSpin .8s linear infinite}' +
'@keyframes bacRdSpin{to{transform:rotate(360deg)}}' +
'.bac-rd-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);max-width:92%;padding:9px 18px;border-radius:12px;background:var(--card-bg);border:2px solid var(--accent);color:var(--accent);font-size:13px;font-weight:bold;display:none;text-align:center;z-index:3}' +
'.bac-rd-toast.show{display:block}' +
'.bac-rd-toast.err{border-color:var(--danger);color:var(--danger)}' +
'.bac-phq{z-index:10700!important}' +
'@media (max-width:640px){' +
  '.bac-rd-bar{gap:8px;padding:8px 6px}' +
  '.bac-rd-grp{gap:5px;padding:3px}' +
  '.bac-rd-btn{min-width:36px;height:36px;padding:0 8px}' +
  '.bac-rd-in{height:36px;width:46px}' +
  '.bac-rd-zv{min-width:50px}' +
  '.bac-rd-sm{display:none}' +
  '.bac-rd-scroll{padding:8px 6px 40px}' +
'}' +
'@media (prefers-reduced-motion:reduce){.bac-rd-spin{animation-duration:2s}}';

function injectCss() {
  if (document.getElementById('bacRdStyles')) return;
  var st = document.createElement('style');
  st.id = 'bacRdStyles';
  st.textContent = CSS;
  document.head.appendChild(st);
}

/* ---------------------------------------------------------
   أدوات
   --------------------------------------------------------- */
function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
function norm(s) {
  return String(s || '').toLowerCase().replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
}
function safeName(s, ext) {
  var n = String(s || 'BacOrbit').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'BacOrbit';
  return /\.pdf$/i.test(n) ? n : n + ext;
}
function saveBlob(blob, name) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
}

var toastTimer;
function toast(msg, opt) {
  opt = opt || {};
  el.Toast.textContent = msg;
  el.Toast.className = 'bac-rd-toast show' + (opt.err ? ' err' : '');
  clearTimeout(toastTimer);
  if (!opt.sticky) toastTimer = setTimeout(function () { el.Toast.classList.remove('show'); }, 2800);
}
function showMsg(html, kind) {
  el.Msg.innerHTML = html;
  el.Msg.className = 'bac-rd-msg show' + (kind === 'err' ? ' err' : '');
}
function hideMsg() { el.Msg.className = 'bac-rd-msg'; el.Msg.innerHTML = ''; }

function loadPdfJs() {
  function wk() {
    var o = window.pdfjsLib.GlobalWorkerOptions;
    if (o && !o.workerSrc) o.workerSrc = PDFJS_WORKER;
    return window.pdfjsLib;
  }
  if (window.pdfjsLib) return Promise.resolve(wk());
  if (pdfLoading) return pdfLoading;
  pdfLoading = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = PDFJS_SRC;
    s.onload = function () { window.pdfjsLib ? res(wk()) : rej(new Error('pdfjs')); };
    s.onerror = function () { pdfLoading = null; rej(new Error('تعذّر تحميل مكتبة عرض PDF (تحقق من الاتصال بالإنترنت)')); };
    document.head.appendChild(s);
  });
  return pdfLoading;
}

/* ---------------------------------------------------------
   بناء الواجهة (مرة واحدة)
   --------------------------------------------------------- */
function build() {
  if (root) return;
  injectCss();
  root = document.createElement('div');
  root.className = 'bac-rd';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="bac-rd-head"><div class="bac-rd-title" id="bacRdTitle"></div>' +
      '<button type="button" class="bac-rd-btn bac-rd-x" data-a="close" aria-label="إغلاق القارئ" title="إغلاق (Esc)">✕</button></div>' +
    '<div class="bac-rd-bar">' +
      '<div class="bac-rd-grp">' +
        '<button type="button" class="bac-rd-btn" data-a="prev" aria-label="الصفحة السابقة" title="الصفحة السابقة">▲</button>' +
        '<input type="text" inputmode="numeric" class="bac-rd-in" id="bacRdPage" aria-label="رقم الصفحة" value="1">' +
        '<span class="bac-rd-of">/ <span id="bacRdTotal">–</span></span>' +
        '<button type="button" class="bac-rd-btn" data-a="next" aria-label="الصفحة التالية" title="الصفحة التالية">▼</button>' +
      '</div>' +
      '<div class="bac-rd-grp">' +
        '<button type="button" class="bac-rd-btn" data-a="zout" aria-label="تصغير" title="تصغير (-)">−</button>' +
        '<button type="button" class="bac-rd-btn bac-rd-zv" data-a="zreset" id="bacRdZoom" title="إعادة الحجم الافتراضي">100%</button>' +
        '<button type="button" class="bac-rd-btn" data-a="zin" aria-label="تكبير" title="تكبير (+)">+</button>' +
      '</div>' +
      '<div class="bac-rd-grp">' +
        '<button type="button" class="bac-rd-btn" data-a="fitw" title="ملاءمة العرض">↔<span class="bac-rd-sm"> العرض</span></button>' +
        '<button type="button" class="bac-rd-btn" data-a="fitp" title="ملاءمة الصفحة كاملة">▯<span class="bac-rd-sm"> الصفحة</span></button>' +
      '</div>' +
      '<div class="bac-rd-grp">' +
        '<button type="button" class="bac-rd-btn" data-a="dl" id="bacRdDl" title="تنزيل">⬇<span id="bacRdDlTxt">تنزيل</span></button>' +
        '<button type="button" class="bac-rd-btn" data-a="fs" id="bacRdFs" title="ملء الشاشة">⛶</button>' +
      '</div>' +
    '</div>' +
    '<div class="bac-rd-body">' +
      '<div class="bac-rd-scroll" id="bacRdScroll" tabindex="0" aria-label="محتوى الملف"><div class="bac-rd-pages" id="bacRdPages"></div></div>' +
      '<div class="bac-rd-msg" id="bacRdMsg" role="status"></div>' +
      '<div class="bac-rd-toast" id="bacRdToast" role="status"></div>' +
    '</div>';
  document.body.appendChild(root);

  ['Title', 'Scroll', 'Pages', 'Page', 'Total', 'Zoom', 'Msg', 'Toast', 'Dl', 'DlTxt', 'Fs']
    .forEach(function (k) { el[k] = $('bacRd' + k); });

  root.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-a]') : null;
    if (b && S) act(b.getAttribute('data-a'));
  });

  var raf = 0;
  el.Scroll.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; updateCur(); });
  }, { passive: true });

  el.Page.addEventListener('focus', function () { el.Page.select(); });
  el.Page.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var n = parseInt(el.Page.value, 10); if (n >= 1 && S) goTo(clamp(n, 1, S.n) - 1); el.Scroll.focus(); }
  });
  el.Page.addEventListener('blur', function () { if (S) el.Page.value = S.cur + 1; });

  /* Ctrl + عجلة الماوس للتكبير */
  el.Scroll.addEventListener('wheel', function (e) {
    if (!S || !e.ctrlKey) return;
    e.preventDefault();
    var r = el.Scroll.getBoundingClientRect();
    setZoom(S.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientY - r.top, e.clientX - r.left);
  }, { passive: false });

  /* قرص الإصبعين للتكبير على الهاتف */
  var pin = null;
  function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  el.Scroll.addEventListener('touchstart', function (e) {
    if (!S || e.touches.length !== 2) return;
    var a = e.touches[0], b = e.touches[1], r = el.Scroll.getBoundingClientRect();
    pin = { d: dist(a, b), s: 1, x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top };
    el.Pages.style.transformOrigin = (el.Scroll.scrollLeft + pin.x) + 'px ' + (el.Scroll.scrollTop + pin.y - el.Pages.offsetTop) + 'px';
  }, { passive: true });
  el.Scroll.addEventListener('touchmove', function (e) {
    if (!pin || e.touches.length !== 2) return;
    var s = dist(e.touches[0], e.touches[1]) / pin.d;
    pin.s = clamp(S.zoom * s, MIN_Z, MAX_Z) / S.zoom;
    el.Pages.style.transform = 'scale(' + pin.s + ')';
  }, { passive: true });
  function pinEnd(e) {
    if (!pin || (e.touches && e.touches.length >= 2)) return;
    var p = pin; pin = null;
    el.Pages.style.transform = '';
    el.Pages.style.transformOrigin = '';
    if (S && Math.abs(p.s - 1) > 0.02) { S.fit = null; setZoom(S.zoom * p.s, p.y, p.x); }
  }
  el.Scroll.addEventListener('touchend', pinEnd, { passive: true });
  el.Scroll.addEventListener('touchcancel', pinEnd, { passive: true });

  document.addEventListener('keydown', onKey);
  window.addEventListener('popstate', function () {
    if (root.classList.contains('open')) close(true);
  });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (S && S.pages.length) { var f = S.fit; layout(); if (f === 'width') fitWidth(); else if (f === 'page') fitPage(); } }, 150);
  });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (el.Fs) el.Fs.classList.toggle('on', !!fsElement()); });
  });
}

function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

function onKey(e) {
  if (!S || !root.classList.contains('open')) return;
  var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '+' || e.key === '=') { e.preventDefault(); act('zin'); }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); act('zout'); }
  else if (e.key === '0') { e.preventDefault(); act('zreset'); }
  else if (e.key === 'ArrowRight' || e.key === 'p') { goTo(S.cur - 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'n') { goTo(S.cur + 1); }
}

function act(a) {
  switch (a) {
    case 'close': close(); break;
    case 'prev': goTo(S.cur - 1); break;
    case 'next': goTo(S.cur + 1); break;
    case 'zin': S.fit = null; setZoom(S.zoom * 1.2); break;
    case 'zout': S.fit = null; setZoom(S.zoom / 1.2); break;
    case 'zreset': S.fit = null; setZoom(1); break;
    case 'fitw': fitWidth(); break;
    case 'fitp': fitPage(); break;
    case 'dl': download(); break;
    case 'fs': toggleFs(); break;
  }
}

/* ---------------------------------------------------------
   فتح / إغلاق
   --------------------------------------------------------- */
function open(o) {
  build();
  cleanup();
  o = o || {};
  S = {
    o: o, type: o.type === 'images' ? 'images' : 'pdf', token: ++seq,
    pages: [], n: 0, cur: 0, zoom: 1, fit: null, aspect: 1.414, base: 600,
    /* موضع تمرير الصفحة الأصلية: يُستعاد عند الإغلاق لنعود لنفس المكان */
    scroll: { x: window.pageXOffset || 0, y: window.pageYOffset || 0 }
  };
  el.Title.textContent = o.title || '';
  el.Pages.innerHTML = '';
  el.Total.textContent = '–';
  el.Page.value = '1';
  el.Zoom.textContent = '100%';
  el.DlTxt.textContent = 'تنزيل';
  el.Dl.title = S.type === 'images' ? 'تنزيل كل الصور في ملف PDF واحد' : 'تنزيل الملف';
  el.Dl.disabled = false;
  el.Toast.className = 'bac-rd-toast';

  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  root.classList.add('open');
  root.classList.remove('focus');
  root.setAttribute('aria-hidden', 'false');
  /* o.history === false: فتح تلقائي عند دخول الصفحة (لا نضيف سجلًا، فيعود زر الرجوع مباشرة للصفحة السابقة) */
  if (!histPushed && o.history !== false) { try { history.pushState({ bacReader: 1 }, ''); histPushed = true; } catch (e) {} }

  if (S.type === 'images') initImages(); else initPdf();
  return true;
}

function cleanup() {
  if (!S) return;
  S.token = 0;
  if (S.io) S.io.disconnect();
  S.pages.forEach(function (p) { if (p.task) try { p.task.cancel(); } catch (e) {} });
  try { if (S.loadTask) S.loadTask.destroy(); } catch (e) {}
  try { if (S.doc) S.doc.destroy(); } catch (e) {}
  clearTimeout(S.rr);
  S = null;
  if (el.Pages) { el.Pages.innerHTML = ''; el.Pages.style.transform = ''; }
}

function close(fromPop) {
  if (!root) return;
  var onClose = S && S.o && typeof S.o.onClose === 'function' ? S.o.onClose : null;
  var sc = S ? S.scroll : null;
  if (fsElement()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
  cleanup();
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = prevOverflow;
  hideMsg();
  if (histPushed) {
    histPushed = false;
    if (fromPop !== true) { try { history.back(); } catch (e) {} }
  }
  /* العودة لنفس موضع التمرير في الواجهة التي فُتح منها المحتوى */
  if (sc) {
    /* استعادة فورية (بدون تمرير ناعم) حتى لا يظهر انزلاق من أعلى الصفحة عند الإغلاق */
    var restore = function () {
      try { window.scrollTo({ left: sc.x, top: sc.y, behavior: 'instant' }); }
      catch (e) { window.scrollTo(sc.x, sc.y); }
    };
    restore();
    requestAnimationFrame(restore);
  }
  if (onClose) { try { onClose(); } catch (e) { console.warn('[BacOrbit][القارئ] onClose', e); } }
}

/* ---------------------------------------------------------
   تحميل المحتوى
   --------------------------------------------------------- */
function initImages() {
  var src = S.o.sources || [];
  if (!src.length) { showMsg('لا توجد صور لعرضها.', 'err'); return; }
  S.n = src.length;
  S.aspect = 1.33;
  hideMsg();
  createPages(clamp(S.o.start || 0, 0, S.n - 1));
}

function initPdf() {
  var tok = S.token;
  showMsg('<div class="bac-rd-spin"></div>جارٍ تحميل الملف…');
  loadPdfJs().then(function (lib) {
    S.loadTask = lib.getDocument({ url: abs(S.o.src), rangeChunkSize: 262144 });
    return S.loadTask.promise;
  }).then(function (doc) {
    if (!S || S.token !== tok) { try { doc.destroy(); } catch (e) {} return; }
    S.doc = doc;
    return doc.getPage(1).then(function (pg) {
      var v = pg.getViewport({ scale: 1 });
      S.aspect = v.height / v.width;
      if (!S || S.token !== tok) return;
      S.n = doc.numPages;
      hideMsg();
      createPages(0);
    });
  }).catch(function (err) {
    if (!S || S.token !== tok) return;
    console.error('[BacOrbit][القارئ] تعذّر فتح الملف:', S.o.src, err);
    var hint = location.protocol === 'file:' ? '<br>الصفحة مفتوحة من القرص (file://) — شغّل الموقع عبر خادم أو GitHub Pages.' : '';
    showMsg('تعذّر عرض هذا الملف داخل الموقع.' + hint +
      '<a class="bac-rd-btn" target="_blank" rel="noopener" href="' + abs(S.o.src) + '">فتح الملف في نافذة جديدة ↗</a>', 'err');
  });
}

function createPages(start) {
  el.Total.textContent = S.n;
  var frag = document.createDocumentFragment();
  for (var i = 0; i < S.n; i++) {
    var w = document.createElement('div');
    w.className = 'bac-rd-page ld';
    w.dataset.i = i;
    var p = { i: i, wrap: w, aspect: S.aspect, vis: false, w: 0, renderedW: 0 };
    if (S.type === 'images') {
      var im = document.createElement('img');
      im.alt = (S.o.sources[i].alt) || ('صفحة ' + (i + 1));
      im.decoding = 'async';
      w.appendChild(im);
      p.img = im;
      p.load = loadImg; p.unload = null;
    } else {
      p.load = renderPdf; p.unload = unloadPdf;
    }
    S.pages.push(p);
    frag.appendChild(w);
  }
  el.Pages.appendChild(frag);
  layout();

  if ('IntersectionObserver' in window) {
    S.io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var p = S && S.pages[+en.target.dataset.i];
        if (!p) return;
        p.vis = en.isIntersecting;
        if (p.vis) p.load(p); else if (p.unload) p.unload(p);
      });
    }, { root: el.Scroll, rootMargin: '150% 0px' });
    S.pages.forEach(function (p) { S.io.observe(p.wrap); });
  } else {
    S.pages.forEach(function (p) { p.vis = true; p.load(p); });
  }
  goTo(start);
  el.Scroll.focus({ preventScroll: true });
}

/* ---------------------------------------------------------
   التخطيط والتكبير
   --------------------------------------------------------- */
function availW() { return Math.max(200, el.Scroll.clientWidth - (window.innerWidth <= 640 ? 12 : 24)); }

function layout() {
  var avail = availW();
  S.avail = avail;
  S.base = Math.min(avail, MAX_BASE);
  var w = Math.round(S.base * S.zoom);
  S.pages.forEach(function (p) { p.w = w; sizePage(p, true); });
  el.Zoom.textContent = Math.round(S.zoom * 100) + '%';
}

function sizePage(p, noShift) {
  var oldH = p.wrap.offsetHeight, h = Math.round(p.w * p.aspect);
  p.wrap.style.width = p.w + 'px';
  p.wrap.style.height = h + 'px';
  /* تغيّر ارتفاع صفحة فوق موضع القراءة لا يجب أن يزحزح المحتوى */
  if (!noShift && oldH && h !== oldH && p.wrap.offsetTop + oldH <= el.Scroll.scrollTop - el.Pages.offsetTop) {
    el.Scroll.scrollTop += h - oldH;
  }
}

function pageAt(y) {
  var lo = 0, hi = S.pages.length - 1;
  while (lo < hi) {
    var mid = (lo + hi + 1) >> 1;
    if (S.pages[mid].wrap.offsetTop <= y) lo = mid; else hi = mid - 1;
  }
  return lo;
}

function setZoom(z, yv, xv, force) {
  if (!S || !S.pages.length) return;
  z = clamp(z, MIN_Z, MAX_Z);
  if (!force && Math.abs(z - S.zoom) < 0.001) { updateCur(); return; }
  var sc = el.Scroll;
  if (yv == null) yv = sc.clientHeight / 2;
  if (xv == null) xv = sc.clientWidth / 2;
  var y = sc.scrollTop + yv - el.Pages.offsetTop, i = pageAt(y), wr = S.pages[i].wrap;
  var f = (y - wr.offsetTop) / Math.max(1, wr.offsetHeight), oldW = S.pages[0].w || 1;
  S.zoom = z;
  layout();
  var np = S.pages[i].wrap;
  sc.scrollTop = el.Pages.offsetTop + np.offsetTop + f * np.offsetHeight - yv;
  sc.scrollLeft = (sc.scrollLeft + xv) * (S.pages[0].w / oldW) - xv;
  clearTimeout(S.rr);
  S.rr = setTimeout(function () { if (S) S.pages.forEach(function (p) { if (p.vis) p.load(p); }); }, 140);
  updateCur();
}

function fitWidth() {
  if (!S) return;
  setZoom(S.avail / S.base, null, null, true);
  S.fit = 'width';
}
function fitPage() {
  if (!S) return;
  var p = S.pages[S.cur] || S.pages[0], cur = S.cur;
  var w = Math.min(S.avail, (el.Scroll.clientHeight - 28) / p.aspect);
  setZoom(w / S.base, null, null, true);
  S.fit = 'page';
  goTo(cur);
}

function updateCur() {
  if (!S || !S.pages.length) return;
  var y = el.Scroll.scrollTop + el.Scroll.clientHeight / 3 - el.Pages.offsetTop;
  var i = pageAt(y);
  if (i !== S.cur) S.cur = i;
  if (document.activeElement !== el.Page) el.Page.value = S.cur + 1;
}

function goTo(i) {
  if (!S || !S.pages.length) return;
  i = clamp(i, 0, S.n - 1);
  S.cur = i;
  el.Scroll.scrollTop = el.Pages.offsetTop + S.pages[i].wrap.offsetTop - 8;
  if (document.activeElement !== el.Page) el.Page.value = i + 1;
}

/* ---------------------------------------------------------
   رسم الصفحات
   --------------------------------------------------------- */
function loadImg(p) {
  var im = p.img;
  if (!im || im.getAttribute('src') || p.wrap.classList.contains('er')) return;
  im.onload = function () {
    if (!S) return;
    if (im.naturalWidth) { p.aspect = im.naturalHeight / im.naturalWidth; sizePage(p); }
    p.wrap.classList.remove('ld');
  };
  im.onerror = function () { p.wrap.classList.add('er'); p.wrap.textContent = 'تعذّر تحميل الصورة'; };
  im.src = S.o.sources[p.i].src;
}

function renderPdf(p) {
  if (!S || !S.doc) return;
  if (p.busy) { p.again = true; return; }
  if (p.renderedW === p.w && p.canvas) return;
  p.busy = true;
  var tok = S.token;
  S.doc.getPage(p.i + 1).then(function (page) {
    if (!S || S.token !== tok || !p.vis) return;
    var v1 = page.getViewport({ scale: 1 });
    var asp = v1.height / v1.width;
    if (Math.abs(asp - p.aspect) > 0.001) { p.aspect = asp; sizePage(p); }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var scale = (p.w / v1.width) * dpr;
    if (v1.width * scale > 4096) scale = 4096 / v1.width;
    var vp = page.getViewport({ scale: scale });
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(vp.width));
    c.height = Math.max(1, Math.floor(vp.height));
    var w = p.w;
    p.task = page.render({ canvasContext: c.getContext('2d'), viewport: vp });
    return p.task.promise.then(function () {
      if (!S || S.token !== tok) return;
      if (p.canvas && p.canvas.parentNode) p.canvas.parentNode.removeChild(p.canvas);
      p.wrap.insertBefore(c, p.wrap.firstChild);
      p.canvas = c; p.renderedW = w;
      p.wrap.classList.remove('ld');
    });
  }).catch(function (e) {
    if (e && e.name === 'RenderingCancelledException') return;
    console.warn('[BacOrbit][القارئ] تعذّر رسم الصفحة ' + (p.i + 1), e);
  }).then(function () {
    p.busy = false; p.task = null;
    if (p.again) { p.again = false; if (S && p.vis) renderPdf(p); }
  });
}

function unloadPdf(p) {
  if (p.task) try { p.task.cancel(); } catch (e) {}
  if (p.canvas) {
    if (p.canvas.parentNode) p.canvas.parentNode.removeChild(p.canvas);
    p.canvas.width = p.canvas.height = 0;
    p.canvas = null;
  }
  p.renderedW = 0;
  p.wrap.classList.add('ld');
}

/* ---------------------------------------------------------
   التنزيل وملء الشاشة
   --------------------------------------------------------- */
function download() {
  if (!S) return;
  if (S.type === 'pdf') {
    var url = abs(S.o.src), name = safeName(S.o.fileName || S.o.title, '.pdf');
    toast('جارٍ التنزيل…', { sticky: true });
    fetch(url).then(function (r) { if (!r.ok) throw new Error('http'); return r.blob(); })
      .then(function (b) { saveBlob(b, name); toast('تم التنزيل ✅'); })
      .catch(function () { toast('تعذّر التنزيل المباشر، سيُفتح الملف في نافذة جديدة', { err: true }); window.open(url, '_blank'); });
  } else {
    imagesToPdf();
  }
}

function toggleFs() {
  if (fsElement()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  var fn = root.requestFullscreen || root.webkitRequestFullscreen;
  if (fn) {
    var r = fn.call(root);
    if (r && r.catch) r.catch(function () { root.classList.toggle('focus'); });
  } else {
    /* متصفحات بلا Fullscreen API (مثل iPhone): نخفي الشريط العلوي فقط */
    root.classList.toggle('focus');
    el.Fs.classList.toggle('on', root.classList.contains('focus'));
    setTimeout(function () { if (S) layout(); }, 50);
  }
}

/* ---------------------------------------------------------
   تجميع الصور في ملف PDF (بدون مكتبات)
   --------------------------------------------------------- */
function imgToJpeg(src) {
  return new Promise(function (res, rej) {
    var im = new Image();
    im.onload = function () {
      var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 2400 / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch);
      x.drawImage(im, 0, 0, cw, ch);
      c.toBlob(function (b) {
        if (!b) return rej(new Error('blob'));
        var fr = new FileReader();
        fr.onload = function () { res({ w: cw, h: ch, data: new Uint8Array(fr.result) }); };
        fr.onerror = rej;
        fr.readAsArrayBuffer(b);
      }, 'image/jpeg', 0.88);
    };
    im.onerror = function () { rej(new Error('img')); };
    im.src = src;
  });
}

function buildPdf(imgs) {
  var enc = new TextEncoder(), parts = [], len = 0, offs = [];
  function push(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; }
  function obj(id, body) { offs[id] = len; push(id + ' 0 obj\n' + body + '\nendobj\n'); }
  var n = imgs.length, kids = [], PW = 595.28;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  for (var k = 0; k < n; k++) kids.push((3 + 3 * k) + ' 0 R');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>');
  imgs.forEach(function (im, k) {
    var pg = 3 + 3 * k, ct = pg + 1, ix = pg + 2, ph = PW * im.h / im.w;
    var pwS = PW.toFixed(2), phS = ph.toFixed(2);
    obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pwS + ' ' + phS + '] /Resources << /XObject << /Im0 ' + ix + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
    var cs = 'q ' + pwS + ' 0 0 ' + phS + ' 0 0 cm /Im0 Do Q';
    obj(ct, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
    offs[ix] = len;
    push(ix + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.data.length + ' >>\nstream\n');
    push(im.data);
    push('\nendstream\nendobj\n');
  });
  var total = 3 + 3 * n, xref = len, x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (var id = 1; id < total; id++) x += ('0000000000' + offs[id]).slice(-10) + ' 00000 n \n';
  push(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
  return new Blob(parts, { type: 'application/pdf' });
}

function imagesToPdf() {
  if (S.busyPdf) return;
  S.busyPdf = true;
  el.Dl.disabled = true;
  var tok = S.token, srcs = S.o.sources, out = [], i = 0, failed = 0, name = safeName(S.o.fileName || S.o.title, '.pdf');
  toast('جارٍ تجهيز ملف PDF… 0/' + srcs.length, { sticky: true });
  (function next() {
    if (!S || S.token !== tok) return;
    if (i >= srcs.length) {
      S.busyPdf = false; el.Dl.disabled = false;
      if (!out.length) { toast('تعذّر تجهيز الملف', { err: true }); return; }
      try {
        saveBlob(buildPdf(out), name);
        toast(failed ? 'تم التنزيل (تعذّر تضمين ' + failed + ' صورة)' : 'تم تنزيل ملف PDF ✅', { err: !!failed });
      } catch (e) { console.error(e); toast('تعذّر إنشاء الملف', { err: true }); }
      return;
    }
    imgToJpeg(srcs[i].src).then(function (r) { out.push(r); }, function () { failed++; }).then(function () {
      i++;
      if (S && S.token === tok) toast('جارٍ تجهيز ملف PDF… ' + i + '/' + srcs.length, { sticky: true });
      setTimeout(next, 0);
    });
  })();
}

window.BacReader = { open: open, close: close, _buildPdf: buildPdf };
})();
