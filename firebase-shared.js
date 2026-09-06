/* ============================================================
   BacOrbit — firebase-shared.js
   تحميل كسول (lazy) لمكتبات Firebase (نفس مشروع bacorbit-c5d67
   المستخدم في بقية الموقع)، وتوفير هوية Anonymous Auth موحّدة —
   نفس هوية المنتدى تمامًا (نفس المتصفح ⇐ نفس UID) — لأي صفحة تحتاج
   ميزات Firebase خارج صفحات المنتدى/لوحة الإدارة/رفع الملخص التي
   تُدير اتصالها الخاص بالفعل (انظر script.js → pageManagesOwnFirebase).

   لا يُحمَّل أي شيء فعليًا إلا عند استدعاء window.BacFirebase.ready().
   ============================================================ */
(function () {
'use strict';
if (window.BacFirebase) return;

var firebaseConfig = {
  apiKey: "AIzaSyBgh1JW8IepmDe78jko33mnvaAU2af3-fw",
  authDomain: "bacorbit-c5d67.firebaseapp.com",
  databaseURL: "https://bacorbit-c5d67-default-rtdb.firebaseio.com",
  projectId: "bacorbit-c5d67",
  storageBucket: "bacorbit-c5d67.firebasestorage.app",
  messagingSenderId: "1047289657770",
  appId: "1:1047289657770:web:2d814fcde45978b17493d3",
  measurementId: "G-4J629GND42"
};

var CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
var readyPromise = null;

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      if (existing.dataset.loaded === '1') { resolve(); return; }
      existing.addEventListener('load', function () { resolve(); });
      existing.addEventListener('error', reject);
      return;
    }
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { s.dataset.loaded = '1'; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* نفس منطق توليد الأسماء العشوائية المستخدم في المنتدى (chat.html)
   وصفحة رفع الملخص، حفاظًا على نفس أسلوب الأسماء عبر كل الموقع. */
function genName(db) {
  function attempt(i) {
    var n = 'التلميذ' + (1000 + Math.floor(Math.random() * 9000));
    return db.collection('users').where('name', '==', n).limit(1).get().then(function (q) {
      if (q.empty) return n;
      if (i > 6) return 'التلميذ' + String(Date.now()).slice(-6);
      return attempt(i + 1);
    });
  }
  return attempt(0);
}

function boot() {
  if (readyPromise) return readyPromise;
  readyPromise = Promise.resolve()
    .then(function () {
      if (typeof firebase !== 'undefined') return;
      return loadScript(CDN + 'firebase-app-compat.js')
        .then(function () { return loadScript(CDN + 'firebase-auth-compat.js'); })
        .then(function () { return loadScript(CDN + 'firebase-firestore-compat.js'); });
    })
    .then(function () {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      var auth = firebase.auth();
      var db = firebase.firestore();
      return new Promise(function (resolve, reject) {
        var unsub = auth.onAuthStateChanged(function (user) {
          unsub();
          (user ? Promise.resolve(user) : auth.signInAnonymously().then(function (cred) { return cred.user; }))
            .then(function (user) {
              var uRef = db.collection('users').doc(user.uid);
              return uRef.get().then(function (snap) {
                if (snap.exists) {
                  var d = snap.data();
                  return { uid: user.uid, name: d.name, banned: !!d.banned };
                }
                return genName(db).then(function (name) {
                  return uRef.set({
                    name: name, banned: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                  }).then(function () { return { uid: user.uid, name: name, banned: false }; });
                });
              });
            }).then(resolve).catch(reject);
        }, reject);
      }).then(function (me) {
        return { firebase: firebase, auth: auth, db: db, me: me };
      });
    })
    .catch(function (err) {
      console.error('[BacOrbit][Firebase] تعذّر تهيئة الاتصال', err);
      readyPromise = null;
      throw err;
    });
  return readyPromise;
}

window.BacFirebase = { ready: boot };
})();
