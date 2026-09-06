/* ============================================================
   BacOrbit — add-files.js
   يتيح للمستخدم إضافة ملف تعليمي (ملخص/تمارين) حسب شعبته ومادته.
   ⚠️ مهم: لا يُنشئ أي نظام مراجعة جديد — يكتب في نفس مجموعة
   Firestore "summaries" التي تستخدمها submit-summary.js ولوحة
   الإدارة (admin.js/admin.html) بالفعل، فقط بحقلين إضافيين
   (branch/branchLabel و category)، حتى تظهر كل الملفات الجديدة
   في نفس تبويب "الملخصات والملفات" داخل لوحة الإدارة دون أي ازدواجية.
   يعتمد على نفس هوية Anonymous Auth المستخدمة في المنتدى وصفحة
   رفع الملخص.
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

/* بنية الشعب والمواد: مبنية مطابقة تمامًا لأسماء الشعب والمواد
   الفعلية الموجودة في صفحات Branches/1_*.html الحالية (لم تُخترع أي
   تسمية جديدة). شعبة الإعلام الآلي غير مفعّلة حاليًا في كامل الموقع
   (مثل حاسبة المعدل وصفحة 1_info.html) فتبقى كذلك هنا أيضًا. */
const BRANCHES = [
  { key: 'science', name: 'علوم تجريبية', subjects: ['الرياضيات', 'الفيزياء', 'العلوم الطبيعية', 'اللغة العربية', 'اللغة الإنجليزية', 'العلوم الإسلامية', 'التاريخ'] },
  { key: 'math', name: 'رياضيات', subjects: ['الرياضيات', 'الفيزياء', 'العلوم الطبيعية', 'اللغة العربية', 'اللغة الإنجليزية', 'العلوم الإسلامية', 'التاريخ'] },
  { key: 'technical', name: 'تقني رياضي', subjects: ['الرياضيات', 'الفيزياء', 'الهندسة المدنية', 'الهندسة الميكانيكية', 'الهندسة الكهربائية', 'هندسة الطرائق', 'اللغة العربية', 'اللغة الإنجليزية', 'العلوم الإسلامية', 'التاريخ'] },
  { key: 'economy', name: 'تسيير واقتصاد', subjects: ['الرياضيات', 'التسيير المحاسبي والمالي', 'القانون', 'اللغة العربية', 'اللغة الإنجليزية', 'العلوم الإسلامية', 'الاجتماعيات', 'الاقتصاد والمناجمنت'] },
  { key: 'info', name: 'الإعلام الآلي (قريبًا)', subjects: [], enabled: false }
];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
             .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

let db, storage, me = null;
const MAX_FILE = 20 * 1024 * 1024; /* 20MB — نفس الحد المستخدم في submit-summary.js */

function showMsg(text, type){
  const el = $('#afMsg');
  el.textContent = text;
  el.className = 'af-msg show ' + type;
}

function populateBranches(){
  const sel = $('#afBranch');
  sel.innerHTML = '';
  BRANCHES.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.key; opt.textContent = b.name;
    if (b.enabled === false) opt.disabled = true;
    sel.appendChild(opt);
  });
  populateSubjects(sel.value);
}

