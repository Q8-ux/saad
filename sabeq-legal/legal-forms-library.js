(() => {
  'use strict';

  const categories = {
    notices: { ar: 'إنذارات ومطالبات', en: 'Notices and claims', ur: 'نوٹس اور مطالبات' },
    agreements: { ar: 'عقود واتفاقات', en: 'Contracts and agreements', ur: 'معاہدے' },
    acknowledgements: { ar: 'إقرارات وتعهدات', en: 'Acknowledgements', ur: 'اقرار اور عہد' },
    labour: { ar: 'صيغ عمالية', en: 'Labour forms', ur: 'لیبر فارمز' },
    property: { ar: 'صيغ عقارية', en: 'Property forms', ur: 'جائیداد فارمز' },
    settlements: { ar: 'تسويات ومخالصات', en: 'Settlements', ur: 'تصفیہ' }
  };

  const templates = [
    {
      id: 'payment-demand', category: 'notices',
      title: { ar: 'مطالبة ودية بسداد مبلغ', en: 'Amicable payment demand', ur: 'ادائیگی کا دوستانہ مطالبہ' },
      description: { ar: 'مطالبة أولية قبل اتخاذ الإجراءات القانونية.', en: 'An initial demand before legal action.', ur: 'قانونی کارروائی سے پہلے ابتدائی مطالبہ۔' },
      body: `التاريخ: {{التاريخ}}

إلى السيد/السادة: {{اسم الطرف المطالب بالسداد}}

الموضوع: مطالبة ودية بسداد مبلغ

بالإشارة إلى التعامل القائم بيننا بشأن {{وصف التعامل أو الاتفاق}}، وحيث ترتب في ذمتكم مبلغ وقدره {{المبلغ رقمًا وكتابةً}}، والمستحق السداد بتاريخ {{تاريخ الاستحقاق}}.

لذلك نطلب منكم التكرم بسداد المبلغ المذكور خلال مدة {{عدد الأيام}} أيام من تاريخ استلام هذه المطالبة، أو التواصل معنا للاتفاق كتابيًا على آلية سداد واضحة.

وفي حال عدم السداد أو التوصل إلى تسوية مكتوبة خلال المدة المحددة، فسيتم الاحتفاظ بكافة الحقوق في اتخاذ الإجراءات المناسبة للمطالبة بالمبلغ وما يترتب عليه.

وتفضلوا بقبول الاحترام.

الاسم: {{الاسم}}
الصفة: {{الصفة}}
وسيلة التواصل: {{الهاتف أو البريد}}`
    },
    {
      id: 'formal-notice', category: 'notices',
      title: { ar: 'إنذار بالوفاء بالتزام', en: 'Notice to perform an obligation', ur: 'ذمہ داری پوری کرنے کا نوٹس' },
      description: { ar: 'صيغة أولية لإنذار طرف بتنفيذ التزام محدد.', en: 'Initial notice requesting performance of an obligation.', ur: 'مخصوص ذمہ داری پوری کرنے کے لیے ابتدائی نوٹس۔' },
      body: `التاريخ: {{التاريخ}}

إلى: {{اسم المنذر إليه}}
العنوان: {{العنوان}}

الموضوع: إنذار بالوفاء بالتزام

بموجب {{العقد أو الاتفاق أو سبب الالتزام}} المؤرخ في {{التاريخ}}، التزمتم بـ {{وصف الالتزام بدقة}}، إلا أن الالتزام لم يُنفذ حتى تاريخه رغم حلول موعده.

وعليه، ننذركم بضرورة تنفيذ الالتزام كاملًا خلال {{المدة}} من تاريخ استلام هذا الإنذار، مع تزويدنا بما يثبت التنفيذ.

وفي حال انقضاء المهلة دون تنفيذ، فسيتم الاحتفاظ بالحق في اتخاذ الإجراءات النظامية والقضائية المناسبة دون إخلال بأي حقوق أخرى.

المنذر: {{الاسم}}
الصفة: {{الصفة}}
التوقيع: __________`
    },
    {
      id: 'receipt', category: 'acknowledgements',
      title: { ar: 'إقرار استلام مبلغ', en: 'Acknowledgement of payment receipt', ur: 'رقم وصولی کا اقرار' },
      description: { ar: 'إثبات استلام مبلغ وبيان سببه وطريقة دفعه.', en: 'Records receipt, purpose, and payment method.', ur: 'رقم، مقصد اور ادائیگی کے طریقے کا ریکارڈ۔' },
      body: `إقرار استلام مبلغ

أنا الموقع أدناه:
الاسم: {{الاسم الكامل}}
الرقم المدني/الهوية: {{الرقم}}
العنوان: {{العنوان}}

أقر بأنني استلمت من السيد/السادة {{اسم الدافع}} مبلغًا وقدره {{المبلغ رقمًا وكتابةً}}، وذلك عن {{سبب السداد}}، وقد تم السداد بواسطة {{نقدًا/تحويل/شيك}} بتاريخ {{التاريخ}}.

ويُعد هذا الإقرار إثباتًا باستلام المبلغ للغرض المبين أعلاه فقط، دون أن يمتد إلى أي التزامات أخرى ما لم يُذكر ذلك صراحةً.

حرر في: {{المكان}}
بتاريخ: {{التاريخ}}

اسم المقر: {{الاسم}}
التوقيع: __________

الشاهد الأول: {{الاسم}} — التوقيع: __________
الشاهد الثاني: {{الاسم}} — التوقيع: __________`
    },
    {
      id: 'financial-release', category: 'settlements',
      title: { ar: 'مخالصة مالية', en: 'Financial release', ur: 'مالی تصفیہ' },
      description: { ar: 'مخالصة محددة النطاق بعد سداد مبلغ أو تسوية.', en: 'A scoped release after payment or settlement.', ur: 'ادائیگی یا تصفیہ کے بعد محدود مالی کلیئرنس۔' },
      body: `مخالصة مالية

أنا/نحن {{الاسم أو اسم الجهة}}، أقر بأنني استلمت من {{اسم الطرف الآخر}} مبلغًا وقدره {{المبلغ رقمًا وكتابةً}} بتاريخ {{التاريخ}}، وذلك تسويةً عن {{وصف الالتزام أو النزاع}}.

وباستلام المبلغ المذكور، أقر بانقضاء المطالبة المالية المتعلقة حصرًا بالموضوع المبين أعلاه حتى تاريخ هذه المخالصة، مع بقاء أي حقوق أو التزامات أخرى غير منصوص عليها صراحةً.

تم تحرير هذه المخالصة بإرادة حرة وبعد قراءة مضمونها وفهم نطاقها.

الاسم: {{الاسم}}
الصفة: {{الصفة}}
الرقم المدني/رقم الترخيص: {{الرقم}}
التوقيع والختم: __________
التاريخ: {{التاريخ}}`
    },
    {
      id: 'undertaking', category: 'acknowledgements',
      title: { ar: 'إقرار وتعهد', en: 'Acknowledgement and undertaking', ur: 'اقرار اور عہد' },
      description: { ar: 'تعهد بتنفيذ أمر أو الامتناع عن تصرف محدد.', en: 'Undertaking to act or refrain from a defined action.', ur: 'کسی مخصوص عمل یا ترک عمل کا عہد۔' },
      body: `إقرار وتعهد

أنا الموقع أدناه {{الاسم الكامل}}، حامل الرقم {{الرقم المدني/الهوية}}، أقر وأنا بكامل إرادتي وأهليتي بأن {{نص الإقرار}}.

كما أتعهد بـ {{وصف الالتزام المطلوب بدقة}} اعتبارًا من تاريخ {{التاريخ}}، وأتحمل مسؤولية الإخلال بهذا التعهد في حدود ما يقرره الاتفاق والقانون.

وقد حرر هذا الإقرار والتعهد للعمل بموجبه عند الحاجة.

الاسم: {{الاسم}}
العنوان: {{العنوان}}
الهاتف: {{الهاتف}}
التوقيع: __________
التاريخ: {{التاريخ}}

الشاهد: {{الاسم}} — التوقيع: __________`
    },
    {
      id: 'services-agreement', category: 'agreements',
      title: { ar: 'اتفاق تقديم خدمات', en: 'Services agreement', ur: 'خدمات کا معاہدہ' },
      description: { ar: 'اتفاق مبسط يحدد الخدمة والمقابل والمدة.', en: 'A concise agreement covering scope, fees, and term.', ur: 'خدمات، فیس اور مدت کا مختصر معاہدہ۔' },
      body: `اتفاق تقديم خدمات

في يوم {{اليوم}} الموافق {{التاريخ}} تم الاتفاق بين كل من:

الطرف الأول: {{الاسم/الجهة}}، ويمثله {{الاسم والصفة}}.
الطرف الثاني: {{الاسم/الجهة}}، ويمثله {{الاسم والصفة}}.

أولًا — نطاق الخدمة:
يتولى الطرف الثاني تنفيذ {{وصف الخدمة ومخرجاتها}} وفق المتطلبات والمواعيد المتفق عليها كتابةً.

ثانيًا — المدة:
تبدأ الخدمة بتاريخ {{التاريخ}} وتنتهي بتاريخ {{التاريخ}}، ما لم يتفق الطرفان كتابةً على تمديدها.

ثالثًا — المقابل وآلية السداد:
إجمالي المقابل {{المبلغ}}، ويسدد على النحو الآتي: {{جدول الدفعات}}.

رابعًا — التزامات الطرفين:
{{التزامات الطرف الأول}}
{{التزامات الطرف الثاني}}

خامسًا — السرية والملكية:
يلتزم الطرفان بالمحافظة على سرية المعلومات، وتحدد ملكية المخرجات وفق {{التفصيل}}.

سادسًا — الإنهاء وتسوية الخلاف:
يجوز إنهاء الاتفاق وفق {{مدة الإخطار وشروطه}}، وتتم محاولة التسوية الودية قبل اتخاذ أي إجراء آخر.

الطرف الأول: __________
الطرف الثاني: __________`
    },
    {
      id: 'debt-schedule', category: 'agreements',
      title: { ar: 'اتفاق جدولة مديونية', en: 'Debt instalment agreement', ur: 'قرض اقساط معاہدہ' },
      description: { ar: 'تنظيم مبلغ الدين وجدول الأقساط والاستحقاقات.', en: 'Sets the debt amount and instalment schedule.', ur: 'قرض کی رقم اور اقساط کا شیڈول۔' },
      body: `اتفاق جدولة مديونية

أقر الطرف المدين {{الاسم}} بانشغال ذمته لصالح الطرف الدائن {{الاسم}} بمبلغ إجمالي قدره {{المبلغ رقمًا وكتابةً}} ناتج عن {{سبب المديونية}}.

واتفق الطرفان على سداد المبلغ وفق الجدول الآتي:
1. دفعة مقدارها {{المبلغ}} تستحق بتاريخ {{التاريخ}}.
2. دفعة مقدارها {{المبلغ}} تستحق بتاريخ {{التاريخ}}.
3. {{إضافة بقية الدفعات}}.

تُثبت كل دفعة بموجب إيصال أو تحويل بنكي واضح. وفي حال التأخر عن أي دفعة، يتواصل الطرفان خلال {{عدد الأيام}} أيام لمعالجة التأخر، مع احتفاظ الدائن بحقوقه بشأن الرصيد غير المسدد.

حرر الاتفاق من نسختين، وتسلم كل طرف نسخة للعمل بموجبها.

الدائن: {{الاسم والتوقيع}}
المدين: {{الاسم والتوقيع}}
التاريخ: {{التاريخ}}`
    },
    {
      id: 'special-authorisation', category: 'acknowledgements',
      title: { ar: 'تفويض خاص', en: 'Special authorisation', ur: 'خصوصی اختیار نامہ' },
      description: { ar: 'تفويض محدد المهمة والمدة دون صلاحيات مفتوحة.', en: 'A task- and time-limited authorisation.', ur: 'مخصوص کام اور مدت کے لیے اختیار۔' },
      body: `تفويض خاص

أنا {{الاسم الكامل}}، حامل الرقم {{الرقم المدني/الهوية}}، أفوض السيد/السيدة {{اسم المفوض إليه}}، حامل الرقم {{الرقم}}، في القيام نيابةً عني بالمهمة الآتية فقط:

{{وصف المهمة والإجراءات المسموح بها بدقة}}

يسري هذا التفويض من تاريخ {{تاريخ البداية}} حتى تاريخ {{تاريخ الانتهاء}}، ولا يجيز للمفوض إليه تفويض الغير أو تجاوز نطاق المهمة إلا بموافقة كتابية مستقلة.

اسم المفوض: {{الاسم}}
التوقيع: __________
الهاتف: {{الهاتف}}
التاريخ: {{التاريخ}}`
    },
    {
      id: 'labour-complaint', category: 'labour',
      title: { ar: 'شكوى عمالية أولية', en: 'Initial labour complaint', ur: 'ابتدائی لیبر شکایت' },
      description: { ar: 'تنظيم الوقائع والمطالبات والمستندات الأساسية.', en: 'Structures facts, claims, and supporting documents.', ur: 'حقائق، مطالبات اور دستاویزات کو منظم کرتا ہے۔' },
      body: `شكوى عمالية أولية

بيانات العامل:
الاسم: {{الاسم}}
الرقم المدني: {{الرقم}}
المسمى الوظيفي: {{المسمى}}
تاريخ بدء العمل: {{التاريخ}}

بيانات صاحب العمل:
الاسم/الجهة: {{الاسم}}
العنوان: {{العنوان}}

موضوع الشكوى:
أتقدم بهذه الشكوى بشأن {{وصف موجز للمشكلة}}.

الوقائع:
1. {{الواقعة الأولى وتاريخها}}
2. {{الواقعة الثانية وتاريخها}}
3. {{إضافة الوقائع بترتيب زمني}}

المطالبات:
1. {{المطالبة الأولى}}
2. {{المطالبة الثانية}}

المستندات المرفقة:
{{عقد العمل/كشوف الرواتب/المراسلات/غيرها}}

الاسم والتوقيع: __________
التاريخ: {{التاريخ}}`
    },
    {
      id: 'property-handover', category: 'property',
      title: { ar: 'محضر استلام وتسليم عين مؤجرة', en: 'Leased property handover record', ur: 'کرایہ شدہ جگہ حوالگی ریکارڈ' },
      description: { ar: 'توثيق حالة العقار والمفاتيح والعدادات عند التسليم.', en: 'Records condition, keys, and meter readings.', ur: 'جائیداد کی حالت، چابیاں اور میٹر ریڈنگ۔' },
      body: `محضر استلام وتسليم عين مؤجرة

بتاريخ {{التاريخ}}، قام الطرف الأول {{اسم المؤجر/الممثل}} بتسليم الطرف الثاني {{اسم المستأجر}} العين الكائنة في {{العنوان الكامل}}.

حالة العين عند التسليم:
{{وصف الجدران والأرضيات والأبواب والمرافق والتجهيزات}}

العدادات:
الكهرباء: {{الرقم والقراءة}}
الماء: {{الرقم والقراءة}}

المفاتيح والملحقات المسلمة:
{{العدد والوصف}}

الملاحظات أو العيوب الظاهرة:
{{التفصيل أو لا يوجد}}

أقر الطرفان بمعاينة الحالة الموضحة أعلاه، وحرر المحضر من نسختين.

الطرف الأول: {{الاسم والتوقيع}}
الطرف الثاني: {{الاسم والتوقيع}}
التاريخ: {{التاريخ}}`
    },
    {
      id: 'confidentiality', category: 'acknowledgements',
      title: { ar: 'تعهد بالمحافظة على السرية', en: 'Confidentiality undertaking', ur: 'رازداری کا عہد' },
      description: { ar: 'تعهد بعدم إفشاء معلومات محددة أو استخدامها خارج الغرض.', en: 'Protects defined information and its permitted use.', ur: 'مخصوص معلومات اور ان کے استعمال کی حفاظت۔' },
      body: `تعهد بالمحافظة على السرية

أنا {{الاسم}}، بصفتي {{الصفة}}، أتعهد بالمحافظة على سرية المعلومات والمستندات والبيانات التي أطلع عليها بسبب {{العمل/المشروع/التعامل}}، وعدم إفشائها أو نسخها أو استخدامها لغير الغرض المصرح به.

يشمل نطاق السرية: {{تحديد أنواع المعلومات}}، ولا يشمل ما أصبح متاحًا للعامة دون إخلال بهذا التعهد أو ما يلزم الإفصاح عنه بموجب إجراء رسمي واجب الاتباع.

أتعهد بإعادة أو إتلاف المواد السرية عند الطلب، والاستمرار في الالتزام بالسرية لمدة {{المدة}} بعد انتهاء العلاقة.

الاسم: {{الاسم}}
الرقم: {{الرقم المدني/رقم الموظف}}
التوقيع: __________
التاريخ: {{التاريخ}}`
    },
    {
      id: 'settlement-record', category: 'settlements',
      title: { ar: 'محضر صلح وتسوية', en: 'Settlement record', ur: 'صلح و تصفیہ ریکارڈ' },
      description: { ar: 'توثيق بنود التسوية ومواعيد التنفيذ بوضوح.', en: 'Records settlement terms and deadlines.', ur: 'تصفیہ کی شرائط اور آخری تاریخیں۔' },
      body: `محضر صلح وتسوية

في يوم {{اليوم}} الموافق {{التاريخ}}، اتفق كل من:
الطرف الأول: {{الاسم والبيانات}}
الطرف الثاني: {{الاسم والبيانات}}

تمهيد:
نشأ بين الطرفين خلاف بشأن {{وصف الخلاف}}، ورغبةً منهما في إنهائه وديًا فقد اتفقا على الآتي:

1. يلتزم الطرف الأول بـ {{الالتزام والموعد}}.
2. يلتزم الطرف الثاني بـ {{الالتزام والموعد}}.
3. تكون آلية التنفيذ والسداد على النحو الآتي: {{التفصيل}}.
4. عند التنفيذ الكامل، تنقضي المطالبات المتعلقة حصرًا بموضوع هذه التسوية.
5. أي تعديل على هذا المحضر لا يكون معتبرًا إلا إذا كان مكتوبًا وموقعًا من الطرفين.

حرر المحضر من نسختين أصليتين.

الطرف الأول: {{الاسم والتوقيع}}
الطرف الثاني: {{الاسم والتوقيع}}
التاريخ: {{التاريخ}}`
    }
  ];

  const ui = {
    ar: {
      title: 'مكتبة الصيغ القانونية', subtitle: 'اختر صيغة، عدّل بياناتها، ثم انسخها أو نزّلها.',
      search: 'ابحث في الصيغ...', all: 'جميع التصنيفات', close: 'إغلاق', copy: 'نسخ الصيغة',
      download: 'تحميل Word', empty: 'لا توجد صيغ مطابقة.', copied: 'تم نسخ الصيغة.', downloaded: 'تم تجهيز الملف.',
      note: 'هذه نماذج إرشادية أولية قابلة للتخصيص وتحتاج إلى مراجعة محامٍ قبل التوقيع أو التقديم.'
    },
    en: {
      title: 'Legal forms library', subtitle: 'Choose an Arabic form, edit it, then copy or download it.',
      search: 'Search forms...', all: 'All categories', close: 'Close', copy: 'Copy form',
      download: 'Download Word', empty: 'No matching forms.', copied: 'Form copied.', downloaded: 'File prepared.',
      note: 'These are editable guidance templates and should be reviewed by a lawyer before signing or filing.'
    },
    ur: {
      title: 'قانونی فارمز لائبریری', subtitle: 'عربی فارم منتخب کریں، ترمیم کریں، پھر کاپی یا ڈاؤن لوڈ کریں۔',
      search: 'فارمز تلاش کریں...', all: 'تمام زمرے', close: 'بند کریں', copy: 'فارم کاپی کریں',
      download: 'Word ڈاؤن لوڈ', empty: 'کوئی مماثل فارم نہیں ملا۔', copied: 'فارم کاپی ہو گیا۔', downloaded: 'فائل تیار ہے۔',
      note: 'یہ قابل ترمیم رہنمائی کے نمونے ہیں؛ دستخط یا جمع کرانے سے پہلے وکیل سے جائزہ ضروری ہے۔'
    }
  };

  let modal;
  let list;
  let search;
  let category;
  let editor;
  let selectedTitle;
  let selectedDescription;
  let status;
  let activeId = templates[0].id;
  let language = 'ar';

  function getLanguage() {
    const value = document.body?.dataset?.language || document.documentElement.lang || 'ar';
    return value.startsWith('en') ? 'en' : value.startsWith('ur') ? 'ur' : 'ar';
  }

  function textFor(value) {
    return value?.[language] || value?.ar || '';
  }

  function createModal() {
    modal = document.createElement('div');
    modal.className = 'sabeq-forms-overlay';
    modal.hidden = true;
    modal.innerHTML = `
      <section class="sabeq-forms-dialog" role="dialog" aria-modal="true" aria-labelledby="sabeq-forms-title">
        <header class="sabeq-forms-header">
          <div><h2 id="sabeq-forms-title"></h2><p data-forms-subtitle></p></div>
          <button class="sabeq-forms-close" type="button" data-forms-close aria-label="Close">×</button>
        </header>
        <div class="sabeq-forms-main">
          <aside class="sabeq-forms-sidebar">
            <input class="sabeq-forms-search" type="search" data-forms-search />
            <select class="sabeq-forms-category" data-forms-category></select>
            <div class="sabeq-forms-list" data-forms-list></div>
          </aside>
          <main class="sabeq-forms-workspace">
            <div class="sabeq-forms-selected"><h3 data-forms-selected-title></h3><p data-forms-selected-description></p><div class="sabeq-forms-status" aria-live="polite"></div></div>
            <textarea class="sabeq-forms-editor" data-forms-editor spellcheck="true"></textarea>
          </main>
        </div>
        <footer class="sabeq-forms-footer">
          <p class="sabeq-forms-note" data-forms-note></p>
          <div class="sabeq-forms-actions">
            <button class="sabeq-forms-action" type="button" data-forms-copy></button>
            <button class="sabeq-forms-action is-primary" type="button" data-forms-download></button>
          </div>
        </footer>
      </section>`;

    document.body.appendChild(modal);
    list = modal.querySelector('[data-forms-list]');
    search = modal.querySelector('[data-forms-search]');
    category = modal.querySelector('[data-forms-category]');
    editor = modal.querySelector('[data-forms-editor]');
    selectedTitle = modal.querySelector('[data-forms-selected-title]');
    selectedDescription = modal.querySelector('[data-forms-selected-description]');
    status = modal.querySelector('.sabeq-forms-status');

    modal.querySelector('[data-forms-close]').addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    search.addEventListener('input', renderList);
    category.addEventListener('change', renderList);
    modal.querySelector('[data-forms-copy]').addEventListener('click', copyForm);
    modal.querySelector('[data-forms-download]').addEventListener('click', downloadForm);
  }

  function applyLanguage() {
    language = getLanguage();
    const labels = ui[language];
    modal.dir = language === 'en' ? 'ltr' : 'rtl';
    modal.querySelector('#sabeq-forms-title').textContent = labels.title;
    modal.querySelector('[data-forms-subtitle]').textContent = labels.subtitle;
    modal.querySelector('[data-forms-close]').setAttribute('aria-label', labels.close);
    modal.querySelector('[data-forms-search]').placeholder = labels.search;
    modal.querySelector('[data-forms-note]').textContent = labels.note;
    modal.querySelector('[data-forms-copy]').textContent = labels.copy;
    modal.querySelector('[data-forms-download]').textContent = labels.download;

    category.replaceChildren();
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = labels.all;
    category.appendChild(all);
    Object.entries(categories).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = textFor(label);
      category.appendChild(option);
    });
  }

  function filteredTemplates() {
    const query = search.value.trim().toLocaleLowerCase(language);
    return templates.filter(template => {
      const matchesCategory = category.value === 'all' || template.category === category.value;
      const haystack = `${textFor(template.title)} ${textFor(template.description)} ${textFor(categories[template.category])}`.toLocaleLowerCase(language);
      return matchesCategory && (!query || haystack.includes(query));
    });
  }

  function renderList() {
    const matches = filteredTemplates();
    list.replaceChildren();

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'sabeq-forms-empty';
      empty.textContent = ui[language].empty;
      list.appendChild(empty);
      return;
    }

    if (!matches.some(template => template.id === activeId)) activeId = matches[0].id;

    matches.forEach(template => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sabeq-form-item${template.id === activeId ? ' is-active' : ''}`;
      const title = document.createElement('strong');
      const description = document.createElement('small');
      title.textContent = textFor(template.title);
      description.textContent = textFor(template.description);
      button.append(title, description);
      button.addEventListener('click', () => selectTemplate(template.id));
      list.appendChild(button);
    });

    if (!editor.value) selectTemplate(activeId);
  }

  function selectTemplate(id) {
    const template = templates.find(item => item.id === id);
    if (!template) return;
    activeId = id;
    selectedTitle.textContent = textFor(template.title);
    selectedDescription.textContent = textFor(template.description);
    editor.value = template.body;
    status.textContent = '';
    renderActiveState();
  }

  function renderActiveState() {
    list.querySelectorAll('.sabeq-form-item').forEach((button, index) => {
      const match = filteredTemplates()[index];
      button.classList.toggle('is-active', match?.id === activeId);
    });
  }

  async function copyForm() {
    const value = editor.value.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (_) {
      editor.focus();
      editor.select();
      document.execCommand('copy');
      editor.setSelectionRange(0, 0);
    }
    status.textContent = ui[language].copied;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function downloadForm() {
    const template = templates.find(item => item.id === activeId);
    if (!template || !editor.value.trim()) return;
    const title = textFor(template.title);
    const content = escapeHtml(editor.value).replace(/\n/g, '<br>');
    const documentHtml = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="direction:rtl;text-align:right;font-family:Arial,sans-serif;font-size:16pt;line-height:1.9"><h1>${escapeHtml(title)}</h1><p>${content}</p><hr><small>${escapeHtml(ui.ar.note)}</small></body></html>`;
    const blob = new Blob(['\ufeff', documentHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)}.doc`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = ui[language].downloaded;
  }

  function openModal() {
    if (!modal) createModal();
    applyLanguage();
    search.value = '';
    category.value = 'all';
    editor.value = '';
    activeId = templates[0].id;
    renderList();
    modal.hidden = false;
    document.body.classList.add('sabeq-forms-open');
    requestAnimationFrame(() => search.focus());
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('sabeq-forms-open');
  }

  function isLibraryCard(target) {
    const button = target.closest?.('button');
    const card = button?.closest?.('.package-card');
    if (!card) return false;
    const text = (card.textContent || '').replace(/\s+/g, ' ').trim();
    return /مكتبة الصيغ القانونية|Legal forms library|قانونی فارمز/i.test(text);
  }

  document.addEventListener('click', event => {
    if (!isLibraryCard(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openModal();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });
})();
