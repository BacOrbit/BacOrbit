/* ============================================================
   BacOrbit — study-later.js
   ميزة "الدراسة لاحقًا" — نسخة محدَّثة:
   - زر واحد صغير 🔖 يُدرَج بجانب زر تغيير الوضع الليلي/الفاتح مباشرة
     (وليس زرًا كبيرًا فوق الدروس كما كان سابقًا)، في أي صفحة تحتوي
     .lessons (دروس/سلاسل تمارين) أو .subjects مع .topic-card (مواضيع
     البكالوريا).
   - في صفحات الدروس/التمارين: يُحفظ موضع التمرير الحالي، ومع صفحات
     الوحدات (I_math / I_physic / I_science / I_Islamic / P_english)
     تُحفظ الوحدة النشطة أيضًا حتى تُفتح تلقائيًا عند العودة.
   - في صفحات مواضيع البكالوريا (S_*.html): يعرض الزر قائمة اختيار
     لتحديد الموضوع (السنة) المطلوب حفظه تحديدًا، ويحفظ رابط ملف PDF
     الخاص بذلك الموضوع فقط.
   - التذكيرات تعتمد بالكامل على نظام notifications.js/🔔 الموجود
     أصلًا (نفس مجموعة Firestore "notifications")، دون أي نظام مواز.
   - متوافقة رجوعًا مع الوثائق القديمة (lessonTitle/lessonUrl) التي
     أنشأتها النسخة السابقة من هذا الملف.

   يُستدعى عبر window.BacStudyLater.init({db, me, firebase}).
   ============================================================ */
