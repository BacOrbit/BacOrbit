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
      (s.branchLabel ? '<span class="admin-item-badge">🏫 ' + esc(s.branchLabel) + '</span>' : '') +
      (s.subject ? '<span class="admin-item-badge">' + esc(s.subject) + '</span>' : '') +
      (s.category ? '<span class="admin-item-badge">' + esc(s.category) + '</span>' : '') +
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

/* ═══════════ الإحصائيات والتحليلات (مدمجة في لوحة واحدة) ═══════════
   - منحنيات بسيطة (SVG) بلا أي مكتبة خارجية.
   - الزوار والصفحات الأكثر زيارة تُقرأ من مجموعة "visits" التي يكتبها
     script.js (وثيقة واحدة لكل زائر في اليوم: visits/{تاريخ}_{uid}). */
let usersDocs = [];
let visitsDocs = [];
let visitsState = 'loading'; /* loading | ok | error */
let rankPeriod = 7;          /* 1 = اليوم، 7 = أسبوع، 30 = شهر */

const PAGE_NAMES = {
  index: 'الصفحة الرئيسية', chat: 'المنتدى', library: 'مكتبة الكتب', guidance: 'نصائح وتوجيهات',
  calculator: 'حساب المعدل', play: 'المكتسبات القبلية', privacy: 'السياسة والخصوصية',
  'add-files': 'إضافة ملفات', 'submit-summary': 'رفع ملخص', 'study-later': 'الدراسة لاحقًا'
};
const SUBJECT_NAMES = [
  ['accounting', 'المحاسبة'], ['civil', 'الهندسة المدنية'], ['arabic', 'اللغة العربية'], ['economy', 'الاقتصاد'],
  ['electrical', 'الهندسة الكهربائية'], ['french', 'اللغة الفرنسية'], ['english', 'اللغة الإنجليزية'],
  ['islamic', 'العلوم الإسلامية'], ['law', 'القانون'], ['mechanical', 'الهندسة الميكانيكية'],
  ['math', 'الرياضيات'], ['philo', 'الفلسفة'], ['physic', 'الفيزياء'], ['science', 'العلوم الطبيعية'],
  ['social', 'الاجتماعيات'], ['transportation', 'هندسة الطرائق'], ['info', 'الإعلام الآلي'], ['technical', 'تقني رياضي']
];
const PAGE_KINDS = { L: 'دروس', S: 'مواضيع', I: 'تمارين', P: 'فقرات' };

function pageLabel(key){
  if(PAGE_NAMES[key]) return PAGE_NAMES[key];
  const m = /^([LSIP1])_(.+)$/.exec(key);
  if(m){
    const rest = m[2].toLowerCase();
    const hit = SUBJECT_NAMES.find(s => rest.indexOf(s[0]) === 0);
    const name = hit ? hit[1] : m[2];
    return m[1] === '1' ? 'شعبة ' + name : PAGE_KINDS[m[1]] + ' ' + name;
  }
  return key;
}

