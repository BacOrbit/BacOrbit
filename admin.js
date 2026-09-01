/* ============================================================
   BacOrbit — admin.js
   منطق لوحة الإدارة: تسجيل دخول الأدمن (بريد/كلمة مرور)، التحقق
   من صلاحية الأدمن عبر مجموعة Firestore "admins" (وليس فقط عبر
   إخفاء الرابط)، إدارة المنتدى (حذف منشورات وردود)، مراجعة
   الملخصات المرسلة من المستخدمين (قبول/رفض مع سبب)، وإحصائيات
   بسيطة. يعتمد على نفس مشروع Firebase المستخدم في chat.html
   (bacorbit-c5d67) ولا ينشئ أي مشروع جديد.

   ⚠️ ملاحظة أمنية مهمة: كل عملية حساسة هنا (حذف، قبول، رفض) تُنفَّذ
   عبر طلبات Firestore عادية، لكن الحماية الحقيقية تأتي من
   Firestore Security Rules (وليس من هذا الملف). أي شخص يفتح
   admin.html بدون أن يكون UID الخاص به مسجلاً داخل مجموعة
   "admins" في Firestore سيفشل في كل عملية كتابة/حذف حتى لو كان
   الكود هنا يحاول تنفيذها — هذا هو خط الدفاع الحقيقي.
   ============================================================ */

