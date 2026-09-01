/* ============================================================
   BacOrbit — submit-summary.js
   يتيح للمستخدم رفع ملخص (PDF) ليدخل مباشرة بحالة "pending" في
   Firestore (مجموعة summaries)، دون أي نشر مباشر. يعتمد على نفس
   هوية المستخدم المجهولة (Anonymous Auth) المستخدمة في المنتدى،
   حتى تُربط الملخصات المُرسَلة بصاحبها ويمكنه متابعة حالتها لاحقًا
   من نفس المتصفح.
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

/* نفس قائمة المواد المستخدمة في مكتبة الكتب (library.js) للحفاظ
   على تطابق التصنيفات بين الملخصات المعتمدة والمكتبة مستقبلًا. */
const SUBJECTS = [
    "الرياضيات","الفيزياء","علوم الطبيعة والحياة","اللغة العربية","الإنجليزية",
    "الفرنسية","التاريخ والجغرافيا","الفلسفة","العلوم الإسلامية","الإعلام الآلي","مواد أخرى"
];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
             .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

let db, storage, me = null;
const MAX_FILE = 20 * 1024 * 1024; /* 20MB */

function showMsg(text, type){
  const el = $('#ssMsg');
  el.textContent = text;
  el.className = 'ss-msg show ' + type;
}

function populateSubjects(){
  const sel = $('#ssSubject');
  SUBJECTS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    sel.appendChild(opt);
  });
}

function fmtDate(ms){
  if(!ms) return '';
  return new Date(ms).toLocaleDateString('ar', { year:'numeric', month:'short', day:'numeric' });
}
function ts(c){ return (c && c.toMillis) ? c.toMillis() : (typeof c==='number' ? c : Date.now()); }

function renderMine(list){
  const wrap = $('#ssMineList');
  const empty = $('#ssMineEmpty');
  wrap.innerHTML = '';
  if(!list.length){ empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.sort((a,b) => ts(b.createdAt) - ts(a.createdAt)).forEach(s => {
    const statusLabel = s.status === 'approved' ? '✅ تم النشر'
      : s.status === 'rejected' ? '❌ مرفوض' : '⏳ بانتظار المراجعة';
    const div = document.createElement('div');
    div.className = 'ss-mine-item';
    div.innerHTML =
      '<div class="ss-mine-head">' +
        '<span class="ss-mine-title">' + esc(s.title) + '</span>' +
        '<span class="ss-status ' + s.status + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div style="color:var(--footer-text);font-size:12px;margin-top:4px">' + esc(s.subject || '') + ' • ' + fmtDate(ts(s.createdAt)) + '</div>' +
      (s.status === 'rejected' && s.rejectionReason ? '<div class="ss-mine-reason">سبب الرفض: ' + esc(s.rejectionReason) + '</div>' : '');
    wrap.appendChild(div);
  });
}

async function submitSummary(){
  const title = $('#ssTitle').value.trim();
  const subject = $('#ssSubject').value;
  const level = $('#ssLevel').value.trim();
  const note = $('#ssNote').value.trim();
  const fileInput = $('#ssFile');
  const file = fileInput.files[0];

  if(!title){ showMsg('الرجاء إدخال عنوان للملخص.', 'err'); return; }
  if(!file){ showMsg('الرجاء اختيار ملف PDF.', 'err'); return; }
  if(file.type !== 'application/pdf'){ showMsg('يُقبل ملف PDF فقط.', 'err'); return; }
  if(file.size > MAX_FILE){ showMsg('حجم الملف كبير جدًا (الحد الأقصى 20MB).', 'err'); return; }
  if(!me){ showMsg('تعذّر تجهيز حسابك، أعد تحميل الصفحة وحاول مجددًا.', 'err'); return; }

  const btn = $('#ssSubmitBtn');
  btn.disabled = true; const oldText = btn.textContent; btn.textContent = 'جارٍ الرفع…';

  try{
    const path = 'summaries/' + me.uid + '/' + Date.now() + '_' + file.name.replace(/[^\w.\-]/g, '_');
    const ref = storage.ref().child(path);
    await ref.put(file);
    const fileUrl = await ref.getDownloadURL();

    await db.collection('summaries').add({
      title, subject, level, note,
      fileUrl, fileName: file.name, fileSize: file.size,
      submitterUid: me.uid,
      submitterName: me.name || 'مستخدم',
      status: 'pending',
      rejectionReason: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null
    });

    showMsg('تم إرسال ملخصك بنجاح ✅ سيراجعه فريق BacOrbit قريبًا.', 'ok');
    $('#ssTitle').value = ''; $('#ssLevel').value = ''; $('#ssNote').value = '';
    fileInput.value = ''; $('#ssFileName').textContent = 'لم يتم اختيار ملف بعد';
  }catch(err){
    console.error(err);
    showMsg('تعذّر إرسال الملخص: ' + (err.message || 'خطأ غير معروف'), 'err');
  }finally{
    btn.disabled = false; btn.textContent = oldText;
  }
}

async function genName(){
  for(let i=0;i<8;i++){
    const n = 'التلميذ' + (1000 + Math.floor(Math.random()*9000));
    const q = await db.collection('users').where('name','==',n).limit(1).get();
    if(q.empty) return n;
  }
  return 'التلميذ' + String(Date.now()).slice(-6);
}

async function boot(){
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();

  populateSubjects();

  $('#ssFile').addEventListener('change', () => {
    const f = $('#ssFile').files[0];
    $('#ssFileName').textContent = f ? f.name : 'لم يتم اختيار ملف بعد';
  });
  $('#ssSubmitBtn').addEventListener('click', submitSummary);

  try{
    let user = auth.currentUser;
    if(!user) user = (await auth.signInAnonymously()).user;

    const uRef = db.collection('users').doc(user.uid);
    let snap = await uRef.get();
    if(!snap.exists){
      const name = await genName();
      await uRef.set({ name, banned:false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      snap = await uRef.get();
    }
    me = { uid: user.uid, name: snap.data().name };

    db.collection('summaries').where('submitterUid','==', me.uid)
      .onSnapshot(qsnap => {
        renderMine(qsnap.docs.map(d => Object.assign({ id: d.id }, d.data())));
      }, () => {});
  }catch(err){
    console.error(err);
    showMsg('تعذّر تجهيز حسابك للرفع، أعد تحميل الصفحة.', 'err');
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
}else{
  boot();
}

})();
