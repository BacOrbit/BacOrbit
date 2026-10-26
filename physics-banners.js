/* ============================================================
   BacOrbit — physics-banners.js
   لافتات أسئلة تفاعلية تظهر من يمين الشاشة في صفحات الفيزياء المستهدفة فقط
   (يُحمَّل من script.js بعد التحقق من الصفحة). يعتمد على localStorage فقط.

   التوقيت: أول سؤال بعد 30 دقيقة من أول فتح لصفحة مستهدفة، ثم سؤال كل ساعة.
   الحالة محفوظة في localStorage (المفتاح bacorbit_phq_v1):
   { nextAt: وقت السؤال القادم, order: ترتيب الأسئلة, pos: موضع الترتيب, last: آخر سؤال }
   ============================================================ */
(function () {
'use strict';
if (window.__bacPhysicsBanners) return;
window.__bacPhysicsBanners = true;

var KEY = 'bacorbit_phq_v1';
var FIRST_DELAY = 30 * 60 * 1000;
var INTERVAL = 60 * 60 * 1000;
var AUTO_HIDE = 15000;
var CHECK_EVERY = 5000;

var QA = [
  ['ما المقصود بالتصادم الفعال؟', 'هو تصادم بين المتفاعلات تتكسر فيه روابط وتتشكل أخرى جديدة لينتج تحول كيميائي.'],
  ['كيف تؤثر درجة الحرارة في سرعة التفاعل؟', 'رفع الحرارة يزيد الطاقة الحركية للمتفاعلات، وبالتالي يرفع تواتر التصادمات الفعالة ويسرع التفاعل.'],
  ['كيف تؤثر زيادة التركيز في سرعة التفاعل؟', 'زيادة التركيز تزيد عدد الأفراد في وحدة الحجم، مما يزيد التصادمات الفعالة وسرعة التفاعل.'],
  ['كيف تؤثر زيادة سطح التلامس في سرعة التفاعل؟', 'زيادته ترفع عدد التصادمات الفعالة وتزيد سرعة التفاعل.'],
  ['ما المقصود بزمن نصف التفاعل؟', 'هو الزمن اللازم ليبلغ تقدم التفاعل نصف قيمته النهائية.'],
  ['ما أهمية زمن نصف التفاعل؟', 'لمقارنة سرعة تفاعلين وتحديد المدة التجريبية للتفاعل، بين أربعة أضعاف زمن نصف التفاعل وسبعة أضعافه.'],
  ['لماذا نبرّد العينات أثناء المتابعة الزمنية؟', 'لإيقاف أو إبطاء التفاعل والمحافظة على تركيب العينة عند لحظة فصلها.'],
  ['كيف نكشف عن نقطة التكافؤ بتغير اللون؟', 'بملاحظة تغير اللون، مثل استقرار اللون البنفسجي للبرمنغنات أو اختفاء اللون الأزرق لصمغ النشاء.'],
  ['ما خصائص تفاعل المعايرة؟', 'سريع، تام، ووحيد الانتقائية.'],
  ['ما المقصود بالوسيط في التفاعل الكيميائي؟', 'عامل حركي يسرع التفاعل ولا يظهر في معادلته ولا يؤثر على حالته النهائية.'],
  ['ما المقصود بنقطة التكافؤ؟', 'النقطة التي يكون فيها المزيج في شروط ستكيومترية.'],
  ['لماذا نستخدم الناقلية لمتابعة بعض التفاعلات؟', 'لأن الوسط التفاعلي يحتوي على شوارد تتغير تراكيزها المولية.'],
  ['ما دور حمض الكبريت في التفاعل؟', 'توفير شوارد الهيدرونيوم اللازمة للتفاعل، ولا يعتبر وسيطًا لأنه يشارك فيه.'],
  ['لماذا نخفف المحاليل المركزة؟', 'للحد من خطورة المحاليل المركزة والاقتصاد في استهلاكها.'],
  ['كيف يؤثر التمديد في الناقلية؟', 'تتناقص الناقلية لنقص تراكيز الشوارد.'],
  ['كيف تؤثر الحرارة وإضافة مركب شاردي في الناقلية؟', 'تزداد الناقلية برفع الحرارة أو بإضافة مركب شاردي.'],
  ['ما أهمية جدول التقدم؟', 'معرفة تركيب جملة كيميائية وحساب كميات المادة في أي لحظة.'],
  ['لماذا نفضل المتابعة الفيزيائية للتفاعل؟', 'لأن القياس مستمر، ويتطلب حجومًا صغيرة، وهو أكثر دقة دون الحاجة إلى توقيف التفاعل.'],
  ['ما الفرق بين وضع العينة في الماء البارد وإضافة الماء البارد إليها؟', 'الماء البارد وحده يخفض الحرارة، أما الإضافة فتبرد وتمدد المحلول معًا.'],
  ['ما دور صمغ النشاء في المعايرة؟', 'لتحديد نقطة التكافؤ بدقة عبر إعطاء لون أزرق داكن مع ثنائي اليود.'],
  ['كيف يتطور حجم التكافؤ لثنائي اليود مع الزمن؟', 'يزيد بمرور الزمن.'],
  ['لماذا لا نحتاج إلى كاشف إضافي عند معايرة الماء الأكسجيني بالبرمنغنات؟', 'لأن البرمنغنات ذات لون بنفسجي يظهر بوضوح عند التكافؤ.'],
  ['ما هو المرجع المركزي الشمسي، وفيمَ يُستخدم؟', 'مبدؤه مركز الشمس ومحاوره موجهة نحو نجوم بعيدة، لدراسة الكواكب والمذنبات.'],
  ['ما هو المرجع الجيومركزي، وفيمَ يُستخدم؟', 'مبدؤه مركز الأرض ومحاوره موازية لمحاور المرجع الشمسي، لدراسة القمر والأقمار الاصطناعية.'],
  ['متى يسمى المرجع غاليليًا؟', 'عندما يتحقق فيه مبدأ العطالة.'],
  ['متى يمكن اعتبار المرجع السطحي الأرضي غاليليًا؟', 'عندما تكون مدة الحركة صغيرة جدًا مقارنة بمدة دوران الأرض.'],
  ['في أي مرجع ندرس حركة قمر اصطناعي، ولماذا؟', 'في مرجع جيومركزي يعتبر غاليليًا لأن مدة الدراسة صغيرة جدًا مقارنة بمدة دوران الأرض حول الشمس.'],
  ['ما المقصود بالمدار الإهليليجي؟', 'مدار بيضوي يقع أحد محرقَيه عنده الكوكب المركزي.'],
  ['ما المقصود بالمدار الجيومستقر؟', 'مدار حول الأرض على خط الاستواء، بنفس جهة دوران الأرض وبنفس دورها.'],
  ['لماذا لا يسقط القمر الاصطناعي مباشرة على الأرض؟', 'لأنه يدور حول الأرض بسرعة مناسبة تجعله في حالة سقوط مستمر حولها.'],
  ['ما الشروط اللازمة لدراسة الحركة الشاقولية؟', 'تتطلب احتكاكًا مع الهواء غير مهمل وشكلًا وكتلة حجمية مناسبين للجسم.'],
  ['لماذا لا يمكن تطبيق قوانين نيوتن على المستوى الذري؟', 'لأن الطاقات في المستوى الذري مكممة.'],
  ['ما خصائص القوة الثابتة؟', 'تحافظ على حاملها واتجاهها وشدتها عند انتقال نقطة تأثيرها.'],
  ['ما خصائص الحركة الدائرية المنتظمة؟', 'شعاع السرعة ثابت الشدة ومتغير الاتجاه، وشعاعا التسارع والقوة موجهان نحو المركز وثابتا الشدة.'],
  ['ما نص مبدأ العطالة؟', 'يحافظ الجسم على سكونه أو حركته المستقيمة المنتظمة إذا لم تؤثر عليه قوة خارجية تغير حالته.'],
  ['ما الفرق بين الأوج والحضيض؟', 'الأوج هي النقطة الأبعد عن الشمس، والحضيض هي النقطة الأقرب إليها.'],
  ['كيف تتغير السرعة وقوة الجذب بين الأوج والحضيض؟', 'تكونان أعظم ما يمكن عند الحضيض وأصغر ما يمكن عند الأوج.'],
  ['ما نص مبدأ انحفاظ الطاقة؟', 'الطاقة لا تستحدث ولا تزول، بل تنتقل أو تتحول من جملة إلى أخرى.']
];

/* ---------- التخزين ---------- */
function load() {
  try {
    var s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return s;
  } catch (e) {}
  return null;
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

function shuffled(avoidFirst) {
  var a = QA.map(function (_, i) { return i; });
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  if (avoidFirst !== undefined && a[0] === avoidFirst && a.length > 1) {
    var t2 = a[0]; a[0] = a[1]; a[1] = t2;
  }
  return a;
}

/* أول زيارة لصفحة مستهدفة: يبدأ المؤقت مرة واحدة فقط */
var state = load();
if (!state || typeof state.nextAt !== 'number' || !Array.isArray(state.order) || state.order.length !== QA.length) {
  state = { nextAt: Date.now() + FIRST_DELAY, order: shuffled(), pos: 0, last: -1 };
  save(state);
}

/* ---------- الأنماط ---------- */
function ensureStyles() {
  if (document.getElementById('bacPhqStyles')) return;
  var st = document.createElement('style');
  st.id = 'bacPhqStyles';
  st.textContent =
    '.bac-phq{position:fixed;right:14px;bottom:24px;width:min(92vw,360px);z-index:4400;direction:rtl;' +
    'background:var(--card-bg,#161616);border:2px solid var(--accent,#1aff66);border-radius:16px;' +
    'box-shadow:0 14px 36px rgba(0,0,0,.4),0 0 18px var(--accent-glow,rgba(26,255,102,.4));' +
    'padding:14px 16px;color:var(--text,#fff);font-family:Arial,sans-serif;cursor:pointer;overflow:hidden;' +
    'transform:translateX(130%);opacity:0;transition:transform .55s cubic-bezier(.34,1.4,.64,1),opacity .35s ease}' +
    '.bac-phq.show{transform:translateX(0);opacity:1}' +
    '.bac-phq.leaving{transform:translateX(130%);opacity:0;transition:transform .4s ease-in,opacity .3s ease}' +
    '.bac-phq-q{font-size:15px;font-weight:bold;line-height:1.8;padding-inline-end:40px}' +
    '.bac-phq-hint{font-size:11.5px;color:var(--footer-text,#888);margin-top:6px}' +
    '.bac-phq-a{display:none;margin-top:10px;padding-top:10px;border-top:1px dashed var(--empty-border,#333);' +
    'font-size:14px;line-height:1.9;color:var(--text-secondary,#bdbdbd)}' +
    '.bac-phq.open{cursor:default}' +
    '.bac-phq.open .bac-phq-a{display:block;animation:bacPhqIn .35s ease both}' +
    '.bac-phq.open .bac-phq-hint{display:none}' +
    '.bac-phq-close{display:flex;align-items:center;justify-content:center;position:absolute;top:8px;left:8px;' +
    'width:32px;height:32px;border-radius:50%;border:2px solid var(--accent,#1aff66);' +
    'background:var(--bg,#0d0d0d);color:var(--accent,#1aff66);font-size:14px;font-weight:bold;' +
    'cursor:pointer;padding:0;line-height:1;font-family:inherit}' +
    '.bac-phq-close:hover{background:var(--accent-glow,rgba(26,255,102,.4))}' +
    '.bac-phq-bar{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--accent,#1aff66);' +
    'transform-origin:right center;animation:bacPhqBar ' + AUTO_HIDE + 'ms linear forwards}' +
    '.bac-phq.open .bac-phq-bar{display:none}' +
    '@keyframes bacPhqBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}' +
    '@keyframes bacPhqIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(st);
}

/* ---------- العرض ---------- */
var active = null;

function removeBanner(el) {
  if (!el) return;
  el.classList.add('leaving');
  el.classList.remove('show');
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
    if (active === el) active = null;
  }, 450);
}

function showBanner(qa) {
  ensureStyles();
  var emoji = Math.random() < 0.5 ? '🤔' : '🧐';
  var el = document.createElement('div');
  el.className = 'bac-phq';
  el.setAttribute('role', 'status');
  el.innerHTML =
    '<button type="button" class="bac-phq-close" aria-label="إغلاق اللافتة" title="إغلاق">✕</button>' +
    '<div class="bac-phq-q"></div>' +
    '<div class="bac-phq-hint">اضغط لإظهار الإجابة</div>' +
    '<div class="bac-phq-a"></div>' +
    '<span class="bac-phq-bar"></span>';
  el.querySelector('.bac-phq-q').textContent = emoji + ' ' + qa[0];
  el.querySelector('.bac-phq-a').textContent = qa[1];
  document.body.appendChild(el);
  active = el;

  var timer = setTimeout(function () { removeBanner(el); }, AUTO_HIDE);

  el.addEventListener('click', function () {
    if (el.classList.contains('open')) return;
    clearTimeout(timer);
    el.classList.add('open');
  });
  el.querySelector('.bac-phq-close').addEventListener('click', function (e) {
    e.stopPropagation();
    clearTimeout(timer);
    removeBanner(el);
  });

  void el.offsetWidth;
  el.classList.add('show');
}

/* ---------- الفحص الدوري ---------- */
function check() {
  if (active || document.hidden) return;
  var s = load();
  if (!s || !Array.isArray(s.order) || s.order.length !== QA.length) return;
  if (Date.now() < s.nextAt) return;

  /* حجز الدور فورًا (قبل العرض) كي لا يتكرر عند التحديث أو في نافذة أخرى */
  if (s.pos >= s.order.length) { s.order = shuffled(s.last); s.pos = 0; }
  var idx = s.order[s.pos];
  s.pos++;
  s.last = idx;
  s.nextAt = Date.now() + INTERVAL;
  save(s);
  state = s;

  showBanner(QA[idx]);
}

check();
setInterval(check, CHECK_EVERY);
document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
