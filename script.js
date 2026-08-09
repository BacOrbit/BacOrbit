<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>منتدى التلاميذ - اطرح أسئلتك وشارك زملاءك | BacOrbit</title>
<link rel="stylesheet" href="style.css">
<script>
/* منع وميض الثيم — نفس المفتاح المستعمل في script.js تماماً */
try{ if(localStorage.getItem("bacorbit-theme")==="light"){ document.documentElement.setAttribute("data-theme","light"); } }catch(e){}
</script>

<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js"></script>

<style>
/* ══ إضافات خاصة بصفحة المنتدى فقط ══ */
.attach-preview-list{display:none;flex-wrap:wrap;gap:12px;margin:0 0 14px}
.attach-chip{position:relative;border:2px solid var(--border);background:var(--bg);border-radius:12px;padding:6px;display:flex;align-items:center;gap:8px;animation:forumCardIn .3s ease both;transition:box-shadow .25s ease,transform .25s ease,border-color .35s ease,background-color .35s ease}
.attach-chip:hover{box-shadow:0 0 14px var(--accent-glow);transform:translateY(-2px)}
.attach-chip img{width:74px;height:74px;object-fit:cover;border-radius:8px;display:block}
.chip-file{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:100px;max-width:150px;padding:8px 6px;font-size:22px;color:var(--text)}
.chip-file small{font-size:10.5px;color:var(--text-secondary);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.chip-remove{position:absolute;top:-8px;left:-8px;width:22px;height:22px;border-radius:50%;border:none;background:var(--danger);color:#fff;font-size:12px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:transform .2s ease;font-family:inherit}
.chip-remove:hover{transform:scale(1.18)}
.reply-form .submit-btn{width:auto;flex:1;min-width:150px}
.report-pill{margin-inline-start:auto;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--danger);color:var(--danger);background:var(--danger-bg);padding:5px 12px;border-radius:10px;font-size:12px;font-weight:bold}
.report-btn.reported-done{border-color:var(--empty-border);color:var(--footer-text);cursor:default}
.report-btn.reported-done:hover{background:none}
.content-note{color:var(--footer-text);font-size:14px;padding:8px 5px;text-align:center;line-height:1.9}
.post.removed-content{border-style:dashed;border-color:var(--danger);background:var(--danger-bg)}
.banned-icon{width:72px;height:72px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:34px;border-radius:50%;background:var(--danger-bg);border:2px solid var(--danger)}
.mode-note{max-width:800px;margin:0 auto 16px;padding:9px 14px;border:1px dashed var(--gold);border-radius:12px;color:var(--gold-dark);background:rgba(255,210,77,.08);font-size:12.5px;text-align:center;line-height:1.7;display:none}
#toast{position:fixed;bottom:24px;left:0;right:0;display:flex;justify-content:center;z-index:3000;pointer-events:none}
#toast .toast-box{background:var(--card-bg);border:2px solid var(--accent);color:var(--accent);padding:12px 24px;border-radius:14px;font-weight:bold;box-shadow:0 8px 30px rgba(0,0,0,.4);opacity:0;transform:translateY(15px);transition:opacity .3s ease,transform .3s ease,border-color .35s ease,color .35s ease;max-width:90%;text-align:center}
#toast.show .toast-box{opacity:1;transform:translateY(0)}
#toast.err .toast-box{border-color:var(--danger);color:var(--danger)}
/* تفاعلات الأزرار الاحترافية */
.action-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px}
.action-btn:active:not(:disabled){transform:translateY(1px)}
.action-btn:disabled{opacity:.65;cursor:wait}
.action-btn.done{background:var(--featured-tint)}
.act-spinner{width:12px;height:12px;border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:forumSpin .7s linear infinite;flex-shrink:0}
.submit-btn:active:not(:disabled){transform:scale(.985)}
.action-btn:focus-visible,.submit-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:600px){.chip-file{min-width:80px}.report-pill{margin-inline-start:0}}
</style>
</head>
<body>

