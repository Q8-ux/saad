/*
 * Independent, multilingual in-site guide.
 * All pages stay on the prototype domain. No official database or application
 * service is represented as connected, and no personal information is collected.
 */
"use strict";

const pages = {
  catalog:       { icon:"⌕", group:"research", related:["databases","bibliography","digital"] },
  databases:     { icon:"▦", group:"research", related:["catalog","digital","bibliography"] },
  bibliography:  { icon:"▤", group:"research", related:["catalog","deposit","digital"] },
  digital:       { icon:"◇", group:"research", related:["bibliography","databases","catalog"] },
  copyright:     { icon:"©", group:"authors", related:["isbn","deposit","bibliography"] },
  isbn:          { icon:"#", group:"authors", related:["deposit","copyright","bibliography"] },
  deposit:       { icon:"▣", group:"authors", related:["copyright","isbn","bibliography"] },
  rooms:         { icon:"⌂", group:"visitors", related:["services","about","digital"] },
  about:         { icon:"✧", group:"general", related:["services","collections","bibliography"] },
  services:      { icon:"▦", group:"general", related:["catalog","isbn","rooms"] },
  collections:   { icon:"◈", group:"general", related:["bibliography","digital","databases"] },
  portal:        { icon:"◎", group:"research", related:["catalog","databases","collections"] },
  theses:        { icon:"♧", group:"research", related:["catalog","bibliography","databases"] },
  public:        { icon:"⌘", group:"research", related:["catalog","portal","services"] }
};

