/* ============================================================
   BacOrbit — library-books.js
   بيانات الكتب فقط (مصفوفة LIBRARY_BOOKS) — لا يوجد هنا أي منطق
   عرض أو قراءة أو تنزيل؛ كل ذلك موجود في library.js الذي يعتمد
   على هذا الملف ويجب تحميله بعده مباشرة في library.html.

   ⚠️ كل ملفات PDF المذكورة أدناه يجب أن توضع داخل مجلد باسم
   "library" في جذر المشروع (بجانب library.html مباشرة، بنفس
   المستوى الذي توجد فيه index.html و calculator.html)، أي:
   BacOrbit/library/اسم-الملف.pdf
   بنفس الأسماء بالحروف الصغيرة والشرطات كما هي مكتوبة هنا تمامًا
   (حساسة لحالة الأحرف على استضافة GitHub Pages).

   لإضافة كتاب جديد مستقبلاً: أضف عنصرًا جديدًا بنفس الشكل
   (title / subject / level / pdf)، مع مراعاة أن قيمة "subject"
   يجب أن تطابق حرفيًا أحد عناصر LIBRARY_SUBJECTS في library.js
   وإلا صُنِّف الكتاب تلقائيًا ضمن "مواد أخرى".

   ⚙️ حقل "coverPage" (اختياري): رقم صفحة PDF التي تُستخدم كغلاف
   لهذا الكتاب تحديدًا. إن لم يُذكر، يُستخدم الغلاف من الصفحة 1
   تلقائيًا (نفس السلوك الافتراضي القديم). لتغيير غلاف أي كتاب
   لاحقًا يكفي إضافة/تعديل هذا الحقل فقط، دون أي تعديل آخر.
   ============================================================ */

var LIBRARY_BOOKS = [

    {
        title: "المراجعة النهائية في اللغة العربية - الأستاذ حيقون",
        subject: "اللغة العربية",
        level: "الثالثة ثانوي",
        pdf: "library/arabic-final-review-haygoun.pdf"
    },
    {
        title: "النوابغ في اللغة العربية للشعب العلمية",
        subject: "اللغة العربية",
        level: "شعبة علوم تجريبية",
        pdf: "library/arabic-nawabigh-science.pdf",
        coverPage: 3
    },
    {
        title: "ملخص اللغة الإنجليزية - الأستاذ منصوري",
        subject: "الإنجليزية",
        level: "الثالثة ثانوي",
        pdf: "library/english-summary-mansouri.pdf"
    },
    {
        title: "كتاب البنفسجي في التاريخ والجغرافيا - الأستاذ بورنان (v5)",
        subject: "التاريخ والجغرافيا",
        level: "الثالثة ثانوي",
        pdf: "library/history-geo-purple-bournan-v5.pdf"
    },
    {
        title: "سلسلة البنفسجي في العلوم الإسلامية",
        subject: "العلوم الإسلامية",
        level: "الثالثة ثانوي",
        pdf: "library/islamic-purple-series.pdf",
        coverPage: 3
    },
    {
        title: "مراجعة العلوم الإسلامية - الأستاذ شمس الدين",
        subject: "العلوم الإسلامية",
        level: "الثالثة ثانوي",
        pdf: "library/islamic-review-chamseddine.pdf"
    },
    {
        title: "الفضي في الرياضيات - الأعداد المركبة",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/math-silver-complex-numbers.pdf"
    },
    {
        title: "التخصص الوظيفي للبروتينات- أستاذة كتفي",
        subject: "علوم الطبيعة والحياة",
        level: "الثالثة ثانوي",
        pdf: "library/math-silver-exercises-v4.pdf",
        coverPage: 3
    },
    {
        title: "الفضي في الرياضيات - الاحتمالات (v4)",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/math-silver-probabilities-v4.pdf",
        coverPage: 2
    },
    {
        title: "الفضي في الرياضيات - المتتاليات - الأستاذ نورالدين",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/math-silver-sequences-nourddine.pdf"
    },
    {
        title: "ملخص اللغة الإنجليزية - الأستاذ ناصري (الجزء 2)",
        subject: "الإنجليزية",
        level: "الثالثة ثانوي",
        pdf: "library/nasri-anglais-2.pdf"
    },
    {
        title: "منهجية علوم الطبيعة والحياة - الأستاذة كتفي",
        subject: "علوم الطبيعة والحياة",
        level: "الثالثة ثانوي",
        pdf: "library/science-methodology-ketfi.pdf"
    }

];
