/* ============================================================
   BacOrbit — library.js
   منطق مكتبة الكتب: بناء البطاقات من LIBRARY_BOOKS (المعرّفة في
   library-books.js ويجب تحميله قبل هذا الملف)، البحث الفوري،
   التصفية حسب المادة، الترتيب، توليد صور غلاف حقيقية من الصفحة
   الأولى (أو المحددة) لكل PDF عبر pdf.js دون تحميل الملف كاملاً
   وفقط عند دخول البطاقة نطاق الرؤية، وعارض قراءة كامل داخل الموقع
   يرسم كل صفحات الكتاب فعليًا كصور Canvas متتالية (بدل الاعتماد
   على iframe الذي يظهر فارغًا على كثير من متصفحات الجوال).
   يعتمد أيضًا على script.js (الشريط العلوي، الثيم، downloadTopic).

   ⚠️ تعديل تشخيصي (لا يغيّر أي سلوك ظاهر أو تصميم): كل خطأ في تحميل
   غلاف أو محتوى كتاب كان سابقًا "يُبتلع" بصمت داخل catch() بلا أي أثر.
   الآن يُطبع في الـ Console (F12) سبب الفشل الحقيقي (404، فشل fetch،
   ملف تالف...)، مع تنبيه خاص إن كانت الصفحة مفتوحة عبر file:// بدل
   خادم محلي، لأن هذا يمنع المتصفح من تحميل ملفات PDF إطلاقًا.
   ============================================================ */