function populateSubjects(branchKey){
  const branch = BRANCHES.find(b => b.key === branchKey) || BRANCHES[0];
  const sel = $('#afSubject');
  sel.innerHTML = '';
  if (!branch.subjects.length){
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'لا توجد مواد متاحة بعد لهذه الشعبة';
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  branch.subjects.forEach(s => {
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
  const wrap = $('#afMineList');
  const empty = $('#afMineEmpty');
  wrap.innerHTML = '';
  if(!list.length){ empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.sort((a,b) => ts(b.createdAt) - ts(a.createdAt)).forEach(s => {
    const statusLabel = s.status === 'approved' ? '✅ تم النشر'
      : s.status === 'rejected' ? '❌ مرفوض' : '⏳ بانتظار المراجعة';
    const div = document.createElement('div');
    div.className = 'af-mine-item';
    div.innerHTML =
      '<div class="af-mine-head">' +
        '<span class="af-mine-title">' + esc(s.title) + '</span>' +
        '<span class="af-status ' + s.status + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div style="color:var(--footer-text);font-size:12px;margin-top:4px">' +
        esc(s.branchLabel || '') + (s.branchLabel && s.subject ? ' • ' : '') + esc(s.subject || '') +
        (s.category ? ' • ' + esc(s.category) : '') + ' • ' + fmtDate(ts(s.createdAt)) +
      '</div>' +
      (s.status === 'rejected' && s.rejectionReason ? '<div class="af-mine-reason">سبب الرفض: ' + esc(s.rejectionReason) + '</div>' : '');
    wrap.appendChild(div);
  });
}

async function submitFile(){
  const branchKey = $('#afBranch').value;
  const branch = BRANCHES.find(b => b.key === branchKey);
  const subject = $('#afSubject').value;
  const category = $('#afCategory').value;
  const title = $('#afTitle').value.trim();
  const note = $('#afNote').value.trim();
  const fileInput = $('#afFile');
  const file = fileInput.files[0];

  if (branch && branch.enabled === false){ showMsg('هذه الشعبة غير مفعّلة بعد.', 'err'); return; }
  if (!subject){ showMsg('الرجاء اختيار المادة.', 'err'); return; }
  if (!title){ showMsg('الرجاء إدخال عنوان للملف.', 'err'); return; }
  if (!file){ showMsg('الرجاء اختيار ملف PDF.', 'err'); return; }
  if (file.type !== 'application/pdf'){ showMsg('يُقبل ملف PDF فقط.', 'err'); return; }
  if (file.size > MAX_FILE){ showMsg('حجم الملف كبير جدًا (الحد الأقصى 20MB).', 'err'); return; }
  if (!me){ showMsg('تعذّر تجهيز حسابك، أعد تحميل الصفحة وحاول مجددًا.', 'err'); return; }

  const btn = $('#afSubmitBtn');
  btn.disabled = true; const oldText = btn.textContent; btn.textContent = 'جارٍ الرفع…';

  try{
    /* نفس مسار التخزين المستخدم في submit-summary.js (summaries/{uid}/...)
       حتى تعمل صلاحيات Firebase Storage الحالية دون أي تعديل إضافي. */
    const path = 'summaries/' + me.uid + '/' + Date.now() + '_' + file.name.replace(/[^\w.\-]/g, '_');
    const ref = storage.ref().child(path);
    await ref.put(file);
    const fileUrl = await ref.getDownloadURL();

    await db.collection('summaries').add({
      title, subject, note,
      branch: branchKey,
      branchLabel: branch ? branch.name : '',
      category,
      level: '',
      fileUrl, fileName: file.name, fileSize: file.size,
      submitterUid: me.uid,
      submitterName: me.name || 'مستخدم',
      status: 'pending',
      rejectionReason: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null
    });

    showMsg('تم إرسال ملفك بنجاح ✅ سيراجعه فريق BacOrbit قريبًا.', 'ok');
    $('#afTitle').value = ''; $('#afNote').value = '';
    fileInput.value = ''; $('#afFileName').textContent = 'لم يتم اختيار ملف بعد';
  }catch(err){
    console.error(err);
    showMsg('تعذّر إرسال الملف: ' + (err.message || 'خطأ غير معروف'), 'err');
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

  populateBranches();

  $('#afBranch').addEventListener('change', () => populateSubjects($('#afBranch').value));
  $('#afFile').addEventListener('change', () => {
    const f = $('#afFile').files[0];
    $('#afFileName').textContent = f ? f.name : 'لم يتم اختيار ملف بعد';
  });
  $('#afSubmitBtn').addEventListener('click', submitFile);

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

    if (window.BacNotifications) {
      window.BacNotifications.init({ db: db, me: me, firebase: firebase });
    }

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