const localization = {
ar: {
  ui: {
    brand:"مكتبة الكويت الوطنية",brandSub:"ذاكرة وطن · أفق معرفة",home:"الرئيسية",services:"الخدمات",collections:"المجموعات",about:"عن المكتبة",
    disclaimer:"نموذج تطويري مستقل غير رسمي، لا يستقبل المعاملات الحكومية.",language:"اللغة",back:"تصفّح جميع الخدمات", overview:"تعرف على الخدمة",
    overviewIntro:"هذا الدليل يقدم معلومات واضحة عن هذا القسم، ومسارات المعرفة المتصلة به، داخل الموقع المطوّر.",
    more:"معلومات أساسية",noteTitle:"حدود هذه النسخة",note:"المحتوى هنا تعريفي وتجريبي؛ لا يوجد اتصال مباشر بالفهرس الحكومي أو بقواعد بيانات الناشرين، ولا يمكن إرسال معاملات أو إتمام حجوزات عبر هذه النسخة.",
    how:"كيفية الاستفادة",howIntro:"جميع الخطوات التالية تتم داخل البوابة التطويرية. المعاملات الرسمية تتطلب تكاملاً مع أنظمة الجهة المختصة.",
    step1:"اقرأ ملخص الخدمة ومعلوماتها الأساسية.",step2:"انتقل إلى الصفحات المرتبطة داخل الموقع نفسه.",step3:"عند تفعيل الربط الرسمي ستتاح المعاملات وفق الصلاحيات المعتمدة.",
    aside:"مسارات أخرى",related:"قد يهمك أيضاً",moreLink:"افتح الصفحة",all:"كل الصفحات",footer:"نموذج تطويري مستقل، وليس بوابة حكومية معتمدة.",up:"العودة للأعلى ↑",
    status:"محتوى معرفي",noticeDigital:"المكتبة الرقمية في الموقع الحكومي ما زالت موصوفة بأنها مشروع قيد التطوير؛ لا توجد في هذا النموذج ملفات تراثية فعلية مخصصة للقراءة أو التنزيل."
  },
  topics: {
    catalog:["فهرس المكتبة","دليل للبحث عن الكتب والمقتنيات المكتبية، دون إظهار نتائج فهرس حقيقية غير متصلة.",
      "يساعد الفهرس القارئ على اكتشاف المؤلفات والعناوين والمعلومات الببليوجرافية.",
      "يمكن تطوير البحث مستقبلاً ليشمل المؤلف والعنوان والموضوع ورقم التصنيف عندما تتوفر واجهة رسمية.",
      "لا تعرض هذه النسخة توافر الكتب أو أماكنها أو إمكانية استعارتها؛ تلك البيانات تحتاج ربطاً مباشراً."],
    databases:["قواعد البيانات البحثية","التعرّف إلى المصادر الأكاديمية والبحثية التي تشير إليها مكتبة الكويت الوطنية.",
      "يعرض الموقع الحكومي مصادر بحثية منها EBSCO Academic Search Complete وقاعدة معرفة العربية.",
      "تشمل المصادر المذكورة في الموقع مجموعات عربية، وكتباً تاريخية، ومراجع متعددة المجالات.",
      "الوصول إلى النصوص الكاملة أو الاشتراكات لا يعمل هنا تلقائياً، وقد يخضع لشروط الجهة الناشرة."],
    bibliography:["الببليوجرافيا الوطنية","توثيق الإنتاج الفكري والعلمي والأدبي المنشور في دولة الكويت.",
      "تضم أعمال القسم جمع وتنظيم وتصنيف وتسجيل الإنتاج الفكري المحلي.",
      "تشمل الإصدارات نشرات الإيداع والقوائم السنوية والأدلة والفهارس والببليوجرافيات المتخصصة.",
      "لا تعرض هذه الصفحة فهرس الأعداد أو ملفات PDF نفسها؛ إضافتها تتطلب مصادر وحقوق نشر معتمدة."],
    digital:["المكتبة الرقمية","مشروع حفظ وإتاحة مختارات من المقتنيات التراثية والتاريخية رقمياً.",
      "المشروع يركز على مواد نادرة وكتب تاريخية وتراثية مرتبطة بذاكرة الكويت.",
      "تشير الصفحة الرسمية إلى أن مشروع المكتبة الرقمية ما زال قيد الإنشاء والتطوير.",
      "لن نعرض صور مخطوطات أو كتب أو ملفات للتحميل قبل التأكد من توافرها وحقوق إتاحتها."],
    copyright:["إدارة حق المؤلف","تعريف بحقوق المؤلف والحقوق المجاورة وخدمات حماية الإنتاج الأدبي والفني.",
      "تتولى إدارة حق المؤلف أعمالاً متعلقة بالإيداع وحماية المصنفات وفق اختصاصاتها.",
      "يشير الموقع إلى قانون رقم 75 لسنة 2019 بشأن حقوق المؤلف والحقوق المجاورة.",
      "هذه الصفحة تقدم معلومات عامة ولا تؤسس حقاً أو تسجل مصنفاً ولا تُعد استشارة قانونية."],
    isbn:["الرقم الدولي المعياري للكتاب ISBN","معلومات عن تخصيص الرقم الدولي المعياري للكتب المنشورة في الكويت.",
      "توضح المكتبة أنها الجهة المعتمدة محلياً لتخصيص أرقام ISBN للكتب المنشورة في الكويت.",
      "توجد بالموقع الرسمي معلومات ونماذج مرتبطة بالإيداع والترقيم الدولي للكتب.",
      "لا يمكن إصدار رقم ISBN من هذا النموذج، ولا نجمع بيانات المؤلفين أو الناشرين فيه."],
    deposit:["الإيداع القانوني","تعريف بإيداع الكتب والمصنفات لدى الجهات المختصة في مكتبة الكويت الوطنية.",
      "تتولى إدارة حق المؤلف وقسم الإيداع والترقيم الدولي الإجراءات المتصلة بإيداع المصنفات.",
      "من الخدمات المنشورة نماذج طلب إيداع المصنف وطلب الإيداع والرقم الدولي للكتاب.",
      "قائمة المستندات النهائية والرسوم إن وجدت يجب تأكيدها من الجهة المختصة قبل أي طلب فعلي."],
    rooms:["القاعات والمسرح","معلومات عن مرافق المكتبة المتاحة للفعاليات الثقافية والتعليمية.",
      "تذكر المكتبة وجود مسرح وقاعتين تدريبيتين مجهزتين بتقنيات سمعية وبصرية.",
      "تتعلق الاستخدامات المذكورة بالندوات والدورات والمؤتمرات والفعاليات الثقافية غير الربحية.",
      "حجز الموعد والتأكد من توفر القاعات والموافقة عليه غير متصلين بهذا النموذج."],
    about:["عن مكتبة الكويت الوطنية","مؤسسة معنية بحفظ التراث والإنتاج الفكري الوطني وتعزيز المعرفة.",
      "أُنشئت المكتبة الوطنية بموجب المرسوم الأميري رقم 52 لسنة 1994.",
      "من أدوارها جمع وتنظيم وتوثيق وحفظ التراث والإنتاج الفكري بأشكاله المختلفة.",
      "يُفترض نشر أي بيانات مؤسسية إضافية بعد مراجعتها واعتمادها من الجهة المختصة."],
    services:["دليل الخدمات","صفحة جامعة للخدمات المعرفية والثقافية المتاحة للتعرّف داخل البوابة المطوّرة.",
      "تشمل الخدمات المعلنة البحث المرجعي والفهرس وقواعد المعلومات والإيداع وISBN.",
      "من الخدمات المساندة المعلنة التصوير والمسح الضوئي وحجز القاعات والمسرح.",
      "اضغط على أي صفحة مرتبطة للتنقل داخلياً؛ تقديم الطلبات الحكومية الفعلية يحتاج ربطاً رسمياً."],
    collections:["المجموعات والمصادر","مسارات معرفية تشمل الببليوجرافيا الوطنية والمكتبة الرقمية وقواعد البيانات.",
      "تعرّف إلى توثيق الإنتاج الفكري الوطني وأدلة الكتب والدوريات.",
      "استكشف وصف المكتبة الرقمية والمقتنيات التراثية المخطط لإتاحتها.",
      "تعرّف إلى قواعد البيانات الأكاديمية، دون الادعاء بإتاحة الاشتراكات من خلال هذا النموذج."],
    portal:["بوابة مكتبات الكويت","مدخل تعريفي مقترح لربط المكتبات والخدمات المرجعية داخل الكويت.",
      "يعرض الموقع الأصلي رابطاً بعنوان بوابة مكتبات دولة الكويت.",
      "يمكن لهذا القسم جمع أدلة المكتبات والوصول إلى فهارسها عندما تتوفر بيانات رسمية.",
      "لا توجد حالياً بوابة موحدة متصلة أو بيانات فهرسة حية ضمن هذه النسخة."],
    theses:["الرسائل الجامعية","مسار تعريفي للبحث في رسائل الماجستير والدكتوراه ومصادرها البحثية.",
      "يتضمن الموقع الأصلي قسماً لرسائل الماجستير والدكتوراه.",
      "يمكن إتاحة التصفح بحسب الجامعة والتخصص والباحث والسنة عند توافر بيانات مصرح بها.",
      "لم نُدرج رسائل أو ملفات أكاديمية من دون تحقق من حقوق النشر والتكامل."],
    public:["فهرس المكتبات العامة","مسار تعريفي لاستكشاف مكتبات الكويت العامة وفهارسها.",
      "يعرض الموقع الأصلي خيار فهرس المكتبات العامة.",
      "يمكن لاحقاً توفير دليل للمكتبات العامة ومواقعها وساعاتها وفهارس مقتنياتها.",
      "لا يتيح هذا النموذج حالياً البحث المباشر في الفهارس الخارجية أو معرفة توافر المواد."]
  }
},
en: {
  ui:{
    brand:"National Library of Kuwait",brandSub:"A nation's memory · A world of knowledge",home:"Home",services:"Services",collections:"Collections",about:"About",
    disclaimer:"Independent, unofficial prototype. Government transactions are not processed here.",language:"Language",back:"Explore all services",overview:"Understanding this service",
    overviewIntro:"Explore a clear guide to this topic and discover connected knowledge pathways within the redesigned website.",more:"Key information",
    noteTitle:"Prototype limitations",note:"This is informational prototype content. The real government catalog, subscriptions, publishing systems and reservation services are not connected, and no applications can be submitted here.",
    how:"How to use this page",howIntro:"Navigation stays within this redesigned website. Official transactions require approved systems integration.",
    step1:"Read the service description and key details.",step2:"Explore related pages without leaving this website.",step3:"Official transactions can only be enabled after authorized integration.",
    aside:"More pathways",related:"You may also like",moreLink:"View page",all:"All pages",footer:"Independent design prototype; not an official government service.",up:"Back to top ↑",
    status:"Information guide",noticeDigital:"The official library describes its digital library as still under development. This prototype provides no digitized heritage files to view or download."
  },
  topics:{
    catalog:["Library catalog","Discover the purpose of the library catalog; live holdings and availability are not connected.",
      "Catalogs help locate titles, authors, subjects and bibliographic information.",
      "Future authorized integration could support searches by title, author, subject and classification.",
      "This prototype cannot confirm book availability, location or lending eligibility."],
    databases:["Research databases","Learn about the academic research resources listed by the library.",
      "The official website describes resources including EBSCO Academic Search Complete and the Arabic database Maarefa.",
      "Other featured resources include Arabic collections, historical books and multidisciplinary references.",
      "Full text and subscription access are not provided by this prototype."],
    bibliography:["National bibliography","Explore how Kuwait's intellectual and cultural output is recorded.",
      "The section documents and classifies works published within Kuwait.",
      "Its work includes annual deposit bulletins, indexes, publications and specialized bibliographies.",
      "Digital copies and complete issue indexes require licensed content and verified sources."],
    digital:["Digital library","An initiative to preserve and eventually share selected historical and heritage collections online.",
      "The planned collections focus on rare items and books connected to Kuwait's memory.",
      "The official source identifies the digital library project as under development.",
      "This preview does not claim to offer digitized manuscripts or licensed downloads."],
    copyright:["Copyright administration","An introduction to authors' rights and related intellectual-property services.",
      "Copyright administration covers matters associated with depositing and protecting creative works.",
      "The official website references Kuwait's Law No. 75 of 2019 on copyright and related rights.",
      "No work is registered here and this summary is not legal advice."],
    isbn:["International Standard Book Number (ISBN)","Information about ISBN assignment for books published in Kuwait.",
      "The library identifies itself as the local ISBN agency for books published in Kuwait.",
      "The official service mentions related book deposit and ISBN application forms.",
      "This prototype cannot issue an ISBN or receive publisher details."],
    deposit:["Legal deposit","Understand deposit of books and other works at the National Library of Kuwait.",
      "The copyright department oversees processes related to depositing creative works.",
      "The official website describes deposit forms and a combined deposit/ISBN request form.",
      "Required documents or charges, if any, need official confirmation before submitting an application."],
    rooms:["Rooms and theatre","Learn about the library's cultural and training facilities.",
      "The library lists a theatre and two training rooms with audiovisual facilities.",
      "The stated use cases include non-profit cultural activities, conferences and workshops.",
      "Real-time room availability and confirmed booking are not available here."],
    about:["About the National Library","An institution devoted to preserving Kuwaiti cultural and intellectual heritage.",
      "The library was established under Amiri Decree No. 52 of 1994.",
      "Its remit includes collecting, documenting, classifying and preserving national works.",
      "New institutional claims should be reviewed by the competent authority."],
    services:["Service directory","An integrated overview of the informational services in this prototype.",
      "Officially listed services include reference research, catalog access, databases, deposit and ISBN.",
      "Other listed services include scanning, copying and booking of cultural venues.",
      "Explore the internal guides; actual government applications are not enabled."],
    collections:["Collections and resources","Explore national bibliography, digital preservation and research resources.",
      "Learn about bibliographic records of the country's intellectual output.",
      "Read about the digital heritage project and its planned collections.",
      "Explore academic databases without implying any subscription access."],
    portal:["Kuwait libraries portal","A proposed information gateway connecting library resources across Kuwait.",
      "The original site references a Kuwait libraries portal.",
      "Future versions could provide verified locations and links to participating catalogs.",
      "No unified live catalog or inter-library search is connected."],
    theses:["Theses and dissertations","Explore the concept of a postgraduate research collections directory.",
      "The original library site lists a section for master's and doctoral theses.",
      "An approved catalog could filter by university, discipline, author and year.",
      "No unauthorized academic documents have been copied into this prototype."],
    public:["Public libraries catalog","A proposed guide to Kuwait's public-library catalog services.",
      "The original site features a public libraries catalog entry.",
      "A future guide could present public library locations, hours and holdings.",
      "Live public library inventory is not connected to this prototype."]
  }
},
fr: {
  ui:{
    brand:"Bibliothèque nationale du Koweït",brandSub:"Mémoire nationale · Horizon du savoir",home:"Accueil",services:"Services",collections:"Collections",about:"À propos",
    disclaimer:"Prototype indépendant non officiel : aucune démarche administrative ici.",language:"Langue",back:"Tous les services",overview:"Présentation",
    overviewIntro:"Découvrez cette rubrique et ses ressources liées directement dans le nouveau site.",more:"Informations essentielles",
    noteTitle:"Limites du prototype",note:"Cette page est informative. Le catalogue public, les abonnements, les demandes et les réservations officielles ne sont pas connectés.",
    how:"Comment utiliser cette page",howIntro:"Toutes les pages se consultent ici. Les démarches officielles nécessitent une intégration autorisée.",
    step1:"Consultez les informations disponibles.",step2:"Parcourez les rubriques associées sans quitter le site.",step3:"Les démarches seront possibles après une intégration officielle.",
    aside:"Autres rubriques",related:"À découvrir aussi",moreLink:"Voir la rubrique",all:"Toutes les rubriques",footer:"Concept indépendant, non gouvernemental.",up:"Retour en haut ↑",
    status:"Guide informatif",noticeDigital:"Le projet de bibliothèque numérique est encore en développement selon la source officielle. Aucun fichier patrimonial n'est hébergé ici."
  },
  topics:{
    catalog:["Catalogue","Présentation du catalogue, sans recherche dans les collections réelles.",
      "Un catalogue permet de trouver des titres, des auteurs et des notices bibliographiques.",
      "Une intégration autorisée pourrait permettre la recherche par titre, auteur ou sujet.",
      "La disponibilité et le prêt des livres ne sont pas consultables ici."],
    databases:["Bases de données","Présentation des sources de recherche mentionnées par la bibliothèque.",
      "Le site officiel cite EBSCO Academic Search Complete et la base arabe Maarefa.",
      "Les ressources couvrent plusieurs disciplines et des collections historiques.",
      "Les abonnements et les textes intégraux ne sont pas accessibles ici."],
    bibliography:["Bibliographie nationale","Inventaire de la production intellectuelle et culturelle publiée au Koweït.",
      "La bibliothèque rassemble et classe les publications nationales.",
      "Elle publie des bulletins de dépôt, des index et des bibliographies spécialisées.",
      "Les documents originaux exigent des sources vérifiées et des droits adaptés."],
    digital:["Bibliothèque numérique","Projet de préservation et de diffusion numérique du patrimoine.",
      "Le projet concerne des documents rares liés à l'histoire du Koweït.",
      "La bibliothèque indique que le projet est toujours en développement.",
      "Aucun manuscrit ou livre numérisé n'est disponible sur cette démo."],
    copyright:["Droit d'auteur","Informations générales sur les droits d'auteur et droits voisins.",
      "L'administration compétente traite notamment le dépôt des œuvres.",
      "Le site évoque la loi koweïtienne n° 75 de 2019.",
      "Ce guide ne permet ni enregistrement d'œuvres ni conseil juridique."],
    isbn:["ISBN","Informations sur l'attribution d'ISBN aux livres publiés au Koweït.",
      "La bibliothèque se présente comme l'agence locale d'attribution des ISBN.",
      "Elle mentionne des formulaires liés à l'ISBN et au dépôt des livres.",
      "Aucun numéro ISBN n'est délivré par ce prototype."],
    deposit:["Dépôt légal","Présentation du dépôt des livres et œuvres auprès de la bibliothèque.",
      "Le département du droit d'auteur intervient dans les procédures de dépôt.",
      "Le site officiel mentionne des formulaires de dépôt.",
      "Les pièces et éventuels frais doivent être confirmés auprès de l'administration."],
    rooms:["Salles et théâtre","Présentation des espaces d'événements culturels.",
      "La bibliothèque mentionne un théâtre et deux salles de formation.",
      "Ces espaces accueillent des activités culturelles non lucratives.",
      "Les disponibilités et réservations ne sont pas connectées."],
    about:["À propos de la bibliothèque","Préserver et valoriser le patrimoine culturel national du Koweït.",
      "La bibliothèque fut fondée par le décret n° 52 de 1994.",
      "Elle rassemble, classe et conserve la production intellectuelle nationale.",
      "Tout nouveau contenu institutionnel doit être validé."],
    services:["Guide des services","Découvrir les services sans quitter le nouveau site.",
      "Recherche, bases de données, dépôt et ISBN figurent parmi les services.",
      "Le site mentionne également la numérisation et les salles culturelles.",
      "Les demandes officielles ne sont pas disponibles dans ce prototype."],
    collections:["Collections","Bibliographie nationale, patrimoine numérique et ressources de recherche.",
      "Découvrez le patrimoine intellectuel publié au Koweït.",
      "Consultez les informations sur le projet de bibliothèque numérique.",
      "Explorez les bases universitaires sans accès aux abonnements."],
    portal:["Portail des bibliothèques","Projet de guide vers les bibliothèques du Koweït.",
      "Le site d'origine possède une entrée « Portail des bibliothèques ».",
      "Un futur système pourrait relier des catalogues autorisés.",
      "Aucun portail unifié n'est connecté pour l'instant."],
    theses:["Thèses universitaires","Rubrique de présentation des mémoires de recherche.",
      "Le site officiel comporte une rubrique de thèses de master et doctorat.",
      "Une intégration pourrait permettre des filtres par université ou domaine.",
      "Aucun document universitaire non autorisé n'est reproduit."],
    public:["Bibliothèques publiques","Présentation des catalogues de bibliothèques publiques.",
      "Le site initial signale un catalogue des bibliothèques publiques.",
      "Un futur annuaire pourrait indiquer les établissements et leurs collections.",
      "La disponibilité réelle des ouvrages n'est pas connectée."]
  }
},
ur: {
  ui:{
    brand:"کویت کی قومی لائبریری",brandSub:"قوم کی یادداشت · علم کا افق",home:"صفحۂ اول",services:"خدمات",collections:"مجموعے",about:"تعارف",
    disclaimer:"آزاد غیر سرکاری نمونہ؛ یہاں سرکاری درخواستیں جمع نہیں ہوتیں۔",language:"زبان",back:"تمام خدمات",overview:"خدمت کا تعارف",
    overviewIntro:"اس شعبے کی معلومات اور متعلقہ صفحات نئے پورٹل کے اندر ہی دیکھیں۔",more:"اہم معلومات",
    noteTitle:"نمونے کی حدود",note:"یہ معلوماتی نمونہ ہے۔ سرکاری فہرست، تحقیقی سبسکرپشن، درخواستیں اور ریزرویشن منسلک نہیں ہیں۔",
    how:"استعمال کا طریقہ",howIntro:"تمام معلومات اسی ویب سائٹ پر ہیں۔ سرکاری معاملات کے لیے مجاز رابطہ ضروری ہے۔",
    step1:"خدمت کی معلومات پڑھیں۔",step2:"اسی سائٹ میں متعلقہ صفحات کھولیں۔",step3:"سرکاری رابطے کے بعد ہی حقیقی درخواستیں ممکن ہوں گی۔",
    aside:"مزید موضوعات",related:"مزید دیکھیں",moreLink:"صفحہ کھولیں",all:"تمام صفحات",footer:"آزاد ڈیزائن نمونہ؛ سرکاری سروس نہیں۔",up:"اوپر واپس ↑",
    status:"معلوماتی رہنما",noticeDigital:"سرکاری معلومات کے مطابق ڈیجیٹل لائبریری ابھی تیار ہو رہی ہے؛ اس نمونے میں اصل تاریخی فائلیں موجود نہیں۔"
  },
  topics:{
    catalog:["کتب کی فہرست","کتابوں کی فہرست کا تعارف؛ اصل کتابوں کا ریکارڈ منسلک نہیں۔",
      "فہرست سے کتاب، مصنف اور موضوع کی شناخت کی جاتی ہے۔",
      "مستقبل میں مجاز رابطے سے عنوان اور مصنف کے مطابق تلاش ممکن ہوگی۔",
      "یہاں کتاب کی دستیابی یا ادھار لینے کی معلومات نہیں ملتی۔"],
    databases:["تحقیقی ڈیٹا بیس","قومی لائبریری کے بتائے ہوئے تحقیقی وسائل کا تعارف۔",
      "سرکاری ویب سائٹ پر EBSCO اور عربی Maarefa کا ذکر ہے۔",
      "وسائل میں علمی اور تاریخی موضوعات شامل ہیں۔",
      "مکمل متن اور سبسکرپشن اس نمونے سے دستیاب نہیں۔"],
    bibliography:["قومی کتابیات","کویت میں شائع شدہ علمی اور ادبی مواد کا ریکارڈ۔",
      "قومی اشاعتوں کو جمع اور درجہ بند کیا جاتا ہے۔",
      "سالانہ فہرستیں اور ایداع کے بلیٹن اس کا حصہ ہیں۔",
      "اصل دستاویزات کے لیے تصدیق شدہ ذرائع اور حقوق درکار ہیں۔"],
    digital:["ڈیجیٹل لائبریری","تاریخی اور ثقافتی مواد کو ڈیجیٹل طور پر محفوظ کرنے کا منصوبہ۔",
      "یہ منصوبہ کویت کی تاریخ سے متعلق نادر مواد پر مرکوز ہے۔",
      "سرکاری بیان کے مطابق منصوبہ ابھی زیرِ ترقی ہے۔",
      "اس نمونے میں اصل مخطوطات یا ڈاؤن لوڈ نہیں ہیں۔"],
    copyright:["حقوقِ مصنف","حقوقِ مصنف اور متعلقہ حقوق کی عمومی معلومات۔",
      "متعلقہ شعبہ تصانیف کے ایداع کے امور دیکھتا ہے۔",
      "سرکاری ویب سائٹ 2019 کے قانون نمبر 75 کا ذکر کرتی ہے۔",
      "یہاں تصنیف رجسٹر نہیں ہوتی، نہ یہ قانونی مشورہ ہے۔"],
    isbn:["ISBN نمبر","کویت میں شائع شدہ کتابوں کے عالمی نمبر کی معلومات۔",
      "قومی لائبریری مقامی ISBN ایجنسی ہے۔",
      "کتاب کے اندراج اور ISBN سے متعلق فارم سرکاری طور پر بیان کیے گئے ہیں۔",
      "یہ نمونہ ISBN نمبر جاری نہیں کرتا۔"],
    deposit:["قانونی ایداع","کتابیں اور تصانیف جمع کرانے کے طریقے کا تعارف۔",
      "حقوقِ مصنف کا شعبہ ایداع کی ذمہ داریاں انجام دیتا ہے۔",
      "سرکاری ویب سائٹ میں درخواست فارم کا ذکر ہے۔",
      "ضروری دستاویزات کی حتمی تصدیق متعلقہ ادارے سے کریں۔"],
    rooms:["ہال اور تھیٹر","ثقافتی پروگراموں کے لیے لائبریری کی سہولیات۔",
      "ایک تھیٹر اور دو تربیتی کمروں کا ذکر ہے۔",
      "یہ مقامات غیر منافع بخش ثقافتی سرگرمیوں کے لیے ہیں۔",
      "لائیو دستیابی یا بکنگ یہاں ممکن نہیں۔"],
    about:["قومی لائبریری کا تعارف","کویت کے علمی و ثقافتی ورثے کا تحفظ۔",
      "لائبریری 1994 کے فرمان نمبر 52 کے تحت قائم ہوئی۔",
      "قومی علمی مواد جمع اور محفوظ کرنا اس کے مقاصد میں شامل ہے۔",
      "اضافی ادارہ جاتی معلومات کی سرکاری توثیق ضروری ہے۔"],
    services:["خدمات کا رہنما","خدمات کی معلومات نئے پورٹل کے اندر۔",
      "تحقیق، فہرست، ڈیٹا بیس، ایداع اور ISBN بنیادی شعبے ہیں۔",
      "اسکیننگ اور ثقافتی ہال بھی خدمات میں شامل ہیں۔",
      "سرکاری درخواستوں کا نظام ابھی منسلک نہیں۔"],
    collections:["مجموعے اور وسائل","قومی کتابیات، ڈیجیٹل ورثہ اور تحقیق۔",
      "کویت میں شائع شدہ مواد کا تعارف حاصل کریں۔",
      "ڈیجیٹل لائبریری کے منصوبے کی تفصیل دیکھیں۔",
      "تحقیقی ڈیٹا بیس تک اصل رسائی شامل نہیں۔"],
    portal:["کویت لائبریری پورٹل","مختلف لائبریریوں کے لیے تجویز کردہ رہنما۔",
      "اصل ویب سائٹ پر لائبریری پورٹل کا ذکر ہے۔",
      "مجاز رابطے سے مشترکہ فہرست مستقبل میں ممکن ہے۔",
      "حقیقی مشترکہ تلاش ابھی منسلک نہیں۔"],
    theses:["جامعاتی مقالے","ماسٹرز اور پی ایچ ڈی تحقیق کا تعارف۔",
      "اصل سائٹ پر تحقیقی مقالوں کا شعبہ درج ہے۔",
      "مستقبل میں جامعہ اور موضوع کے حساب سے تلاش ممکن ہوگی۔",
      "غیر مجاز مقالے شامل نہیں کیے گئے۔"],
    public:["عوامی لائبریریاں","کویت کی عوامی لائبریریوں کی فہرست کا تعارف۔",
      "اصل سائٹ عوامی لائبریریوں کی فہرست دکھاتی ہے۔",
      "مستقبل میں مقام اور مجموعوں کی معلومات دی جا سکتی ہیں۔",
      "کتابوں کی اصل دستیابی یہاں نہیں ملتی۔"]
  }
},
hi: {
  ui:{
    brand:"कुवैत राष्ट्रीय पुस्तकालय",brandSub:"राष्ट्र की स्मृति · ज्ञान का विस्तार",home:"मुखपृष्ठ",services:"सेवाएँ",collections:"संग्रह",about:"परिचय",
    disclaimer:"स्वतंत्र गैर-सरकारी नमूना; यहाँ सरकारी आवेदन नहीं लिए जाते।",language:"भाषा",back:"सभी सेवाएँ",overview:"सेवा परिचय",
    overviewIntro:"इस विषय की जानकारी और संबंधित पेज इसी नई वेबसाइट पर पढ़ें।",more:"मुख्य जानकारी",
    noteTitle:"इस नमूने की सीमाएँ",note:"यह केवल जानकारी देने वाला नमूना है। सरकारी कैटलॉग, सदस्यता, आवेदन या बुकिंग की वास्तविक सेवाएँ जुड़ी नहीं हैं।",
    how:"इस पेज का उपयोग कैसे करें",howIntro:"सभी पेज इसी वेबसाइट के अंदर हैं। सरकारी काम के लिए अधिकृत एकीकरण आवश्यक है।",
    step1:"सेवा का विवरण पढ़ें।",step2:"संबंधित पेज इसी साइट में देखें।",step3:"आधिकारिक एकीकरण के बाद ही आवेदन संभव होंगे।",
    aside:"अन्य विषय",related:"यह भी देखें",moreLink:"पेज खोलें",all:"सभी पेज",footer:"स्वतंत्र डिज़ाइन नमूना; सरकारी सेवा नहीं।",up:"ऊपर जाएँ ↑",
    status:"जानकारी गाइड",noticeDigital:"आधिकारिक विवरण के अनुसार डिजिटल पुस्तकालय अभी विकासाधीन है। यहाँ वास्तविक डिजिटाइज़ की गई फाइलें नहीं हैं।"
  },
  topics:{
    catalog:["पुस्तकालय कैटलॉग","पुस्तकों की सूची की जानकारी; वास्तविक सूची जुड़ी नहीं है।",
      "कैटलॉग में शीर्षक, लेखक, विषय और ग्रंथ-सूची की जानकारी मिलती है।",
      "अधिकृत एकीकरण होने पर शीर्षक या लेखक से खोज संभव हो सकती है।",
      "यहाँ पुस्तक उपलब्धता या उधारी की जानकारी नहीं दी जाती।"],
    databases:["शोध डेटाबेस","पुस्तकालय द्वारा बताई गई शोध सामग्री का परिचय।",
      "आधिकारिक साइट EBSCO और अरबी Maarefa का उल्लेख करती है।",
      "इन संसाधनों में अनेक शैक्षणिक और ऐतिहासिक विषय हैं।",
      "सदस्यता या पूर्ण पाठ यहाँ उपलब्ध नहीं है।"],
    bibliography:["राष्ट्रीय ग्रंथसूची","कुवैत में प्रकाशित बौद्धिक और सांस्कृतिक सामग्री का अभिलेख।",
      "स्थानीय प्रकाशनों को एकत्र और वर्गीकृत किया जाता है।",
      "वार्षिक सूचियाँ, जमा बुलेटिन और विशेष ग्रंथसूचियाँ शामिल हैं।",
      "मूल दस्तावेज़ों के लिए सत्यापित स्रोत और अधिकार आवश्यक हैं।"],
    digital:["डिजिटल पुस्तकालय","ऐतिहासिक सामग्री के संरक्षण और डिजिटल उपलब्धता की परियोजना।",
      "यह योजना कुवैत के इतिहास से जुड़े दुर्लभ संग्रह पर केंद्रित है।",
      "आधिकारिक स्रोत इसे अभी विकासाधीन बताता है।",
      "इस नमूने में वास्तविक पांडुलिपियाँ या डाउनलोड नहीं हैं।"],
    copyright:["कॉपीराइट","लेखकों के अधिकार और संबंधित सेवाओं की जानकारी।",
      "संबंधित विभाग रचनाओं के जमा होने के मामलों को देखता है।",
      "आधिकारिक साइट 2019 के कानून संख्या 75 को संदर्भित करती है।",
      "यह पेज न पंजीकरण करता है और न कानूनी सलाह देता है।"],
    isbn:["ISBN सेवा","कुवैत में प्रकाशित पुस्तकों के अंतरराष्ट्रीय नंबर की जानकारी।",
      "पुस्तकालय स्थानीय ISBN एजेंसी के रूप में काम करता है।",
      "आधिकारिक साइट में आवेदन और जमा संबंधी फॉर्म हैं।",
      "यह नमूना ISBN जारी नहीं कर सकता।"],
    deposit:["कानूनी जमा","पुस्तकें और रचनाएँ जमा करने की सेवा का परिचय।",
      "कॉपीराइट विभाग जमा संबंधी प्रक्रियाएँ संभालता है।",
      "आधिकारिक वेबसाइट पर जमा के आवेदन का उल्लेख है।",
      "अंतिम दस्तावेज़ आवश्यकताओं की सरकारी पुष्टि जरूरी है।"],
    rooms:["हॉल और थिएटर","सांस्कृतिक आयोजनों के लिए पुस्तकालय की सुविधाएँ।",
      "पुस्तकालय में एक थिएटर और दो प्रशिक्षण कक्ष बताए गए हैं।",
      "इनका उपयोग गैर-लाभकारी सांस्कृतिक कार्यक्रमों में होता है।",
      "यहाँ लाइव उपलब्धता या बुकिंग नहीं है।"],
    about:["पुस्तकालय का परिचय","कुवैत की सांस्कृतिक और बौद्धिक विरासत का संरक्षण।",
      "पुस्तकालय की स्थापना 1994 के डिक्री संख्या 52 से हुई।",
      "राष्ट्रीय कृतियाँ एकत्र और संरक्षित करना इसके कार्यों में है।",
      "संस्थागत तथ्यों की आधिकारिक समीक्षा आवश्यक है।"],
    services:["सेवा निर्देशिका","नई वेबसाइट पर सेवाओं की जानकारी देखें।",
      "शोध, कैटलॉग, डेटाबेस, जमा और ISBN मुख्य सेवाएँ हैं।",
      "स्कैनिंग और सांस्कृतिक सभागार भी सूचीबद्ध हैं।",
      "वास्तविक सरकारी आवेदन अभी नहीं किए जा सकते।"],
    collections:["संग्रह और संसाधन","राष्ट्रीय ग्रंथसूची, डिजिटल विरासत और शोध सामग्री।",
      "कुवैत में प्रकाशित रचनाओं की जानकारी पाएँ।",
      "डिजिटल पुस्तकालय की योजना के बारे में पढ़ें।",
      "डेटाबेस की सदस्यता इस साइट पर उपलब्ध नहीं।"],
    portal:["कुवैत पुस्तकालय पोर्टल","अलग-अलग पुस्तकालयों के लिए प्रस्तावित गाइड।",
      "मूल वेबसाइट पर पुस्तकालय पोर्टल का विकल्प है।",
      "भविष्य में अनुमति से साझा कैटलॉग जोड़ा जा सकता है।",
      "अभी कोई लाइव साझा खोज नहीं है।"],
    theses:["शोध-प्रबंध","स्नातकोत्तर शोध सामग्री का परिचय।",
      "मूल साइट पर मास्टर्स और पीएचडी शोध के लिए अनुभाग है।",
      "भविष्य में विश्वविद्यालय व विषय से खोज संभव हो सकती है।",
      "बिना अनुमति के शोध दस्तावेज़ कॉपी नहीं किए गए।"],
    public:["सार्वजनिक पुस्तकालय","सार्वजनिक पुस्तकालयों की सूची का परिचय।",
      "मूल साइट सार्वजनिक पुस्तकालय कैटलॉग का उल्लेख करती है।",
      "भविष्य में पुस्तकालयों का पता और संग्रह जोड़ा जा सकता है।",
      "पुस्तकों की वास्तविक उपलब्धता यहाँ नहीं दिखती।"]
  }
},
zh: {
  ui:{
    brand:"科威特国家图书馆",brandSub:"国家记忆 · 知识视野",home:"首页",services:"服务",collections:"馆藏",about:"关于我们",
    disclaimer:"独立非官方设计原型，不办理政府业务。",language:"语言",back:"浏览全部服务",overview:"服务简介",
    overviewIntro:"在新版网站中查看本主题的信息及相关知识资源。",more:"关键信息",
    noteTitle:"原型的限制",note:"本页面仅供了解信息。实际政府目录、付费数据库、申请和预约系统均未连接。",
    how:"如何使用本页面",howIntro:"所有介绍页面均在本站内打开，实际办理业务须获得官方授权并完成系统集成。",
    step1:"阅读服务介绍和关键信息。",step2:"在本站浏览相关专题。",step3:"完成正式系统集成后才可能办理真实业务。",
    aside:"其他专题",related:"更多推荐",moreLink:"打开页面",all:"全部页面",footer:"独立体验设计原型，并非政府官方服务。",up:"返回顶部 ↑",
    status:"信息指南",noticeDigital:"官方说明数字图书馆项目仍在建设中，本原型未提供真正的历史文献文件或下载。"
  },
  topics:{
    catalog:["馆藏目录","了解馆藏目录的功能；真实馆藏数据尚未连接。",
      "目录通常用于检索书名、作者、主题及书目记录。",
      "未来经授权后，可按书名、作者及分类检索。",
      "本原型无法查询图书馆藏位置、是否可借或实时库存。"],
    databases:["研究数据库","了解图书馆列出的学术研究资源。",
      "官方网站提及 EBSCO Academic Search Complete 和阿拉伯语 Maarefa。",
      "所列资源覆盖历史、学术及多个专业领域。",
      "本网站无法提供订阅资源或全文访问。"],
    bibliography:["国家书目","介绍科威特出版作品的记录与整理工作。",
      "国家书目部门收集并整理本国出版作品。",
      "相关工作涵盖年度缴存公告、索引及专题书目。",
      "原始文件的发布需要核实来源和版权。"],
    digital:["数字图书馆","保存并逐步提供历史及文化遗产数字资源的计划。",
      "该项目关注与科威特历史相关的珍贵馆藏。",
      "官方页面注明数字图书馆仍处于建设阶段。",
      "本原型未提供真实数字手稿或下载。"],
    copyright:["版权管理","介绍作者权利及相关知识产权服务。",
      "有关部门处理作品缴存及版权管理事项。",
      "官方网站提及科威特2019年第75号法律。",
      "本页面不办理登记，也不构成法律建议。"],
    isbn:["ISBN 国际标准书号","介绍科威特出版图书的 ISBN 申请事项。",
      "图书馆是科威特的本地 ISBN 指定机构。",
      "官方资料列有图书缴存和 ISBN 相关表格。",
      "本原型不能发放 ISBN 编号。"],
    deposit:["法定缴存","了解向国家图书馆缴存图书和作品的事项。",
      "版权管理部门负责相关缴存程序。",
      "官方页面列有作品缴存申请资料。",
      "最终材料要求必须向主管机关确认。"],
    rooms:["活动厅与剧院","了解图书馆的文化活动设施。",
      "官方资料介绍一座剧院和两间培训室。",
      "适合非营利的文化讲座和培训活动。",
      "本原型无法查询实时可用场地或办理预约。"],
    about:["关于国家图书馆","致力于保存科威特国家文化和知识遗产。",
      "图书馆依据1994年第52号法令成立。",
      "收集、整理和保存国家文化作品是其重要职责。",
      "新增机构信息应由主管部门核实。"],
    services:["服务目录","在新版网站中查看图书馆服务的介绍。",
      "服务包括研究、目录、数据库、缴存和 ISBN。",
      "官方资料还提及扫描及文化场地服务。",
      "政府业务办理系统尚未接入。"],
    collections:["馆藏与资源","国家书目、数字遗产项目以及学术资源。",
      "了解科威特本国出版作品的记录。",
      "阅读数字图书馆建设项目的介绍。",
      "研究数据库的订阅权限不在本站提供。"],
    portal:["科威特图书馆门户","面向科威特各图书馆的规划性信息入口。",
      "原官方网站设有图书馆门户入口。",
      "未来可在获得授权后连接参与机构的目录。",
      "当前没有统一的实时检索功能。"],
    theses:["学位论文","研究生学位论文目录的介绍。",
      "原网站设有硕士和博士论文专题。",
      "未来可能支持按高校、学科和作者检索。",
      "本站未复制未经授权的学术文献。"],
    public:["公共图书馆目录","介绍科威特公共图书馆的目录服务。",
      "原网站设有公共图书馆目录入口。",
      "未来可提供经核实的图书馆位置与馆藏。",
      "本原型不提供实时库存查询。"]
  }
}
};