(function () {
'use strict';

var SESSION_KEY = 'bacorbit_study_reminded_session';
var RESUME_PARAM = 'bacResume';

/* ═══════════ أدوات عامة ═══════════ */
function sessionShown() {
  try { return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function markSessionShown(id) {
  var s = sessionShown();
  s.add(id);
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(s))); } catch (e) {}
}
function sanitize(s) {
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 140);
}
function lessonKeyFor() {
  return location.pathname.replace(/\/+$/, '') || '/';
}
function docIdFor(uid, key) {
  return uid + '__' + sanitize(key);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function findThemeToggle() {
  return document.getElementById('themeToggle') || document.getElementById('themeSwitch');
}

/* يحدد سياق الصفحة الحالية: هل هي صفحة دروس/تمارين، أم صفحة مواضيع
   بكالوريا (سنوات)، أم لا شيء من هذا (فلا يظهر الزر إطلاقًا). */
function getPageContext() {
  if (document.querySelector('.lessons')) return 'lesson';
  if (document.querySelector('.subjects') && document.querySelector('.topic-card')) return 'topic';
  return null;
}

/* حاوية أزرار الوحدات (إن وُجدت) في صفحات I_math/I_physic/I_science/
   I_Islamic/P_english — جميعها تبني أزرارًا بـ data-key وتُضيف كلاس
   "active" على الزر النشط، فهذا الكشف عام ولا يحتاج تخصيصًا لكل صفحة. */
function findUnitsContainer() {
  return document.querySelector('[id$="Units"]');
}
function currentActiveUnitKey() {
  var wrap = findUnitsContainer();
  if (!wrap) return null;
  var activeBtn = wrap.querySelector('button.active');
  return activeBtn ? activeBtn.dataset.key : null;
}

/* ═══════════ الأنماط (تُحقن مرة واحدة فقط) ═══════════ */
function ensureStyles() {
  if (document.getElementById('bacStudyLaterStyles')) return;
  var style = document.createElement('style');
  style.id = 'bacStudyLaterStyles';
  style.textContent =
    '.bac-sl-btn{position:relative;width:44px;height:44px;display:inline-flex;align-items:center;' +
    'justify-content:center;background:var(--track-bg,#0a0a0a);border:1px solid var(--border,#1aff66);' +
    'border-radius:12px;cursor:pointer;padding:0;margin-inline-end:8px;flex-shrink:0;font-size:19px;' +
    'line-height:1;color:var(--footer-text,#888);transition:box-shadow .25s ease,transform .15s ease,color .25s ease;font-family:inherit}' +
    '.bac-sl-btn:hover{box-shadow:0 0 14px var(--accent-glow,rgba(26,255,102,.4))}' +
    '.bac-sl-btn:active{transform:scale(.94)}' +
    '.bac-sl-btn.saved{color:var(--accent,#1aff66);border-color:var(--accent,#1aff66)}' +
    '.bac-sl-modal-overlay{position:fixed;inset:0;z-index:6100;display:none;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,.72);padding:20px}' +
    '.bac-sl-modal-overlay.open{display:flex}' +
    '.bac-sl-modal{max-width:420px;width:100%;max-height:80vh;overflow-y:auto;' +
    'background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);border-radius:18px;' +
    'padding:22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.4)}' +
    '.bac-sl-modal h3{color:var(--accent,#1aff66);font-size:16.5px;margin-bottom:6px;text-align:center}' +
    '.bac-sl-modal p{color:var(--text-secondary,#bdbdbd);font-size:12.5px;text-align:center;margin-bottom:16px;line-height:1.7}' +
    '.bac-sl-modal-list{display:flex;flex-direction:column;gap:8px}' +
    '.bac-sl-modal-item{background:var(--bg,#0d0d0d);border:1.5px solid var(--empty-border,#333);' +
    'color:var(--text,#fff);border-radius:11px;padding:11px 14px;font-size:14px;font-weight:bold;' +
    'cursor:pointer;font-family:inherit;text-align:right;transition:border-color .2s ease,color .2s ease}' +
    '.bac-sl-modal-item:hover{border-color:var(--accent,#1aff66);color:var(--accent,#1aff66)}' +
    '.bac-sl-modal-close{display:block;margin:14px auto 0;background:none;border:none;' +
    'color:var(--footer-text,#888);font-size:12.5px;cursor:pointer;font-family:inherit}';
  document.head.appendChild(style);
}

/* ═══════════ توست بسيط (نفس أسلوب باقي الموقع) ═══════════ */
var toastTimer;
function toast(msg) {
  var host = document.getElementById('bacSlToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'bacSlToastHost';
    host.style.cssText = 'position:fixed;bottom:24px;left:0;right:0;display:flex;justify-content:center;z-index:5000;pointer-events:none';
    var box = document.createElement('div');
    box.id = 'bacSlToastBox';
    box.style.cssText = 'background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);color:var(--accent,#1aff66);' +
      'padding:11px 20px;border-radius:13px;font-weight:bold;font-size:13.5px;box-shadow:0 8px 26px rgba(0,0,0,.4);' +
      'opacity:0;transform:translateY(14px);transition:opacity .3s ease,transform .3s ease;max-width:90%;text-align:center';
    host.appendChild(box);
    document.body.appendChild(host);
  }
  var box = document.getElementById('bacSlToastBox');
  box.textContent = msg;
  box.style.opacity = '1';
  box.style.transform = 'translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    box.style.opacity = '0';
    box.style.transform = 'translateY(14px)';
  }, 2600);
}