(function () {
'use strict';

/* ---------------------------------------------------------
   1. المواد المتاحة للتصفية (الترتيب هو ترتيب ظهور الأزرار)
   المفتاح هنا يجب أن يطابق حرفيًا قيمة "subject" في كل كتاب.
   --------------------------------------------------------- */
var LIBRARY_SUBJECTS = [
    "الرياضيات",
    "الفيزياء",
    "علوم الطبيعة والحياة",
    "اللغة العربية",
    "الإنجليزية",
    "الفرنسية",
    "التاريخ والجغرافيا",
    "الفلسفة",
    "العلوم الإسلامية",
    "الإعلام الآلي",
    "مواد أخرى"
];

var books = (typeof LIBRARY_BOOKS !== "undefined" && Array.isArray(LIBRARY_BOOKS)) ? LIBRARY_BOOKS : [];

/* تطبيع: أي مادة غير موجودة في القائمة أعلاه تُصنَّف "مواد أخرى"
   حتى لا يختفي أي كتاب بسبب خطأ إملائي بسيط في بيانات الكتاب. */
books.forEach(function (b, i) {
    b._id = "book-" + i;
    if (LIBRARY_SUBJECTS.indexOf(b.subject) === -1) b.subject = "مواد أخرى";
    /* coverPage: رقم صفحة الـPDF التي تُستخدم كغلاف لهذا الكتاب تحديدًا.
       إن لم يُذكر الحقل في library-books.js، تُستخدم الصفحة 1 تلقائيًا
       (نفس السلوك الافتراضي القديم لكل الكتب غير المحدَّدة). */
    if (!b.coverPage || b.coverPage < 1) b.coverPage = 1;
});

var state = { query: "", subject: "الكل", sort: "newest" };

/* ---------------------------------------------------------
   2. أدوات مساعدة
   --------------------------------------------------------- */
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function on(el, evt, fn, opts) { if (el) el.addEventListener(evt, fn, opts); }
function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function baseName(path) {
    var parts = String(path).split("/");
    try { return decodeURIComponent(parts[parts.length - 1]); } catch (e) { return parts[parts.length - 1]; }
}

/* يكشف إن كانت الصفحة مفتوحة مباشرة من القرص (file://) بدل خادم
   محلي/استضافة حقيقية. في هذه الحالة يمنع المتصفح (Chrome وغيره)
   طلبات fetch/XHR لملفات PDF المحلية لأسباب أمنية، فتفشل كل من
   الأغلفة والقراءة بصمت دون أي سبب واضح للمستخدم. */
function isFileProtocol() {
    return typeof location !== "undefined" && location.protocol === "file:";
}
var FILE_PROTOCOL_HINT =
    "⚠️ يبدو أنّ الصفحة مفتوحة مباشرة من جهازك (file://) وليس عبر خادم محلي. " +
    "المتصفح يمنع تحميل ملفات PDF بهذه الطريقة. افتح المشروع عبر خادم محلي " +
    "(مثل امتداد Live Server في VS Code، أو أي استضافة حقيقية مثل GitHub Pages) ثم أعد المحاولة.";

/* ---------------------------------------------------------
   3. بناء أزرار تصفية المواد مع عدد الكتب بجانب كل مادة
   --------------------------------------------------------- */
function renderChips() {
    var wrap = document.getElementById("libraryChips");
    if (!wrap) return;
    wrap.innerHTML = "";

    var counts = {};
    books.forEach(function (b) { counts[b.subject] = (counts[b.subject] || 0) + 1; });

    var allChip = makeChip("الكل", books.length, state.subject === "الكل");
    wrap.appendChild(allChip);

    LIBRARY_SUBJECTS.forEach(function (subj) {
        var count = counts[subj] || 0;
        if (count === 0) return; /* لا داعي لعرض مادة لا تحتوي أي كتاب بعد */
        wrap.appendChild(makeChip(subj, count, state.subject === subj));
    });
}

function makeChip(label, count, active) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lib-chip" + (active ? " active" : "");
    btn.innerHTML = esc(label) + ' <span class="lib-chip-count">' + count + "</span>";
    btn.addEventListener("click", function () {
        state.subject = label;
        renderChips();
        renderGrid();
    });
    return btn;
}

/* ---------------------------------------------------------
   4. الفرز والفلترة والبحث
   --------------------------------------------------------- */
function getVisibleBooks() {
    var q = state.query.trim().toLowerCase();

    var list = books.filter(function (b) {
        if (state.subject !== "الكل" && b.subject !== state.subject) return false;
        if (!q) return true;
        var hay = (b.title + " " + b.subject + " " + (b.level || "")).toLowerCase();
        return hay.indexOf(q) !== -1;
    });

    if (state.sort === "name") {
        list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title, "ar"); });
    } else if (state.sort === "subject") {
        list = list.slice().sort(function (a, b) { return a.subject.localeCompare(b.subject, "ar"); });
    } else {
        /* "newest": نفس ترتيب الإدراج في library-books.js، الأحدث أولًا */
        list = list.slice().reverse();
    }

    return list;
}

/* ---------------------------------------------------------
   5. بناء بطاقة كتاب واحدة
   --------------------------------------------------------- */
