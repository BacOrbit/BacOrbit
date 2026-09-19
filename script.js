/* ============================================================
   BacOrbit — script.js
   الملف المركزي لكل التفاعلات: الثيم، الشريط العلوي، تأثير النبض،
   الإشعارات، تنزيل المواضيع والدروس، وعارض تكبير/تنزيل الصور.
   مصمم ليعمل بأمان على أي صفحة حتى لو كانت بعض العناصر غير موجودة.

   ⚠️ القسم 0ب: إصلاح اختفاء أيقونة الموقع (favicon) في الصفحات
   الداخلية عبر حقن وسم <link rel="icon"> بمسار مطلق إن لم يكن موجودًا.

   ⚠️ القسم 8ج-1 (التعديل الحالي): توحيد قائمة التنقل ☰ في كل صفحات
   الموقع دون استثناء. بدل الاعتماد على محتوى .nav-menu-panel المكتوب
   يدويًا داخل كل ملف HTML (وهو ما كان يسبب اختلاف الترتيب وتكرار/
   نقصان بعض الروابط بين الصفحات)، أصبح محتوى القائمة الآن يُبنى
   بالكامل من مصدر واحد فقط هنا (BAC_NAV_ITEMS) عبر rebuildNavMenu()،
   التي تُفرغ .nav-menu-panel وتعيد بناءه من الصفر في كل صفحة عند
   التحميل، بنفس الترتيب والأسماء والأيقونات:
   الصفحة الرئيسية، المنتدى، المكتبة، نصائح وتوجيهات، إضافة ملفات،
   حساب المعدل، الدعم، السياسة والخصوصية. هذا لا يحذف أي صفحة أو
   ميزة من الموقع (مثل play.html "المكتسبات القبلية" التي تبقى تُفتح
   من بطاقتها في الصفحة الرئيسية كما هي)، فقط يوحّد ما يظهر داخل
   قائمة ☰ نفسها في كل الصفحات.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     0-أ. توجيه تلقائي فوري لأصحاب شعبة محفوظة عند دخول الصفحة الرئيسية
     --------------------------------------------------------- */
  (function redirectToSavedBranchIfHome() {
    try {
      var path = location.pathname;
      var isHome = /(^|\/)index\.html$/.test(path) || /\/$/.test(path);
      if (!isHome) return;
      var raw = localStorage.getItem('bacorbit_saved_branch');
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && saved.url) location.replace(saved.url);
    } catch (e) { /* المتابعة بتحميل الصفحة الرئيسية عاديًا */ }
  })();

  /* ---------------------------------------------------------
     0. أدوات مساعدة عامة
     --------------------------------------------------------- */
  function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function on(el, evt, fn, opts) { if (el) el.addEventListener(evt, fn, opts); }

  function safeRun(fn, label) {
    try { fn(); }
    catch (err) { console.warn('[BacOrbit]', label || 'خطأ غير متوقع', err); }
  }

  /* ---------------------------------------------------------
     0ب. ضمان ظهور أيقونة BacOrbit (favicon) في كل صفحة
     --------------------------------------------------------- */
  var SITE_ROOT = 'https://bacorbit.github.io/BacOrbit/';

  var CURRENT_SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  function siblingUrl(name) {
    if (CURRENT_SCRIPT_SRC) {
      return CURRENT_SCRIPT_SRC.replace(/script\.js(\?.*)?$/, '') + name;
    }
    return name;
  }
  function loadScriptTag(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-bac-src="' + src + '"]');
      if (existing) {
        if (existing.dataset.bacLoaded === '1') { resolve(); return; }
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', reject);
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.dataset.bacSrc = src;
      s.onload = function () { s.dataset.bacLoaded = '1'; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensureFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;

    var icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.href = SITE_ROOT + 'favicon.png';
    document.head.appendChild(icon);

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      var apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = SITE_ROOT + 'icon-192.png';
      document.head.appendChild(apple);
    }
  }

  /* ---------------------------------------------------------
     1. الوضع الداكن / الفاتح (Theme)
     --------------------------------------------------------- */
  const THEME_KEY = 'bacorbit_theme';

  function applyStoredTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch (e) {}
  }
  applyStoredTheme();
  safeRun(ensureFavicon, 'أيقونة الموقع (favicon)');

  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    on(btn, 'click', function () {
      const root = document.documentElement;
      const isLight = root.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------------------------------------------------------
     2. الشريط العلوي — إخفاء/إظهار عند التمرير
     --------------------------------------------------------- */
  function initTopBarScroll() {
    const topBar = document.getElementById('topBar');
    if (!topBar) return;

    let lastY = window.scrollY || 0;
    let ticking = false;

    function update() {
      const y = window.scrollY || 0;
      topBar.classList.toggle('hide', y > lastY && y > 130);
      lastY = y;
      ticking = false;
    }

    on(window, 'scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     4. إشعارات (Toast)
     --------------------------------------------------------- */
  let toastTimer = null;

  function ensureToastStyles() {
    if (document.getElementById('bacToastStyles')) return;
    const style = document.createElement('style');
    style.id = 'bacToastStyles';
    style.textContent =
      '#bacToastHost{position:fixed;bottom:24px;left:0;right:0;display:flex;' +
      'justify-content:center;z-index:4000;pointer-events:none;padding:0 14px}' +
      '.bac-toast{background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);' +
      'color:var(--accent,#1aff66);padding:12px 22px;border-radius:14px;font-weight:bold;' +
      'font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,.4);opacity:0;transform:translateY(15px);' +
      'transition:opacity .3s ease,transform .3s ease;max-width:92%;text-align:center;' +
      'font-family:Arial,sans-serif}' +
      '.bac-toast.show{opacity:1;transform:translateY(0)}' +
      '.bac-toast.err{border-color:var(--danger,#ff4d4d);color:var(--danger,#ff4d4d)}';
    document.head.appendChild(style);
  }

  function showToast(message, type) {
    ensureToastStyles();
    let host = document.getElementById('bacToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'bacToastHost';
      const box = document.createElement('div');
      box.className = 'bac-toast';
      box.id = 'bacToastBox';
      host.appendChild(box);
      document.body.appendChild(host);
    }
    const box = document.getElementById('bacToastBox');
    box.textContent = message;
    box.classList.toggle('err', type === 'err');
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('show'); }, 3200);
  }

  /* ---------------------------------------------------------
     5. تنزيل الملفات
     --------------------------------------------------------- */
  function triggerFileDownload(url, fileName) {
    if (typeof fetch !== 'function') {
      return Promise.reject(new Error('fetch غير مدعوم في هذا المتصفح'));
    }
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('missing-file');
      return res.blob();
    }).then(function (blob) {
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = fileName || '';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(objUrl); }, 4000);
    });
  }

  window.downloadTopic = function (event, filePath, fileName) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event ? event.currentTarget : null;
    if (btn && btn.dataset.busy === '1') return;

    const textEl = btn ? btn.querySelector('span') : null;
    const originalText = textEl ? textEl.textContent : null;

    if (btn) {
      btn.dataset.busy = '1';
      btn.disabled = true;
      btn.classList.add('loading');
      if (textEl) textEl.textContent = 'جارٍ التنزيل…';
    }

    triggerFileDownload(filePath, fileName).then(function () {
      showToast('تم تنزيل: ' + (fileName || 'الملف') + ' ✅');
      if (btn) {
        btn.classList.remove('loading');
        btn.classList.add('done');
        if (textEl) textEl.textContent = 'تم التنزيل ✅';
      }
    }).catch(function () {
      showToast('تعذّر تنزيل الملف، سيتم فتحه في نافذة جديدة', 'err');
      if (btn) btn.classList.remove('loading');
      safeRun(function () { window.open(filePath, '_blank'); });
    }).finally(function () {
      if (btn) {
        setTimeout(function () {
          btn.classList.remove('done');
          btn.disabled = false;
          btn.dataset.busy = '0';
          if (textEl && originalText) textEl.textContent = originalText;
        }, 1600);
      }
    });
  };

  window.downloadLessonFolder = function (button, folderName, fileNames, folderLabel) {
    if (!button || button.dataset.busy === '1') return;
    if (!Array.isArray(fileNames) || fileNames.length === 0) return;

    const svgEl = button.querySelector('svg');
    const labelEl = button.querySelector('.dl-label');
    const originalSvgHTML = svgEl ? svgEl.outerHTML : '';
    const originalLabelText = labelEl ? labelEl.textContent : '';

    button.dataset.busy = '1';
    button.disabled = true;
    button.classList.add('loading');
    if (svgEl) svgEl.outerHTML = '<span class="dl-spinner"></span>';

    let done = 0, failed = 0;
    const total = fileNames.length;

    function updateLabel() {
      if (labelEl) labelEl.textContent = 'جارٍ التنزيل… (' + (done + failed) + '/' + total + ')';
    }
    updateLabel();

    (async function run() {
      for (let i = 0; i < fileNames.length; i++) {
        const name = fileNames[i];
        const url = folderName + '/' + name;
        try {
          await triggerFileDownload(url, name);
          done++;
        } catch (e) {
          failed++;
        }
        updateLabel();
        await new Promise(function (r) { setTimeout(r, 220); });
      }

      button.classList.remove('loading');
      button.classList.add('done');
      const spinner = button.querySelector('.dl-spinner');
      if (spinner) spinner.outerHTML = '<span class="dl-check">✔</span>';
      if (labelEl) {
        labelEl.textContent = failed
          ? ('تم تنزيل ' + done + ' من ' + total)
          : 'تم تنزيل جميع الدروس ✅';
      }

      if (failed) {
        showToast('تعذّر تنزيل ' + failed + ' ملف من ' + (folderLabel || folderName), 'err');
      } else {
        showToast('تم تنزيل ' + (folderLabel || 'جميع الملفات') + ' بنجاح ✅');
      }

      setTimeout(function () {
        const check = button.querySelector('.dl-check');
        if (check) check.outerHTML = originalSvgHTML;
        if (labelEl) labelEl.textContent = originalLabelText;
        button.classList.remove('done');
        button.disabled = false;
        button.dataset.busy = '0';
      }, 2600);
    })();
  };

  /* ---------------------------------------------------------
     6. عارض الصور
     --------------------------------------------------------- */
  const DOWNLOAD_SVG =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  function baseName(path) {
    const parts = String(path).split('/');
    try { return decodeURIComponent(parts[parts.length - 1] || 'image'); }
    catch (e) { return parts[parts.length - 1] || 'image'; }
  }

  let imageViewerEls = null;

  function ensureImageViewer() {
    if (imageViewerEls) return imageViewerEls;

    const overlay = document.createElement('div');
    overlay.id = 'bacImageViewerOverlay';
    overlay.className = 'bac-image-viewer-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('div');
    inner.className = 'bac-image-viewer-inner';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'bac-image-viewer-close';
    closeBtn.setAttribute('aria-label', 'إغلاق المكبر');
    closeBtn.innerHTML = '✕';

    const img = document.createElement('img');
    img.id = 'bacImageViewerImg';
    img.alt = 'عرض مكبر للصورة';

    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'topic-download-btn bac-image-viewer-download';
    dlBtn.innerHTML = DOWNLOAD_SVG + '<span>تنزيل الصورة</span>';

    inner.appendChild(closeBtn);
    inner.appendChild(img);
    inner.appendChild(dlBtn);
    overlay.appendChild(inner);
    document.body.insertBefore(overlay, document.body.firstChild);

    function close() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      img.removeAttribute('src');
    }

    function openWith(src, name) {
      img.setAttribute('src', src);
      img.setAttribute('alt', name || 'صورة مكبرة');
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }

    on(closeBtn, 'click', function (e) { e.stopPropagation(); close(); });
    on(overlay, 'click', function (e) { if (e.target === overlay) close(); });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    on(dlBtn, 'click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (dlBtn.dataset.busy === '1') return;
      const src = img.getAttribute('src');
      if (!src) return;
      dlBtn.dataset.busy = '1';
      const name = baseName(src);
      triggerFileDownload(src, name).then(function () {
        showToast('تم تنزيل الصورة ✅');
      }).catch(function () {
        showToast('تعذّر تنزيل الصورة، سيتم فتحها في نافذة جديدة', 'err');
        safeRun(function () { window.open(src, '_blank'); });
      }).finally(function () {
        dlBtn.dataset.busy = '0';
      });
    });

    imageViewerEls = { overlay: overlay, img: img, open: openWith, close: close };
    return imageViewerEls;
  }

  function openImageViewer(src, name) {
    ensureImageViewer().open(src, name);
  }

  function enhanceLessonImages() {
    qsa('.lesson > img').forEach(function (img) {
      if (img.closest('.bac-img-frame')) return;

      const frame = document.createElement('div');
      frame.className = 'bac-img-frame';

      const controls = document.createElement('div');
      controls.className = 'bac-img-controls';

      const dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'topic-download-btn bac-side-download';
      dlBtn.setAttribute('aria-label', 'تنزيل الصورة');
      dlBtn.innerHTML = DOWNLOAD_SVG;

      controls.appendChild(dlBtn);

      img.parentNode.insertBefore(frame, img);
      frame.appendChild(img);
      frame.appendChild(controls);

      on(img, 'click', function (e) {
        e.preventDefault();
        openImageViewer(img.getAttribute('src'), baseName(img.getAttribute('src')));
      });

      on(dlBtn, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (dlBtn.dataset.busy === '1') return;
        dlBtn.dataset.busy = '1';
        const src = img.getAttribute('src');
        const name = baseName(src);
        triggerFileDownload(src, name).then(function () {
          showToast('تم تنزيل الصورة ✅');
        }).catch(function () {
          showToast('تعذّر تنزيل الصورة، سيتم فتحها في نافذة جديدة', 'err');
          safeRun(function () { window.open(src, '_blank'); });
        }).finally(function () {
          dlBtn.dataset.busy = '0';
        });
      });
    });
  }

  window.bacEnhanceLessonImages = enhanceLessonImages;

  /* ---------------------------------------------------------
     6ب. شريط التحكم بحجم صور الدروس
     --------------------------------------------------------- */
  function initLessonZoomControl() {
    var lessonsEl = document.querySelector('.lessons');
    if (!lessonsEl || document.getElementById('bacLessonZoomBar')) return;

    var bar = document.createElement('div');
    bar.id = 'bacLessonZoomBar';
    bar.className = 'bac-zoom-bar';
    bar.innerHTML =
      '<span class="bac-zoom-label">🔍 حجم صور الدروس</span>' +
      '<button type="button" class="bac-zoom-btn" id="bacZoomOut" aria-label="تصغير حجم الصور">−</button>' +
      '<input type="range" id="bacZoomRange" class="bac-zoom-range" min="50" max="100" step="5" value="100" aria-label="التحكم بحجم صور الدروس">' +
      '<button type="button" class="bac-zoom-btn" id="bacZoomIn" aria-label="تكبير حجم الصور">+</button>';

    lessonsEl.parentNode.insertBefore(bar, lessonsEl);

    var range = bar.querySelector('#bacZoomRange');
    var btnOut = bar.querySelector('#bacZoomOut');
    var btnIn = bar.querySelector('#bacZoomIn');

    function applyZoom(val) {
      val = Math.max(50, Math.min(100, val));
      lessonsEl.style.setProperty('--bac-lesson-zoom', val + '%');
      range.value = val;
    }

    on(range, 'input', function () { applyZoom(parseInt(range.value, 10)); });
    on(btnOut, 'click', function () { applyZoom(parseInt(range.value, 10) - 10); });
    on(btnIn, 'click', function () { applyZoom(parseInt(range.value, 10) + 10); });
  }

  /* ---------------------------------------------------------
     6ج. تمييز المواضيع التي سبق للمستخدم الدخول إليها
     --------------------------------------------------------- */
  const VISITED_TOPICS_KEY = 'bacorbit_visited_topics';

  function loadVisitedTopics() {
    try {
      const raw = localStorage.getItem(VISITED_TOPICS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) { return {}; }
  }

  function saveVisitedTopics(map) {
    try { localStorage.setItem(VISITED_TOPICS_KEY, JSON.stringify(map)); }
    catch (e) {}
  }

  function topicCardKey(card) {
    const openAttr = card.getAttribute('onclick') || '';
    const m = openAttr.match(/window\.open\(\s*['"]([^'"]+)['"]/);
    if (!m) return null;
    return location.pathname + '|' + m[1];
  }

  function ensureVisitedBadge(card) {
    if (card.querySelector('.topic-visited-badge')) return;
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'topic-visited-badge';
    badge.textContent = '✓';
    badge.setAttribute('aria-label', 'إزالة علامة الزيارة عن هذا الموضوع');
    badge.title = 'إزالة علامة الزيارة';
    on(badge, 'click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      unmarkTopicVisited(card);
    });
    card.appendChild(badge);
  }

  function removeVisitedBadge(card) {
    const badge = card.querySelector('.topic-visited-badge');
    if (badge) badge.remove();
  }

  function markTopicVisited(card) {
    const key = topicCardKey(card);
    if (!key) return;
    card.classList.add('topic-visited');
    ensureVisitedBadge(card);
    const visited = loadVisitedTopics();
    if (!visited[key]) {
      visited[key] = 1;
      saveVisitedTopics(visited);
    }
  }

  function unmarkTopicVisited(card) {
    card.classList.remove('topic-visited');
    removeVisitedBadge(card);
    const key = topicCardKey(card);
    if (!key) return;
    const visited = loadVisitedTopics();
    if (visited[key]) {
      delete visited[key];
      saveVisitedTopics(visited);
    }
  }

  function applyVisitedTopicsState() {
    const cards = qsa('.topic-card');
    if (!cards.length) return;
    const visited = loadVisitedTopics();
    cards.forEach(function (card) {
      const key = topicCardKey(card);
      if (key && visited[key]) {
        card.classList.add('topic-visited');
        ensureVisitedBadge(card);
      }
    });
  }

  function initVisitedTopicsTracking() {
    if (!qs('.topic-card')) return;
    applyVisitedTopicsState();
    document.addEventListener('click', function (e) {
      const card = e.target.closest ? e.target.closest('.topic-card') : null;
      if (card) markTopicVisited(card);
    }, true);
  }

  /* ---------------------------------------------------------
     7. توافقية مستقبلية: toggleContent احتياطي
     --------------------------------------------------------- */
  function ensureToggleContentFallback() {
    if (typeof window.toggleContent === 'function') return;
    window.toggleContent = function (card) {
      const content = card && card.querySelector('.subject-content');
      if (!content) return;
      content.style.display = (content.style.display === 'block') ? 'none' : 'block';
    };
  }

  /* ---------------------------------------------------------
     8. الخلفية التفاعلية (شبكة جسيمات) + تأثير النقر
     --------------------------------------------------------- */
  function readAccentColors() {
    const styles = getComputedStyle(document.documentElement);
    const dot = (styles.getPropertyValue('--bg-particle-dot') || styles.getPropertyValue('--accent') || '#1aff66').trim();
    const line = (styles.getPropertyValue('--bg-particle-line') || styles.getPropertyValue('--accent-soft') || 'rgba(26,255,102,0.4)').trim();
    return { dot: dot, line: line };
  }

  function isLightTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function getVisualParams() {
    return isLightTheme()
      ? { dotAlpha: 0.72, lineAlpha: 0.38, mouseForce: 0.42, glow: 7 }
      : { dotAlpha: 0.35, lineAlpha: 0.18, mouseForce: 0.50, glow: 0 };
  }

  function initInteractiveBackground() {
    if (document.getElementById('bacBgCanvas')) return;
    if (typeof window.matchMedia !== 'function') return;

    const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionMQ.matches) return;

    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const canvas = document.createElement('canvas');
    canvas.id = 'bacBgCanvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let colors = readAccentColors();
    let visualParams = getVisualParams();
    const mouse = { x: -9999, y: -9999, active: false };
    const smoothMouse = { x: -9999, y: -9999 };
    let running = false;
    let rafId = null;

    function particleTarget() {
      const area = W * H;
      const light = isLightTheme();
      const base = Math.round(area / (light ? 21000 : 24000));
      const max = hasFinePointer ? (light ? 95 : 85) : (light ? 55 : 50);
      return Math.max(14, Math.min(base, max));
    }

    function makeParticle() {
      const light = isLightTheme();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: light ? (Math.random() * 1.6 + 0.9) : (Math.random() * 1.3 + 0.6)
      };
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const target = particleTarget();
      if (particles.length < target) {
        while (particles.length < target) particles.push(makeParticle());
      } else if (particles.length > target) {
        particles.length = target;
      }
    }

    function step() {
      if (!running) { rafId = null; return; }
      ctx.clearRect(0, 0, W, H);

      smoothMouse.x += (mouse.x - smoothMouse.x) * 0.06;
      smoothMouse.y += (mouse.y - smoothMouse.y) * 0.06;

      const linkDist = Math.min(140, Math.max(90, W / 9));
      const mouseRadius = 130;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;

        if (hasFinePointer && mouse.active) {
          const dx = p.x - smoothMouse.x, dy = p.y - smoothMouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < mouseRadius && d > 0.01) {
            const force = (1 - d / mouseRadius) * visualParams.mouseForce;
            p.x += (dx / d) * force;
            p.y += (dy / d) * force;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colors.dot;
        ctx.globalAlpha = visualParams.dotAlpha;
        if (visualParams.glow) {
          ctx.shadowBlur = visualParams.glow;
          ctx.shadowColor = colors.dot;
        }
        ctx.fill();
        if (visualParams.glow) ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const pa = particles[a], pb = particles[b];
          const ddx = pa.x - pb.x, ddy = pa.y - pb.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < linkDist) {
            ctx.globalAlpha = (1 - dist / linkDist) * visualParams.lineAlpha;
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(step);
    }

    function start() {
      if (!rafId) { running = true; rafId = window.requestAnimationFrame(step); }
    }
    function stop() {
      running = false;
      if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    }

    resize();
    start();

    let resizeTimer;
    on(window, 'resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    if (hasFinePointer) {
      on(window, 'pointermove', function (e) {
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      }, { passive: true });
      on(window, 'blur', function () { mouse.active = false; });
      on(document, 'mouseleave', function () { mouse.active = false; });
    }

    on(document, 'visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    if (typeof MutationObserver === 'function') {
      const themeObserver = new MutationObserver(function () {
        colors = readAccentColors();
        visualParams = getVisualParams();
        resize();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    if (typeof reduceMotionMQ.addEventListener === 'function') {
      reduceMotionMQ.addEventListener('change', function (e) {
        if (e.matches) { stop(); canvas.style.display = 'none'; }
      });
    }
  }

  function initClickEffects() {
    if (document.getElementById('bacClickFxCanvas')) return;
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'bacClickFxCanvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let ripples = [];
    let rafId = null;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    let resizeTimer;
    on(window, 'resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    function spawnRipple(x, y) {
      const accent = readAccentColors().dot;
      const dots = [];
      const dotCount = 5;
      for (let i = 0; i < dotCount; i++) {
        const angle = (Math.PI * 2 * i) / dotCount + Math.random() * 0.4;
        const speed = 0.8 + Math.random() * 0.9;
        dots.push({
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1
        });
      }
      ripples.push({ x: x, y: y, r: 0, life: 1, color: accent, dots: dots });
      loop();
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 2.2;
        rp.life -= 0.028;

        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = Math.max(rp.life, 0) * 0.5;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        for (let d = 0; d < rp.dots.length; d++) {
          const dot = rp.dots[d];
          dot.x += dot.vx;
          dot.y += dot.vy;
          dot.life -= 0.03;
          if (dot.life > 0) {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = rp.color;
            ctx.globalAlpha = Math.max(dot.life, 0) * 0.7;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        if (rp.life <= 0) ripples.splice(i, 1);
      }

      if (ripples.length > 0) {
        rafId = window.requestAnimationFrame(frame);
      } else {
        rafId = null;
      }
    }

    function loop() {
      if (!rafId) rafId = window.requestAnimationFrame(frame);
    }

    on(document, 'pointerdown', function (e) {
      if (e.pointerType === 'mouse' && typeof e.button === 'number' && e.button !== 0) return;
      spawnRipple(e.clientX, e.clientY);
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     8ب. قائمة التنقل المنسدلة (Hamburger Nav Menu) — التفاعل (فتح/إغلاق)
     --------------------------------------------------------- */
  function initNavMenu() {
    const btn = document.getElementById('navMenuBtn');
    const panel = document.getElementById('navMenuPanel');
    if (!btn || !panel) return;

    let navOpen = false;

    function openMenu() {
      if (navOpen) return;
      navOpen = true;
      btn.classList.add('open');
      panel.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');
    }
    function closeMenu() {
      if (!navOpen) return;
      navOpen = false;
      btn.classList.remove('open');
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    }

    on(btn, 'click', function (e) {
      e.stopPropagation();
      navOpen ? closeMenu() : openMenu();
    });

    on(document, 'click', function (e) {
      if (!navOpen) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      closeMenu();
    });

    on(panel, 'click', function (e) {
      if (e.target.closest('.nav-menu-item')) closeMenu();
    });

    on(document, 'keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    let navResizeTimer;
    on(window, 'resize', function () {
      clearTimeout(navResizeTimer);
      navResizeTimer = setTimeout(closeMenu, 120);
    });
  }

  /* ---------------------------------------------------------
     8ج-1. توحيد محتوى قائمة التنقل ☰ في كل صفحات الموقع
     ------------------------------------------------------------
     مصدر واحد فقط لكل روابط القائمة (BAC_NAV_ITEMS)، بنفس الترتيب
     والأسماء والأيقونات في كل صفحة:
       1) الصفحة الرئيسية   2) المنتدى   3) المكتبة
       4) نصائح و توجيهات   5) المكتسبات القبلية   6) إضافة ملفات
       7) حساب المعدل       8) الدعم   9) السياسة والخصوصية
     rebuildNavMenu() تُفرّغ .nav-menu-panel الموجودة أصلاً في HTML كل
     صفحة (بغض النظر عن محتواها القديم المختلف من صفحة لأخرى) وتُعيد
     بناءها بالكامل من هذا المصدر الموحّد، بدل تعديل عشرات ملفات HTML
     يدويًا وتكرار احتمال اختلاف الترتيب أو نسيان رابط أو تكرار آخر.
     المسارات نسبية وتُحل تلقائيًا حسب عمق الصفحة (الجذر أو داخل
     Branches/)، بنفس منطق "/Branches/" المستخدم أصلاً في بقية الملف.
     لا يُحذف أي شيء آخر من الصفحة ولا أي صفحة من الموقع — رابط
     "المكتسبات القبلية" (play.html) يبقى متاحًا كبطاقة مميزة في
     الصفحة الرئيسية كما هو، فقط محتوى قائمة ☰ تحديدًا يُوحَّد الآن. */
  var BAC_NAV_ITEMS = [
    { label: 'الصفحة الرئيسية',   icon: '🏠', path: 'index.html' },
    { label: 'المنتدى',           icon: '📚', path: 'chat.html' },
    { label: 'المكتبة',           icon: '📖', path: 'library.html' },
    { label: 'نصائح و توجيهات',   icon: '💡', path: 'guidance.html' },
    { label: 'المكتسبات القبلية', icon: '🧠', path: 'play.html' },
    { label: 'إضافة ملفات',       icon: '📤', path: 'add-files.html' },
    { label: 'حساب المعدل',       icon: '🧮', path: 'calculator.html' },
    { label: 'الدعم',             icon: '🎧', href: 'https://www.facebook.com/profile.php?id=61593220613025', external: true },
    { label: 'السياسة والخصوصية', icon: '🛡️', path: 'privacy.html' }
  ];

  function bacNavPathPrefix() {
    return location.pathname.indexOf('/Branches/') !== -1 ? '../' : '';
  }

  function rebuildNavMenu() {
    var panel = document.querySelector('.nav-menu-panel');
    if (!panel) return; // الصفحة لا تحتوي قائمة ☰ أصلًا — لا شيء لفعله

    var prefix = bacNavPathPrefix();
    panel.innerHTML = '';

    BAC_NAV_ITEMS.forEach(function (item) {
      var link = document.createElement('a');
      link.className = 'nav-menu-item';
      link.setAttribute('role', 'menuitem');

      if (item.external) {
        link.href = item.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else {
        link.href = prefix + item.path;
      }

      link.innerHTML = '<span class="nav-menu-item-icon">' + item.icon + '</span>' + item.label;
      panel.appendChild(link);
    });
  }

  /* ---------------------------------------------------------
     8ج-2. الإشعارات (🔔) + "الدراسة لاحقًا" — ميزات Firebase اختيارية
     --------------------------------------------------------- */
  function pageManagesOwnFirebase() {
    return !!document.querySelector('script[src*="firebase-firestore-compat"]');
  }

  function initBacCloudFeatures() {
    if (pageManagesOwnFirebase()) return;

    loadScriptTag(siblingUrl('firebase-shared.js'))
      .then(function () {
        /* كل ملف يُحمَّل باستقلال: فشل أحدهما لا يُعطّل الآخر */
        return Promise.all([
          loadScriptTag(siblingUrl('notifications.js')).catch(function (e) { console.warn('[BacOrbit] تعذّر تحميل notifications.js', e); }),
          loadScriptTag(siblingUrl('study-later.js')).catch(function (e) { console.warn('[BacOrbit] تعذّر تحميل study-later.js', e); })
        ]);
      })
      .then(function () { return window.BacFirebase.ready(); })
      .then(function (ctx) {
        if (ctx && ctx.me && ctx.me.banned) return;
        if (window.BacNotifications) window.BacNotifications.init(ctx);
        if (window.BacStudyLater) window.BacStudyLater.init(ctx);
      })
      .catch(function (err) {
        console.warn('[BacOrbit] تعذّر تفعيل الإشعارات/الدراسة لاحقًا (لن يؤثر على بقية الموقع)', err);
      });
  }

  /* ---------------------------------------------------------
     8ج. مؤقت الدراسة (Study Timer)
     --------------------------------------------------------- */
  const TIMER_KEY = 'bacorbit_timer_state_v1';
  const TIMER_MIN_SEC = 60;
  const TIMER_MAX_SEC = 180 * 60;
  const TIMER_DEFAULT_SEC = 45 * 60;

  function loadTimerState() {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return Object.assign({
          totalSeconds: TIMER_DEFAULT_SEC, remaining: TIMER_DEFAULT_SEC,
          running: false, endAt: null, hidden: true, finishedAlertShown: false
        }, parsed);
      }
    } catch (e) {}
    return {
      totalSeconds: TIMER_DEFAULT_SEC, remaining: TIMER_DEFAULT_SEC,
      running: false, endAt: null, hidden: true, finishedAlertShown: false
    };
  }
  function saveTimerState(state) {
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function timerComputeRemaining(state) {
    if (state.running && state.endAt) return Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
    return Math.max(0, Math.round(state.remaining));
  }
  function timerFormat(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) {
      return h + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }
  function initStudyTimer() {
    const navWrap = document.querySelector('.nav-menu-wrap');
    if (!navWrap || document.getElementById('bacTimerBtn')) return;

    let state = loadTimerState();
    let intervalId = null;
    let audioCtx = null;
    let isEditing = false;
    let dragging = false, dragOffsetX = 0, dragOffsetY = 0;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'bacTimerBtn';
    btn.className = 'bac-timer-btn';
    btn.setAttribute('aria-label', 'مؤقت الدراسة');
    btn.title = 'مؤقت الدراسة';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/><path d="M12 2v3"/></svg>' +
      '<span class="bac-timer-badge" id="bacTimerBadge"></span>';
    navWrap.appendChild(btn);

    const widget = document.createElement('div');
    widget.id = 'bacTimerWidget';
    widget.className = 'bac-timer-widget';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'مؤقت الدراسة');
    widget.innerHTML =
      '<div class="bac-timer-head" id="bacTimerHead">' +
        '<span class="bac-timer-drag-dots" aria-hidden="true">⠿⠿</span>' +
        '<span class="bac-timer-title">⏱️ مؤقت الدراسة</span>' +
        '<button type="button" class="bac-timer-close" id="bacTimerClose" aria-label="إخفاء المؤقت">✕</button>' +
      '</div>' +
      '<div class="bac-timer-body">' +
        '<button type="button" class="bac-timer-adjust-btn" data-delta="-15">−15</button>' +
        '<div class="bac-timer-display-wrap">' +
          '<span class="bac-timer-display" id="bacTimerDisplay" tabindex="0" title="اضغط للتعديل">45:00</span>' +
          '<input type="text" id="bacTimerEditInput" class="bac-timer-edit-input" inputmode="numeric" autocomplete="off">' +
        '</div>' +
        '<button type="button" class="bac-timer-adjust-btn" data-delta="15">+15</button>' +
      '</div>' +
      '<div class="bac-timer-controls">' +
        '<button type="button" class="bac-timer-primary-btn" id="bacTimerToggle">▶ ابدأ</button>' +
        '<button type="button" class="bac-timer-secondary-btn" id="bacTimerReset">↺</button>' +
      '</div>' +
      '<p class="bac-timer-hint">كل دقيقة دراسة تقرّبك من هدفك 🌟</p>';
    document.body.appendChild(widget);

    const badgeEl = btn.querySelector('#bacTimerBadge');
    const displayEl = widget.querySelector('#bacTimerDisplay');
    const editInput = widget.querySelector('#bacTimerEditInput');
    const toggleBtn = widget.querySelector('#bacTimerToggle');
    const resetBtn = widget.querySelector('#bacTimerReset');
    const closeBtn = widget.querySelector('#bacTimerClose');
    const headEl = widget.querySelector('#bacTimerHead');

    function ensureAudio() {
      if (audioCtx) return audioCtx;
      try { const Ctx = window.AudioContext || window.webkitAudioContext; if (Ctx) audioCtx = new Ctx(); } catch (e) {}
      return audioCtx;
    }
    function playChime() {
      const ctx = ensureAudio();
      if (!ctx) return;
      try {
        [0, 0.22, 0.44].forEach(function (delay, i) {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = i === 2 ? 880 : 660;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.35);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.4);
        });
      } catch (e) {}
    }

    let finishOverlay = null;
    function ensureFinishOverlay() {
      if (finishOverlay) return finishOverlay;
      finishOverlay = document.createElement('div');
      finishOverlay.className = 'bac-timer-finish-overlay';
      finishOverlay.innerHTML =
        '<div class="bac-timer-finish-card">' +
          '<div class="bac-timer-finish-icon">⏰</div>' +
          '<h3>انتهى وقت الدراسة!</h3>' +
          '<p>أحسنت، خذ استراحة قصيرة ثم عد بحماس 💪</p>' +
          '<button type="button" class="restart-btn" id="bacTimerFinishOk">حسنًا</button>' +
        '</div>';
      document.body.appendChild(finishOverlay);
      finishOverlay.querySelector('#bacTimerFinishOk').addEventListener('click', hideFinishOverlay);
      finishOverlay.addEventListener('click', function (e) { if (e.target === finishOverlay) hideFinishOverlay(); });
      return finishOverlay;
    }
    let finishTitleTimer = null;
    const originalTitle = document.title;
    function showFinishOverlay() {
      ensureFinishOverlay().classList.add('show');
      playChime();
      let blink = false;
      clearInterval(finishTitleTimer);
      finishTitleTimer = setInterval(function () {
        document.title = blink ? originalTitle : '⏰ انتهى الوقت!';
        blink = !blink;
      }, 1200);
    }
    function hideFinishOverlay() {
      if (finishOverlay) finishOverlay.classList.remove('show');
      clearInterval(finishTitleTimer);
      document.title = originalTitle;
    }

    function persist() { saveTimerState(state); }

    function applyPosition() {
      if (state.pos && typeof state.pos.left === 'number' && !dragging) {
        const maxLeft = window.innerWidth - widget.offsetWidth - 6;
        const maxTop = window.innerHeight - widget.offsetHeight - 6;
        const left = Math.max(6, Math.min(state.pos.left, maxLeft));
        const top = Math.max(6, Math.min(state.pos.top, maxTop));
        widget.style.left = left + 'px';
        widget.style.top = top + 'px';
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
      }
    }

    function render() {
      const rem = timerComputeRemaining(state);
      if (!isEditing) {
        displayEl.textContent = timerFormat(rem);
        displayEl.classList.toggle('bac-timer-display-long', rem >= 3600);
      }
      toggleBtn.textContent = state.running ? '⏸ إيقاف' : (rem <= 0 ? '▶ ابدأ' : '▶ استئناف');
      btn.classList.toggle('active', state.running);
      badgeEl.textContent = state.running ? timerFormat(rem) : '';
      widget.classList.toggle('open', !state.hidden);
      btn.setAttribute('aria-expanded', state.hidden ? 'false' : 'true');
      btn.title = state.running ? 'مؤقت الدراسة — ' + timerFormat(rem) + ' متبقية' : 'مؤقت الدراسة';
      if (!state.hidden) applyPosition();
    }

    function tick() {
      const rem = timerComputeRemaining(state);
      if (state.running && rem <= 0 && !state.finishedAlertShown) {
        state.running = false; state.endAt = null; state.remaining = 0; state.finishedAlertShown = true;
        persist(); showFinishOverlay();
      }
      render();
      manageInterval();
    }
    function manageInterval() {
      const needsTick = state.running;
      if (needsTick && !intervalId) intervalId = setInterval(tick, 500);
      else if (!needsTick && intervalId) { clearInterval(intervalId); intervalId = null; }
    }

    function startTimer() {
      const rem = timerComputeRemaining(state);
      const startFrom = rem > 0 ? rem : state.totalSeconds;
      state.remaining = startFrom;
      state.endAt = Date.now() + startFrom * 1000;
      state.running = true; state.finishedAlertShown = false;
      hideFinishOverlay(); persist(); render(); manageInterval();
    }
    function pauseTimer() {
      state.remaining = timerComputeRemaining(state);
      state.running = false; state.endAt = null;
      persist(); render(); manageInterval();
    }
    function resetTimer() {
      state.running = false; state.endAt = null;
      state.remaining = state.totalSeconds; state.finishedAlertShown = false;
      hideFinishOverlay(); persist(); render(); manageInterval();
    }
    function adjustMinutes(deltaMin) {
      const deltaSec = deltaMin * 60;
      const rem = timerComputeRemaining(state);
      if (state.running) {
        const newRem = Math.max(0, Math.min(TIMER_MAX_SEC, rem + deltaSec));
        state.totalSeconds = Math.max(TIMER_MIN_SEC, Math.min(TIMER_MAX_SEC, state.totalSeconds + deltaSec));
        state.remaining = newRem;
        state.endAt = Date.now() + newRem * 1000;
      } else {
        const newTotal = Math.max(TIMER_MIN_SEC, Math.min(TIMER_MAX_SEC, state.totalSeconds + deltaSec));
        state.totalSeconds = newTotal; state.remaining = newTotal;
      }
      state.finishedAlertShown = false;
      persist(); render();
    }
    function toggleWidget() { state.hidden = !state.hidden; persist(); render(); }
    function hideWidget() { if (state.hidden) return; state.hidden = true; persist(); render(); }

    function enterEditMode() {
      if (isEditing) return;
      isEditing = true;
      const rem = timerComputeRemaining(state);
      editInput.value = timerFormat(rem);
      editInput.classList.toggle('long', rem >= 3600);
      displayEl.classList.add('bac-timer-display-hidden');
      editInput.classList.add('show');
      editInput.focus();
      editInput.select();
    }
    function exitEditMode(apply) {
      if (!isEditing) return;
      isEditing = false;
      displayEl.classList.remove('bac-timer-display-hidden');
      editInput.classList.remove('show');
      if (apply) applyEditedValue(editInput.value);
      else render();
    }
    function applyEditedValue(raw) {
      raw = (raw || '').trim();
      let totalSec = null;
      if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(raw)) {
        const parts = raw.split(':');
        const h = parseInt(parts[0], 10), m = Math.min(59, parseInt(parts[1], 10)), s = Math.min(59, parseInt(parts[2], 10));
        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) totalSec = h * 3600 + m * 60 + s;
      } else if (/^\d{1,3}:\d{1,2}$/.test(raw)) {
        const parts = raw.split(':');
        const m = parseInt(parts[0], 10), s = Math.min(59, parseInt(parts[1], 10));
        if (!isNaN(m) && !isNaN(s)) totalSec = m * 60 + s;
      } else if (/^\d{1,3}$/.test(raw)) {
        totalSec = parseInt(raw, 10) * 60;
      }
      if (totalSec === null || isNaN(totalSec) || totalSec <= 0) { render(); return; }
      totalSec = Math.max(TIMER_MIN_SEC, Math.min(TIMER_MAX_SEC, totalSec));
      state.totalSeconds = totalSec;
      state.remaining = totalSec;
      if (state.running) state.endAt = Date.now() + totalSec * 1000;
      state.finishedAlertShown = false;
      persist(); render();
    }

    function dragStart(clientX, clientY) {
      dragging = true;
      const rect = widget.getBoundingClientRect();
      dragOffsetX = clientX - rect.left;
      dragOffsetY = clientY - rect.top;
      widget.classList.add('dragging');
    }
    function dragMove(clientX, clientY) {
      if (!dragging) return;
      let left = clientX - dragOffsetX;
      let top = clientY - dragOffsetY;
      const maxLeft = window.innerWidth - widget.offsetWidth - 6;
      const maxTop = window.innerHeight - widget.offsetHeight - 6;
      left = Math.max(6, Math.min(left, maxLeft));
      top = Math.max(6, Math.min(top, maxTop));
      widget.style.left = left + 'px';
      widget.style.top = top + 'px';
      widget.style.bottom = 'auto';
      widget.style.right = 'auto';
    }
    function dragEnd() {
      if (!dragging) return;
      dragging = false;
      widget.classList.remove('dragging');
      const rect = widget.getBoundingClientRect();
      state.pos = { left: rect.left, top: rect.top };
      persist();
    }

    on(btn, 'click', toggleWidget);
    on(closeBtn, 'click', hideWidget);
    on(toggleBtn, 'click', function () { state.running ? pauseTimer() : startTimer(); });
    on(resetBtn, 'click', resetTimer);
    qsa('.bac-timer-adjust-btn', widget).forEach(function (b) {
      on(b, 'click', function () { adjustMinutes(parseInt(b.dataset.delta, 10)); });
    });

    on(displayEl, 'click', enterEditMode);
    on(displayEl, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterEditMode(); } });
    on(editInput, 'keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); exitEditMode(true); }
      else if (e.key === 'Escape') { e.preventDefault(); exitEditMode(false); }
    });
    on(editInput, 'blur', function () { exitEditMode(true); });

    on(headEl, 'mousedown', function (e) {
      if (e.target.closest('.bac-timer-close')) return;
      dragStart(e.clientX, e.clientY);
    });
    on(document, 'mousemove', function (e) { dragMove(e.clientX, e.clientY); });
    on(document, 'mouseup', dragEnd);
    on(headEl, 'touchstart', function (e) {
      if (e.target.closest('.bac-timer-close')) return;
      const t = e.touches[0]; dragStart(t.clientX, t.clientY);
    }, { passive: true });
    on(document, 'touchmove', function (e) { if (!dragging) return; const t = e.touches[0]; dragMove(t.clientX, t.clientY); }, { passive: true });
    on(document, 'touchend', dragEnd);

    on(document, 'keydown', function (e) {
      if (state.hidden || isEditing) return;
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); state.running ? pauseTimer() : startTimer(); }
      else if (e.key === 'r' || e.key === 'R') { resetTimer(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); adjustMinutes(e.shiftKey ? 15 : 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); adjustMinutes(e.shiftKey ? -15 : -1); }
      else if (e.key === 'Escape') { hideWidget(); }
    });

    on(window, 'storage', function (e) {
      if (e.key !== TIMER_KEY) return;
      state = loadTimerState();
      hideFinishOverlay(); render(); manageInterval();
    });
    on(window, 'resize', function () { applyPosition(); });

    render();
    manageInterval();
  }
 
  /* ---------------------------------------------------------
     8د. العدّاد التنازلي (Flip Clock) لبكالوريا 2027
     --------------------------------------------------------- */
  var BAC_COUNTDOWN_TARGET_MS = Date.UTC(2027, 5, 6, 23, 0, 0);

  function bacCountdownPad(n, len) {
    var s = String(Math.max(0, n));
    while (s.length < len) s = '0' + s;
    return s;
  }

  function bacBuildFlipUnit(digitCount, label) {
    var unit = document.createElement('div');
    unit.className = 'bac-flip-unit';

    var digitsWrap = document.createElement('div');
    digitsWrap.className = 'bac-flip-digits';

    var cards = [];
    for (var i = 0; i < digitCount; i++) {
      var card = document.createElement('div');
      card.className = 'bac-flip-card';

      var inner = document.createElement('div');
      inner.className = 'bac-flip-card-inner';

      var face1 = document.createElement('div');
      face1.className = 'bac-flip-face bac-flip-face-front';
      face1.textContent = '0';

      var face2 = document.createElement('div');
      face2.className = 'bac-flip-face bac-flip-face-back';
      face2.textContent = '0';

      inner.appendChild(face1);
      inner.appendChild(face2);
      card.appendChild(inner);
      digitsWrap.appendChild(card);

      cards.push({ inner: inner, face1: face1, face2: face2, toggled: false, current: '0' });
    }

    var labelEl = document.createElement('div');
    labelEl.className = 'bac-flip-label';
    labelEl.textContent = label;

    unit.appendChild(digitsWrap);
    unit.appendChild(labelEl);

    return { el: unit, cards: cards };
  }

  function bacSetInitialFlip(unit, valueStr) {
    for (var i = 0; i < unit.cards.length; i++) {
      var card = unit.cards[i];
      var digit = valueStr[i] || '0';
      card.current = digit;
      card.face1.textContent = digit;
      card.face2.textContent = digit;
    }
  }

  function bacUpdateFlipUnit(unit, valueStr) {
    for (var i = 0; i < unit.cards.length; i++) {
      var card = unit.cards[i];
      var digit = valueStr[i] || '0';
      if (digit === card.current) continue;
      card.current = digit;
      if (card.toggled) card.face1.textContent = digit;
      else card.face2.textContent = digit;
      card.toggled = !card.toggled;
      card.inner.classList.toggle('bac-flip-rot', card.toggled);
    }
  }

  function bacComputeCountdownParts() {
    var diff = BAC_COUNTDOWN_TARGET_MS - Date.now();
    if (diff <= 0) return null;
    return {
      days: bacCountdownPad(Math.floor(diff / 86400000), 3),
      hours: bacCountdownPad(Math.floor((diff % 86400000) / 3600000), 2),
      mins: bacCountdownPad(Math.floor((diff % 3600000) / 60000), 2),
      secs: bacCountdownPad(Math.floor((diff % 60000) / 1000), 2)
    };
  }

  function bacShowCountdownFinished(wrap) {
    wrap.innerHTML = '';
    var msg = document.createElement('div');
    msg.className = 'bac-countdown-finished';
    msg.textContent = 'انطلقت بكالوريا 2027 🎓';
    wrap.appendChild(msg);
  }

  function initBacCountdown() {
    var wrap = document.getElementById('bacFlipClock');
    if (!wrap) return;

    var initialParts = bacComputeCountdownParts();
    if (!initialParts) { bacShowCountdownFinished(wrap); return; }

    var daysUnit = bacBuildFlipUnit(3, 'أيام');
    var hoursUnit = bacBuildFlipUnit(2, 'ساعات');
    var minsUnit = bacBuildFlipUnit(2, 'دقائق');
    var secsUnit = bacBuildFlipUnit(2, 'ثوانٍ');

    wrap.appendChild(daysUnit.el);
    wrap.appendChild(hoursUnit.el);
    wrap.appendChild(minsUnit.el);
    wrap.appendChild(secsUnit.el);

    bacSetInitialFlip(daysUnit, initialParts.days);
    bacSetInitialFlip(hoursUnit, initialParts.hours);
    bacSetInitialFlip(minsUnit, initialParts.mins);
    bacSetInitialFlip(secsUnit, initialParts.secs);

    var timer = setInterval(function () {
      var parts = bacComputeCountdownParts();
      if (!parts) { clearInterval(timer); bacShowCountdownFinished(wrap); return; }
      bacUpdateFlipUnit(daysUnit, parts.days);
      bacUpdateFlipUnit(hoursUnit, parts.hours);
      bacUpdateFlipUnit(minsUnit, parts.mins);
      bacUpdateFlipUnit(secsUnit, parts.secs);
    }, 1000);
  }

  /* ---------------------------------------------------------
     8هـ. حفظ شعبة المستخدم
     --------------------------------------------------------- */
  var BAC_BRANCH_STORAGE_KEY = 'bacorbit_saved_branch';
  var BAC_BRANCH_PROMPT_KEY = 'bacorbit_branch_prompt_shown';

  function bacLoadSavedBranch() {
    try {
      var raw = localStorage.getItem(BAC_BRANCH_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.url && parsed.name) return parsed;
      return null;
    } catch (e) { return null; }
  }
  function bacSaveBranch(data) {
    try { localStorage.setItem(BAC_BRANCH_STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function bacClearSavedBranch() {
    try { localStorage.removeItem(BAC_BRANCH_STORAGE_KEY); } catch (e) {}
  }
  function bacMarkBranchPromptShown() {
    try { localStorage.setItem(BAC_BRANCH_PROMPT_KEY, '1'); } catch (e) {}
  }
  function bacWasBranchPromptShown() {
    try { return localStorage.getItem(BAC_BRANCH_PROMPT_KEY) === '1'; } catch (e) { return false; }
  }

  function bacHomeHrefFromCurrentPage() {
    return location.pathname.indexOf('/Branches/') !== -1 ? '../index.html' : 'index.html';
  }

  function bacResolveBranchUrl(savedUrl) {
    var insideBranches = location.pathname.indexOf('/Branches/') !== -1;
    return insideBranches ? savedUrl.replace(/^Branches\//, '') : savedUrl;
  }

  var bacBranchModalOverlay = null;
  function bacEnsureBranchModal() {
    if (bacBranchModalOverlay) return bacBranchModalOverlay;
    bacBranchModalOverlay = document.createElement('div');
    bacBranchModalOverlay.className = 'bac-branch-modal-overlay';
    bacBranchModalOverlay.innerHTML =
      '<div class="bac-branch-modal">' +
        '<div class="bac-branch-modal-icon">💾</div>' +
        '<h3>هل تريد حفظ شعبتك؟</h3>' +
        '<p>لن تضطر إلى اختيار شعبتك مرة أخرى عند زيارة الموقع.</p>' +
        '<div class="bac-branch-modal-actions">' +
          '<button type="button" class="bac-branch-modal-btn bac-branch-modal-save" id="bacBranchSaveBtn">حفظ</button>' +
          '<button type="button" class="bac-branch-modal-btn bac-branch-modal-later" id="bacBranchLaterBtn">ليس الآن</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bacBranchModalOverlay);
    return bacBranchModalOverlay;
  }
  function bacOpenBranchModal(onChoice) {
    var overlay = bacEnsureBranchModal();
    overlay.classList.add('open');
    var saveBtn = document.getElementById('bacBranchSaveBtn');
    var laterBtn = document.getElementById('bacBranchLaterBtn');

    function close(choice) {
      overlay.classList.remove('open');
      saveBtn.removeEventListener('click', onSave);
      laterBtn.removeEventListener('click', onLater);
      overlay.removeEventListener('click', onOverlayClick);
      onChoice(choice);
    }
    function onSave() { close(true); }
    function onLater() { close(false); }
    function onOverlayClick(e) { if (e.target === overlay) close(false); }

    saveBtn.addEventListener('click', onSave);
    laterBtn.addEventListener('click', onLater);
    overlay.addEventListener('click', onOverlayClick);
  }

  function initBranchSelectionCards() {
    var cards = qsa('.card[data-branch-key]');
    if (!cards.length) return;

    cards.forEach(function (card) {
      on(card, 'click', function () {
        var url = card.getAttribute('data-branch-url');
        var name = card.getAttribute('data-branch-name');
        var key = card.getAttribute('data-branch-key');
        var saved = bacLoadSavedBranch();

        if (saved) {
          bacSaveBranch({ key: key, name: name, url: url });
          window.location.href = url;
          return;
        }
        if (bacWasBranchPromptShown()) {
          window.location.href = url;
          return;
        }

        bacOpenBranchModal(function (wantsSave) {
          bacMarkBranchPromptShown();
          if (wantsSave) bacSaveBranch({ key: key, name: name, url: url });
          window.location.href = url;
        });
      });
    });
  }

  function initCountdownBranchAction() {
    var mount = document.getElementById('bacCountdownBranchAction');
    if (!mount) return;

    var saved = bacLoadSavedBranch();
    if (!saved) { mount.innerHTML = ''; return; }

    mount.innerHTML = '<button type="button" class="bac-change-branch-link" id="bacChangeBranchLink">↺ تغيير الشعبة</button>';
    on(document.getElementById('bacChangeBranchLink'), 'click', function () {
      bacClearSavedBranch();
      window.location.href = bacHomeHrefFromCurrentPage();
    });
  }

  var BRANCH_TOP_PAGE_RE = /\/Branches\/1_(science|math|technical|economy|info)\.html$/;

  function initSmartBackLinks() {
    if (BRANCH_TOP_PAGE_RE.test(location.pathname)) return;

    var saved = bacLoadSavedBranch();
    if (!saved) return;

    var target = bacResolveBranchUrl(saved.url);
    qsa('a.back').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (/(^|\/)index\.html$/.test(href)) {
        link.setAttribute('href', target);
      }
    });
  }

  function initBranchPageChangeButton() {
    if (!BRANCH_TOP_PAGE_RE.test(location.pathname)) return;

    var link = document.querySelector('a.back');
    if (!link) return;

    link.textContent = '🔄 تغيير الشعبة';
    link.setAttribute('href', '../index.html');

    on(link, 'click', function (e) {
      e.preventDefault();
      bacClearSavedBranch();
      window.location.href = '../index.html';
    });
  }

  /* ---------------------------------------------------------
     9. التهيئة العامة
     --------------------------------------------------------- */
  function init() {
    safeRun(ensureFavicon, 'أيقونة الموقع (favicon)');
    safeRun(initThemeToggle, 'الوضع الداكن/الفاتح');
    safeRun(initTopBarScroll, 'الشريط العلوي');
    safeRun(ensureImageViewer, 'مكبر الصور الموحّد');
    safeRun(enhanceLessonImages, 'عارض صور الدروس');
    safeRun(initLessonZoomControl, 'شريط التحكم بحجم صور الدروس');
    safeRun(initVisitedTopicsTracking, 'تمييز المواضيع التي تمت زيارتها');
    safeRun(ensureToggleContentFallback, 'toggleContent الاحتياطي');
    safeRun(initNavMenu, 'قائمة التنقل');
    safeRun(rebuildNavMenu, 'توحيد قائمة التنقل الجانبية');
    safeRun(initBacCloudFeatures, 'الإشعارات والدراسة لاحقًا');
    safeRun(initStudyTimer, 'مؤقت الدراسة');
    safeRun(initInteractiveBackground, 'الخلفية التفاعلية');
    safeRun(initClickEffects, 'تأثير النقر');
    safeRun(initBacCountdown, 'العدّاد التنازلي لبكالوريا 2027');
    safeRun(initBranchSelectionCards, 'حفظ اختيار الشعبة');
    safeRun(initCountdownBranchAction, 'رابط تغيير الشعبة أسفل العدّاد');
    safeRun(initSmartBackLinks, 'أزرار العودة الذكية للشعبة المحفوظة');
    safeRun(initBranchPageChangeButton, 'زر تغيير الشعبة في صفحات اختيار المادة');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
