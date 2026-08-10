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
     3. تأثير النبض (Ripple) — يعتمد على تنسيقات .js-ripple
        الموجودة أصلًا في style.css
     نستخدم مرحلة الالتقاط (capture) حتى يظهر النبض دائمًا
     حتى لو استُدعي stopPropagation() لاحقًا داخل زر معيّن.
     --------------------------------------------------------- */
  function initRipple() {
    const selector = '.card, .mini-card, .topic-card, button';
    on(document, 'click', function (e) {
      const target = e.target.closest(selector);
      if (!target) return;
      if (target.classList.contains('card-empty')) return;
      if (target.classList.contains('disabled-card')) return;
      if (target.disabled) return;

      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'js-ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top  = (e.clientY - rect.top) + 'px';
      target.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 650);
    }, true);
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
     6. عارض الصور — تكبير/تصغير + تنزيل جانبي لصور الدروس
     يعتمد على تنسيقات .bac-img-frame الموجودة أصلًا في style.css
     ويُنشئ البنية اللازمة ديناميكيًا حول <img> داخل .lesson
     --------------------------------------------------------- */
  const ZOOM_SVG_IN =
    '<svg class="bac-zoom-in" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  const ZOOM_SVG_OUT =
    '<svg class="bac-zoom-out" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  const DOWNLOAD_SVG =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  function baseName(path) {
    const parts = String(path).split('/');
    try { return decodeURIComponent(parts[parts.length - 1] || 'image'); }
    catch (e) { return parts[parts.length - 1] || 'image'; }
  }

  function closeZoom(frame) {
    frame.classList.remove('is-zoomed');
    const host = frame.closest('.lesson, .card, .topic-card, .mini-card');
    if (host) host.classList.remove('bac-zoom-open');
  }

  function openZoom(frame) {
    qsa('.bac-img-frame.is-zoomed').forEach(function (f) {
      if (f !== frame) closeZoom(f);
    });
    frame.classList.add('is-zoomed');
    const host = frame.closest('.lesson, .card, .topic-card, .mini-card');
    if (host) host.classList.add('bac-zoom-open');
  }

  function enhanceLessonImages() {
    qsa('.lesson > img').forEach(function (img) {
      if (img.closest('.bac-img-frame')) return; // مُجهّزة مسبقًا

      const frame = document.createElement('div');
      frame.className = 'bac-img-frame';

      const controls = document.createElement('div');
      controls.className = 'bac-img-controls';

      const zoomBtn = document.createElement('button');
      zoomBtn.type = 'button';
      zoomBtn.className = 'bac-img-zoom-btn';
      zoomBtn.setAttribute('aria-label', 'تكبير/تصغير الصورة');
      zoomBtn.innerHTML = ZOOM_SVG_IN + ZOOM_SVG_OUT;

      const dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'topic-download-btn bac-side-download';
      dlBtn.setAttribute('aria-label', 'تنزيل الصورة');
      dlBtn.innerHTML = DOWNLOAD_SVG;

      controls.appendChild(zoomBtn);
      controls.appendChild(dlBtn);

      img.parentNode.insertBefore(frame, img);
      frame.appendChild(img);
      frame.appendChild(controls);

      on(zoomBtn, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        frame.classList.contains('is-zoomed') ? closeZoom(frame) : openZoom(frame);
      });

      on(img, 'click', function (e) {
        if (frame.classList.contains('is-zoomed')) {
          e.preventDefault();
          e.stopPropagation();
          closeZoom(frame);
        }
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

  function initImageViewerGlobalHandlers() {
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape') {
        qsa('.bac-img-frame.is-zoomed').forEach(closeZoom);
      }
    });
    on(document, 'click', function (e) {
      qsa('.bac-img-frame.is-zoomed').forEach(function (frame) {
        if (!frame.contains(e.target)) closeZoom(frame);
      });
    });
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
     8. التهيئة العامة
     --------------------------------------------------------- */
  function init() {
    safeRun(initThemeToggle, 'الوضع الداكن/الفاتح');
    safeRun(initTopBarScroll, 'الشريط العلوي');
    safeRun(initRipple, 'تأثير النبض');
    safeRun(enhanceLessonImages, 'عارض صور الدروس');
    safeRun(initImageViewerGlobalHandlers, 'أحداث عارض الصور العامة');
    safeRun(ensureToggleContentFallback, 'toggleContent الاحتياطي');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();