/* ============================================================
   BacOrbit — notifications.js
   أيقونة 🔔 الإشعارات: تُضاف ديناميكيًا داخل .nav-menu-wrap مباشرة
   بجانب زر القائمة ☰ (وليس كعنصر شقيق منفصل لـ #topBar)، حتى تظهر
   في نفس المكان تمامًا في كل صفحات الموقع بغض النظر عن اختلاف بنية
   الشريط العلوي (وجود .top-bar-right-group من عدمه، أو اختلاف معرّف
   زر الثيم بين الصفحات: themeToggle مقابل themeSwitch في chat.html).
   تستمع لحظيًا (onSnapshot) لمجموعة Firestore "notifications" الخاصة
   بالمستخدم الحالي فقط (بحسب Security Rules)، وتعرض عددًا للإشعارات
   غير المقروءة، وتسمح بفتح كل إشعار (يُصبح مقروءًا) والانتقال مباشرة
   إلى رابطه إن وُجد.

   يُستدعى عبر window.BacNotifications.init({db, me, firebase}).
   يعمل مع أي اتصال Firebase جاهز (سواء من firebase-shared.js أو من
   اتصال الصفحة الخاص بها كما في chat.html).

   ⚠️ تعديل (هذه النسخة فقط): إضافة «لافتة تذكير» تلقائية تظهر لمدة
   ثانيتين فقط عند وجود تذكير «دراسة لاحقًا» (type === 'study_reminder')
   لم يُقرأ بعد، دون إنشاء أي نظام إشعارات موازٍ — اللافتة تُبنى فوق
   نفس مجموعة Firestore "notifications" الموجودة أصلًا وتُقرأ من نفس
   الاستماع اللحظي (onSnapshot) هنا فقط. لكل تذكير عدّاد مستقل لعدد
   مرات ظهور اللافتة (محفوظ في localStorage تحت المفتاح
   bacorbit_study_banner_shown، بمعرّف الإشعار نفسه — وهو معرّف ثابت
   بالفعل بحسب study-later.js: sl_<docId>_<count> — فلا يوجد أي تكرار
   حتى لو حفظ المستخدم عشرات الصفحات). اللافتة تظهر بحد أقصى 3 مرات
   لكل تذكير، ثم تختفي نهائيًا مع بقاء التذكير في سجل 🔔، وتظهر مرة
   واحدة فقط لكل تحميل صفحة (تحسبًا لتكرار onSnapshot)، ولا تظهر إطلاقًا
   لإشعارات الردود على المنتدى (type === 'forum_reply') التي تكتفي
   بالنقطة/العداد على الجرس كما كانت.
   ============================================================ */
