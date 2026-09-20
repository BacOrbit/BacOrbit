/* ============================================================
   BacOrbit — study-later.js  (نسخة مُصلَحة)
   ميزة «الدراسة لاحقًا» — زر 🔖 واحد بجانب زر الوضع الداكن/الفاتح
   في: صفحات الدروس (L_*)، صفحات المواضيع (S_*)، سلاسل التمارين (I_*)
   وفقرات الإنجليزية (P_english).

   ما تغيّر مقارنةً بالنسخة السابقة (نفس النظام ونفس المجموعتين
   savedLessons و notifications، دون أي نظام موازٍ):
   1) معرّف الوثيقة أصبح خاصًا بالمحتوى نفسه لا بالصفحة فقط:
        - درس: الصفحة (كما كان تمامًا، فلا تتأثر الوثائق القديمة).
        - سلسلة تمارين: الصفحة + الوحدة النشطة.
        - موضوع بكالوريا: الصفحة + ملف الـPDF المختار.
      فلا يتكرر الحفظ لنفس المحتوى، ولا يُمسح موضوع عند حفظ آخر.
   2) نافذة اختيار المواضيع تُظهر ✓ للمحفوظ منها، وتتيح الحفظ/الإزالة لكل موضوع.
   3) حالة الزر تُحدَّث لحظيًا (onSnapshot) وتتبع تغيير الوحدة في صفحات التمارين.
   4) استعلامات بلا فهارس مركّبة (uid فقط، والتصفية على العميل) — كان
      الاستعلام السابق (uid + reminderCount<3) يحتاج فهرسًا مركّبًا
      فيفشل بصمت ولا تظهر أي تذكيرات.
   5) أخطاء الحفظ تظهر للمستخدم بسبب واضح (مثل permission-denied) بدل
      رسالة عامة، وتُطبع تفاصيلها في الـ Console.
   6) زر 🔖 يُدرج داخل مجموعة واحدة مع زر الثيم (لا يقف وسط الشريط).

   ⚠️ إصلاح (هذه النسخة فقط): toggleLesson() وtoggleTopic() كانا
   يستدعيان ref.get() قبل الحفظ ليعرفا هل الوثيقة موجودة أصلاً. لكن
   قواعد Firestore التي تتحقق من resource.data.uid ترفض دائمًا قراءة
   وثيقة غير موجودة بعد (resource تكون null فيفشل التقييم)، فكانت كل
   عملية حفظ أولى تفشل بـ permission-denied قبل الوصول إلى ref.set()
   أصلاً — بصرف النظر عن صحة قاعدة savedLessons نفسها. الحل: استخدام
   الحالة saved (المُحدَّثة أصلاً لحظيًا عبر onSnapshot في startListener)
   بدل ref.get()، فلا حاجة لأي قراءة إضافية إطلاقًا. لم يتغيّر أي شيء
   آخر في الملف.

   يُستدعى عبر window.BacStudyLater.init({db, me, firebase}).
   ============================================================ */