<nav class="top-bar" id="topBar">
  <a class="top-link" href="https://www.facebook.com/profile.php?id=61593220613025" target="_blank" rel="noopener">🎧 الدعم</a>
  <!-- نفس البنية والمعرّف الذي يتوقعه script.js -->
  <button class="theme-switch" id="themeToggle" aria-label="تبديل الوضع الليلي/النهاري">
    <span class="theme-switch-track">
      <span class="theme-switch-icon sun">☀️</span>
      <span class="theme-switch-icon moon">🌙</span>
    </span>
    <span class="theme-switch-thumb"></span>
  </button>
  <a class="top-link" href="chat.html">📚 المنتدى</a>
</nav>

<header class="site-header"><div class="logo">BacOrbit</div></header>

<section class="hero">
  <h1>منتدى التلاميذ</h1>
  <p>اطرح سؤالك، شارك ملاحظاتك، وساعد زملاءك 🎓</p>
</section>

<main class="wrap">
  <div class="mode-note" id="modeNote">⚙️ وضع تجريبي محلي — البيانات محفوظة في متصفحك فقط. أضف إعدادات Firebase داخل الكود لتفعيل المزامنة الفعلية والحظر المرتبط بالحساب.</div>

  <div id="forumLoading" class="auth-gate">
    <div class="auth-icon">💬</div>
    <h2 style="color:var(--accent);margin-bottom:10px">جارٍ الدخول إلى المنتدى…</h2>
    <p style="color:var(--text-secondary)">يتم تجهيز هويتك وتحميل التعليقات.</p>
  </div>

  <div id="bannedScreen" class="auth-gate" style="display:none">
    <div class="banned-icon">🚫</div>
    <h2 style="color:var(--danger)">تم إيقاف حسابك في المنتدى</h2>
    <p style="color:var(--text-secondary);line-height:1.8">الحساب <strong style="color:var(--danger)" id="bannedName"></strong> تلقّى أحد محتوياته
    <b>3 بلاغات من 3 أعضاء مختلفين</b>، لذلك تم إقصاؤه من منتدى BacOrbit.<br>
    هذا الإيقاف مرتبط بالحساب نفسه ومخزَّن في قاعدة البيانات، ولا يمكن تجاوزه بإعادة تحميل الصفحة.</p>
    <a class="back" style="width:100%;margin:12px 0 0" href="index.html">⬅ العودة إلى الصفحة الرئيسية</a>
  </div>

  <div id="forumApp" style="display:none">
    <div class="user-bar">
      <span>مسجّل الدخول باسم: <strong id="userName">…</strong></span>
      <a class="signout-link" id="signOutBtn">تسجيل الخروج ⏻</a>
    </div>

    <div class="new-post">
      <div class="composer-title">
        <div>
          <h3>✏️ اكتب سؤالاً أو تعليقاً</h3>
          <p>شارك نصاً، صورة، أو ملفاً مع زملائك.</p>
        </div>
        <span class="composer-badge">BacOrbit 🎓</span>
      </div>

      <div id="mainError" class="forum-error" style="display:none"></div>

      <textarea id="postText" data-draft="main" placeholder="اكتب سؤالك أو مشاركتك هنا… (Ctrl+Enter للنشر السريع)"></textarea>

      <div class="attach-preview-list" data-preview="main"></div>

      <div class="file-row">
        <label class="file-label">📎 إضافة صورة أو ملف
          <input type="file" hidden multiple data-filefor="main"
                 accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv">
        </label>
        <span class="file-name">PDF، Word، ZIP، صور… حتى 15MB</span>
      </div>

      <button type="button" class="submit-btn" id="postSubmit"><span class="dl-label">نشر التعليق ➜</span></button>
    </div>

    <div id="postsList"></div>
    <div id="emptyState" class="empty-state" style="display:none">لا توجد تعليقات بعد، كن أول من يشارك! 🙌</div>
  </div>
</main>

<a class="back" href="index.html">⬅ العودة إلى الصفحة الرئيسية</a>
<footer>© 2026 BacOrbit</footer>

<div id="toast"><div class="toast-box" id="toastBox"></div></div>

<!-- السكربت المشترك للموقع: الثيم + إخفاء الشريط العلوي (لا نكرر منطقه أبداً) -->
<script src="script.js"></script>