(function () {
'use strict';

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function ts(c) { return (c && c.toMillis) ? c.toMillis() : (typeof c === 'number' ? c : Date.now()); }
function fmtDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ═══════════ عدّاد ظهور لافتة التذكير (مستقل لكل تذكير، أقصاه 3) ═══════════ */
var BANNER_SHOWN_KEY = 'bacorbit_study_banner_shown';
function loadBannerCounts() {
  try {
    var raw = localStorage.getItem(BANNER_SHOWN_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) { return {}; }
}
function saveBannerCounts(map) {
  try { localStorage.setItem(BANNER_SHOWN_KEY, JSON.stringify(map)); } catch (e) {}
}
/* مجموعة داخل الذاكرة فقط (لا تُحفظ) تمنع ظهور أكثر من لافتة واحدة في
   نفس تحميل الصفحة الواحد، حتى لو أطلق onSnapshot أكثر من مرة. */
var bannerHandledThisLoad = {};

function ensureStyles() {
  if (document.getElementById('bacNotifStyles')) return;
  var style = document.createElement('style');
  style.id = 'bacNotifStyles';
  style.textContent =
    '.bac-notif-btn{position:relative;width:44px;height:44px;display:inline-flex;align-items:center;' +
    'justify-content:center;background:var(--track-bg,#0a0a0a);border:1px solid var(--border,#1aff66);' +
    'border-radius:12px;cursor:pointer;padding:0;margin-inline-end:8px;flex-shrink:0;font-size:19px;' +
    'line-height:1;transition:box-shadow .25s ease,transform .15s ease;font-family:inherit}' +
    '.bac-notif-btn:hover{box-shadow:0 0 14px var(--accent-glow,rgba(26,255,102,.4))}' +
    '.bac-notif-btn:active{transform:scale(.94)}' +
    '.bac-notif-badge{position:absolute;top:-6px;left:-6px;min-width:18px;height:18px;padding:0 4px;' +
    'border-radius:999px;background:var(--danger,#ff4d4d);color:#fff;font-size:10.5px;font-weight:bold;' +
    'display:none;align-items:center;justify-content:center;direction:ltr}' +
    '.bac-notif-badge.show{display:flex}' +
    '.bac-notif-panel{position:fixed;top:64px;left:14px;right:14px;max-width:380px;margin-inline-start:auto;' +
    'background:var(--card-bg,#161616);border:1.5px solid var(--border,#1aff66);border-radius:16px;' +
    'box-shadow:0 16px 40px rgba(0,0,0,.35);z-index:4200;max-height:70vh;overflow-y:auto;display:none;' +
    'opacity:0;transform:translateY(-8px);transition:opacity .2s ease,transform .2s ease}' +
    '.bac-notif-panel.open{display:block;opacity:1;transform:translateY(0)}' +
    '.bac-notif-head{padding:12px 16px;font-weight:bold;color:var(--accent,#1aff66);font-size:13.5px;' +
    'border-bottom:1px solid var(--empty-border,#333)}' +
    '.bac-notif-item{display:block;padding:13px 16px;border-bottom:1px dashed var(--empty-border,#333);' +
    'color:var(--text,#fff);text-decoration:none;font-size:13px;line-height:1.8;cursor:pointer;' +
    'transition:background-color .2s ease}' +
    '.bac-notif-item:last-child{border-bottom:none}' +
    '.bac-notif-item:hover{background:var(--accent-glow,rgba(26,255,102,.15))}' +
    '.bac-notif-item.unread{background:var(--featured-tint,#0f2b1a)}' +
    '.bac-notif-item strong{display:block;color:var(--accent,#1aff66);margin-bottom:3px;font-size:12.5px}' +
    '.bac-notif-item small{display:block;color:var(--footer-text,#888);margin-top:5px;font-size:11px}' +
    '.bac-notif-empty{padding:26px 16px;text-align:center;color:var(--footer-text,#888);font-size:13px}' +
    /* ── لافتة تذكير الدراسة لاحقًا (تظهر ثانيتين فقط) ── */
    '.bac-study-banner-host{position:fixed;top:64px;left:0;right:0;display:flex;justify-content:center;' +
    'z-index:4300;pointer-events:none;padding:0 14px}' +
    '.bac-study-banner{pointer-events:auto;cursor:pointer;max-width:420px;width:100%;display:flex;' +
    'align-items:center;gap:10px;background:var(--card-bg,#161616);border:1.5px solid var(--accent,#1aff66);' +
    'color:var(--text,#fff);border-radius:14px;padding:12px 14px;box-shadow:0 14px 34px rgba(0,0,0,.35);' +
    'opacity:0;transform:translateY(-10px);transition:opacity .25s ease,transform .25s ease;font-size:13px;' +
    'line-height:1.7}' +
    '.bac-study-banner.show{opacity:1;transform:translateY(0)}' +
    '.bac-study-banner .bac-study-banner-icon{font-size:19px;flex-shrink:0}' +
    '.bac-study-banner strong{display:block;color:var(--accent,#1aff66);font-size:12.5px;margin-bottom:2px}';
  document.head.appendChild(style);
}

/* ═══════════ لافتة تذكير الدراسة لاحقًا ═══════════ */
var bannerTimer = null;
function showStudyBanner(n, onOpen) {
  var host = document.getElementById('bacStudyBannerHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'bacStudyBannerHost';
    host.className = 'bac-study-banner-host';
    document.body.appendChild(host);
  }
  host.innerHTML = '';
  var box = document.createElement('div');
  box.className = 'bac-study-banner';
  box.innerHTML =
    '<span class="bac-study-banner-icon">📚</span>' +
    '<span><strong>تذكير بالدراسة</strong>' + esc(n.body || n.title || 'لديك صفحة أردت متابعتها لاحقًا') + '</span>';
  box.addEventListener('click', function () { onOpen(); hideStudyBanner(); });
  host.appendChild(box);
  /* دورة إطار لضمان تطبيق الانتقال (transition) قبل إضافة show */
  requestAnimationFrame(function () { box.classList.add('show'); });
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(hideStudyBanner, 2000);
}
function hideStudyBanner() {
  var host = document.getElementById('bacStudyBannerHost');
  if (!host) return;
  var box = host.querySelector('.bac-study-banner');
  if (box) box.classList.remove('show');
}

function init(ctx) {
  if (!ctx || !ctx.db || !ctx.me) return;
  var topBar = document.getElementById('topBar');
  if (!topBar || document.getElementById('bacNotifBtn')) return;

  ensureStyles();

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'bacNotifBtn';
  btn.className = 'bac-notif-btn';
  btn.setAttribute('aria-label', 'الإشعارات');
  btn.title = 'الإشعارات';
  btn.innerHTML = '🔔<span class="bac-notif-badge" id="bacNotifBadge">0</span>';

  /* حاوية موحّدة لأزرار الشريط العلوي: تجمع ☰ و 🔔 و ⏱️ في صف واحد.
     تبقى لوحة القائمة خارجها لأنها موضوعة absolute بالنسبة إلى .nav-menu-wrap. */
  var navBtn = document.getElementById('navMenuBtn');
  if (navBtn && navBtn.parentNode) {
    var navActions = navBtn.parentNode.querySelector('.bac-nav-actions');
    if (!navActions) {
      navActions = document.createElement('div');
      navActions.className = 'bac-nav-actions';
      navBtn.parentNode.insertBefore(navActions, navBtn.parentNode.firstChild);
      navActions.appendChild(navBtn);
    }
    navActions.appendChild(btn);
  } else {
    var anchor = document.getElementById('themeToggle') || document.getElementById('themeSwitch');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(btn, anchor);
    } else {
      topBar.appendChild(btn);
    }
  }

  var panel = document.createElement('div');
  panel.className = 'bac-notif-panel';
  panel.id = 'bacNotifPanel';
  panel.innerHTML = '<div class="bac-notif-head">🔔 الإشعارات</div><div class="bac-notif-empty">لا توجد إشعارات بعد</div>';
  document.body.appendChild(panel);

  var open = false;
  function closePanel() { open = false; panel.classList.remove('open'); }
  function togglePanel() { open = !open; panel.classList.toggle('open', open); }

  btn.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
  document.addEventListener('click', function (e) {
    if (!open) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    closePanel();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

  var badge = document.getElementById('bacNotifBadge');

  /* فتح إشعار: يُصبح مقروءًا، ثم الانتقال إلى رابطه إن وُجد — نفس
     السلوك المستخدم سواء فُتح من اللوحة أو من اللافتة، بلا ازدواجية. */
  function openNotification(n) {
    if (!n.read) {
      ctx.db.collection('notifications').doc(n.id).update({ read: true }).catch(function () {});
    }
    closePanel();
    if (n.link) window.location.href = n.link;
  }

  ctx.db.collection('notifications')
    .where('uid', '==', ctx.me.uid)
    .limit(100)
    .onSnapshot(function (qs) {
      /* الترتيب على العميل: الجمع بين where(uid) وorderBy(createdAt) كان يتطلب
         فهرسًا مركّبًا في Firestore، وبدونه يفشل الاستماع بصمت فلا يظهر أي إشعار. */
      var items = qs.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })
        .sort(function (a, b) { return ts(b.createdAt) - ts(a.createdAt); })
        .slice(0, 30);
      var unread = items.filter(function (n) { return !n.read; }).length;
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.classList.toggle('show', unread > 0);

      var head = '<div class="bac-notif-head">🔔 الإشعارات</div>';
      if (!items.length) {
        panel.innerHTML = head + '<div class="bac-notif-empty">لا توجد إشعارات بعد</div>';
      } else {
        panel.innerHTML = head;
        items.forEach(function (n) {
          var el = document.createElement('div');
          el.className = 'bac-notif-item' + (n.read ? '' : ' unread');
          el.innerHTML =
            '<strong>' + esc(n.title || 'إشعار') + '</strong>' +
            (n.body ? esc(n.body) : '') +
            '<small>' + fmtDate(ts(n.createdAt)) + '</small>';
          el.addEventListener('click', function () { openNotification(n); });
          panel.appendChild(el);
        });
      }

      /* لافتة تذكير «الدراسة لاحقًا» (ثانيتان فقط، أقصاه 3 مرات لكل
         تذكير) — لا تشمل إشعارات ردود المنتدى (forum_reply) إطلاقًا. */
      var reminder = items.find(function (n) {
        return n.type === 'study_reminder' && !n.read && !bannerHandledThisLoad[n.id];
      });
      if (reminder) {
        var counts = loadBannerCounts();
        var shown = counts[reminder.id] || 0;
        bannerHandledThisLoad[reminder.id] = true; /* مرة واحدة فقط لكل تحميل صفحة */
        if (shown < 3) {
          counts[reminder.id] = shown + 1;
          saveBannerCounts(counts);
          showStudyBanner(reminder, function () { openNotification(reminder); });
        }
      }
    }, function (err) {
      console.error('[BacOrbit][الإشعارات] تعذّر تحميل الإشعارات (على الأغلب Security Rules)', err);
    });
}

window.BacNotifications = { init: init };
})();