(function () {
'use strict';

var SESSION_KEY = 'bacorbit_study_reminded_session';
var RESUME_PARAM = 'bacResume';
var UNIT_PARAM = 'bacUnit';
var MAX_REMINDERS = 3;

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
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, '_');
}
function hash36(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function pagePath() {
  return location.pathname.replace(/\/+$/, '') || '/';
}
/* المعرّف القديم للصفحة (يبقى كما هو للدروس العادية حفاظًا على الوثائق المحفوظة سابقًا) */
function pageDocId(uid) {
  return uid + '__' + sanitize(pagePath()).slice(0, 140);
}
/* معرّف خاص بمحتوى فرعي داخل الصفحة (وحدة تمارين / موضوع بكالوريا) */
function subDocId(uid, sub) {
  var base = sanitize(pagePath()).slice(-60);
  return uid + '__' + base + '__' + hash36(pagePath() + '|' + sub);
}
function cleanTitle(s) {
  return String(s || '').replace(/^[^\u0600-\u06FFA-Za-z0-9]+/, '').trim();
}
function heroTitle() {
  var h = document.querySelector('.hero h1');
  return cleanTitle(h ? h.textContent : document.title);
}
function findThemeToggle() {
  return document.getElementById('themeToggle') || document.getElementById('themeSwitch');
}

/* سياق الصفحة: دروس/تمارين (lesson) أو مواضيع بكالوريا (topic) أو لا شيء */
function getPageContext() {
  if (document.querySelector('.lessons')) return 'lesson';
  if (document.querySelector('.subjects') && document.querySelector('.topic-card')) return 'topic';
  return null;
}

/* صفحات التمارين: حاوية أزرار الوحدات (iiUnits/imUnits/ipUnits/isUnits/peUnits) */
function findUnitsContainer() {
  return document.querySelector('[id$="Units"]');
}
function activeUnit() {
  var wrap = findUnitsContainer();
  if (!wrap) return null;
  var b = wrap.querySelector('button.active');
  return b ? { key: b.dataset.key, name: cleanTitle(b.textContent) } : null;
}

/* ═══════════ الأنماط ═══════════ */
function ensureStyles() {
  if (document.getElementById('bacStudyLaterStyles')) return;
  var style = document.createElement('style');
  style.id = 'bacStudyLaterStyles';
  style.textContent =
    '.bac-sl-group{display:flex;align-items:center;gap:8px;flex-shrink:0}' +
    '.bac-sl-btn{position:relative;width:44px;height:44px;display:inline-flex;align-items:center;' +
    'justify-content:center;background:var(--track-bg,#0a0a0a);border:1px solid var(--border,#1aff66);' +
    'border-radius:12px;cursor:pointer;padding:0;flex-shrink:0;font-size:19px;' +
    'line-height:1;color:var(--footer-text,#888);transition:box-shadow .25s ease,transform .15s ease,color .25s ease;font-family:inherit}' +
    '.bac-sl-btn:hover{box-shadow:0 0 14px var(--accent-glow,rgba(26,255,102,.4))}' +
    '.bac-sl-btn:active{transform:scale(.94)}' +
    '.bac-sl-btn:disabled{opacity:.6;cursor:wait}' +
    '.bac-sl-btn.saved{color:var(--accent,#1aff66);border-color:var(--accent,#1aff66);background:var(--featured-tint,#0f2b1a)}' +
    '.bac-sl-modal-overlay{position:fixed;inset:0;z-index:6100;display:none;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,.72);padding:20px}' +
    '.bac-sl-modal-overlay.open{display:flex}' +
    '.bac-sl-modal{max-width:420px;width:100%;max-height:80vh;overflow-y:auto;' +
    'background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);border-radius:18px;' +
    'padding:22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.4)}' +
    '.bac-sl-modal h3{color:var(--accent,#1aff66);font-size:16.5px;margin-bottom:6px;text-align:center}' +
    '.bac-sl-modal p{color:var(--text-secondary,#bdbdbd);font-size:12.5px;text-align:center;margin-bottom:16px;line-height:1.7}' +
    '.bac-sl-modal-list{display:flex;flex-direction:column;gap:8px}' +
    '.bac-sl-modal-item{display:flex;align-items:center;justify-content:space-between;gap:10px;' +
    'background:var(--bg,#0d0d0d);border:1.5px solid var(--empty-border,#333);' +
    'color:var(--text,#fff);border-radius:11px;padding:11px 14px;font-size:14px;font-weight:bold;' +
    'cursor:pointer;font-family:inherit;text-align:right;transition:border-color .2s ease,color .2s ease}' +
    '.bac-sl-modal-item:hover{border-color:var(--accent,#1aff66);color:var(--accent,#1aff66)}' +
    '.bac-sl-modal-item.saved{border-color:var(--accent,#1aff66);color:var(--accent,#1aff66);background:var(--featured-tint,#0f2b1a)}' +
    '.bac-sl-modal-item .bac-sl-mark{font-size:12px;font-weight:bold;white-space:nowrap}' +
    '.bac-sl-modal-close{display:block;margin:14px auto 0;background:none;border:none;' +
    'color:var(--footer-text,#888);font-size:12.5px;cursor:pointer;font-family:inherit}' +
    '.bac-sl-banner{position:fixed;top:78px;left:50%;width:min(94vw,440px);z-index:7000;opacity:0;' +
    'visibility:hidden;pointer-events:none;transform:translate(-50%,-14px);text-align:center;' +
    'background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);color:var(--text,#fff);' +
    'border-radius:14px;padding:12px 16px;font-size:13.5px;font-weight:bold;line-height:1.7;' +
    'box-shadow:0 16px 40px rgba(0,0,0,.35);transition:opacity .3s ease,transform .3s ease,visibility .3s ease}' +
    '.bac-sl-banner.show{opacity:1;visibility:visible;transform:translate(-50%,0)}';
  document.head.appendChild(style);
}

/* ═══════════ توست ═══════════ */
var toastTimer;
function toast(msg) {
  var host = document.getElementById('bacSlToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'bacSlToastHost';
    host.style.cssText = 'position:fixed;bottom:24px;left:0;right:0;display:flex;justify-content:center;z-index:7000;pointer-events:none;padding:0 14px';
    var b = document.createElement('div');
    b.id = 'bacSlToastBox';
    b.style.cssText = 'background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);color:var(--accent,#1aff66);' +
      'padding:11px 20px;border-radius:13px;font-weight:bold;font-size:13.5px;box-shadow:0 8px 26px rgba(0,0,0,.4);' +
      'opacity:0;transform:translateY(14px);transition:opacity .3s ease,transform .3s ease;max-width:92%;text-align:center;line-height:1.7';
    host.appendChild(b);
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
  }, 3200);
}