function buildCard(book) {
    var card = document.createElement("div");
    card.className = "book-card";
    card.dataset.id = book._id;

    var coverWrap = document.createElement("div");
    coverWrap.className = "book-cover-wrap";
    coverWrap.innerHTML = '<div class="book-cover-skeleton"></div><span class="book-cover-icon">📕</span>';

    var info = document.createElement("div");
    info.className = "book-info";
    info.innerHTML =
        '<h3 class="book-title" title="' + esc(book.title) + '">' + esc(book.title) + "</h3>" +
        '<div class="book-meta">' +
            '<span class="book-subject-badge">' + esc(book.subject) + "</span>" +
            (book.level ? '<span class="book-level">' + esc(book.level) + "</span>" : "") +
        "</div>";

    var actions = document.createElement("div");
    actions.className = "book-actions";

    var readBtn = document.createElement("button");
    readBtn.type = "button";
    readBtn.className = "book-btn book-btn-read";
    readBtn.innerHTML = "📖 <span>قراءة</span>";
    readBtn.addEventListener("click", function () { openReader(book); });

    var dlBtn = document.createElement("button");
    dlBtn.type = "button";
    dlBtn.className = "book-btn book-btn-download";
    dlBtn.innerHTML = "⬇️ <span>تنزيل</span>";
    dlBtn.addEventListener("click", function (e) {
        if (typeof window.downloadTopic === "function") {
            window.downloadTopic(e, book.pdf, baseName(book.pdf));
        } else {
            window.open(book.pdf, "_blank");
        }
    });

    actions.appendChild(readBtn);
    actions.appendChild(dlBtn);

    card.appendChild(coverWrap);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/* ---------------------------------------------------------
   6. رسم الشبكة كاملة + مراقبة الظهور لتحميل الأغلفة لاحقًا
   --------------------------------------------------------- */
var previewObserver = null;

function renderGrid() {
    var grid = document.getElementById("libraryGrid");
    var emptyState = document.getElementById("libraryEmpty");
    if (!grid) return;

    if (previewObserver) { previewObserver.disconnect(); }

    var list = getVisibleBooks();
    grid.innerHTML = "";

    if (!list.length) {
        grid.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        return;
    }
    grid.style.display = "grid";
    if (emptyState) emptyState.style.display = "none";

    var frag = document.createDocumentFragment();
    list.forEach(function (book) { frag.appendChild(buildCard(book)); });
    grid.appendChild(frag);

    /* ملاحظة: تم حذف عرض "عدد الكتب" من الواجهة بطلب صريح — العنصر
       libraryResultsCount لم يعد موجودًا في library.html، فلم يعد هناك
       داعٍ لتحديث أي نص عدّاد هنا. */

    initPreviewObserver();
}

function initPreviewObserver() {
    var cards = document.querySelectorAll(".book-card");
    if (!("IntersectionObserver" in window)) {
        /* دعم احتياطي: تحميل الجميع مباشرة إن تعذّر استخدام IntersectionObserver */
        cards.forEach(function (card) { loadCover(card); });
        return;
    }
    previewObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                loadCover(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: "250px 0px", threshold: 0.01 });

    cards.forEach(function (card) { previewObserver.observe(card); });
}

/* ---------------------------------------------------------
   7. توليد صورة الغلاف من صفحة الـPDF المحددة لكل كتاب عبر حقل
   coverPage (الصفحة 1 افتراضيًا إن لم يُحدَّد الحقل) عبر pdf.js.
   pdf.js يطلب الملف بأجزاء (Range Requests) عند دعم الخادم لذلك،
   فلا يتم تنزيل ملف الـPDF كاملاً فقط لعرض الغلاف، والغلاف دائمًا
   مرتبط بنفس ملف PDF الخاص بالكتاب (book.pdf) — لا صور خارجية ولا
   أغلفة مصطنعة إطلاقًا.
   --------------------------------------------------------- */