function tms(c){ return (c && c.toMillis) ? c.toMillis() : (typeof c === 'number' ? c : null); }
function pad2(n){ return String(n).padStart(2, '0'); }
function dayKey(ms){
  const d = new Date(ms);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
/* آخر n يومًا (الأقدم أولًا) بصيغة مفاتيح yyyy-mm-dd بتوقيت المتصفح */
function lastDays(n){
  const out = [], now = new Date();
  for(let i = n - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({
      key: dayKey(d.getTime()),
      label: d.toLocaleDateString('ar', { month: 'short', day: 'numeric' }),
      tick: d.getDate() + '/' + (d.getMonth() + 1),
      value: 0
    });
  }
  return out;
}
function countByDay(list, getMs, days){
  const map = new Map(days.map(d => [d.key, d]));
  list.forEach(x => {
    const t = getMs(x);
    if(t === null || t === undefined) return;
    const d = map.get(dayKey(t));
    if(d) d.value++;
  });
  return days;
}

/* ── منحنى SVG ناعم ── */
function lineChart(items, id){
  const W = 600, H = 210, L = 34, R = 12, T = 14, B = 28;
  const max = Math.max(1, ...items.map(i => i.value));
  const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const n = items.length, step = (W - L - R) / Math.max(1, n - 1);
  const yOf = v => T + (H - T - B) * (1 - v / top);
  const pts = items.map((it, i) => ({ x: L + i * step, y: yOf(it.value), it }));
  const clampY = y => Math.max(T, Math.min(H - B, y));

  let d = 'M' + pts[0].x + ' ' + pts[0].y;
  for(let i = 0; i < pts.length - 1; i++){
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = clampY(p2.y - (p3.y - p1.y) / 6);
    d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
  }
  const base = H - B;
  const area = d + ' L' + pts[pts.length - 1].x + ' ' + base + ' L' + pts[0].x + ' ' + base + ' Z';

  let grid = '';
  for(let k = 0; k <= 4; k++){
    const v = top * k / 4, y = yOf(v);
    grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" style="stroke:var(--empty-border)" stroke-dasharray="3 4"/>' +
            '<text x="' + (L - 6) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="10" style="fill:var(--footer-text)">' + Math.round(v) + '</text>';
  }
  const every = Math.ceil(n / 7);
  let xl = '';
  pts.forEach((p, i) => {
    if(i % every === 0 || i === n - 1) xl += '<text x="' + p.x + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" style="fill:var(--footer-text)">' + esc(p.it.tick) + '</text>';
  });
  const dots = pts.map(p =>
    '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (n <= 14 ? 3.2 : 2.4) + '" style="fill:var(--accent)"><title>' + esc(p.it.label) + ': ' + p.it.value + '</title></circle>' +
    '<circle cx="' + p.x + '" cy="' + p.y + '" r="9" fill="transparent"><title>' + esc(p.it.label) + ': ' + p.it.value + '</title></circle>'
  ).join('');

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;direction:ltr;display:block" role="img">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" style="stop-color:var(--accent);stop-opacity:.35"/><stop offset="100%" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>' +
    grid + '<path d="' + area + '" fill="url(#' + id + ')"/>' +
    '<path d="' + d + '" fill="none" style="stroke:var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    dots + xl + '</svg>';
}

function anCard(title, body, note){
  return '<div class="an-card"><h3>' + title + '</h3>' + body + (note ? '<div class="an-note">' + note + '</div>' : '') + '</div>';
}
function statCard(value, label){
  return '<div class="admin-stat-card"><div class="admin-stat-value">' + value + '</div><div class="admin-stat-label">' + label + '</div></div>';
}
function sumValues(items){ return items.reduce((s, i) => s + i.value, 0); }

function computeVisits(){
  const days = lastDays(30);
  const keyIndex = new Map(days.map(d => [d.key, d]));
  const last7 = new Set(days.slice(-7).map(d => d.key));
  const today = days[days.length - 1].key;
  const u1 = new Set(), u7 = new Set(), u30 = new Set();
  visitsDocs.forEach(v => {
    const d = keyIndex.get(v.date);
    if(!d) return;
    d.value++; /* وثيقة واحدة = زائر واحد في هذا اليوم */
    u30.add(v.uid);
    if(last7.has(v.date)) u7.add(v.uid);
    if(v.date === today) u1.add(v.uid);
  });
  return { days, today: u1.size, week: u7.size, month: u30.size };
}

function topPages(period){
  const keys = new Set(lastDays(period).map(d => d.key));
  const m = new Map();
  visitsDocs.forEach(v => {
    if(!keys.has(v.date) || !v.pages) return;
    Object.keys(v.pages).forEach(k => m.set(k, (m.get(k) || 0) + (Number(v.pages[k]) || 0)));
  });
  return Array.from(m, ([k, value]) => ({ label: pageLabel(k), value })).sort((a, b) => b.value - a.value).slice(0, 10);
}
function hBars(rows){
  if(!rows.length) return '<div class="an-note">لا توجد زيارات مسجّلة في هذه الفترة بعد.</div>';
  const max = Math.max.apply(null, rows.map(r => r.value)) || 1;
  return rows.map((r, i) =>
    '<div class="an-hrow"><span class="an-hrank">' + (i + 1) + '</span><span class="an-hlabel" title="' + esc(r.label) + '">' + esc(r.label) + '</span>' +
    '<span class="an-htrack"><span class="an-hfill" style="width:' + Math.max(3, Math.round(r.value / max * 100)) + '%"></span></span>' +
    '<span class="an-hval">' + r.value + '</span></div>').join('');
}

function loadVisits(){
  const start = lastDays(30)[0].key;
  visitsState = 'loading';
  db.collection('visits').where('date', '>=', start).get()
    .then(snap => { visitsDocs = snap.docs.map(d => d.data()); visitsState = 'ok'; renderStats(); })
    .catch(err => { console.error('visits', err); visitsState = 'error'; renderStats(); });
}

function renderStats(){
  const root = $('#analyticsBody');
  if(!root) return;

  const pendingCount = summariesData.filter(s => s.status === 'pending').length;
  const totalReports = postsData.reduce((sum, p) => sum + (p.reportCount || 0), 0);
  const topPostsCount = postsData.filter(p => !p.parentId && !p.deleted).length;

  const v = computeVisits();
  const users30 = countByDay(usersDocs, u => tms(u.createdAt), lastDays(30));
  const posts30 = countByDay(postsData.filter(p => !p.deleted), p => tms(p.createdAt), lastDays(30));

  const visitorsCards = visitsState === 'ok'
    ? statCard(v.today, 'زوار اليوم') + statCard(v.week, 'زوار الأسبوع') + statCard(v.month, 'زوار الشهر')
    : '';
  const generalCards =
    statCard(usersCount, 'عدد المستخدمين') +
    statCard(topPostsCount, 'عدد المنشورات') +
    statCard(pendingCount, 'ملفات بانتظار المراجعة') +
    statCard(totalReports, 'إجمالي البلاغات');

  let visitsBlock;
  if(visitsState === 'loading'){
    visitsBlock = anCard('👁️ الزوار', '<div class="an-note">جارٍ التحميل…</div>');
  } else if(visitsState === 'error'){
    visitsBlock = anCard('👁️ الزوار', '',
      'تعذّر قراءة مجموعة visits. أضف قاعدة visits إلى Firestore Rules كما في الشرح ثم أعد تحميل الصفحة.');
  } else {
    const periodBtns = [[1, 'اليوم'], [7, 'الأسبوع'], [30, 'الشهر']].map(p =>
      '<button type="button" class="an-period' + (rankPeriod === p[0] ? ' active' : '') + '" data-rank-period="' + p[0] + '">' + p[1] + '</button>').join('');
    visitsBlock =
      anCard('📈 الزوار يوميًا (آخر 30 يومًا)', lineChart(v.days, 'gVisits'),
        'كل زائر يُحسب مرة واحدة في اليوم. التسجيل يبدأ من تاريخ رفع التحديث فقط.') +
      anCard('🔥 أكثر الصفحات زيارة <span class="an-periods">' + periodBtns + '</span>', hBars(topPages(rankPeriod)),
        'عدد مرات فتح كل صفحة (تُحتسب مرة واحدة لكل زائر في الجلسة).');
  }

  root.innerHTML =
    '<h2 class="admin-section-title">نظرة عامة</h2>' +
    '<div class="admin-stats-grid">' + visitorsCards + generalCards + '</div>' +
    '<div class="an-grid">' + visitsBlock + '</div>' +
    '<div class="an-grid">' +
      anCard('👥 حسابات جديدة يوميًا (' + sumValues(users30) + ' خلال 30 يومًا)', lineChart(users30, 'gUsers')) +
      anCard('💬 نشاط المنتدى يوميًا (' + sumValues(posts30) + ' خلال 30 يومًا)', lineChart(posts30, 'gPosts'), 'منشورات وردود (آخر 500 عنصر محمَّل).') +
    '</div>';
}
const renderAnalytics = renderStats;

/* ═══════════ الأحداث العامة (تفويض نقر واحد) ═══════════ */
document.addEventListener('click', async (e) => {
  const periodBtn = e.target.closest('[data-rank-period]');
  if(periodBtn){ rankPeriod = parseInt(periodBtn.dataset.rankPeriod, 10) || 7; renderStats(); return; }

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
  loadVisits();

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
      renderAnalytics();
    }, err => toast('تعذّر تحميل الملخصات: ' + err.message, 'err'));

  db.collection('users').get()
    .then(snap => { usersCount = snap.size; usersDocs = snap.docs.map(d => d.data()); renderStats(); renderAnalytics(); })
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