function explainError(err) {
  console.error('[BacOrbit][الدراسة لاحقًا]', err);
  var code = err && err.code;
  if (code === 'permission-denied') {
    return 'تعذّر الحفظ: قواعد Firestore لا تسمح بكتابة «savedLessons» — انشر القواعد المحدّثة';
  }
  if (code === 'unavailable' || code === 'failed-precondition') {
    return 'تعذّر الاتصال بقاعدة البيانات، تحقّق من الإنترنت وحاول مجددًا';
  }
  return 'حدث خطأ أثناء الحفظ، حاول مجددًا';
}

/* ═══════════ الحالة المشتركة ═══════════ */
var ctxRef = null;
var saved = new Map();        /* id -> بيانات الوثيقة (تُحدَّث لحظيًا) */
var firstSnapshotDone = false;
var btnEl = null;

/* ═══════════ نافذة اختيار الموضوع (لصفحات S_*.html) ═══════════ */
var modalOverlay = null;
function ensureModal() {
  if (modalOverlay) return modalOverlay;
  modalOverlay = document.createElement('div');
  modalOverlay.className = 'bac-sl-modal-overlay';
  modalOverlay.innerHTML =
    '<div class="bac-sl-modal">' +
      '<h3>🔖 اختر الموضوع للدراسة لاحقًا</h3>' +
      '<p>اضغط على موضوع لحفظه أو إزالته. سيُذكّرك به الموقع وينقلك مباشرة إلى نفس الملف.</p>' +
      '<div class="bac-sl-modal-list"></div>' +
      '<button type="button" class="bac-sl-modal-close">إغلاق</button>' +
    '</div>';
  document.body.appendChild(modalOverlay);
  modalOverlay.querySelector('.bac-sl-modal-close').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  return modalOverlay;
}
function closeModal() { if (modalOverlay) modalOverlay.classList.remove('open'); }

