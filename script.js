/* ============================================================
   BacOrbit — script.js
   الملف المركزي لكل التفاعلات: الثيم، الشريط العلوي، تأثير النبض،
   الإشعارات، تنزيل المواضيع والدروس، وعارض تكبير/تنزيل الصور.
   مصمم ليعمل بأمان على أي صفحة حتى لو كانت بعض العناصر غير موجودة.
   ============================================================ */

(function () {
  'use strict';

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
     1. الوضع الداكن / الفاتح (Theme)
     نفس المفتاح المستخدم في chat.html (bacorbit_theme) لضمان
     تزامن التفضيل عبر كامل الموقع.
     --------------------------------------------------------- */
  const THEME_KEY = 'bacorbit_theme';

  function applyStoredTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch (e) { /* localStorage قد يكون غير متاح (وضع خاص مثلاً) */ }
  }
  applyStoredTheme(); // ينفَّذ فورًا (قبل رسم الصفحة) لمنع وميض الثيم

  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return; // الصفحة لا تحتوي زر ثيم (مثل chat.html) — لا مشكلة
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
     4. إشعارات (Toast) — عنصر يُولَّد ديناميكيًا بالكامل
        (لا يحتاج أي تعديل في HTML)
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
     5. تنزيل الملفات — أداة مشتركة تُستخدم في كل الأزرار
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

  /* ---------- 5.1 تنزيل موضوع واحد (زر .topic-download-btn) ---------- */
  window.downloadTopic = function (event, filePath, fileName) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event ? event.currentTarget : null;
    if (btn && btn.dataset.busy === '1') return; // منع الضغط المتكرر

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

  /* ---------- 5.2 تنزيل مجلد دروس كامل (زر .download-all-btn) ---------- */
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
        await new Promise(function (r) { setTimeout(r, 220); }); // تجنّب حجب المتصفح للتنزيلات المتتالية
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
     6. عارض الصور — مكبّر مشترك واحد لكل صفحة + تنزيل جانبي لصور الدروس
     يُنشئ المكبّر مرة واحدة في أعلى الصفحة (أول عنصر داخل body)،
     وكل صور الدروس (بجميع المواد) تفتح داخل نفس المكبّر عند النقر عليها.
     يعتمد على تنسيقات .bac-img-frame و.bac-image-viewer-* في style.css.
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
      if (img.closest('.bac-img-frame')) return; // مُجهّزة مسبقًا

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

  /* ---------------------------------------------------------
     6ب. شريط التحكم بحجم صور الدروس (تكبير/تصغير فوري)
     يُنشأ ديناميكياً فوق شبكة الدروس (.lessons) في أي صفحة تحتوي
     عليها، ويتحكم بعرض الصور عبر متغير CSS واحد (--bac-lesson-zoom)
     ضمن نطاق آمن (50%–100%) بحيث لا تتجاوز الصور حدود حاويتها أبداً.
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
     7. توافقية مستقبلية: toggleContent احتياطي
     (فقط إن لم تُعرّفه الصفحة نفسها محليًا، لا يُبطل أي كود موجود)
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
     طبقتا Canvas منفصلتان تمامًا عن DOM الموقع، لا تلمسان أي عنصر
     ولا تعترضان أي نقر أو تحديد نص (pointer-events: none دائمًا).
     - تُقرأ الألوان من متغيرات CSS الحالية (--accent / --accent-soft)
       فتتبدّل تلقائيًا مع تبديل الوضع الداكن/الفاتح.
     - تحترم prefers-reduced-motion وتتوقف تمامًا عند تفعيله.
     - تعطّل تفاعل الماوس (التنافر اللطيف) على الأجهزة اللمسية،
       وتُبقي فقط تأثير النقر الخفيف.
     - تتوقف عن الرسم عند إخفاء التبويب لتوفير الأداء والبطارية.
     --------------------------------------------------------- */

  function readAccentColors() {
    const styles = getComputedStyle(document.documentElement);
    const dot = (styles.getPropertyValue('--bg-particle-dot') || styles.getPropertyValue('--accent') || '#1aff66').trim();
    const line = (styles.getPropertyValue('--bg-particle-line') || styles.getPropertyValue('--accent-soft') || 'rgba(26,255,102,0.4)').trim();
    return { dot: dot, line: line };
  }

  function initInteractiveBackground() {
    if (document.getElementById('bacBgCanvas')) return; // مُهيأ مسبقًا
    if (typeof window.matchMedia !== 'function') return;

    const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionMQ.matches) return; // احترام تفضيل تقليل الحركة فورًا

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
    const mouse = { x: -9999, y: -9999, active: false };
    const smoothMouse = { x: -9999, y: -9999 };
    let running = false;
    let rafId = null;

    function particleTarget() {
      const area = W * H;
      const base = Math.round(area / 24000);
      const max = hasFinePointer ? 85 : 50; // كثافة أقل على الأجهزة اللمسية
      return Math.max(16, Math.min(base, max));
    }

    function makeParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.3 + 0.6
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
            const force = (1 - d / mouseRadius) * 0.5;
            p.x += (dx / d) * force;
            p.y += (dy / d) * force;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colors.dot;
        ctx.globalAlpha = 0.35;
        ctx.fill();
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
            ctx.globalAlpha = (1 - dist / linkDist) * 0.18;
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

    // إعادة قراءة الألوان عند تبديل الوضع الداكن/الفاتح (زر الصفحة الحالية إن وجد)
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      on(themeBtn, 'click', function () {
        setTimeout(function () { colors = readAccentColors(); }, 60);
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
     8ب. قائمة التنقل المنسدلة (Hamburger Nav Menu)
     زر ☰ واحد يفتح لوحة تحتوي: المنتدى، حساب المعدل، الدعم،
     السياسة والخصوصية. يعمل بأمان إن لم تحتوِ الصفحة على العناصر.
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
     9. التهيئة العامة
     --------------------------------------------------------- */
  function init() {
    safeRun(initThemeToggle, 'الوضع الداكن/الفاتح');
    safeRun(initTopBarScroll, 'الشريط العلوي');
    safeRun(ensureImageViewer, 'مكبر الصور الموحّد');
    safeRun(enhanceLessonImages, 'عارض صور الدروس');
    safeRun(initLessonZoomControl, 'شريط التحكم بحجم صور الدروس');
    safeRun(ensureToggleContentFallback, 'toggleContent الاحتياطي');
    safeRun(initNavMenu, 'قائمة التنقل');
    safeRun(initInteractiveBackground, 'الخلفية التفاعلية');
    safeRun(initClickEffects, 'تأثير النقر');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();