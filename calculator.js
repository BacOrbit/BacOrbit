/* ============================================================
   BacOrbit — calculator.js
   منطق حاسبة معدل البكالوريا: بيانات الشعب والمعاملات، بناء الجدول،
   حساب المعدل مباشرة، حفظ/استرجاع العلامات محليًا، والتحقق من صحة الإدخال.
   لا يعتمد على أي اتصال خارجي — كل الحسابات تتم داخل المتصفح.
   ============================================================ */

(function () {
'use strict';

/* ---------------------------------------------------------
   1. بيانات الشعب والمعاملات
   لإضافة شعبة جديدة مستقبلًا: أضف مفتاحًا جديدًا هنا بنفس الشكل
   (name / enabled / subjects) ثم أضف مفتاحه إلى BRANCH_ORDER.
   لا تُعدَّل معاملات الشعب الأربع المفعلة هنا بأي شكل.
   --------------------------------------------------------- */
var BAC_BRANCHES = {

    science: {
        name: "علوم تجريبية",
        enabled: true,
        subjects: [
            { name: "علوم الطبيعة والحياة", coef: 6 },
            { name: "الرياضيات", coef: 5 },
            { name: "العلوم الفيزيائية", coef: 5 },
            { name: "اللغة العربية وآدابها", coef: 2 },
            { name: "اللغة الإنجليزية", coef: 3 },
            { name: "التاريخ", coef: 2 },
            { name: "العلوم الإسلامية", coef: 2 },
            { name: "التربية البدنية والرياضية", coef: 1 }
        ]
    },

    math: {
        name: "رياضيات",
        enabled: true,
        subjects: [
            { name: "الرياضيات", coef: 8 },
            { name: "العلوم الفيزيائية", coef: 6 },
            { name: "الإعلام الآلي", coef: 3 },
            { name: "اللغة الإنجليزية", coef: 3 },
            { name: "علوم الطبيعة والحياة", coef: 2 },
            { name: "التاريخ", coef: 2 },
            { name: "العلوم الإسلامية", coef: 2 },
            { name: "التربية البدنية والرياضية", coef: 1 }
        ]
    },

    technical: {
        name: "تقني رياضي",
        enabled: true,
        subjects: [
            { name: "التكنولوجيا (حسب التخصص)", coef: 7 },
            { name: "الرياضيات", coef: 6 },
            { name: "العلوم الفيزيائية", coef: 6 },
            { name: "اللغة العربية وآدابها", coef: 3 },
            { name: "الإعلام الآلي", coef: 2 },
            { name: "اللغة الإنجليزية", coef: 3 },
            { name: "التاريخ", coef: 2 },
            { name: "العلوم الإسلامية", coef: 2 },
            { name: "التربية البدنية والرياضية", coef: 1 }
        ]
    },

    economy: {
        name: "تسيير واقتصاد",
        enabled: true,
        subjects: [
            { name: "التسيير المحاسبي والمالي", coef: 6 },
            { name: "الاقتصاد والمناجمنت", coef: 5 },
            { name: "الرياضيات", coef: 5 },
            { name: "التاريخ والجغرافيا", coef: 3 },
            { name: "اللغة العربية وآدابها", coef: 3 },
            { name: "القانون", coef: 2 },
            { name: "اللغة الإنجليزية", coef: 3 },
            { name: "العلوم الإسلامية", coef: 2 },
            { name: "التربية البدنية والرياضية", coef: 1 }
        ]
    },

    /* شعبة الإعلام الآلي: غير مفعلة، بدون معاملات مخترعة.
       عند توفر المعاملات الرسمية مستقبلًا: تُضاف داخل subjects
       ويُغيَّر enabled إلى true فقط. */
    info: {
        name: "الإعلام الآلي",
        enabled: false,
        subjects: []
    }

};

var BRANCH_ORDER = ["science", "math", "technical", "economy", "info"];
var STORAGE_PREFIX = "bacorbit_calc_marks_";

/* ---------------------------------------------------------
   2. أدوات مساعدة
   --------------------------------------------------------- */
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function on(el, evt, fn) { if (el) el.addEventListener(evt, fn); }

function clampMark(value) {
    if (value === "" || value === null || typeof value === "undefined") return null;
    var n = parseFloat(String(value).replace(",", "."));
    if (isNaN(n)) return null;
    if (n < 0) n = 0;
    if (n > 20) n = 20;
    return n;
}

function fmt(n, decimals) {
    return (Math.round(n * 100) / 100).toFixed(typeof decimals === "number" ? decimals : 2);
}

var toastTimer = null;
function showToast(message) {
    var host = document.getElementById("calcToast");
    var box = document.getElementById("calcToastBox");
    if (!host || !box) return;
    box.textContent = message;
    host.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { host.classList.remove("show"); }, 2600);
}

/* ---------------------------------------------------------
   3. الحالة الحالية
   --------------------------------------------------------- */
var currentBranch = "science";

function storageKey(branchKey) { return STORAGE_PREFIX + branchKey; }

function loadMarks(branchKey) {
    try {
        var raw = localStorage.getItem(storageKey(branchKey));
        if (!raw) return {};
        var parsed = JSON.parse(raw);
        return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) { return {}; }
}

function saveMarks(branchKey, marks) {
    try { localStorage.setItem(storageKey(branchKey), JSON.stringify(marks)); }
    catch (e) { /* التخزين المحلي قد يكون غير متاح — لا مشكلة، الحاسبة تعمل بدونه */ }
}

/* ---------------------------------------------------------
   4. بناء تبويبات الشعب
   --------------------------------------------------------- */
function renderTabs() {
    var wrap = document.getElementById("branchTabs");
    if (!wrap) return;
    wrap.innerHTML = "";

    BRANCH_ORDER.forEach(function (key) {
        var branch = BAC_BRANCHES[key];
        if (!branch) return;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "branch-tab" + (key === currentBranch ? " active" : "") + (!branch.enabled ? " branch-tab-disabled" : "");
        btn.textContent = (branch.enabled ? "" : "🔒 ") + branch.name;

        if (!branch.enabled) {
            btn.setAttribute("aria-disabled", "true");
            btn.title = "هذه الشعبة غير متاحة حاليًا";
            btn.addEventListener("click", function () {
                showToast("هذه الشعبة غير متاحة حاليًا 🔒");
            });
        } else {
            btn.addEventListener("click", function () {
                if (key === currentBranch) return;
                currentBranch = key;
                renderTabs();
                renderBranch();
            });
        }

        wrap.appendChild(btn);
    });
}

/* ---------------------------------------------------------
   5. بناء الجدول وحساب المعدل
   --------------------------------------------------------- */
function renderBranch() {
    var branch = BAC_BRANCHES[currentBranch];
    var tableWrap = document.getElementById("calcTableWrap");
    var lockedNote = document.getElementById("calcLockedNote");
    var resultsArea = document.getElementById("calcResultsArea");
    var tbody = document.getElementById("calcTableBody");

    if (!branch || !branch.enabled) {
        if (tableWrap) tableWrap.style.display = "none";
        if (resultsArea) resultsArea.style.display = "none";
        if (lockedNote) lockedNote.style.display = "block";
        return;
    }

    if (tableWrap) tableWrap.style.display = "block";
    if (resultsArea) resultsArea.style.display = "block";
    if (lockedNote) lockedNote.style.display = "none";

    var marks = loadMarks(currentBranch);
    tbody.innerHTML = "";

    branch.subjects.forEach(function (subject, index) {
        var tr = document.createElement("tr");
        tr.className = "calc-row";

        var tdName = document.createElement("td");
        tdName.className = "calc-subject-name";
        tdName.textContent = subject.name;

        var tdCoef = document.createElement("td");
        var coefBadge = document.createElement("span");
        coefBadge.className = "calc-coef-badge";
        coefBadge.textContent = subject.coef;
        tdCoef.appendChild(coefBadge);

        var tdMark = document.createElement("td");
        var input = document.createElement("input");
        input.type = "number";
        input.className = "calc-mark-input";
        input.min = "0";
        input.max = "20";
        input.step = "0.5";
        input.placeholder = "00";
        input.setAttribute("inputmode", "decimal");
        input.setAttribute("aria-label", "علامة مادة " + subject.name);
        input.dataset.index = String(index);

        var savedValue = marks[index];
        if (typeof savedValue === "number" && !isNaN(savedValue)) {
            input.value = savedValue;
        }

        tdMark.appendChild(input);

        var tdPoints = document.createElement("td");
        tdPoints.className = "calc-points-cell";
        tdPoints.id = "points-" + index;
        tdPoints.textContent = "0.00";

        tr.appendChild(tdName);
        tr.appendChild(tdCoef);
        tr.appendChild(tdMark);
        tr.appendChild(tdPoints);
        tbody.appendChild(tr);

        on(input, "input", function () {
            handleMarkInput(input, index, subject.coef);
        });
        on(input, "blur", function () {
            handleMarkInput(input, index, subject.coef, true);
        });
    });

    computeAverage();
}

function handleMarkInput(input, index, coef, isBlur) {
    var raw = input.value;

    if (raw === "") {
        input.classList.remove("invalid");
        var marks = loadMarks(currentBranch);
        delete marks[index];
        saveMarks(currentBranch, marks);
        updatePointsCell(index, 0);
        computeAverage();
        return;
    }

    var numeric = parseFloat(raw);
    var outOfRange = isNaN(numeric) || numeric < 0 || numeric > 20;

    if (isBlur) {
        var clamped = clampMark(raw);
        if (clamped === null) {
            input.value = "";
            input.classList.remove("invalid");
        } else {
            input.value = clamped;
            input.classList.remove("invalid");
        }
        numeric = clamped;
    } else {
        input.classList.toggle("invalid", outOfRange);
    }

    var marks = loadMarks(currentBranch);
    var safeValue = clampMark(input.value);
    if (safeValue === null) {
        delete marks[index];
        updatePointsCell(index, 0);
    } else {
        marks[index] = safeValue;
        updatePointsCell(index, safeValue * coef);
    }
    saveMarks(currentBranch, marks);
    computeAverage();
}

function updatePointsCell(index, points) {
    var cell = document.getElementById("points-" + index);
    if (cell) cell.textContent = fmt(points);
}

function computeAverage() {
    var branch = BAC_BRANCHES[currentBranch];
    if (!branch || !branch.enabled) return;

    var marks = loadMarks(currentBranch);
    var totalCoef = 0;
    var totalPoints = 0;

    branch.subjects.forEach(function (subject, index) {
        totalCoef += subject.coef;
        var mark = marks[index];
        if (typeof mark === "number" && !isNaN(mark)) {
            totalPoints += mark * subject.coef;
        }
    });

    var average = totalCoef > 0 ? (totalPoints / totalCoef) : 0;

    var sumCoefEl = document.getElementById("sumCoef");
    var sumPointsEl = document.getElementById("sumPoints");
    var avgEl = document.getElementById("avgResult");

    if (sumCoefEl) sumCoefEl.textContent = totalCoef;
    if (sumPointsEl) sumPointsEl.textContent = fmt(totalPoints);
    if (avgEl) {
        avgEl.textContent = fmt(average) + " / 20";
        avgEl.classList.toggle("low", average > 0 && average < 10);
    }
}

/* ---------------------------------------------------------
   6. الأزرار: حساب المعدل / مسح العلامات
   --------------------------------------------------------- */
function initButtons() {
    var computeBtn = document.getElementById("computeBtn");
    var clearBtn = document.getElementById("clearBtn");

    on(computeBtn, "click", function () {
        computeAverage();
        showToast("تم حساب المعدل ✅");
    });

    on(clearBtn, "click", function () {
        var branch = BAC_BRANCHES[currentBranch];
        if (!branch || !branch.enabled) return;

        saveMarks(currentBranch, {});

        var inputs = document.querySelectorAll(".calc-mark-input");
        inputs.forEach(function (input) {
            input.value = "";
            input.classList.remove("invalid");
        });

        branch.subjects.forEach(function (subject, index) {
            updatePointsCell(index, 0);
        });

        computeAverage();
        showToast("تم مسح جميع العلامات 🗑️");
    });
}

/* ---------------------------------------------------------
   7. الإقلاع
   --------------------------------------------------------- */
function init() {
    renderTabs();
    renderBranch();
    initButtons();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();