function collectTopicOptions() {
  var out = [];
  document.querySelectorAll('.topic-card').forEach(function (card) {
    var h2 = card.querySelector('h2');
    var m = (card.getAttribute('onclick') || '').match(/window\.open\(\s*['"]([^'"]+)['"]/);
    if (!m) return;
    var abs;
    try { abs = new URL(m[1], location.href).toString(); } catch (e) { abs = m[1]; }
    out.push({
      label: h2 ? h2.textContent.trim() : 'موضوع',
      name: h2 ? cleanTitle(h2.textContent) : 'موضوع',
      relUrl: m[1],
      absUrl: abs
    });
  });
  return out;
}
/* بعض الصفحات (مثل S_Arabic) تكرر نفس ملف الـPDF لبطاقتين: نجعل المعرّف
   يعتمد على الملف + اسم البطاقة حتى لا تلتبس الدورتان. */
function topicId(opt) { return subDocId(ctxRef.me.uid, 'topic|' + opt.relUrl + '|' + opt.name); }

function fillTopicPicker() {
  var list = modalOverlay.querySelector('.bac-sl-modal-list');
  list.innerHTML = '';
  var options = collectTopicOptions();
  if (!options.length) {
    list.innerHTML = '<p style="margin:0">لا توجد مواضيع متاحة هنا حاليًا.</p>';
    return;
  }
  options.forEach(function (opt) {
    var id = topicId(opt);
    var isSaved = saved.has(id);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bac-sl-modal-item' + (isSaved ? ' saved' : '');
    b.innerHTML = '<span></span><span class="bac-sl-mark">' + (isSaved ? '✓ محفوظ' : '🔖 حفظ') + '</span>';
    b.firstChild.textContent = opt.label;
    b.addEventListener('click', function () {
      b.disabled = true;
      toggleTopic(opt, id).then(fillTopicPicker).catch(function () { b.disabled = false; });
    });
    list.appendChild(b);
  });
}
function openTopicPicker() {
  ensureStyles();
  ensureModal();
  fillTopicPicker();
  modalOverlay.classList.add('open');
}

/* ═══════════ الحفظ / الإزالة ═══════════ */
function docRef(id) { return ctxRef.db.collection('savedLessons').doc(id); }
function serverTs() { return ctxRef.firebase.firestore.FieldValue.serverTimestamp(); }

/* حماية من الضغط المتكرر السريع: عملية واحدة فقط لكل عنصر في نفس الوقت */
var busy = {};

/* إزالة إشعار التذكير الخاص بعنصر محفوظ (المعرّف الثابت الجديد + القديم sl_<id>_<n>) */
function removeReminderNotif(id) {
  ['sl_' + id, 'sl_' + id + '_0', 'sl_' + id + '_1', 'sl_' + id + '_2'].forEach(function (nid) {
    ctxRef.db.collection('notifications').doc(nid).delete().catch(function () {});
  });
}

/* ⚠️ لا يوجد أي ref.get() هنا — نعتمد على saved (المُحدَّثة لحظيًا عبر
   onSnapshot) لمعرفة هل العنصر محفوظ مسبقًا، لأن قراءة وثيقة غير موجودة
   تُرفض من قواعد Firestore (resource == null). */
function toggleTopic(opt, id) {
  if (busy[id]) return Promise.resolve();
  busy[id] = true;
  var ref = docRef(id);
  if (saved.has(id)) {
    return ref.delete().then(function () {
      saved.delete(id); removeReminderNotif(id); refreshButton();
      toast('تمت إزالة «' + opt.name + '» من الدراسة لاحقًا');
    }).catch(function (err) { toast(explainError(err)); throw err; })
      .finally(function () { busy[id] = false; });
  }
  var data = {
    uid: ctxRef.me.uid, kind: 'topic',
    title: heroTitle() + ' — ' + opt.name,
    targetUrl: opt.absUrl, pagePath: pagePath(),
    reminderCount: 0, createdAt: serverTs(), lastRemindedAt: null
  };
  removeReminderNotif(id); /* حفظ جديد = تذكير جديد بدل بقاء أثر قديم */
  return ref.set(data).then(function () {
    saved.set(id, data); refreshButton();
    toast('تم حفظ «' + opt.name + '» للدراسة لاحقًا 🔖');
  }).catch(function (err) { toast(explainError(err)); throw err; })
    .finally(function () { busy[id] = false; });
}

/* المحتوى الحالي في صفحات الدروس/التمارين (بحسب الوحدة النشطة إن وُجدت) */
function currentLessonTarget() {
  var hasUnits = !!findUnitsContainer();
  var unit = activeUnit();
  if (hasUnits && !unit) return { needUnit: true };
  var uid = ctxRef.me.uid;
  return {
    unit: unit,
    id: unit ? subDocId(uid, 'unit|' + unit.key) : pageDocId(uid)
  };
}

function toggleLesson() {
  var t = currentLessonTarget();
  if (t.needUnit) { toast('اختر الوحدة أولًا ثم اضغط 🔖 لحفظها'); return Promise.resolve(); }
  if (busy[t.id]) return Promise.resolve();
  busy[t.id] = true;
  var ref = docRef(t.id);

  if (saved.has(t.id)) {
    return ref.delete().then(function () {
      saved.delete(t.id); removeReminderNotif(t.id); refreshButton();
      toast('تمت إزالة هذا العنصر من الدراسة لاحقًا');
    }).catch(function (err) { toast(explainError(err)); })
      .finally(function () { busy[t.id] = false; });
  }

  var clean = location.href.split('#')[0].split('?')[0];
  var resume = clean + '?' + RESUME_PARAM + '=1' + (t.unit ? '&' + UNIT_PARAM + '=' + encodeURIComponent(t.unit.key) : '');
  var data = {
    uid: ctxRef.me.uid, kind: 'lesson',
    title: heroTitle() + (t.unit ? ' — ' + t.unit.name : ''),
    pageUrl: resume, pagePath: pagePath(),
    scrollY: window.scrollY || 0,
    unitKey: t.unit ? t.unit.key : null,
    reminderCount: 0, createdAt: serverTs(), lastRemindedAt: null
  };
  removeReminderNotif(t.id); /* حفظ جديد = تذكير جديد بدل بقاء أثر قديم */
  return ref.set(data).then(function () {
    saved.set(t.id, data); refreshButton();
    toast('تم الحفظ للدراسة لاحقًا 🔖');
  }).catch(function (err) { toast(explainError(err)); })
    .finally(function () { busy[t.id] = false; });
}

/* ═══════════ حالة الزر ═══════════ */
function refreshButton() {
  if (!btnEl || !ctxRef) return;
  var context = getPageContext();
  var isSaved = false;
  if (context === 'topic') {
    var p = pagePath();
    saved.forEach(function (d) { if (d.kind === 'topic' && d.pagePath === p) isSaved = true; });
    btnEl.title = isSaved ? 'لديك مواضيع محفوظة هنا — اضغط للإدارة' : 'حفظ موضوع للدراسة لاحقًا';
  } else {
    var t = currentLessonTarget();
    isSaved = !t.needUnit && saved.has(t.id);
    btnEl.title = isSaved ? 'محفوظ للدراسة لاحقًا — اضغط للإزالة' : 'حفظ للدراسة لاحقًا';
  }
  btnEl.classList.toggle('saved', isSaved);
  btnEl.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
}

/* ═══════════ زر الهيدر ═══════════ */
function ensureHeaderButton() {
  var context = getPageContext();
  if (!context || document.getElementById('bacSlBtn')) return;
  ensureStyles();

  btnEl = document.createElement('button');
  btnEl.type = 'button';
  btnEl.id = 'bacSlBtn';
  btnEl.className = 'bac-sl-btn';
  btnEl.setAttribute('aria-label', 'الدراسة لاحقًا');
  btnEl.textContent = '🔖';

  var toggle = findThemeToggle();
  var topBar = document.getElementById('topBar');
  if (toggle && toggle.parentNode === topBar) {
    /* مجموعة واحدة (🔖 + الثيم) حتى لا يتوسط الزر الشريط العلوي */
    var group = document.createElement('div');
    group.className = 'bac-sl-group';
    topBar.insertBefore(group, toggle);
    group.appendChild(btnEl);
    group.appendChild(toggle);
  } else if (toggle && toggle.parentNode) {
    toggle.parentNode.insertBefore(btnEl, toggle);
  } else if (topBar) {
    topBar.appendChild(btnEl);
  } else {
    document.body.appendChild(btnEl);
  }

  btnEl.addEventListener('click', function () {
    if (context === 'topic') { openTopicPicker(); return; }
    btnEl.disabled = true;
    toggleLesson().then(function () { btnEl.disabled = false; }, function () { btnEl.disabled = false; });
  });

  /* صفحات التمارين: تحديث الحالة عند تغيير الوحدة النشطة أو الرجوع للوحدات */
  var units = findUnitsContainer();
  if (units && typeof MutationObserver === 'function') {
    new MutationObserver(refreshButton).observe(units, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }
  refreshButton();
}

/* ═══════════ استعادة الموضع عند العودة عبر رابط تذكير ═══════════ */
function applyResumeIfNeeded() {
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { return; }
  if (params.get(RESUME_PARAM) !== '1') return;

  var unitKey = params.get(UNIT_PARAM);
  var uid = ctxRef.me.uid;
  var id = unitKey ? subDocId(uid, 'unit|' + unitKey) : pageDocId(uid);

  docRef(id).get().then(function (snap) {
    var d = snap.exists ? snap.data() : null;
    var scrollY = d && typeof d.scrollY === 'number' ? d.scrollY : 0;
    var key = unitKey || (d && d.unitKey);

    function doScroll() { window.scrollTo({ top: scrollY, behavior: 'smooth' }); }

    if (key) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var unitBtn = document.querySelector('[id$="Units"] [data-key="' + String(key).replace(/"/g, '') + '"]');
        if (unitBtn) {
          clearInterval(timer);
          unitBtn.click();
          setTimeout(doScroll, 450);
        } else if (tries > 50) {
          clearInterval(timer);
          doScroll();
        }
      }, 100);
    } else if (scrollY) {
      setTimeout(doScroll, 500);
    }
  }).catch(function (err) { console.error('[BacOrbit][الدراسة لاحقًا] تعذّر الاستعادة', err); });
}