(function () {
'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyBgh1JW8IepmDe78jko33mnvaAU2af3-fw",
  authDomain: "bacorbit-c5d67.firebaseapp.com",
  databaseURL: "https://bacorbit-c5d67-default-rtdb.firebaseio.com",
  projectId: "bacorbit-c5d67",
  storageBucket: "bacorbit-c5d67.firebasestorage.app",
  messagingSenderId: "1047289657770",
  appId: "1:1047289657770:web:2d814fcde45978b17493d3",
  measurementId: "G-4J629GND42"
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
             .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

let db = null, auth = null, meUid = null;
let postsData = [];
let summariesData = [];
let usersCount = 0;

/* ═══════════ أدوات عامة ═══════════ */
function ts(c){ return (c && c.toMillis) ? c.toMillis() : (typeof c==='number' ? c : Date.now()); }
function fmtDate(ms){
  if(!ms) return '';
  return new Date(ms).toLocaleString('ar', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
let toastTimer;
function toast(msg, type){
  const el = $('#adminToast'); if(!el) return;
  $('#adminToastBox').textContent = msg;
  el.classList.toggle('err', type === 'err');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

/* ═══════════ تسجيل الدخول ═══════════ */
function showLogin(errMsg){
  $('#adminLoginScreen').style.display = 'block';
  $('#adminDashboard').style.display = 'none';
  const errBox = $('#adminLoginError');
  if(errMsg){
    errBox.textContent = errMsg;
    errBox.classList.add('show');
  } else {
    errBox.classList.remove('show');
  }
}

function showDashboard(email){
  $('#adminLoginScreen').style.display = 'none';
  $('#adminDashboard').style.display = 'block';
  $('#adminWhoamiEmail').textContent = email || '';
  initListeners();
}

async function handleLogin(){
  const email = $('#adminEmailInput').value.trim();
  const pass = $('#adminPasswordInput').value;
  if(!email || !pass){ toast('أدخل البريد وكلمة المرور', 'err'); return; }

  const btn = $('#adminLoginBtn');
  btn.disabled = true; const oldText = btn.textContent; btn.textContent = 'جارٍ الدخول…';

  try{
    await auth.signInWithEmailAndPassword(email, pass);
    /* لا شيء آخر هنا — onAuthStateChanged سيتولى التحقق من صلاحية الأدمن والتنقل */
  }catch(err){
    let msg = 'تعذّر تسجيل الدخول. تحقق من البريد وكلمة المرور.';
    if(err && err.code === 'auth/too-many-requests') msg = 'محاولات كثيرة جدًا، حاول لاحقًا.';
    showLogin(msg);
  }finally{
    btn.disabled = false; btn.textContent = oldText;
  }
}

async function checkIsAdminAndEnter(user){
  try{
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if(adminDoc.exists){
      meUid = user.uid;
      showDashboard(user.email);
    }else{
      showLogin('هذا الحساب مسجّل دخول بنجاح لكنه لا يملك صلاحية الوصول إلى لوحة الإدارة.');
      await auth.signOut();
    }
  }catch(err){
    /* فشل قراءة مجموعة admins يعني غالبًا أن Security Rules ترفض القراءة لهذا
       المستخدم — وهذا هو السلوك الصحيح والمتوقع لأي حساب غير مُصرَّح له. */
    console.error(err);
    showLogin('تعذّر التحقق من صلاحيات الحساب. إن كنت متأكدًا أنك الأدمن، تأكد من إضافة UID داخل مجموعة admins في Firestore.');
    await auth.signOut();
  }
}

/* ═══════════ التبويبات ═══════════ */
function initTabs(){
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('#' + btn.dataset.panel).classList.add('active');
    });
  });
}

/* ═══════════ الإحصائيات ═══════════ */
function renderStats(){
  const pendingCount = summariesData.filter(s => s.status === 'pending').length;
  const totalReports = postsData.reduce((sum, p) => sum + (p.reportCount || 0), 0);
  const topPosts = postsData.filter(p => !p.parentId && !p.deleted).length;

  $('#statUsers').textContent = usersCount;
  $('#statPosts').textContent = topPosts;
  $('#statPending').textContent = pendingCount;
  $('#statReports').textContent = totalReports;
}

/* ═══════════ إدارة المنتدى ═══════════ */
function buildForumItem(p, isReply){
  const div = document.createElement('div');
  div.className = 'admin-item' + (isReply ? ' is-reply' : '');

  let badges = '';
  if(p.removed) badges += '<span class="admin-item-badge danger">⚠️ مُزال تلقائيًا</span>';
  if(p.deleted) badges += '<span class="admin-item-badge danger">🗑️ محذوف</span>';
  if(p.reportCount) badges += '<span class="admin-item-badge">🚩 ' + p.reportCount + ' بلاغ</span>';

  div.innerHTML =
    '<div class="admin-item-head">' +
      '<span class="admin-item-author">' + esc(p.name || 'غير معروف') + (isReply ? ' <small style="color:var(--footer-text)">(رد)</small>' : '') + '</span>' +
      '<span class="admin-item-date">' + fmtDate(ts(p.createdAt)) + '</span>' +
    '</div>' +
    (badges ? '<div style="margin-bottom:8px">' + badges + '</div>' : '') +
    '<div class="admin-item-text">' + (p.text ? esc(p.text) : '<span style="color:var(--footer-text)">(بدون نص، مرفق فقط)</span>') + '</div>' +
    '<div class="admin-item-actions">' +
      (!p.deleted ? '<button type="button" class="admin-btn danger" data-del-post="' + p.id + '">🗑 حذف نهائي</button>' : '') +
    '</div>';

  return div;
}

function renderForum(){
  const list = $('#adminForumList');
  const empty = $('#adminForumEmpty');
  list.innerHTML = '';

  const tops = postsData.filter(p => !p.parentId).sort((a,b) => ts(b.createdAt) - ts(a.createdAt));

  if(!tops.length){ empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  tops.forEach(p => {
    list.appendChild(buildForumItem(p, false));
    const replies = postsData.filter(r => r.parentId === p.id).sort((a,b) => ts(a.createdAt) - ts(b.createdAt));
    replies.forEach(r => list.appendChild(buildForumItem(r, true)));
  });
}

async function deleteForumPost(id){
  if(!confirm('حذف هذا المحتوى نهائيًا من قاعدة البيانات؟ لا يمكن التراجع.')) return;
  try{
    await db.collection('forumPosts').doc(id).delete();
    toast('تم الحذف نهائيًا 🗑️');
  }catch(err){
    toast('تعذّر الحذف: ' + (err.message || 'خطأ غير معروف'), 'err');
  }
}

/* ═══════════ مراجعة الملخصات ═══════════ */
function buildSummaryItem(s){
  const div = document.createElement('div');
  div.className = 'admin-item';

  const statusLabel = s.status === 'approved' ? '✅ منشور'
    : s.status === 'rejected' ? '❌ مرفوض' : '⏳ بانتظار المراجعة';
  const statusClass = s.status === 'rejected' ? ' danger' : '';

  div.innerHTML =
    '<div class="admin-item-head">' +
      '<span class="admin-item-author">' + esc(s.title || 'بدون عنوان') + '</span>' +
      '<span class="admin-item-date">' + fmtDate(ts(s.createdAt)) + '</span>' +
    '</div>' +
    '<div class="admin-summary-meta">' +
      '<span class="admin-item-badge' + statusClass + '">' + statusLabel + '</span>' +
      (s.subject ? '<span class="admin-item-badge">' + esc(s.subject) + '</span>' : '') +
      (s.level ? '<span class="admin-item-badge">' + esc(s.level) + '</span>' : '') +
    '</div>' +
    '<div class="admin-item-text">أُرسل بواسطة: ' + esc(s.submitterName || 'مستخدم') + '</div>' +
    (s.fileUrl ? '<a class="admin-summary-link" href="' + esc(s.fileUrl) + '" target="_blank" rel="noopener">📄 معاينة الملف ↗</a><br>' : '') +
    (s.status === 'rejected' && s.rejectionReason ? '<div class="admin-item-text" style="color:var(--danger)">سبب الرفض: ' + esc(s.rejectionReason) + '</div>' : '') +
    '<div class="admin-item-actions">' +
      (s.status === 'pending'
        ? '<button type="button" class="admin-btn" data-approve="' + s.id + '">✅ قبول ونشر</button>' +
          '<button type="button" class="admin-btn danger" data-reject-toggle="' + s.id + '">❌ رفض</button>'
        : '') +
      '<button type="button" class="admin-btn danger" data-del-summary="' + s.id + '">🗑 حذف السجل</button>' +
    '</div>' +
    (s.status === 'pending'
      ? '<div class="admin-reject-box" data-reject-box="' + s.id + '">' +
          '<input type="text" class="admin-reject-input" data-reject-input="' + s.id + '" placeholder="سبب الرفض (سيظهر للمستخدم)…">' +
          '<button type="button" class="admin-btn danger" data-reject-confirm="' + s.id + '">تأكيد الرفض</button>' +
        '</div>'
      : '');

  return div;
}

function renderSummaries(){
  const pendingList = $('#adminSummariesPending');
  const pendingEmpty = $('#adminSummariesPendingEmpty');
  const allList = $('#adminSummariesAll');

  const pending = summariesData.filter(s => s.status === 'pending').sort((a,b) => ts(a.createdAt) - ts(b.createdAt));
  const others = summariesData.filter(s => s.status !== 'pending').sort((a,b) => ts(b.createdAt) - ts(a.createdAt));

  pendingList.innerHTML = '';
  if(!pending.length){ pendingEmpty.style.display = 'block'; }
  else { pendingEmpty.style.display = 'none'; pending.forEach(s => pendingList.appendChild(buildSummaryItem(s))); }

  allList.innerHTML = '';
  if(!others.length){
    allList.innerHTML = '<div class="admin-empty-note">لا توجد ملخصات تمت مراجعتها بعد.</div>';
  } else {
    others.forEach(s => allList.appendChild(buildSummaryItem(s)));
  }

  renderStats();
}

async function approveSummary(id){
  try{
    await db.collection('summaries').doc(id).update({
      status: 'approved',
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedBy: meUid
    });
    toast('تم قبول الملخص ونشره ✅');
  }catch(err){
    toast('تعذّر القبول: ' + (err.message || 'خطأ غير معروف'), 'err');
  }
}

async function rejectSummary(id, reason){
  try{
    await db.collection('summaries').doc(id).update({
      status: 'rejected',
      rejectionReason: reason || 'لم يُذكر سبب محدد.',
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedBy: meUid
    });
    toast('تم رفض الملخص 🚫');
  }catch(err){
    toast('تعذّر الرفض: ' + (err.message || 'خطأ غير معروف'), 'err');
  }
}

async function deleteSummary(id){
  if(!confirm('حذف سجل هذا الملخص نهائيًا؟')) return;
  try{
    await db.collection('summaries').doc(id).delete();
    toast('تم حذف السجل 🗑️');
  }catch(err){
    toast('تعذّر الحذف: ' + (err.message || 'خطأ غير معروف'), 'err');
  }
}

/* ═══════════ الأحداث العامة (تفويض نقر واحد) ═══════════ */
document.addEventListener('click', async (e) => {
  const delPost = e.target.closest('[data-del-post]');
  if(delPost){ deleteForumPost(delPost.dataset.delPost); return; }

  const approveBtn = e.target.closest('[data-approve]');
  if(approveBtn){ approveBtn.disabled = true; await approveSummary(approveBtn.dataset.approve); return; }

  const rejectToggle = e.target.closest('[data-reject-toggle]');
  if(rejectToggle){
    const box = document.querySelector('[data-reject-box="' + rejectToggle.dataset.rejectToggle + '"]');
    if(box) box.classList.toggle('show');
    return;
  }

  const rejectConfirm = e.target.closest('[data-reject-confirm]');
  if(rejectConfirm){
    const id = rejectConfirm.dataset.rejectConfirm;
    const input = document.querySelector('[data-reject-input="' + id + '"]');
    rejectConfirm.disabled = true;
    await rejectSummary(id, input ? input.value.trim() : '');
    return;
  }

  const delSummary = e.target.closest('[data-del-summary]');
  if(delSummary){ deleteSummary(delSummary.dataset.delSummary); return; }
});

/* ═══════════ الاستماع الحي للبيانات (بعد التأكد من صلاحية الأدمن فقط) ═══════════ */
let listenersStarted = false;
function initListeners(){
  if(listenersStarted) return;
  listenersStarted = true;

  db.collection('forumPosts').orderBy('createdAt', 'desc').limit(500)
    .onSnapshot(snap => {
      postsData = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      renderForum();
      renderStats();
    }, err => toast('تعذّر تحميل بيانات المنتدى: ' + err.message, 'err'));

  db.collection('summaries').orderBy('createdAt', 'desc').limit(500)
    .onSnapshot(snap => {
      summariesData = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      renderSummaries();
    }, err => toast('تعذّر تحميل الملخصات: ' + err.message, 'err'));

  db.collection('users').get()
    .then(snap => { usersCount = snap.size; renderStats(); })
    .catch(() => {});
}

/* ═══════════ الإقلاع ═══════════ */
function boot(){
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();

  initTabs();

  $('#adminLoginBtn').addEventListener('click', handleLogin);
  $('#adminPasswordInput').addEventListener('keydown', e => { if(e.key === 'Enter') handleLogin(); });
  $('#adminSignoutBtn').addEventListener('click', async () => {
    listenersStarted = false;
    await auth.signOut();
  });

  auth.onAuthStateChanged(user => {
    if(user && !user.isAnonymous){
      checkIsAdminAndEnter(user);
    } else {
      showLogin();
    }
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
}else{
  boot();
}

})();