function loadCover(cardEl) {
    var book = books.find(function (b) { return b._id === cardEl.dataset.id; });
    if (!book) return;

    var coverWrap = cardEl.querySelector(".book-cover-wrap");
    if (!coverWrap || coverWrap.dataset.loaded === "1") return;

    if (!window.pdfjsLib) {
        /* pdf.js لم يُحمَّل بعد (اتصال بطيء مثلاً) — أعد المحاولة قريبًا بدل
           الاستسلام فورًا وترك أيقونة بديلة فقط. */
        setTimeout(function () { loadCover(cardEl); }, 400);
        return;
    }

    coverWrap.dataset.loaded = "1";

    /* إن كان الكتاب يملك حقل coverImage (غلاف مخصص ثابت)، تُستخدم هذه
       الصورة مباشرة بدل توليد الغلاف من صفحة الـPDF عبر pdf.js. هذا خاص
       فقط بالكتب التي تحمل هذا الحقل، ولا يغيّر آلية توليد الأغلفة
       الافتراضية (من الصفحة الأولى أو coverPage) لبقية كتب المكتبة. */
    if (book.coverImage) {
        var customImg = new Image();
        customImg.alt = book.title;
        customImg.loading = "lazy";
        customImg.style.width = "100%";
        customImg.style.height = "100%";
        customImg.style.objectFit = "cover";
        customImg.style.display = "block";
        customImg.onload = function () {
            coverWrap.innerHTML = "";
            coverWrap.appendChild(customImg);
        };
        customImg.onerror = function () {
            console.error(
                '[BacOrbit][مكتبة] تعذّر تحميل صورة الغلاف المخصصة للكتاب "' + book.title + '" من: ' + book.coverImage +
                (isFileProtocol() ? ' — ' + FILE_PROTOCOL_HINT : ' — تحقّق من أنّ الصورة موجودة فعليًا بهذا المسار.')
            );
            coverWrap.dataset.loaded = "0";
            coverWrap.innerHTML = '<span class="book-cover-icon book-cover-fallback">📕</span>';
        };
        customImg.src = book.coverImage;
        return;
    }

    var loadingTask = window.pdfjsLib.getDocument({ url: book.pdf, rangeChunkSize: 65536 });

    loadingTask.promise.then(function (pdf) {
        var pageNum = Math.min(book.coverPage || 1, pdf.numPages);
        return pdf.getPage(pageNum);
    }).then(function (page) {
        var targetWidth = (coverWrap.clientWidth || 220) * (window.devicePixelRatio || 1);
        var baseViewport = page.getViewport({ scale: 1 });
        var scale = targetWidth / baseViewport.width;
        var viewport = page.getViewport({ scale: scale });

        var canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext("2d");

        return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
            coverWrap.innerHTML = "";
            coverWrap.appendChild(canvas);
        });
    }).catch(function (err) {
        /* تعذّر توليد الغلاف (مسار الملف خاطئ أو الملف غير مرفوع بعد) —
           نُبقي أيقونة بديلة بسيطة بدل ترك المكان فارغًا، دون التأثير
           على بقية البطاقات أو منع القراءة/التنزيل.
           تُسجَّل تفاصيل الخطأ الحقيقية هنا في الـ Console (F12 → Console)
           لتسهيل معرفة السبب الفعلي: 404 (الملف غير موجود بهذا المسار)،
           فشل الشبكة، أو الصفحة مفتوحة عبر file:// بدل خادم محلي. */
        console.error(
            '[BacOrbit][مكتبة] تعذّر توليد غلاف الكتاب "' + book.title + '" من الملف: ' + book.pdf +
            (isFileProtocol() ? ' — ' + FILE_PROTOCOL_HINT : ' — تحقّق من تبويب Network في أدوات المطوّر لمعرفة رمز الحالة (404 يعني أنّ الملف غير موجود بهذا المسار).'),
            err
        );
        coverWrap.dataset.loaded = "0";
        coverWrap.innerHTML = '<span class="book-cover-icon book-cover-fallback">📕</span>';
    });
}

/* ---------------------------------------------------------
   8. عارض القراءة داخل الموقع (Modal يعرض كل صفحات الـPDF)
   --------------------------------------------------------- */
