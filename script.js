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