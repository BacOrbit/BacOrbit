/* ==========================================================
   BacOrbit - Shared Script
   يتحكم في: تبديل الوضع الداكن/الفاتح + إخفاء الشريط العلوي عند التمرير
   يجب تضمين هذا الملف في كل صفحة تستعمل style.css
   ========================================================== */

(function(){

    var THEME_KEY = "bacorbit-theme";
    var root = document.documentElement;

    /* تطبيق الوضع المحفوظ فوراً قبل الرسم لتفادي وميض الشاشة */
    var saved = null;
    try{
        saved = localStorage.getItem(THEME_KEY);
    }catch(e){
        saved = null;
    }

    if(saved === "light"){
        root.setAttribute("data-theme", "light");
    }

    function currentTheme(){
        return root.getAttribute("data-theme") === "light" ? "light" : "dark";
    }

    function setupThemeSwitch(){

        var btn = document.getElementById("themeToggle");
        if(!btn) return;

        btn.addEventListener("click", function(){

            var isLight = currentTheme() === "light";

            if(isLight){
                root.removeAttribute("data-theme");
                try{ localStorage.setItem(THEME_KEY, "dark"); }catch(e){}
            }else{
                root.setAttribute("data-theme", "light");
                try{ localStorage.setItem(THEME_KEY, "light"); }catch(e){}
            }

        });

    }

    function setupTopBarScroll(){

        var topBar = document.getElementById("topBar");
        if(!topBar) return;

        var lastScroll = 0;

        window.addEventListener("scroll", function(){

            var current = window.pageYOffset;

            if(current <= 0){
                topBar.classList.remove("hide");
                lastScroll = current;
                return;
            }

            if(current > lastScroll){
                topBar.classList.add("hide");
            }else{
                topBar.classList.remove("hide");
            }

            lastScroll = current;

        });

    }

    function init(){
        setupThemeSwitch();
        setupTopBarScroll();
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", init);
    }else{
        init();
    }

})();

/* ==========================================================
   تنزيل جميع ملفات/صور مجلد الدرس دفعة واحدة (تنزيلات منفصلة)
   يُستعمل من أزرار "download-all-btn" في صفحات الدروس (L_*.html)
   كل ملف يُنزَّل مباشرة كما هو (صورة أو PDF) دون أي ضغط/تجميع
   ========================================================== */

(function(){

    function setLabel(btn, text){
        var label = btn.querySelector(".dl-label");
        if(label) label.textContent = text;
    }

    function delay(ms){
        return new Promise(function(resolve){ setTimeout(resolve, ms); });
    }

    function triggerDownload(url, fileName){
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    window.downloadLessonFolder = async function(btn, folder, files, folderLabel){

        if(!btn || btn.dataset.busy === "1") return;
        btn.dataset.busy = "1";

        var originalHTML = btn.innerHTML;
        btn.classList.add("loading");

        var total = files.length;

        try{

            for(var i = 0; i < total; i++){

                var fileName = files[i];
                setLabel(btn, "جاري التنزيل… " + (i + 1) + " / " + total);
                btn.innerHTML = '<span class="dl-spinner"></span><span class="dl-label">جاري التنزيل… ' + (i + 1) + ' / ' + total + '</span>';

                triggerDownload(folder + "/" + fileName, fileName);

                await delay(400);

            }

            btn.classList.remove("loading");
            btn.classList.add("done");
            btn.innerHTML = '<span class="dl-check">✓</span><span class="dl-label">تم تنزيل ' + total + ' ملفاً بنجاح</span>';

            setTimeout(function(){
                btn.classList.remove("done");
                btn.innerHTML = originalHTML;
                btn.dataset.busy = "0";
            }, 2600);

        }catch(err){

            console.error(err);
            btn.classList.remove("loading");
            btn.innerHTML = '<span class="dl-label">⚠ حدث خطأ، أعد المحاولة</span>';

            setTimeout(function(){
                btn.innerHTML = originalHTML;
                btn.dataset.busy = "0";
            }, 2600);

        }

    };

})();

/* ==========================================================
   تنزيل موضوع واحد
   ========================================================== */

(function(){

    window.downloadTopic = function(event, url, fileName){

        if(event){
            event.preventDefault();
            event.stopPropagation();
        }

        var button = event && event.currentTarget ? event.currentTarget : null;
        if(!button || button.dataset.busy === "1") return;

        button.dataset.busy = "1";
        button.classList.add("loading");

        var originalHTML = button.innerHTML;

        button.innerHTML =
            '<span class="dl-spinner"></span>' +
            '<span>جاري التنزيل…</span>';

        var a = document.createElement("a");
        a.href = url;
        a.download = fileName || "";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(function(){
            button.classList.remove("loading");
            button.classList.add("done");
            button.innerHTML =
                '<span class="dl-check">✓</span>' +
                '<span>تم التنزيل</span>';

            setTimeout(function(){
                button.classList.remove("done");
                button.innerHTML = originalHTML;
                button.dataset.busy = "0";
            }, 1800);
        }, 500);
    };

})();
