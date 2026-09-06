/* ============================================================
   BacOrbit — study-later.js
   ميزة "الدراسة لاحقًا": زر تبديل داخل صفحات الدروس (أي صفحة تحتوي
   حاوية .lessons) يحفظ الدرس الحالي في مجموعة Firestore
   "savedLessons" لحساب المستخدم (لا نسخ مكررة — معرّف الوثيقة
   مبني من uid + مسار الصفحة)، مع تذكير تلقائي عند دخول أي صفحة
   في الموقع، يظهر لكل درس محفوظ حتى 3 مرات فقط (العدّاد محفوظ في
   Firestore فيبقى صحيحًا حتى لو تغيّر الجهاز طالما بقيت نفس هوية
   Anonymous Auth)، ولا يتكرر أكثر من مرة في نفس الجلسة (sessionStorage).

   يُستدعى عبر window.BacStudyLater.init({db, me, firebase}).
   ============================================================ */
(function () {
'use strict';

var SESSION_KEY = 'bacorbit_study_reminded_session';

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

function ensureStyles() {
  if (document.getElementById('bacStudyLaterStyles')) return;
  var style = document.createElement('style');
  style.id = 'bacStudyLaterStyles';
  style.textContent =
    '.bac-save-later-btn{display:flex;align-items:center;justify-content:center;gap:8px;' +
    'max-width:1050px;margin:0 auto 16px;padding:12px 20px;border-radius:12px;cursor:pointer;' +
    'background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);color:var(--accent,#1aff66);' +
    'font-weight:bold;font-size:14px;font-family:inherit;transition:background-color .2s ease,' +
    'color .2s ease,box-shadow .25s ease,transform .15s ease;width:calc(100% - 40px)}' +
    '.bac-save-later-btn:hover{box-shadow:0 0 16px var(--accent-glow,rgba(26,255,102,.4))}' +
    '.bac-save-later-btn:active{transform:scale(.99)}' +
    '.bac-save-later-btn.saved{background:var(--accent,#1aff66);color:#000}' +
    '.bac-save-later-btn:disabled{opacity:.6;cursor:wait}';
  document.head.appendChild(style);
}

function initSaveButton(ctx) {
  var lessonsEl = document.querySelector('.lessons');
  if (!lessonsEl || document.getElementById('bacSaveLaterBtn')) return;

  ensureStyles();

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'bacSaveLaterBtn';
  btn.className = 'bac-save-later-btn';
  btn.innerHTML = '📚 <span>الدراسة لاحقًا</span>';
  lessonsEl.parentNode.insertBefore(btn, lessonsEl);

  var key = lessonKeyFor();
  var id = docIdFor(ctx.me.uid, key);
  var ref = ctx.db.collection('savedLessons').doc(id);

  function render(saved) {
    btn.classList.toggle('saved', saved);
    btn.querySelector('span').textContent = saved ? 'محفوظ للدراسة لاحقًا ✓ (إزالة)' : 'الدراسة لاحقًا';
  }

  ref.get().then(function (snap) { render(snap.exists); }).catch(function () {});

  btn.addEventListener('click', function () {
    btn.disabled = true;
    ref.get().then(function (snap) {
      if (snap.exists) {
        return ref.delete().then(function () { render(false); });
      }
      var title = (document.querySelector('.hero h1') && document.querySelector('.hero h1').textContent.trim())
        || document.title;
      return ref.set({
        uid: ctx.me.uid,
        lessonKey: key,
        lessonTitle: title,
        lessonUrl: location.href,
        reminderCount: 0,
        createdAt: ctx.firebase.firestore.FieldValue.serverTimestamp(),
        lastRemindedAt: null
      }).then(function () { render(true); });
    }).catch(function (err) {
      console.error('[BacOrbit][الدراسة لاحقًا] تعذّر الحفظ', err);
    }).finally(function () { btn.disabled = false; });
  });
}

/* عند دخول أي صفحة: ابحث عن دروس محفوظة لم تصل تذكيراتها إلى 3 بعد،
   ولم تُعرض في هذه الجلسة، وأنشئ لها إشعار "تذكير" (يظهر في 🔔)،
   مع رفع عدّاد التذكير في نفس الوثيقة. */
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

        var notifId = 'sl_' + doc.id + '_' + (d.reminderCount || 0);
        ctx.db.collection('notifications').doc(notifId).set({
          uid: ctx.me.uid,
          type: 'study_reminder',
          title: '📚 تذكير بالدراسة',
          body: 'لم تنسَ متابعة: ' + (d.lessonTitle || 'الدرس المحفوظ'),
          link: d.lessonUrl || '',
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
      console.error('[BacOrbit][تذكير الدراسة لاحقًا] تعذّر التحقق من الدروس المحفوظة', err);
    });
}

window.BacStudyLater = {
  init: function (ctx) {
    if (!ctx || !ctx.db || !ctx.me) return;
    initSaveButton(ctx);
    initReminders(ctx);
  }
};
})();