<script>
/* ═══════════════════════════════════════════════════════════════
   منتدى BacOrbit — النسخة المصححة
═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ═══════════ إعدادات Firebase ═══════════
   ضع هنا إعدادات مشروعك. إن بقيت كما هي يعمل الموقع بالوضع التجريبي. */
const firebaseConfig = {
  apiKey:            "ضع_API_KEY_هنا",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:xxxxxxxxxxxx"
};

const MAX_REPORTS = 3;
const MAX_FILE    = 15 * 1024 * 1024;
const ACCEPT      = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv";

const $   = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
             .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

let MODE='local', DB=null, me=null;
let postsData=[], drafts=new Map(), openReplyFor=null;

function getDraft(k){ if(!drafts.has(k)) drafts.set(k,{text:'',attachments:[]}); return drafts.get(k); }
function ts(c){ return (c && c.toMillis) ? c.toMillis() : (typeof c==='number' ? c : Date.now()); }

function timeAgo(ms){
  if(!ms) return 'الآن';
  const s=Math.floor((Date.now()-ms)/1000);
  if(s<60) return 'الآن';
  const m=Math.floor(s/60);
  if(m<60) return 'منذ '+(m===1?'دقيقة':m===2?'دقيقتين':m<=10?m+' دقائق':m+' دقيقة');
  const h=Math.floor(m/60);
  if(h<24) return 'منذ '+(h===1?'ساعة':h===2?'ساعتين':h<=10?h+' ساعات':h+' ساعة');
  const d=Math.floor(h/24);
  if(d===1) return 'أمس';
  if(d<7)  return 'منذ '+d+' أيام';
  return new Date(ms).toLocaleDateString('ar',{year:'numeric',month:'short',day:'numeric'});
}
function fileIcon(name){
  const ext=(name.split('.').pop()||'').toLowerCase();
  const map={pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',
             zip:'📦',rar:'📦','7z':'📦',txt:'📄',csv:'📄',mp3:'🎧',wav:'🎧',
             mp4:'🎬',png:'🖼️',jpg:'🖼️',jpeg:'🖼️',gif:'🖼️',webp:'🖼️'};
  return map[ext]||'📁';
}
function fmtSize(b){
  if(b==null) return '';
  if(b<1024) return b+' B';
  if(b<1048576) return (b/1024).toFixed(1)+' KB';
  return (b/1048576).toFixed(1)+' MB';
}
function trErr(msg){
  return msg==='dup'    ? 'لقد أبلغت عن هذا المحتوى مسبقاً'
       : msg==='own'    ? 'لا يمكنك الإبلاغ عن محتواك الشخصي'
       : msg==='missing'? 'هذا المحتوى لم يعد موجوداً'
       : (msg || 'حدث خطأ غير متوقع');
}

let toastTimer;
function toast(msg,type){
  const el=$('#toast'); $('#toastBox').textContent=msg;
  el.classList.toggle('err',type==='err'); el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3400);
}

/* ═══════════ حالات الأزرار (نفس نمط downloadTopic في script.js) ═══════════ */
const isBusy = btn => btn && btn.dataset.busy==='1';
function btnLoading(btn,text){
  if(!btn) return;
  btn.dataset.orig=btn.innerHTML;
  btn.dataset.busy='1';
  btn.classList.add('loading');
  btn.disabled=true;
  const spinner = btn.classList.contains('submit-btn')
    ? '<span class="btn-spinner"></span>'
    : '<span class="act-spinner"></span>';
  btn.innerHTML = spinner+'<span class="dl-label">'+text+'</span>';
}
function btnDone(btn,text){
  if(!btn) return;
  btn.classList.remove('loading');
  btn.classList.add('done');
  btn.innerHTML='<span class="dl-check">✓</span><span class="dl-label">'+text+'</span>';
  setTimeout(()=>btnReset(btn),1800);
}
function btnReset(btn){
  if(!btn) return;
  btn.classList.remove('loading','done');
  btn.disabled=false;
  btn.dataset.busy='0';
  if(btn.dataset.orig) btn.innerHTML=btn.dataset.orig;
}