/* ═══════════ التذكيرات (نفس مجموعة الإشعارات 🔔) ═══════════
   - لافتة تلقائية لمدة ثانيتين عند الدخول، بحد أقصى MAX_REMINDERS مرات لكل صفحة
     محفوظة، بعدّاد مستقل داخل وثيقة كل صفحة (reminderCount).
   - إشعار واحد فقط لكل صفحة بمعرّف ثابت sl_<id> يُنشأ عند أول تذكير،
     ويبقى في سجل الإشعارات حتى بعد اختفاء اللافتة. */
var BANNER_MS = 2000;
var bannerTimer;
function showReminderBanner(list) {
  ensureStyles();
  var el = document.getElementById('bacSlBanner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bacSlBanner';
    el.className = 'bac-sl-banner';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = list.length === 1
    ? '📚 لديك صفحة أردت دراستها سابقًا: ' + (list[0].d.title || list[0].d.lessonTitle || 'المحتوى المحفوظ')
    : '📚 لديك ' + list.length + ' صفحات أردت دراستها سابقًا';
  /* إعادة تشغيل الانتقال حتى لو كانت ظاهرة */
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(function () { el.classList.remove('show'); }, BANNER_MS);
}

function runRemindersOnce(docs) {
  var shown = sessionShown();
  var here = pagePath();
  var due = [];
  docs.forEach(function (doc) {
    var d = doc.data();
    var count = d.reminderCount || 0;
    if (count >= MAX_REMINDERS || shown.has(doc.id)) return; /* لا تكرار في نفس الزيارة */
    if (d.pagePath === here) return;                          /* لا نُذكّره بالصفحة التي هو فيها الآن */
    due.push({ doc: doc, d: d, count: count });
  });
  if (!due.length) return;

  due.forEach(function (it) {
    var doc = it.doc, d = it.d;
    markSessionShown(doc.id);

    /* العدّاد الدائم: زيادة ذرّية مستقلة لكل صفحة */
    doc.ref.update({
      reminderCount: ctxRef.firebase.firestore.FieldValue.increment(1),
      lastRemindedAt: serverTs()
    }).catch(function (err) {
      console.error('[BacOrbit][الدراسة لاحقًا] تعذّر تحديث عدّاد التذكير', err);
    });

    /* إشعار السجل: مرة واحدة فقط لكل صفحة (عند أول تذكير) بمعرّف ثابت */
    if (it.count === 0) {
      var title = d.title || d.lessonTitle || 'المحتوى المحفوظ';
      var isTopic = d.kind === 'topic';
      ctxRef.db.collection('notifications').doc('sl_' + doc.id).set({
        uid: ctxRef.me.uid,
        type: 'study_reminder',
        title: '📚 تذكير بالدراسة',
        body: 'لم تنسَ متابعة: ' + title,
        link: isTopic ? (d.targetUrl || '') : (d.pageUrl || d.lessonUrl || ''),
        newTab: isTopic,
        savedId: doc.id,
        read: false,
        createdAt: serverTs()
      }).catch(function (err) {
        console.error('[BacOrbit][تذكير الدراسة لاحقًا] تعذّر إنشاء الإشعار (تحقّق من قواعد notifications)', err);
      });
    }
  });

  showReminderBanner(due);
}

/* مستمع واحد لكل عناصر المستخدم: يُحدّث حالة الزر ويُنتج التذكيرات (بلا فهارس مركّبة) */
function startListener() {
  ctxRef.db.collection('savedLessons').where('uid', '==', ctxRef.me.uid)
    .onSnapshot(function (qs) {
      saved.clear();
      qs.forEach(function (doc) { saved.set(doc.id, doc.data()); });
      refreshButton();
      if (!firstSnapshotDone) {
        firstSnapshotDone = true;
        runRemindersOnce(qs.docs ? qs.docs.slice() : []);
      }
    }, function (err) {
      console.error('[BacOrbit][الدراسة لاحقًا] تعذّر تحميل العناصر المحفوظة (على الأغلب Security Rules)', err);
    });
}

var started = false;
window.BacStudyLater = {
  init: function (ctx) {
    if (!ctx || !ctx.db || !ctx.me || started) return;
    started = true;
    ctxRef = ctx;
    ensureHeaderButton();
    applyResumeIfNeeded();
    startListener();
  }
};
})();