/* ═══════════ نافذة اختيار الموضوع (لصفحات S_*.html) ═══════════ */
var modalOverlay = null;
function ensureModal() {
  if (modalOverlay) return modalOverlay;
  modalOverlay = document.createElement('div');
  modalOverlay.className = 'bac-sl-modal-overlay';
  modalOverlay.innerHTML =
    '<div class="bac-sl-modal">' +
      '<h3>🔖 أي موضوع تريد حفظه للدراسة لاحقًا؟</h3>' +
      '<p>سيتم تذكيرك به لاحقًا وسينقلك مباشرة إلى نفس الملف.</p>' +
      '<div class="bac-sl-modal-list"></div>' +
      '<button type="button" class="bac-sl-modal-close">إلغاء</button>' +
    '</div>';
  document.body.appendChild(modalOverlay);
  modalOverlay.querySelector('.bac-sl-modal-close').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  return modalOverlay;
}
function closeModal() {
  if (modalOverlay) modalOverlay.classList.remove('open');
}
function collectTopicOptions() {
  var out = [];
  document.querySelectorAll('.topic-card').forEach(function (card) {
    var h2 = card.querySelector('h2');
    var onclickAttr = card.getAttribute('onclick') || '';
    var m = onclickAttr.match(/window\.open\(\s*['"]([^'"]+)['"]/);
    if (!m) return;
    out.push({ title: h2 ? h2.textContent.trim() : 'موضوع', relUrl: m[1] });
  });
  return out;
}
function openTopicPicker(onPick) {
  ensureStyles();
  var overlay = ensureModal();
  var list = overlay.querySelector('.bac-sl-modal-list');
  list.innerHTML = '';
  var options = collectTopicOptions();
  if (!options.length) {
    list.innerHTML = '<p style="color:var(--footer-text,#888);font-size:13px;text-align:center">لا توجد مواضيع متاحة هنا حاليًا.</p>';
  }
  options.forEach(function (opt) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bac-sl-modal-item';
    btn.textContent = opt.title;
    btn.addEventListener('click', function () {
      closeModal();
      onPick(opt);
    });
    list.appendChild(btn);
  });
  overlay.classList.add('open');
}

/* ═══════════ الحفظ/الإزالة ═══════════ */
function saveLessonEntry(ctx, ref, btn) {
  var title = (document.querySelector('.hero h1') && document.querySelector('.hero h1').textContent.trim())
    || document.title;
  var cleanUrl = location.href.split('#')[0].split('?')[0];
  var resumeUrl = cleanUrl + '?' + RESUME_PARAM + '=1';
  var unitKey = currentActiveUnitKey();

  return ref.set({
    uid: ctx.me.uid,
    kind: 'lesson',
    title: title,
    pageUrl: resumeUrl,
    scrollY: window.scrollY || 0,
    unitKey: unitKey || null,
    reminderCount: 0,
    createdAt: ctx.firebase.firestore.FieldValue.serverTimestamp(),
    lastRemindedAt: null
  }).then(function () {
    render(btn, true);
    toast('تم حفظ هذا الدرس للدراسة لاحقًا 🔖');
  });
}

function saveTopicEntry(ctx, ref, btn, opt) {
  var absoluteUrl;
  try { absoluteUrl = new URL(opt.relUrl, location.href).toString(); }
  catch (e) { absoluteUrl = opt.relUrl; }

  return ref.set({
    uid: ctx.me.uid,
    kind: 'topic',
    title: opt.title,
    targetUrl: absoluteUrl,
    reminderCount: 0,
    createdAt: ctx.firebase.firestore.FieldValue.serverTimestamp(),
    lastRemindedAt: null
  }).then(function () {
    render(btn, true);
    toast('تم حفظ "' + opt.title + '" للدراسة لاحقًا 🔖');
  });
}

function render(btn, saved) {
  btn.classList.toggle('saved', saved);
  btn.title = saved ? 'محفوظ للدراسة لاحقًا — اضغط للإزالة' : 'حفظ للدراسة لاحقًا';
}