const store={
 get(key){try{return localStorage.getItem(key);}catch{return null;}},
 set(key,value){try{localStorage.setItem(key,value);}catch{}}
};
const param=new URLSearchParams(location.search);
let topic=Object.hasOwn(pages,param.get("topic"))?param.get("topic"):"services";
let lang=Object.hasOwn(localization,param.get("lang"))?param.get("lang"):
         Object.hasOwn(localization,store.get("nlk-lang"))?store.get("nlk-lang"):"ar";
let fontIndex=Number(store.get("nlk-font")||0);
if(!Number.isInteger(fontIndex)||fontIndex<0||fontIndex>2)fontIndex=0;
const scales=[1,1.12,1.24];
const $=id=>document.getElementById(id);
const isRtl=code=>code==="ar"||code==="ur";
const href=(topicId)=>"./page.html?topic="+encodeURIComponent(topicId)+"&lang="+encodeURIComponent(lang);
function node(tag,className,text){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
}
function textTo(id,value){$(id).textContent=value;}
function link(id,topicId){$(id).href=href(topicId);}
function setHrefLanguages(){
  document.querySelectorAll('a[href^="./index.html"]').forEach(a=>a.href="./index.html?lang="+encodeURIComponent(lang));
}
function card(slug){
  const item=pages[slug], t=localization[lang].topics[slug], u=localization[lang].ui;
  const a=node("a","service-card related-card");
  a.href=href(slug);
  a.setAttribute("aria-label",t[0]+" — "+u.moreLink);
  a.append(node("span","service-icon",item.icon),node("h3","",t[0]),node("p","",t[1]));
  const bottom=node("span","service-bottom");bottom.append(node("span","",u.moreLink),node("span","","↗"));
  a.append(bottom);return a;
}
function render(){
  const u=localization[lang].ui,t=localization[lang].topics[topic],page=pages[topic];
  document.documentElement.lang=lang;
  document.documentElement.dir=isRtl(lang)?"rtl":"ltr";
  document.title=t[0]+" | "+u.brand;
  $("language").value=lang;
  textTo("skip",lang==="ar"?"تجاوز إلى المحتوى":u.home);
  textTo("prototype",u.disclaimer);
  textTo("note-home",u.home);
  textTo("brand",u.brand);textTo("footer-brand",u.brand);
  textTo("brand-sub",u.brandSub);
  ["nav-home","crumb-home","home-action","footer-home"].forEach(id=>textTo(id,u.home));
  ["nav-services","footer-services"].forEach(id=>textTo(id,u.services));
  textTo("nav-collections",u.collections);textTo("nav-about",u.about);
  textTo("lang-label",u.language);
  textTo("page-title",t[0]);textTo("crumb-current",t[0]);
  const groupTitle=page.group==="authors"||page.group==="visitors"||page.group==="research"?u.services:
                   topic==="about"?u.about:topic==="collections"?u.collections:u.services;
  textTo("crumb-section",groupTitle);textTo("eyebrow",groupTitle);
  textTo("page-summary",t[1]);textTo("page-symbol",page.icon);
  textTo("back-text",u.back);
  textTo("details-kicker",u.status);textTo("overview-title",u.overview);
  textTo("overview-desc",u.overviewIntro);
  const list=$("detail-points"),frag=document.createDocumentFragment();
  t.slice(2,5).forEach((value,i)=>{
    const item=node("div","detail-point");
    item.append(node("span","detail-number",String(i+1).padStart(2,"0")),node("p","",value));
    frag.append(item);
  });
  list.replaceChildren(frag);
  textTo("notice-title",u.noteTitle);textTo("notice-text",topic==="digital"?u.noticeDigital:u.note);
  textTo("how-title",u.how);textTo("how-text",u.howIntro);
  ["step1","step2","step3"].forEach((key,i)=>textTo("step-"+(i+1),u[key]));
  textTo("aside-kicker",u.more);textTo("aside-title",u.aside);
  textTo("alert-title",u.noteTitle);textTo("alert-text",u.note);
  textTo("related-kicker",u.status);textTo("related-title",u.related);
  textTo("all-link",u.all+" ↗");textTo("footer-note",u.footer);textTo("footer-up",u.up);
  link("nav-services","services");link("nav-collections","collections");link("nav-about","about");
  link("all-link","services");
  link("page-back",page.group==="general"?"services":"services");
  link("footer-services","services");
  const sidebar=$("aside-links"),sideFrag=document.createDocumentFragment();
  const groups=topic==="services" ? Object.keys(pages).filter(x=>!["services","collections","about"].includes(x)) :
    topic==="collections"?["bibliography","digital","databases","catalog","theses","public"]:
    [topic,...page.related].filter((x,i,a)=>a.indexOf(x)===i);
  groups.forEach(slug=>{
    const a=node("a","sidebar-link"+(slug===topic?" selected":""));
    a.href=href(slug); if(slug===topic)a.setAttribute("aria-current","page");
    a.append(node("span","sidebar-symbol",pages[slug].icon),node("span","",localization[lang].topics[slug][0]),node("span","sidebar-arr","↗"));
    sideFrag.append(a);
  });
  sidebar.replaceChildren(sideFrag);
  const allCards=(topic==="services"?Object.keys(pages).filter(x=>!["services","about","collections"].includes(x)):
                topic==="collections"?["bibliography","digital","databases","catalog","theses","public"]:
                page.related);
  const cardFrag=document.createDocumentFragment();
  allCards.forEach(x=>cardFrag.append(card(x)));
  $("related-cards").replaceChildren(cardFrag);
  setHrefLanguages();
  const url=new URL(location.href);
  url.searchParams.set("topic",topic);url.searchParams.set("lang",lang);
  history.replaceState(null,"",url.pathname+url.search+url.hash);
}
$("language").addEventListener("change",e=>{
  if(!Object.hasOwn(localization,e.target.value))return;
  lang=e.target.value;store.set("nlk-lang",lang);render();
});
$("font-btn").addEventListener("click",()=>{
  fontIndex=(fontIndex+1)%scales.length;
  document.documentElement.style.setProperty("--type-scale",String(scales[fontIndex]));
  store.set("nlk-font",String(fontIndex));
});
$("contrast-btn").addEventListener("click",()=>{
  const enabled=document.documentElement.classList.toggle("high-contrast");
  $("contrast-btn").setAttribute("aria-pressed",String(enabled));
  store.set("nlk-contrast",enabled?"1":"0");
});
$("menu-btn").addEventListener("click",()=>{
  const active=$("primary-nav").classList.toggle("open");
  $("menu-btn").setAttribute("aria-expanded",String(active));
});
$("primary-nav").querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
  $("primary-nav").classList.remove("open");
  $("menu-btn").setAttribute("aria-expanded","false");
}));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){$("primary-nav").classList.remove("open");$("menu-btn").setAttribute("aria-expanded","false");}
});
document.documentElement.classList.toggle("high-contrast",store.get("nlk-contrast")==="1");
$("contrast-btn").setAttribute("aria-pressed",String(store.get("nlk-contrast")==="1"));
document.documentElement.style.setProperty("--type-scale",String(scales[fontIndex]));
render();