/* ═══════════ محوّل Firebase ═══════════ */
const FB={
  db:null,auth:null,storage:null,
  async init(){
    firebase.initializeApp(firebaseConfig);
    this.auth=firebase.auth(); this.db=firebase.firestore(); this.storage=firebase.storage();
    let user=this.auth.currentUser;
    if(!user) user=(await this.auth.signInAnonymously()).user;
    const uRef=this.db.collection('users').doc(user.uid);
    let snap=await uRef.get();
    if(!snap.exists){
      const name=await this.genName();
      await uRef.set({name,banned:false,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      snap=await uRef.get();
    }
    const d=snap.data();
    me={uid:user.uid,name:d.name,banned:!!d.banned};
    return me;
  },
  async genName(){
    for(let i=0;i<8;i++){
      const n='التلميذ'+(1000+Math.floor(Math.random()*9000));
      const q=await this.db.collection('users').where('name','==',n).limit(1).get();
      if(q.empty) return n;
    }
    return 'التلميذ'+String(Date.now()).slice(-6);
  },
  listenUser(cb){ this.db.collection('users').doc(me.uid).onSnapshot(s=>{ if(s.exists) cb(s.data()); }); },
  listen(cb){
    this.db.collection('forumPosts').orderBy('createdAt','desc').limit(300).onSnapshot(
      s=>cb(s.docs.map(x=>Object.assign({id:x.id},x.data()))),
      err=>{ const e=$('#mainError'); e.textContent='تعذّر تحميل التعليقات: '+(err.message||err); e.style.display='block'; }
    );
  },
  async upload(file){
    const r=this.storage.ref().child('forum/'+me.uid+'/'+Date.now()+'_'+file.name.replace(/[^\w.\-]/g,'_'));
    await r.put(file);
    return await r.getDownloadURL();
  },
  base(data){ return Object.assign({},data,{uid:me.uid,name:me.name,reports:{},reportCount:0,
    removed:false,deleted:false,createdAt:firebase.firestore.FieldValue.serverTimestamp()}); },
  createPost(d){ return this.db.collection('forumPosts').add(this.base(Object.assign({parentId:null},d))); },
  createReply(pid,d){ return this.db.collection('forumPosts').add(this.base(Object.assign({parentId:pid},d))); },
  async delete(id){
    const ref=this.db.collection('forumPosts').doc(id);
    await firebase.firestore().runTransaction(async tx=>{
      const s=await tx.get(ref);
      if(!s.exists) throw new Error('missing');
      if(s.data().uid!==me.uid) throw new Error('لا يمكنك حذف محتوى الآخرين');
      tx.update(ref,{deleted:true});
    });
  },
  async report(id){
    const ref=this.db.collection('forumPosts').doc(id);
    const out={};
    await firebase.firestore().runTransaction(async tx=>{
      const s=await tx.get(ref);
      if(!s.exists) throw new Error('missing');
      const d=s.data();
      if(d.uid===me.uid) throw new Error('own');
      const reps=d.reports||{};
      if(reps[me.uid]) throw new Error('dup');
      const count=(d.reportCount||0)+1;
      const upd={reportCount:count}; upd['reports.'+me.uid]=true;
      if(count>=MAX_REPORTS){
        upd.removed=true;
        tx.update(this.db.collection('users').doc(d.uid),{
          banned:true,bannedAt:firebase.firestore.FieldValue.serverTimestamp(),bannedFor:id});
      }
      tx.update(ref,upd);
      out.count=count; out.banned=count>=MAX_REPORTS;
    });
    return out;
  },
  async signOut(){ await this.auth.signOut(); }
};

/* ═══════════ محوّل الوضع التجريبي المحلي ═══════════ */
const LC={
  KEY:'bacorbit_forum_v1',data:null,cb:null,userCb:null,
  load(){ try{this.data=JSON.parse(localStorage.getItem(this.KEY))}catch(e){this.data=null}
          if(!this.data) this.data={uid:null,users:{},posts:[]}; },
  save(){ try{localStorage.setItem(this.KEY,JSON.stringify(this.data));}
          catch(e){ throw new Error('مساحة التخزين التجريبي ممتلئة — فعّل Firebase'); } },
  wait(){ return new Promise(r=>setTimeout(r,220)); },
  async init(){
    this.load();
    if(!this.data.uid){
      const uid='u_'+Math.random().toString(36).slice(2,10);
      this.data.uid=uid; this.data.users[uid]={name:this.genName(),banned:false};
      this.save();
    }
    const u=this.data.users[this.data.uid];
    me={uid:this.data.uid,name:u.name,banned:!!u.banned};
    return me;
  },
  genName(){ let n; do{ n='التلميذ'+(1000+Math.floor(Math.random()*9000)); }
             while(Object.values(this.data.users).some(u=>u.name===n)); return n; },
  listen(cb){ this.cb=cb; this.emit(); },
  listenUser(cb){ this.userCb=cb; },
  emit(){ this.cb&&this.cb(this.data.posts.map(p=>Object.assign({},p)));
          this.userCb&&me&&this.userCb(this.data.users[me.uid]); },
  async upload(file){
    if(file.size>1500000) throw new Error('الوضع التجريبي يدعم ملفات حتى 1.5MB فقط — فعّل Firebase للملفات الكبيرة');
    return await new Promise((res,rej)=>{ const r=new FileReader();
      r.onload=()=>res(r.result); r.onerror=()=>rej(new Error('فشل قراءة الملف')); r.readAsDataURL(file); });
  },
  push(data,parentId){
    this.data.posts.push(Object.assign({},data,{
      id:(parentId?'r_':'p_')+Date.now()+Math.random().toString(36).slice(2,6),
      parentId:parentId||null,uid:me.uid,name:me.name,reports:{},reportCount:0,
      removed:false,deleted:false,createdAt:Date.now()}));
    this.save(); this.emit();
  },
  async createPost(d){ await this.wait(); this.push(d,null); },
  async createReply(pid,d){ await this.wait(); this.push(d,pid); },
  async delete(id){ await this.wait(); const p=this.data.posts.find(x=>x.id===id);
    if(!p) throw new Error('missing');
    if(p.uid!==me.uid) throw new Error('لا يمكنك حذف محتوى الآخرين');
    p.deleted=true; this.save(); this.emit(); },
  async report(id){ await this.wait(); const p=this.data.posts.find(x=>x.id===id);
    if(!p) throw new Error('missing');
    if(p.uid===me.uid) throw new Error('own');
    p.reports=p.reports||{};
    if(p.reports[me.uid]) throw new Error('dup');
    p.reportCount=(p.reportCount||0)+1; p.reports[me.uid]=true;
    let banned=false;
    if(p.reportCount>=MAX_REPORTS){
      p.removed=true;
      const a=this.data.users[p.uid]; if(a){ a.banned=true; banned=true; }
    }
    this.save(); this.emit(); return {count:p.reportCount,banned}; },
  async signOut(){ this.data.uid=null; this.save(); }
};

/* ═══════════ العرض ═══════════ */
function attachmentsHTML(list){
  let h='';
  (list||[]).forEach(a=>{
    if(a.kind==='image'){
      h+='<a class="attachment-image-link" href="'+esc(a.url)+'" target="_blank" rel="noopener">'
        +'<img class="post-img" src="'+esc(a.url)+'" alt="صورة مرفقة" loading="lazy"></a>';
    }else{
      h+='<a class="attachment-card" href="'+esc(a.url)+'" target="_blank" rel="noopener" download="'+esc(a.name)+'">'
        +'<span class="attachment-icon">'+fileIcon(a.name)+'</span>'
        +'<span class="attachment-info"><strong>'+esc(a.name)+'</strong><small>'+fmtSize(a.size)+'</small></span>'
        +'<span class="attachment-download">⬇</span></a>';
    }
  });
  return h;
}
function actionsHTML(c,mine,isReply){
  let h='<div class="post-actions">';
  if(!isReply) h+='<button type="button" class="action-btn reply-btn" data-reply-toggle="'+c.id+'">💬 رد</button>';
  if(mine){
    h+='<button type="button" class="action-btn del-btn" data-del="'+c.id+'">🗑 حذف</button>';
  }else{
    const already=c.reports&&c.reports[me.uid];
    h+= already
      ? '<button type="button" class="action-btn report-btn reported-done" disabled>✅ تم الإبلاغ</button>'
      : '<button type="button" class="action-btn report-btn" data-report="'+c.id+'">🚩 إبلاغ</button>';
  }
  if(c.reportCount>0) h+='<span class="report-pill" title="عدد البلاغات على هذا المحتوى">🚩 '+c.reportCount+'/'+MAX_REPORTS+'</span>';
  return h+'</div>';
}
function replyFormHTML(pid){
  return '<div class="reply-form'+(openReplyFor===pid?' open':'')+'" data-form="'+pid+'">'
    +'<textarea data-draft="reply-'+pid+'" placeholder="اكتب ردك… يمكنك إرفاق صورة أو ملف 📎"></textarea>'
    +'<div class="attach-preview-list" data-preview="reply-'+pid+'"></div>'
    +'<div class="file-row">'
    +'<label class="file-label">📎 صورة أو ملف<input type="file" hidden multiple accept="'+ACCEPT+'" data-filefor="reply-'+pid+'"></label>'
    +'<button type="button" class="submit-btn" data-reply-submit="'+pid+'"><span class="dl-label">إرسال الرد ➜</span></button>'
    +'</div></div>';
}
function replyHTML(r){
  const mine=r.uid===me.uid;
  let h='<div class="reply'+(mine?' post-mine':'')+'">';
  if(r.removed) return h+'<div class="content-note">⚠️ تمت إزالة هذا الرد بعد تلقيه '+MAX_REPORTS+' بلاغات.</div></div>';
  if(r.deleted) return h+'<div class="content-note">🗑️ تم حذف هذا الرد بواسطة صاحبه.</div></div>';
  h+='<div class="post-head"><span class="post-author">'+esc(r.name)+(mine?' <span class="you-badge">أنت</span>':'')
    +'</span><span class="post-date">'+timeAgo(ts(r.createdAt))+'</span></div>';
  if(r.text) h+='<div class="post-text">'+esc(r.text)+'</div>';
  h+=attachmentsHTML(r.attachments);
  h+=actionsHTML(r,mine,true);
  return h+'</div>';
}
function buildPost(p){
  const mine=p.uid===me.uid;
  const art=document.createElement('article');
  art.className='post'+(mine?' post-mine':'');
  if(p.removed){ art.classList.add('removed-content');
    art.innerHTML='<div class="content-note">⚠️ تمت إزالة هذا المحتوى تلقائياً بعد تلقيه '+MAX_REPORTS+' بلاغات من أعضاء مختلفين، وتم إقصاء صاحبه.</div>';
    return art; }
  if(p.deleted){ art.innerHTML='<div class="content-note">🗑️ تم حذف هذا التعليق بواسطة صاحبه.</div>'; return art; }
  let h='<div class="post-head"><span class="post-author">'+esc(p.name)+(mine?' <span class="you-badge">أنت</span>':'')
    +'</span><span class="post-date">'+timeAgo(ts(p.createdAt))+'</span></div>';
  if(p.text) h+='<div class="post-text">'+esc(p.text)+'</div>';
  h+=attachmentsHTML(p.attachments);
  h+=actionsHTML(p,mine,false);
  h+=replyFormHTML(p.id);
  const replies=postsData.filter(r=>r.parentId===p.id).sort((a,b)=>ts(a.createdAt)-ts(b.createdAt));
  if(replies.length) h+='<div class="replies"><div class="replies-title">💬 الردود ('+replies.length+')</div>'
    +replies.map(replyHTML).join('')+'</div>';
  art.innerHTML=h;
  return art;
}
function renderForum(){
  const list=$('#postsList'); list.innerHTML='';
  const tops=postsData.filter(p=>!p.parentId).sort((a,b)=>ts(b.createdAt)-ts(a.createdAt));
  $('#emptyState').style.display=tops.length?'none':'block';
  tops.forEach(p=>list.appendChild(buildPost(p)));
  drafts.forEach((d,key)=>{
    const ta=document.querySelector('[data-draft="'+key+'"]'); if(ta) ta.value=d.text;
    renderPreviews(key);
  });
}
function renderPreviews(key){
  const box=document.querySelector('[data-preview="'+key+'"]'); if(!box) return;
  const d=getDraft(key);
  box.innerHTML=''; box.style.display=d.attachments.length?'flex':'none';
  d.attachments.forEach(a=>{
    const chip=document.createElement('div'); chip.className='attach-chip';
    chip.innerHTML = a.kind==='image'
      ? '<img src="'+a.previewUrl+'" alt="معاينة">'
      : '<span class="chip-file">'+fileIcon(a.name)+'<small title="'+esc(a.name)+'">'+esc(a.name)+'</small><small>'+fmtSize(a.size)+'</small></span>';
    const rm=document.createElement('button');
    rm.type='button'; rm.className='chip-remove'; rm.textContent='✕';
    rm.dataset.key=key; rm.dataset.remove=a.id;
    chip.appendChild(rm); box.appendChild(chip);
  });
}
function updateUserBar(){ if(me) $('#userName').textContent=me.name; }
function showBanned(){
  $('#forumApp').style.display='none';
  $('#forumLoading').style.display='none';
  $('#bannedName').textContent=me.name;
  $('#bannedScreen').style.display='block';
}

/* ═══════════ المرفقات والمسودات ═══════════ */
function addFiles(files,key){
  const d=getDraft(key);
  for(const f of files){
    if(f.size>MAX_FILE){ toast('الملف "'+f.name+'" أكبر من 15MB','err'); continue; }
    const isImg=f.type&&f.type.startsWith('image/');
    d.attachments.push({id:'a_'+Math.random().toString(36).slice(2,8),file:f,name:f.name,
      size:f.size,kind:isImg?'image':'file',previewUrl:isImg?URL.createObjectURL(f):null});
  }
  renderPreviews(key);
}
function removeAttachment(key,id){
  const d=getDraft(key); const i=d.attachments.findIndex(a=>a.id===id);
  if(i>-1){ const a=d.attachments[i];
    if(a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    d.attachments.splice(i,1); renderPreviews(key); }
}
async function sendContent(key,btn,submitFn,after){
  if(isBusy(btn)) return;
  const d=getDraft(key);
  if(!d.text.trim() && !d.attachments.length){ toast('اكتب نصاً أو أرفق ملفاً قبل النشر','err'); return; }
  btnLoading(btn,'جارٍ النشر…');
  try{
    const atts=[];
    for(const a of d.attachments){
      let url;
      try{ url=await DB.upload(a.file); }
      catch(e){ throw new Error('فشل رفع الملف "'+a.name+'" — تحقق من اتصالك ومن تفعيل Firebase Storage'); }
      atts.push({name:a.name,size:a.size,kind:a.kind,url});
    }
    await submitFn({text:d.text.trim(),attachments:atts});
    d.attachments.forEach(a=>{ if(a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
    d.text=''; d.attachments=[];
    const ta=document.querySelector('[data-draft="'+key+'"]'); if(ta) ta.value='';
    renderPreviews(key);
    btnDone(btn,'تم النشر');
    toast('تم النشر بنجاح ✅');
    if(after) after();
  }catch(e){
    btnReset(btn);
    toast(e.message||'حدث خطأ أثناء النشر','err');
  }
}
function toggleReply(pid){
  if(openReplyFor===pid){
    openReplyFor=null;
    document.querySelectorAll('.reply-form.open').forEach(f=>f.classList.remove('open'));
    return;
  }
  document.querySelectorAll('.reply-form.open').forEach(f=>f.classList.remove('open'));
  openReplyFor=pid;
  const f=document.querySelector('.reply-form[data-form="'+pid+'"]');
  if(f){ f.classList.add('open'); const ta=f.querySelector('textarea'); ta&&ta.focus(); }
}

/* ═══════════ الأحداث ═══════════ */
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-reply-toggle],[data-del],[data-report],[data-reply-submit],.chip-remove');
  if(!t) return;

  if(t.hasAttribute('data-reply-toggle')){ toggleReply(t.dataset.replyToggle); return; }
  if(t.classList.contains('chip-remove')){ removeAttachment(t.dataset.key,t.dataset.remove); return; }

  if(t.hasAttribute('data-del')){
    if(isBusy(t)) return;
    if(!confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;
    btnLoading(t,'جارٍ الحذف…');
    try{ await DB.delete(t.dataset.del); btnDone(t,'تم الحذف'); toast('تم الحذف 🗑️'); }
    catch(err){ btnReset(t); toast(trErr(err.message),'err'); }
    return;
  }

  if(t.hasAttribute('data-report')){
    if(isBusy(t)) return;
    if(!confirm('هل تريد الإبلاغ عن هذا المحتوى؟')) return;
    btnLoading(t,'جارٍ الإبلاغ…');
    try{
      const res=await DB.report(t.dataset.report);
      btnDone(t,'تم الإبلاغ');
      if(res.banned) toast('اكتملت البلاغات ('+MAX_REPORTS+'/'+MAX_REPORTS+') — تم إقصاء صاحب المحتوى من المنتدى 🚫','err');
      else toast('تم تسجيل بلاغك ('+res.count+'/'+MAX_REPORTS+') 🚩');
    }catch(err){
      btnReset(t); toast(trErr(err.message),'err');
    }
    return;
  }

  if(t.hasAttribute('data-reply-submit')){
    const pid=t.dataset.replySubmit;
    sendContent('reply-'+pid,t,d=>DB.createReply(pid,d),()=>{
      openReplyFor=null;
      const f=document.querySelector('.reply-form[data-form="'+pid+'"]');
      f&&f.classList.remove('open');
    });
  }
});

document.addEventListener('input',e=>{
  const k=e.target.dataset&&e.target.dataset.draft;
  if(k) getDraft(k).text=e.target.value;
});
document.addEventListener('change',e=>{
  const k=e.target.dataset&&e.target.dataset.filefor;
  if(k&&e.target.files.length){ addFiles(e.target.files,k); e.target.value=''; }
});
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key==='Enter'&&e.target.dataset&&e.target.dataset.draft){
    const k=e.target.dataset.draft;
    if(k==='main') $('#postSubmit').click();
    else if(k.startsWith('reply-')){
      const b=document.querySelector('[data-reply-submit="'+k.slice(6)+'"]'); b&&b.click();
    }
  }
});

$('#postSubmit').addEventListener('click',function(){ sendContent('main',this,d=>DB.createPost(d)); });

$('#signOutBtn').addEventListener('click',async()=>{
  if(!confirm('هل تريد تسجيل الخروج؟ عند العودة ستحصل على هوية جديدة.')) return;
  try{ await DB.signOut(); }catch(e){}
  location.reload();
});

/* ═══════════ الإقلاع ═══════════ */
async function boot(){
  const cfgOk = (typeof firebase!=='undefined')
    && firebaseConfig.apiKey && firebaseConfig.projectId
    && !/ضع|YOUR/i.test(firebaseConfig.apiKey)
    && !/your-project/i.test(firebaseConfig.projectId);
  if(cfgOk){ MODE='firebase'; DB=FB; } else { MODE='local'; DB=LC; $('#modeNote').style.display='block'; }

  try{
    await DB.init();
    $('#forumLoading').style.display='none';
    if(me.banned){ showBanned(); return; }

    updateUserBar();
    $('#forumApp').style.display='block';

    DB.listenUser(d=>{
      if(!d) return;
      if(d.name&&d.name!==me.name){ me.name=d.name; updateUserBar(); }
      const was=me.banned; me.banned=!!d.banned;
      if(me.banned&&!was) showBanned();
    });
    DB.listen(list=>{ postsData=list; renderForum(); });
  }catch(e){
    console.error(e);
    $('#forumLoading').innerHTML='<div class="forum-error">تعذّر الدخول إلى المنتدى: '
      +esc(e.message||e)+'<br>تحقق من إعدادات Firebase وقواعد الأمان وتفعيل الدخول المجهول.</div>';
  }
}
boot();
})();
</script>
</body>
</html>