function ensureReader() {
    if (document.getElementById("pdfReaderOverlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "pdfReaderOverlay";
    overlay.className = "pdf-reader-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
        '<div class="pdf-reader-inner">' +
            '<div class="pdf-reader-bar">' +
                '<span class="pdf-reader-title" id="pdfReaderTitle"></span>' +
                '<div class="pdf-reader-bar-actions">' +
                    '<button type="button" class="pdf-reader-btn" id="pdfReaderFullscreen" title="ملء الشاشة">⛶</button>' +
                    '<button type="button" class="pdf-reader-btn" id="pdfReaderDownload" title="تنزيل">⬇️</button>' +
                    '<button type="button" class="pdf-reader-btn pdf-reader-close" id="pdfReaderClose" title="إغلاق وعودة للمكتبة">✕</button>' +
                '</div>' +
            '</div>' +
            '<div id="pdfReaderFrame" class="pdf-reader-frame" role="document" aria-label="محتوى الكتاب" tabindex="0"></div>' +
        '</div>';
    document.body.appendChild(overlay);

    on(document.getElementById("pdfReaderClose"), "click", closeReader);
    on(overlay, "click", function (e) { if (e.target === overlay) closeReader(); });
    on(document, "keydown", function (e) { if (e.key === "Escape") closeReader(); });
    on(document.getElementById("pdfReaderFullscreen"), "click", function () {
        var inner = overlay.querySelector(".pdf-reader-inner");
        if (document.fullscreenElement) { document.exitFullscreen(); }
        else if (inner.requestFullscreen) { inner.requestFullscreen().catch(function () {}); }
    });
}

var currentReaderBook = null;
var readerRequestId = 0; /* يُستخدم لإبطال أي عملية عرض قديمة عند فتح كتاب آخر أو الإغلاق قبل اكتمال التحميل */

function setReaderStatus(container, html, isError) {
    container.innerHTML = '<div class="pdf-reader-status' + (isError ? " pdf-reader-error" : "") + '">' + html + "</div>";
}

/* يعرض كل صفحات الـPDF فعليًا كصور Canvas متتالية داخل حاوية قابلة
   للتمرير، بدل الاعتماد على عارض PDF المدمج في المتصفح عبر iframe
   (الذي لا يعمل على كثير من متصفحات الجوال ويؤدي لظهور عارض فارغ
   دون أي محتوى). يستخدم pdf.js الذي تم تحميله مسبقًا لأجل الأغلفة،
   فلا حاجة لأي مكتبة إضافية، ويعمل بنفس الطريقة على كل أحجام الملفات
   والصفحات لأنه يرسم كل صفحة بحجمها الحقيقي بشكل مستقل. */
function renderBookIntoReader(book, container, myRequestId) {
    if (!window.pdfjsLib) {
        setReaderStatus(container, "تعذّر تحميل عارض PDF في متصفحك. جرّب تنزيل الكتاب بدلًا من ذلك.", true);
        return;
    }

    setReaderStatus(container, '<div class="pdf-status-spinner"></div>جارٍ تحميل الكتاب…');

    var loadingTask = window.pdfjsLib.getDocument({ url: book.pdf, rangeChunkSize: 262144 });

    loadingTask.promise.then(function (pdf) {
        if (myRequestId !== readerRequestId) return; /* المستخدم أغلق العارض أو فتح كتابًا آخر أثناء التحميل */

        container.innerHTML = "";
        var targetWidth = Math.min(container.clientWidth || 760, 900) - 4;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);

        function renderPage(pageNum) {
            if (myRequestId !== readerRequestId) return null;
            return pdf.getPage(pageNum).then(function (page) {
                if (myRequestId !== readerRequestId) return null;

                var baseViewport = page.getViewport({ scale: 1 });
                var scale = Math.max(0.2, targetWidth / baseViewport.width);
                var displayViewport = page.getViewport({ scale: scale });
                var renderViewport = page.getViewport({ scale: scale * dpr });

                var wrap = document.createElement("div");
                wrap.className = "pdf-page-wrap";

                var canvas = document.createElement("canvas");
                canvas.className = "pdf-page-canvas";
                canvas.width = Math.ceil(renderViewport.width);
                canvas.height = Math.ceil(renderViewport.height);
                canvas.style.width = Math.ceil(displayViewport.width) + "px";
                canvas.style.height = Math.ceil(displayViewport.height) + "px";

                var pageBadge = document.createElement("span");
                pageBadge.className = "pdf-page-num";
                pageBadge.textContent = pageNum + " / " + pdf.numPages;

                wrap.appendChild(canvas);
                wrap.appendChild(pageBadge);
                container.appendChild(wrap);

                var ctx = canvas.getContext("2d");
                return page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
            });
        }

        /* رسم الصفحات بالتتابع (لا بالتوازي) حتى لا تُثقل المتصفح بذاكرة/معالجة
           زائدة في الكتب الكبيرة، مع ظهور كل صفحة فور اكتمال رسمها فيتمكن
           المستخدم من البدء بالقراءة والتمرير دون انتظار الكتاب كاملاً. */
        var chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) {
            (function (num) {
                chain = chain.then(function () { return renderPage(num); });
            })(i);
        }
        return chain;
    }).catch(function (err) {
        if (myRequestId !== readerRequestId) return;
        /* تُسجَّل تفاصيل الخطأ الحقيقية هنا في الـ Console (F12 → Console)
           بدل ابتلاعها بصمت كما كان سابقًا، لتسهيل معرفة السبب الفعلي. */
        console.error('[BacOrbit][مكتبة] تعذّر تحميل/عرض الكتاب "' + book.title + '" من الملف: ' + book.pdf, err);

        var msg = "تعذّر عرض محتوى هذا الكتاب داخل الموقع حاليًا. تأكد من رفع الملف بنفس المسار الصحيح، أو نزّله مباشرة عبر زر التنزيل أعلاه.";
        if (isFileProtocol()) {
            msg += "<br><br>" + FILE_PROTOCOL_HINT;
        } else {
            var reason = (err && err.message) ? String(err.message) : "";
            if (reason) {
                msg += '<br><br><small style="opacity:.75">تفاصيل تقنية (من Console): ' + esc(reason) + "</small>";
            }
            msg += '<br><small style="opacity:.75">تحقّق أيضًا من تبويب Network في أدوات المطوّر — رمز 404 يعني أنّ الملف "' + esc(book.pdf) + '" غير موجود فعليًا بهذا المسار داخل مجلد library/.</small>';
        }
        setReaderStatus(container, msg, true);
    });
}