/* ═══════════ زر الهيدر الموحّد ═══════════ */
function ensureHeaderButton(ctx) {
  var context = getPageContext();
  if (!context) return;
  if (document.getElementById('bacSlBtn')) return;

  ensureStyles();

  var toggle = findThemeToggle();
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'bacSlBtn';
  btn.className = 'bac-sl-btn';
  btn.setAttribute('aria-label', 'الدراسة لاحقًا');
  btn.title = 'حفظ للدراسة لاحقًا';
  btn.textContent = '🔖';

  if (toggle && toggle.parentNode) {
    toggle.parentNode.insertBefore(btn, toggle);
  } else {
    var topBar = document.getElementById('topBar');
    if (topBar) topBar.appendChild(btn); else document.body.appendChild(btn);
  }

  var key = lessonKeyFor();
  var id = docIdFor(ctx.me.uid, key);
  var ref = ctx.db.collection('savedLessons').doc(id);

  ref.get().then(function (snap) { render(btn, snap.exists); }).catch(function () {});

  btn.addEventListener('click', function () {
    btn.disabled = true;
    ref.get().then(function (snap) {
      if (snap.exists) {
        return ref.delete().then(function () {
          render(btn, false);
          toast('تمت إزالة هذا العنصر من الدراسة لاحقًا');
        });
      }
      if (context === 'topic') {
        btn.disabled = false;
        openTopicPicker(function (opt) {
          btn.disabled = true;
          saveTopicEntry(ctx, ref, btn, opt).finally(function () { btn.disabled = false; });
        });
        return null;
      }
      return saveLessonEntry(ctx, ref, btn);
    }).catch(function (err) {
      console.error('[BacOrbit][الدراسة لاحقًا] تعذّر الحفظ/الإزالة', err);
      toast('حدث خطأ، حاول مجددًا');
    }).finally(function () { btn.disabled = false; });
  });
}

/* ═══════════ استعادة الموضع المحفوظ عند العودة عبر رابط تذكير ═══════════ */
function applyResumeIfNeeded(ctx) {
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
  if (!params || params.get(RESUME_PARAM) !== '1') return;

  var key = lessonKeyFor();
  var id = docIdFor(ctx.me.uid, key);
  ctx.db.collection('savedLessons').doc(id).get().then(function (snap) {
    if (!snap.exists) return;
    var d = snap.data();
    var scrollY = typeof d.scrollY === 'number' ? d.scrollY : 0;

    function doScroll() {
      window.scrollTo({ top: scrollY, behavior: 'smooth' });
    }

    if (d.unitKey) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var unitBtn = document.querySelector('[data-key="' + d.unitKey.replace(/"/g, '') + '"]');
        if (unitBtn) {
          clearInterval(timer);
          unitBtn.click();
          setTimeout(doScroll, 450);
        } else if (tries > 50) {
          clearInterval(timer);
          doScroll();
        }
      }, 100);
    } else {
      setTimeout(doScroll, 500);
    }
  }).catch(function () {});
}

/* ═══════════ التذكيرات (نفس منطق الإشعارات 🔔 الموجود مسبقًا) ═══════════ */
function initReminders(ctx) {
  ctx.db.collection('savedLessons')
    .where('uid', '==', ctx.me.uid)
    .where('reminderCount', '<', 3)
    .limit(15)
    .get()
    .then(function (qs) {
      var shown = sessionShown();
      qs.forEach(function (doc) {
        if (shown.has(doc.id)) return;
        var d = doc.data();
        markSessionShown(doc.id);

        var title = d.title || d.lessonTitle || 'المحتوى المحفوظ';
        var link = d.kind === 'topic' ? (d.targetUrl || '') : (d.pageUrl || d.lessonUrl || '');

        var notifId = 'sl_' + doc.id + '_' + (d.reminderCount || 0);
        ctx.db.collection('notifications').doc(notifId).set({
          uid: ctx.me.uid,
          type: 'study_reminder',
          title: '📚 تذكير بالدراسة',
          body: 'لم تنسَ متابعة: ' + title,
          link: link,
          read: false,
          createdAt: ctx.firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () {});

        doc.ref.update({
          reminderCount: (d.reminderCount || 0) + 1,
          lastRemindedAt: ctx.firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () {});
      });
    })
    .catch(function (err) {
      console.error('[BacOrbit][تذكير الدراسة لاحقًا] تعذّر التحقق من العناصر المحفوظة', err);
    });
}

window.BacStudyLater = {
  init: function (ctx) {
    if (!ctx || !ctx.db || !ctx.me) return;
    ensureHeaderButton(ctx);
    applyResumeIfNeeded(ctx);
    initReminders(ctx);
  }
};
})();
