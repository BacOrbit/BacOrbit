/* ============================================================
   BacOrbit — service-worker.js
   Service Worker بسيط يهدف بشكل أساسي لتمكين خاصية "تثبيت الموقع"
   (PWA Install)، مع تخزين مؤقت خفيف لأصول الواجهة الأساسية فقط
   (لا يخزن أي صفحات دروس أو ملفات PDF لتفادي استهلاك المساحة).
   ============================================================ */

var CACHE_NAME = 'bacorbit-shell-v1';
var CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(CORE_ASSETS).catch(function () {
                /* في حال تعذر تخزين أحد الأصول لا نمنع التثبيت */
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (key) { return key !== CACHE_NAME; })
                    .map(function (key) { return caches.delete(key); })
            );
        })
    );
    self.clients.claim();
});

/* استراتيجية Network First مع رجوع للـ Cache فقط لأصول الواجهة الأساسية،
   وترك أي طلب آخر (صفحات الدروس، الصور، ملفات PDF...) يمر مباشرة للشبكة
   دون أي تعديل، حتى لا يؤثر على سلوك الموقع الحالي. */
self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;

    var url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    var isCoreAsset = CORE_ASSETS.some(function (asset) {
        return url.pathname.endsWith(asset.replace('./', '/')) || url.pathname === '/' ;
    });

    if (!isCoreAsset) return;

    event.respondWith(
        fetch(event.request).then(function (response) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
            return response;
        }).catch(function () {
            return caches.match(event.request);
        })
    );
});
