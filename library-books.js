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

   ✅ تحديث: تمت إضافة 19 كتابًا جديدًا كانت ملفاتها موجودة فعليًا
   داخل مجلد library/ لكنها لم تكن مُدرجة هنا بعد (تم اكتشافها
   بمقارنة محتوى المجلد الفعلي مع هذه القائمة). الأسماء المستخدمة
   في حقل "pdf" هي نفسها أسماء الملفات الحقيقية حرفيًا (بما في ذلك
   المسافات والأحرف الكبيرة/الصغيرة)، حتى تعمل القراءة والتنزيل
   والغلاف لكل كتاب دون أي خطأ 404. العناوين والمواد والمستوى
   وُضعت بأفضل تخمين ممكن استنادًا لاسم كل ملف — يمكنك تعديل أي
   عنوان لاحقًا بكل حرية دون التأثير على عمل الكتاب.
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
    },

    /* ══ الكتب الجديدة (تمت إضافتها بعد مطابقة محتوى مجلد library/) ══ */

    {
        title: "الهدى في الرياضيات",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/Al-Huda in Mathematics.pdf"
    },
    {
        title: "المغني في التاريخ والجغرافيا - السنة الثالثة ثانوي",
        subject: "التاريخ والجغرافيا",
        level: "الثالثة ثانوي",
        pdf: "library/Al-Mughni in History and Geography - 3rd Year.pdf"
    },
    {
        title: "الفصل الأول: العلاقات - رياضيات",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/chapitre1al3emlaq.pdf"
    },
    {
        title: "كليك ماث في الرياضيات",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/Click_maths_3as.pdf"
    },
    {
        title: "الجديد في الرياضيات - الجزء الأول",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/El_djadid_math_3AS.pdf"
    },
    {
        title: "الجديد في الرياضيات - الجزء الثاني",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/El_djadid_math_Partie2_3AS.pdf"
    },
    {
        title: "الجديد في الرياضيات - الجزء الثالث",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/El_djadid_math_Partie3_3AS.pdf"
    },
    {
        title: "الحديث في الرياضيات",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/El_hadite_maths_3as.pdf"
    },
    {
        title: "الميسر في الرياضيات",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/El_meyasser_maths_3AS.pdf"
    },
    {
        title: "المراجعة النهائية للبكالوريا - اللغة العربية",
        subject: "اللغة العربية",
        level: "الثالثة ثانوي",
        pdf: "library/Final BAC Revison Arabic.pdf"
    },
    {
        title: "المراجعة النهائية للبكالوريا - الرياضيات",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/Final BAC Revison MATH.pdf"
    },
    {
        title: "المراجعة النهائية للبكالوريا - الفيزياء",
        subject: "الفيزياء",
        level: "الثالثة ثانوي",
        pdf: "library/Final BAC Revison Physique.pdf"
    },
    {
        title: "المراجعة النهائية للبكالوريا - علوم الطبيعة والحياة",
        subject: "علوم الطبيعة والحياة",
        level: "الثالثة ثانوي",
        pdf: "library/Final_BAC_Revison_Science.pdf"
    },
    {
        title: "باز في الرياضيات",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/math3as-baz.pdf"
    },
    {
        title: "المتميز في الرياضيات - الأعداد المركبة",
        subject: "الرياضيات",
        level: "الثالثة ثانوي",
        pdf: "library/Motameyez_maths_nom_com_3AS.pdf"
    },
    {
        title: "Success Key - مفتاح النجاح في اللغة الإنجليزية",
        subject: "الإنجليزية",
        level: "الثالثة ثانوي",
        pdf: "library/success-key-3SE.pdf"
    },
    {
        title: "تأشيرة النجاح في العلوم الفيزيائية - الجزء الأول",
        subject: "الفيزياء",
        level: "الثالثة ثانوي",
        pdf: "library/Success Visa in Physical Sciences - Part 1.pdf"
    },
    {
        title: "تأشيرة النجاح في العلوم الفيزيائية - الجزء الثاني",
        subject: "الفيزياء",
        level: "الثالثة ثانوي",
        pdf: "library/Success Visa in Physical Sciences - Part 2.pdf"
    },
    {
        title: "تأشيرة النجاح في العلوم الفيزيائية - الجزء الثالث",
        subject: "الفيزياء",
        level: "الثالثة ثانوي",
        pdf: "library/Success Visa in Physical Sciences - Part 3.pdf",
        /* غلاف مخصص لهذا الكتاب فقط: صورة ثابتة بدل الغلاف المولَّد تلقائيًا
           من الصفحة الأولى للـPDF. لا تؤثر على أي كتاب آخر في المكتبة. */
        coverImage: "library/covers/success-visa-part3-cover.png"
    }

];