function openReader(book) {
    ensureReader();
    currentReaderBook = book;
    readerRequestId++;
    var myRequestId = readerRequestId;

    var overlay = document.getElementById("pdfReaderOverlay");
    var frame = document.getElementById("pdfReaderFrame");
    document.getElementById("pdfReaderTitle").textContent = book.title;
    document.getElementById("pdfReaderDownload").onclick = function (e) {
        if (typeof window.downloadTopic === "function") window.downloadTopic(e, book.pdf, baseName(book.pdf));
        else window.open(book.pdf, "_blank");
    };

    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    frame.scrollTop = 0;

    renderBookIntoReader(book, frame, myRequestId);
}

function closeReader() {
    var overlay = document.getElementById("pdfReaderOverlay");
    if (!overlay) return;
    if (document.fullscreenElement) document.exitFullscreen();
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    readerRequestId++; /* يُبطل أي عملية رسم صفحات لا تزال قيد التنفيذ */
    var frame = document.getElementById("pdfReaderFrame");
    if (frame) frame.innerHTML = "";
    document.body.style.overflow = "";
    currentReaderBook = null;
}

/* ---------------------------------------------------------
   9. الإقلاع: ربط البحث والفرز والتصفية
   --------------------------------------------------------- */
function init() {
    /* تنبيه واحد واضح في الـ Console عند الإقلاع إن كانت الصفحة مفتوحة
       عبر file://، لأن هذا سيمنع كل الأغلفة وكل عمليات القراءة من
       العمل بغض النظر عن صحة مسارات الملفات. */
    if (isFileProtocol()) {
        console.warn('[BacOrbit][مكتبة] ' + FILE_PROTOCOL_HINT);
    }

    renderChips();
    renderGrid();

    var searchInput = document.getElementById("librarySearch");
    on(searchInput, "input", function () {
        state.query = searchInput.value;
        renderGrid();
    });

    var sortSelect = document.getElementById("librarySort");
    on(sortSelect, "change", function () {
        state.sort = sortSelect.value;
        renderGrid();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();