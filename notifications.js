/* ============================================================
   BacOrbit — notifications.js
   أيقونة 🔔 الإشعارات: تُضاف ديناميكيًا بجانب زر الثيم في الشريط
   العلوي على أي صفحة، وتستمع لحظيًا (onSnapshot) لمجموعة
   Firestore "notifications" الخاصة بالمستخدم الحالي فقط (بحسب
   Security Rules)، وتعرض عددًا للإشعارات غير المقروءة، وتسمح
   بفتح كل إشعار (يُصبح مقروءًا) والانتقال مباشرة إلى رابطه إن وُجد.

   يُستدعى عبر window.BacNotifications.init({db, me, firebase}).
   يعمل مع أي اتصال Firebase جاهز (سواء من firebase-shared.js أو من
   اتصال الصفحة الخاص بها كما في chat.html).
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
    '.bac-notif-empty{padding:26px 16px;text-align:center;color:var(--footer-text,#888);font-size:13px}';
  document.head.appendChild(style);
}

function init(ctx) {
  if (!ctx || !ctx.db || !ctx.me) return;
  var topBar = document.getElementById('topBar');
  if (!topBar || document.getElementById('bacNotifBtn')) return;

  ensureStyles();

  var anchor = document.getElementById('themeToggle') || document.getElementById('themeSwitch');

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'bacNotifBtn';
  btn.className = 'bac-notif-btn';
  btn.setAttribute('aria-label', 'الإشعارات');
  btn.title = 'الإشعارات';
  btn.innerHTML = '🔔<span class="bac-notif-badge" id="bacNotifBadge">0</span>';

  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(btn, anchor);
  } else {
    topBar.appendChild(btn);
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

  ctx.db.collection('notifications')
    .where('uid', '==', ctx.me.uid)
    .orderBy('createdAt', 'desc')
    .limit(30)
    .onSnapshot(function (qs) {
      var items = qs.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      var unread = items.filter(function (n) { return !n.read; }).length;
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.classList.toggle('show', unread > 0);

      var head = '<div class="bac-notif-head">🔔 الإشعارات</div>';
      if (!items.length) {
        panel.innerHTML = head + '<div class="bac-notif-empty">لا توجد إشعارات بعد</div>';
        return;
      }
      panel.innerHTML = head;
      items.forEach(function (n) {
        var el = document.createElement('div');
        el.className = 'bac-notif-item' + (n.read ? '' : ' unread');
        el.innerHTML =
          '<strong>' + esc(n.title || 'إشعار') + '</strong>' +
          (n.body ? esc(n.body) : '') +
          '<small>' + fmtDate(ts(n.createdAt)) + '</small>';
        el.addEventListener('click', function () {
          if (!n.read) {
            ctx.db.collection('notifications').doc(n.id).update({ read: true }).catch(function () {});
          }
          closePanel();
          if (n.link) window.location.href = n.link;
        });
        panel.appendChild(el);
      });
    }, function (err) {
      console.error('[BacOrbit][الإشعارات] تعذّر تحميل الإشعارات (على الأغلب Security Rules)', err);
    });
}

window.BacNotifications = { init: init };
})();
