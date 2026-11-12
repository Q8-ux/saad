"use strict";

// Independent, non-official prototype. No personal data is sent to this project.
// Search filters the LOCAL SERVICE DIRECTORY, not the library's holdings catalog.
const localPage = slug => "./page.html?topic=" + encodeURIComponent(slug);
const serviceData = [
  {id:"catalog",category:"research",icon:"⌕",url:localPage("catalog"),tag:"catalog books library فهرس كتاب"},
  {id:"databases",category:"research",icon:"▦",url:localPage("databases"),tag:"research databases academic ebsco معرفة"},
  {id:"bibliography",category:"research",icon:"▤",url:localPage("bibliography"),tag:"bibliography national books publication"},
  {id:"digital",category:"research",icon:"◇",url:localPage("digital"),tag:"digital archive collections heritage تراث"},
  {id:"copyright",category:"authors",icon:"©",url:localPage("copyright"),tag:"copyright authors intellectual property حق المؤلف"},
  {id:"isbn",category:"authors",icon:"#",url:localPage("isbn"),tag:"isbn publishing number الترقيم الدولي"},
  {id:"deposit",category:"authors",icon:"▣",url:localPage("deposit"),tag:"legal deposit publication إيداع"},
  {id:"rooms",category:"visitors",icon:"⌂",url:localPage("rooms"),tag:"rooms events hall theatre booking قاعات"}
];
const translations = {
  ar:{
    skip:"تجاوز إلى المحتوى",disclaimer:"نموذج تطويري مستقل غير رسمي، لا يستقبل أي معاملات حكومية.",official:"الموقع الرسمي",brand:"مكتبة الكويت الوطنية",brandSub:"ذاكرة وطن · أفق معرفة",navHome:"الرئيسية",navServices:"الخدمات",navCollections:"المجموعات",navAbout:"عن المكتبة",language:"اللغة",
    heroEyebrow:"بوابتك إلى المعرفة والتراث الكويتي",heroTitle1:"معرفة تحفظ الماضي",heroTitle2:"وتلهم المستقبل",heroDesc:"اكتشف خدمات البحث والمصادر المعرفية والببليوجرافيا الوطنية وحقوق المؤلف عبر تجربة مصممة للباحث والقارئ.",explore:"استكشف الخدمات",goOfficial:"انتقل للموقع الرسمي",heroTag1:"التراث الوطني",heroTag2:"مصادر البحث",heroTag3:"حقوق المؤلف",artCaption:"إرث معرفي يتجدد",
    servicesKicker:"خدمات المكتبة",servicesTitle:"كل ما يحتاجه فِكرك من معلومات",servicesDesc:"ابحث داخل دليل الخدمات، ثم انتقل إلى الصفحة الرسمية لإتمام الخطوة التالية.",allOfficial:"دليل الخدمات الرسمي",searchLabel:"البحث في الخدمات",searchPlaceholder:"ابحث عن خدمة، مثل: ISBN أو قواعد البيانات",voiceTitle:"البحث الصوتي",filterAll:"جميع الخدمات",filterResearch:"البحث والمصادر",filterAuthors:"المؤلفون والنشر",filterVisitors:"الزوار والأنشطة",emptyTitle:"لم نجد خدمات مطابقة",emptyDesc:"جرّب كلمة بحث مختلفة أو اختر جميع الخدمات.",
    collectionsKicker:"مجموعات ومعرفة",collectionsTitle:"مسارات إلى ذاكرة الكويت",collectionsDesc:"مصادر مرجعية منشورة في موقع المكتبة الرسمي.",collection1:"الببليوجرافيا الوطنية",collection1Desc:"سجل الإنتاج الفكري المنشور في الكويت.",collection2:"المكتبة الرقمية",collection2Desc:"مشروع حفظ المقتنيات التراثية وإتاحتها رقمياً، قيد التطوير.",collection3:"قواعد البيانات",collection3Desc:"مصادر أكاديمية وأدوات للبحث العلمي.",
    aboutKicker:"عن المكتبة",aboutTitle:"المعرفة مسؤولية وطنية",aboutDesc:"تأسست مكتبة الكويت الوطنية بموجب المرسوم رقم 52 لسنة 1994 بهدف جمع وتنظيم وحفظ التراث والإنتاج الفكري الوطني، وتعزيز البحث والتعاون المعرفي.",aboutPoint1:"حفظ الذاكرة الثقافية",aboutPoint2:"تمكين الباحثين والقراء",aboutPoint3:"دعم حقوق المبدعين",aboutLink:"التأسيس والأهداف الرسمية",ctaKicker:"ابدأ رحلتك",ctaTitle:"إرث الكويت المعرفي بين يديك",ctaDesc:"الخدمات الرسمية متاحة من خلال موقع مكتبة الكويت الوطنية.",ctaButton:"زيارة المكتبة الرسمية",footerNote:"نموذج أولي مستقل لتصميم تجربة المستخدم، وليس خدمة حكومية رسمية.",backTop:"العودة للأعلى ↑",
    linkLabel:"الاطلاع على الخدمة",statusMatches:"{n} خدمة في دليل الخدمات",statusNoMatches:"لا توجد نتائج مطابقة",voiceUnsupported:"البحث الصوتي غير مدعوم في هذا المتصفح.",voiceListening:"جارٍ الاستماع... تحدث الآن.",voiceDenied:"تعذر استخدام الميكروفون؛ يمكنك البحث بالكتابة.",fontTitle:"تكبير حجم النص",contrastTitle:"تبديل التباين المرتفع",menuTitle:"فتح القائمة",
    service:{
      catalog:["فهرس المكتبة","الدخول إلى الموقع الرسمي للوصول إلى فهرس الكتب والمقتنيات."],
      databases:["قواعد البيانات البحثية","الوصول إلى مصادر أكاديمية عربية ودولية متخصصة."],
      bibliography:["الببليوجرافيا الوطنية","تصفح توثيق الإنتاج الفكري والكتب المنشورة في الكويت."],
      digital:["المكتبة الرقمية","التعرف على مشروع رقمنة وحفظ المواد التراثية، وهو قيد التطوير."],
      copyright:["حق المؤلف","معلومات عن حقوق المؤلف والحقوق المجاورة والملكية الفكرية."],
      isbn:["الرقم الدولي للكتاب ISBN","التعرف على متطلبات طلب الرقم الدولي المعياري للكتاب."],
      deposit:["الإيداع القانوني","الاطلاع على معلومات إيداع المصنفات والوثائق المطلوبة."],
      rooms:["القاعات والمسرح","معرفة شروط وإجراءات حجز قاعات المكتبة والمسرح."]
    }
  },
  en:{
    skip:"Skip to content",disclaimer:"Independent, unofficial design prototype. No government transactions are processed here.",official:"Official website",brand:"National Library of Kuwait",brandSub:"A nation's memory · A world of knowledge",navHome:"Home",navServices:"Services",navCollections:"Collections",navAbout:"About",language:"Language",
    heroEyebrow:"Your gateway to Kuwait's knowledge and heritage",heroTitle1:"Knowledge preserves the past",heroTitle2:"and inspires the future",heroDesc:"Explore research services, information resources, the national bibliography and copyright guidance in a reader-friendly experience.",explore:"Explore services",goOfficial:"Visit official website",heroTag1:"National heritage",heroTag2:"Research resources",heroTag3:"Copyright",artCaption:"Living cultural knowledge",
    servicesKicker:"Library services",servicesTitle:"Everything in one place",servicesDesc:"Search this local services guide, then visit the official page to continue.",allOfficial:"Official services guide",searchLabel:"Search services",searchPlaceholder:"Search services, e.g. ISBN or databases",voiceTitle:"Voice search",filterAll:"All services",filterResearch:"Research & resources",filterAuthors:"Authors & publishing",filterVisitors:"Visitors & events",emptyTitle:"No matching services",emptyDesc:"Try another keyword or select all services.",
    collectionsKicker:"Collections & knowledge",collectionsTitle:"Explore Kuwait's memory",collectionsDesc:"Reference resources published on the library's official website.",collection1:"National bibliography",collection1Desc:"A record of intellectual works published in Kuwait.",collection2:"Digital library",collection2Desc:"A heritage digitization initiative that remains under development.",collection3:"Research databases",collection3Desc:"Academic resources and research tools.",
    aboutKicker:"About the library",aboutTitle:"Knowledge is a national responsibility",aboutDesc:"Established under Decree No. 52 of 1994, the National Library of Kuwait collects, organizes and preserves national cultural and intellectual heritage while promoting research and cooperation.",aboutPoint1:"Preserving cultural memory",aboutPoint2:"Empowering researchers and readers",aboutPoint3:"Supporting creators' rights",aboutLink:"Official history and objectives",ctaKicker:"Begin your journey",ctaTitle:"Kuwait's knowledge heritage awaits",ctaDesc:"Access official services on the National Library of Kuwait website.",ctaButton:"Visit official library",footerNote:"Independent user-experience concept; not an official government service.",backTop:"Back to top ↑",
    linkLabel:"View official service",statusMatches:"{n} services in this guide",statusNoMatches:"No matching results",voiceUnsupported:"Voice search is not supported in this browser.",voiceListening:"Listening… please speak.",voiceDenied:"Microphone unavailable. You can search by typing.",fontTitle:"Increase text size",contrastTitle:"Toggle high contrast",menuTitle:"Open menu",
    service:{
      catalog:["Library catalog","Open the official website to access the library's catalog and holdings."],
      databases:["Research databases","Discover specialized Arabic and international academic resources."],
      bibliography:["National bibliography","Browse records documenting books and intellectual output published in Kuwait."],
      digital:["Digital library","Explore the heritage digitization project, currently under development."],
      copyright:["Copyright information","Guidance on copyright, related rights and intellectual property."],
      isbn:["ISBN service","Read about applying for an International Standard Book Number."],
      deposit:["Legal deposit","Information on depositing works and the required documents."],
      rooms:["Rooms and theatre","Review procedures and conditions for venue reservation."]
    }
  },
  fr:{
    skip:"Aller au contenu",disclaimer:"Prototype indépendant et non officiel. Aucune démarche administrative n'est effectuée ici.",official:"Site officiel",brand:"Bibliothèque nationale du Koweït",brandSub:"Mémoire nationale · Horizon du savoir",navHome:"Accueil",navServices:"Services",navCollections:"Collections",navAbout:"À propos",language:"Langue",
    heroEyebrow:"Votre porte d'entrée vers le patrimoine du Koweït",heroTitle1:"Un savoir qui préserve le passé",heroTitle2:"et inspire l'avenir",heroDesc:"Découvrez les ressources de recherche, la bibliographie nationale et les informations sur le droit d'auteur dans une expérience intuitive.",explore:"Explorer les services",goOfficial:"Visiter le site officiel",heroTag1:"Patrimoine national",heroTag2:"Recherche",heroTag3:"Droit d'auteur",artCaption:"Un patrimoine vivant",
    servicesKicker:"Services de la bibliothèque",servicesTitle:"Tout au même endroit",servicesDesc:"Recherchez dans ce guide local, puis accédez à la page officielle.",allOfficial:"Guide officiel des services",searchLabel:"Rechercher des services",searchPlaceholder:"Ex. : ISBN, bases de données",voiceTitle:"Recherche vocale",filterAll:"Tous les services",filterResearch:"Recherche et ressources",filterAuthors:"Auteurs et édition",filterVisitors:"Visiteurs et événements",emptyTitle:"Aucun service trouvé",emptyDesc:"Essayez un autre mot-clé ou affichez tous les services.",
    collectionsKicker:"Collections et savoir",collectionsTitle:"Explorer la mémoire du Koweït",collectionsDesc:"Ressources référencées sur le site officiel.",collection1:"Bibliographie nationale",collection1Desc:"Inventaire des œuvres publiées au Koweït.",collection2:"Bibliothèque numérique",collection2Desc:"Projet de numérisation patrimoniale encore en développement.",collection3:"Bases de données",collection3Desc:"Ressources académiques et outils de recherche.",
    aboutKicker:"À propos",aboutTitle:"Le savoir, une mission nationale",aboutDesc:"Créée par le décret n° 52 de 1994, la Bibliothèque nationale du Koweït collecte, organise et préserve le patrimoine intellectuel et culturel national.",aboutPoint1:"Préserver la mémoire culturelle",aboutPoint2:"Accompagner chercheurs et lecteurs",aboutPoint3:"Soutenir les droits des créateurs",aboutLink:"Historique et objectifs officiels",ctaKicker:"Votre parcours commence ici",ctaTitle:"Découvrez le patrimoine intellectuel du Koweït",ctaDesc:"Les services officiels sont disponibles sur le site de la bibliothèque.",ctaButton:"Accéder au site officiel",footerNote:"Prototype indépendant d'expérience utilisateur, non gouvernemental.",backTop:"Retour en haut ↑",
    linkLabel:"Voir le service officiel",statusMatches:"{n} services dans ce guide",statusNoMatches:"Aucun résultat",voiceUnsupported:"La recherche vocale n'est pas prise en charge.",voiceListening:"Écoute en cours… parlez.",voiceDenied:"Microphone indisponible. Saisissez votre recherche.",fontTitle:"Agrandir le texte",contrastTitle:"Contraste élevé",menuTitle:"Ouvrir le menu",
    service:{
      catalog:["Catalogue","Accédez au site officiel pour consulter le catalogue."],
      databases:["Bases de données","Explorez les ressources académiques arabes et internationales."],
      bibliography:["Bibliographie nationale","Consultez les publications et la production intellectuelle du Koweït."],
      digital:["Bibliothèque numérique","Découvrez le projet patrimonial en cours de développement."],
      copyright:["Droit d'auteur","Informations sur les droits d'auteur et la propriété intellectuelle."],
      isbn:["Numéro ISBN","Renseignements sur l'attribution d'un ISBN."],
      deposit:["Dépôt légal","Informations sur le dépôt des œuvres et les pièces requises."],
      rooms:["Salles et théâtre","Conditions de réservation des espaces de la bibliothèque."]
    }
  },
  ur:{
    skip:"مواد پر جائیں",disclaimer:"یہ ایک آزاد اور غیر سرکاری ڈیزائن نمونہ ہے۔ یہاں سرکاری معاملات انجام نہیں دیے جاتے۔",official:"سرکاری ویب سائٹ",brand:"کویت کی قومی لائبریری",brandSub:"قوم کی یادداشت · علم کا افق",navHome:"صفحۂ اول",navServices:"خدمات",navCollections:"مجموعے",navAbout:"تعارف",language:"زبان",
    heroEyebrow:"کویت کے علم اور ورثے تک آپ کی رسائی",heroTitle1:"علم ماضی کو محفوظ رکھتا ہے",heroTitle2:"اور مستقبل کو روشن کرتا ہے",heroDesc:"تحقیقی خدمات، علمی وسائل، قومی کتابیات اور حقوقِ مصنف کی معلومات آسان انداز میں دریافت کریں۔",explore:"خدمات دیکھیں",goOfficial:"سرکاری ویب سائٹ",heroTag1:"قومی ورثہ",heroTag2:"تحقیقی وسائل",heroTag3:"حقوقِ مصنف",artCaption:"زندہ علمی ورثہ",
    servicesKicker:"لائبریری کی خدمات",servicesTitle:"تمام ضروری معلومات ایک جگہ",servicesDesc:"اس رہنما میں خدمات تلاش کریں اور مزید معلومات کے لیے سرکاری صفحہ کھولیں۔",allOfficial:"سرکاری خدمات کا رہنما",searchLabel:"خدمات تلاش کریں",searchPlaceholder:"مثلاً ISBN یا ڈیٹا بیس تلاش کریں",voiceTitle:"آواز سے تلاش",filterAll:"تمام خدمات",filterResearch:"تحقیق اور وسائل",filterAuthors:"مصنفین اور اشاعت",filterVisitors:"زائرین اور تقریبات",emptyTitle:"کوئی متعلقہ خدمت نہیں ملی",emptyDesc:"دوسرا لفظ آزمائیں یا تمام خدمات منتخب کریں۔",
    collectionsKicker:"مجموعے اور علم",collectionsTitle:"کویت کی یادداشت دریافت کریں",collectionsDesc:"سرکاری ویب سائٹ پر موجود معلوماتی وسائل۔",collection1:"قومی کتابیات",collection1Desc:"کویت میں شائع ہونے والے علمی کاموں کا ریکارڈ۔",collection2:"ڈیجیٹل لائبریری",collection2Desc:"ورثے کی ڈیجیٹل حفاظت کا منصوبہ ابھی زیرِ ترقی ہے۔",collection3:"تحقیقی ڈیٹا بیس",collection3Desc:"تعلیمی اور تحقیقی وسائل۔",
    aboutKicker:"لائبریری کے بارے میں",aboutTitle:"علم ایک قومی ذمہ داری ہے",aboutDesc:"کویت کی قومی لائبریری 1994 کے فرمان نمبر 52 کے تحت قائم ہوئی تاکہ قومی علمی و ثقافتی ورثے کو جمع، منظم اور محفوظ کیا جائے۔",aboutPoint1:"ثقافتی یادداشت کا تحفظ",aboutPoint2:"محققین اور قارئین کی معاونت",aboutPoint3:"تخلیق کاروں کے حقوق کا تحفظ",aboutLink:"سرکاری تاریخ اور مقاصد",ctaKicker:"اپنا سفر شروع کریں",ctaTitle:"کویت کا علمی ورثہ دریافت کریں",ctaDesc:"سرکاری خدمات قومی لائبریری کی ویب سائٹ پر دستیاب ہیں۔",ctaButton:"سرکاری لائبریری دیکھیں",footerNote:"تجرباتی غیر سرکاری ڈیزائن؛ سرکاری خدمت نہیں۔",backTop:"اوپر واپس ↑",
    linkLabel:"سرکاری خدمت دیکھیں",statusMatches:"اس رہنما میں {n} خدمات",statusNoMatches:"کوئی نتیجہ نہیں",voiceUnsupported:"اس براؤزر میں صوتی تلاش دستیاب نہیں۔",voiceListening:"سن رہا ہے… بولیں۔",voiceDenied:"مائیکروفون دستیاب نہیں؛ لکھ کر تلاش کریں۔",fontTitle:"متن بڑا کریں",contrastTitle:"زیادہ تضاد",menuTitle:"مینو کھولیں",
    service:{
      catalog:["لائبریری کی فہرست","کتابوں کی فہرست کے لیے سرکاری ویب سائٹ کھولیں۔"],
      databases:["تحقیقی ڈیٹا بیس","عربی اور بین الاقوامی تحقیقی وسائل دیکھیں۔"],
      bibliography:["قومی کتابیات","کویت کی مطبوعات کے ریکارڈ دیکھیں۔"],
      digital:["ڈیجیٹل لائبریری","زیرِ ترقی ڈیجیٹل ورثہ منصوبے کی معلومات۔"],
      copyright:["حقوقِ مصنف","حقوقِ مصنف اور فکری ملکیت کی رہنمائی۔"],
      isbn:["ISBN نمبر","کتاب کے بین الاقوامی نمبر کے حصول کی معلومات۔"],
      deposit:["قانونی جمع","تصانیف جمع کرانے کی شرائط اور دستاویزات۔"],
      rooms:["ہال اور تھیٹر","ہال کی بکنگ کے طریقے اور شرائط۔"]
    }
  },
  hi:{
    skip:"मुख्य सामग्री पर जाएँ",disclaimer:"यह एक स्वतंत्र, गैर-सरकारी डिज़ाइन नमूना है। यहाँ सरकारी लेन-देन नहीं होते।",official:"आधिकारिक वेबसाइट",brand:"कुवैत राष्ट्रीय पुस्तकालय",brandSub:"राष्ट्र की स्मृति · ज्ञान का विस्तार",navHome:"मुखपृष्ठ",navServices:"सेवाएँ",navCollections:"संग्रह",navAbout:"परिचय",language:"भाषा",
    heroEyebrow:"कुवैत के ज्ञान और विरासत का प्रवेशद्वार",heroTitle1:"ज्ञान अतीत को सँजोता है",heroTitle2:"और भविष्य को प्रेरित करता है",heroDesc:"शोध सेवाओं, जानकारी के स्रोतों, राष्ट्रीय ग्रंथसूची और कॉपीराइट संबंधी जानकारी तक आसानी से पहुँचें।",explore:"सेवाएँ देखें",goOfficial:"आधिकारिक वेबसाइट देखें",heroTag1:"राष्ट्रीय विरासत",heroTag2:"शोध संसाधन",heroTag3:"कॉपीराइट",artCaption:"जीवंत ज्ञान विरासत",
    servicesKicker:"पुस्तकालय सेवाएँ",servicesTitle:"सभी सेवाएँ एक स्थान पर",servicesDesc:"इस स्थानीय सेवा निर्देशिका में खोजें और आगे के लिए आधिकारिक पेज खोलें।",allOfficial:"आधिकारिक सेवा सूची",searchLabel:"सेवाएँ खोजें",searchPlaceholder:"जैसे ISBN या डेटाबेस खोजें",voiceTitle:"बोलकर खोजें",filterAll:"सभी सेवाएँ",filterResearch:"शोध और संसाधन",filterAuthors:"लेखक और प्रकाशन",filterVisitors:"आगंतुक और कार्यक्रम",emptyTitle:"कोई सेवा नहीं मिली",emptyDesc:"दूसरा शब्द आज़माएँ या सभी सेवाएँ चुनें।",
    collectionsKicker:"संग्रह और ज्ञान",collectionsTitle:"कुवैत की स्मृति से जुड़ें",collectionsDesc:"पुस्तकालय की आधिकारिक साइट पर उपलब्ध संसाधन।",collection1:"राष्ट्रीय ग्रंथसूची",collection1Desc:"कुवैत में प्रकाशित बौद्धिक कृतियों का अभिलेख।",collection2:"डिजिटल पुस्तकालय",collection2Desc:"विरासत के डिजिटलीकरण का प्रोजेक्ट अभी विकासाधीन है।",collection3:"शोध डेटाबेस",collection3Desc:"शैक्षणिक स्रोत और शोध उपकरण।",
    aboutKicker:"पुस्तकालय के बारे में",aboutTitle:"ज्ञान एक राष्ट्रीय उत्तरदायित्व है",aboutDesc:"कुवैत राष्ट्रीय पुस्तकालय की स्थापना 1994 के डिक्री संख्या 52 के तहत राष्ट्रीय बौद्धिक और सांस्कृतिक धरोहर को संग्रहीत एवं संरक्षित करने के लिए हुई।",aboutPoint1:"सांस्कृतिक स्मृति का संरक्षण",aboutPoint2:"शोधकर्ताओं और पाठकों की सहायता",aboutPoint3:"रचनाकारों के अधिकारों का समर्थन",aboutLink:"आधिकारिक इतिहास और उद्देश्य",ctaKicker:"यात्रा शुरू करें",ctaTitle:"कुवैत की ज्ञान विरासत खोजें",ctaDesc:"आधिकारिक सेवाएँ पुस्तकालय की वेबसाइट पर उपलब्ध हैं।",ctaButton:"आधिकारिक पुस्तकालय खोलें",footerNote:"स्वतंत्र उपयोगकर्ता-अनुभव नमूना; सरकारी सेवा नहीं।",backTop:"ऊपर जाएँ ↑",
    linkLabel:"आधिकारिक सेवा देखें",statusMatches:"इस सूची में {n} सेवाएँ",statusNoMatches:"कोई परिणाम नहीं",voiceUnsupported:"इस ब्राउज़र में वॉइस सर्च उपलब्ध नहीं है।",voiceListening:"सुन रहा है… बोलें।",voiceDenied:"माइक्रोफ़ोन उपलब्ध नहीं। टाइप करके खोजें।",fontTitle:"टेक्स्ट बड़ा करें",contrastTitle:"उच्च कंट्रास्ट",menuTitle:"मेन्यू खोलें",
    service:{
      catalog:["पुस्तकालय कैटलॉग","पुस्तकों की सूची के लिए आधिकारिक साइट खोलें।"],
      databases:["शोध डेटाबेस","अरबी और अंतरराष्ट्रीय शैक्षणिक संसाधन देखें।"],
      bibliography:["राष्ट्रीय ग्रंथसूची","कुवैत में प्रकाशित कृतियों की जानकारी देखें।"],
      digital:["डिजिटल पुस्तकालय","विकासाधीन डिजिटलीकरण परियोजना की जानकारी।"],
      copyright:["कॉपीराइट","कॉपीराइट और बौद्धिक संपदा की जानकारी।"],
      isbn:["ISBN सेवा","पुस्तक के अंतरराष्ट्रीय मानक नंबर की जानकारी।"],
      deposit:["कानूनी जमा","कृतियाँ जमा करने की शर्तें और दस्तावेज़।"],
      rooms:["हॉल और थिएटर","हॉल बुकिंग की प्रक्रिया और शर्तें।"]
    }
  },
  zh:{
    skip:"跳转到主要内容",disclaimer:"本页面为独立非官方设计原型，不办理政府业务。",official:"官方网站",brand:"科威特国家图书馆",brandSub:"国家记忆 · 知识视野",navHome:"首页",navServices:"服务",navCollections:"馆藏",navAbout:"关于我们",language:"语言",
    heroEyebrow:"探索科威特知识与文化遗产",heroTitle1:"以知识珍藏过去",heroTitle2:"以灵感开创未来",heroDesc:"便捷了解研究服务、信息资源、国家书目以及版权相关资讯。",explore:"探索服务",goOfficial:"访问官方网站",heroTag1:"国家文化遗产",heroTag2:"研究资源",heroTag3:"版权",artCaption:"历久弥新的知识遗产",
    servicesKicker:"图书馆服务",servicesTitle:"所需服务，一站了解",servicesDesc:"在本地服务指南中搜索，然后前往官方页面继续办理。",allOfficial:"官方服务指南",searchLabel:"搜索服务",searchPlaceholder:"搜索 ISBN、数据库等服务",voiceTitle:"语音搜索",filterAll:"全部服务",filterResearch:"研究与资源",filterAuthors:"作者与出版",filterVisitors:"访客与活动",emptyTitle:"未找到匹配服务",emptyDesc:"请尝试其他关键词或查看全部服务。",
    collectionsKicker:"馆藏与知识",collectionsTitle:"探索科威特的文化记忆",collectionsDesc:"以下资源可在图书馆官方网站查阅。",collection1:"国家书目",collection1Desc:"科威特出版的知识作品记录。",collection2:"数字图书馆",collection2Desc:"文化遗产数字化项目仍在开发中。",collection3:"研究数据库",collection3Desc:"学术资源与研究工具。",
    aboutKicker:"关于图书馆",aboutTitle:"知识是国家共同的责任",aboutDesc:"科威特国家图书馆依据1994年第52号法令成立，旨在收集、整理和保存国家文化及知识遗产，并促进研究与合作。",aboutPoint1:"保护文化记忆",aboutPoint2:"支持研究人员和读者",aboutPoint3:"维护创作者权益",aboutLink:"官方历史与宗旨",ctaKicker:"开启探索之旅",ctaTitle:"科威特知识遗产触手可及",ctaDesc:"请通过国家图书馆官方网站访问正式服务。",ctaButton:"访问官方图书馆",footerNote:"独立用户体验设计原型，并非政府官方服务。",backTop:"返回顶部 ↑",
    linkLabel:"查看官方服务",statusMatches:"本指南共有 {n} 项服务",statusNoMatches:"无匹配结果",voiceUnsupported:"此浏览器不支持语音搜索。",voiceListening:"正在聆听，请说话。",voiceDenied:"无法使用麦克风，请输入关键词。",fontTitle:"放大文字",contrastTitle:"切换高对比度",menuTitle:"打开菜单",
    service:{
      catalog:["图书馆目录","通过官方网站查看图书馆目录和馆藏。"],
      databases:["研究数据库","获取阿拉伯语和国际学术研究资源。"],
      bibliography:["国家书目","浏览科威特出版作品的记录。"],
      digital:["数字图书馆","了解仍在开发中的文化遗产数字化项目。"],
      copyright:["版权信息","了解版权、邻接权和知识产权。"],
      isbn:["ISBN 服务","了解国际标准书号的申请要求。"],
      deposit:["法定缴存","了解作品缴存要求及所需文件。"],
      rooms:["场地与剧院","查看活动场地预约流程和条件。"]
    }
  }
};

/* Internal navigation in all six languages; no outdated external-site promises. */
const internalCopy = {
  ar:{goOfficial:"دليل الخدمات الجديد",servicesDesc:"ابحث عن الخدمة وافتح صفحتها الجديدة داخل الموقع دون الانتقال إلى الموقع القديم.",allOfficial:"جميع الصفحات الداخلية",aboutLink:"اقرأ عن المكتبة",ctaButton:"تصفح المجموعات",ctaDesc:"اكتشف مسارات المعرفة والخدمات داخل البوابة المطوّرة.",linkLabel:"افتح الصفحة",official:"صفحات الموقع",morePathsKicker:"مسارات بحثية إضافية",morePathsTitle:"مكتبات الكويت في موقع واحد",portalTitle:"بوابة مكتبات دولة الكويت",portalDesc:"مسار تعريفي إلى المكتبات والفهارس الكويتية.",thesesTitle:"رسائل الماجستير والدكتوراه",thesesDesc:"دليل للتعرف إلى مصادر الرسائل الجامعية.",publicTitle:"فهرس المكتبات العامة",publicDesc:"استكشاف المكتبات العامة وخدمات الفهرسة."},
  en:{goOfficial:"Explore our new service pages",servicesDesc:"Find a service and open its new page without leaving this site.",allOfficial:"All internal pages",aboutLink:"Read about the library",ctaButton:"Explore collections",ctaDesc:"Browse the library's informational guides within the redesigned site.",linkLabel:"Open page",official:"Site pages",morePathsKicker:"More research pathways",morePathsTitle:"Explore Kuwait's libraries",portalTitle:"Kuwait libraries portal",portalDesc:"A guide to participating libraries and their catalogs.",thesesTitle:"Theses and dissertations",thesesDesc:"Learn about the academic thesis research pathway.",publicTitle:"Public libraries catalog",publicDesc:"Explore public libraries and their catalog services."},
  fr:{goOfficial:"Voir les nouvelles pages de services",servicesDesc:"Ouvrez les pages des services directement sur ce site.",allOfficial:"Toutes les pages internes",aboutLink:"En savoir plus",ctaButton:"Explorer les collections",ctaDesc:"Parcourez les guides informatifs au sein du site rénové.",linkLabel:"Ouvrir la page",official:"Rubriques du site",morePathsKicker:"Autres parcours",morePathsTitle:"Explorer les bibliothèques du Koweït",portalTitle:"Portail des bibliothèques",portalDesc:"Guide des bibliothèques et catalogues du Koweït.",thesesTitle:"Thèses universitaires",thesesDesc:"Découvrir les sources de recherche universitaire.",publicTitle:"Bibliothèques publiques",publicDesc:"Explorer les bibliothèques et leurs catalogues."},
  ur:{goOfficial:"نئے خدمات کے صفحات",servicesDesc:"خدمت منتخب کریں اور اسی ویب سائٹ پر اس کا نیا صفحہ کھولیں۔",allOfficial:"تمام اندرونی صفحات",aboutLink:"لائبریری کا تعارف",ctaButton:"مجموعے دیکھیں",ctaDesc:"اسی نئی ویب سائٹ میں علمی صفحات تلاش کریں۔",linkLabel:"صفحہ کھولیں",official:"ویب سائٹ کے صفحات",morePathsKicker:"مزید تحقیقی راستے",morePathsTitle:"کویت کی لائبریریاں دریافت کریں",portalTitle:"کویت لائبریری پورٹل",portalDesc:"کویت کی لائبریریوں اور فہرستوں کا تعارفی رہنما۔",thesesTitle:"جامعاتی مقالے",thesesDesc:"جامعاتی تحقیقی مواد سے متعلق معلومات۔",publicTitle:"عوامی لائبریریاں",publicDesc:"عوامی لائبریریوں اور ان کی فہرستوں کا تعارف۔"},
  hi:{goOfficial:"नए सेवा पेज देखें",servicesDesc:"अपनी सेवा का नया पेज इसी वेबसाइट पर खोलें।",allOfficial:"सभी आंतरिक पेज",aboutLink:"पुस्तकालय परिचय",ctaButton:"संग्रह देखें",ctaDesc:"इस नई साइट पर ज्ञान और सेवाओं के पेज खोजें।",linkLabel:"पेज खोलें",official:"वेबसाइट पेज",morePathsKicker:"अतिरिक्त शोध विषय",morePathsTitle:"कुवैत के पुस्तकालय खोजें",portalTitle:"कुवैत पुस्तकालय पोर्टल",portalDesc:"स्थानीय पुस्तकालयों और कैटलॉग का परिचय।",thesesTitle:"शोध-प्रबंध",thesesDesc:"विश्वविद्यालयों के शोध संसाधनों का परिचय।",publicTitle:"सार्वजनिक पुस्तकालय",publicDesc:"पुस्तकालयों और उनकी सूचियों की जानकारी।"},
  zh:{goOfficial:"浏览新版服务页面",servicesDesc:"查找服务并在本站打开对应的新版内页。",allOfficial:"全部站内页面",aboutLink:"了解图书馆",ctaButton:"探索馆藏",ctaDesc:"在新版网站内部浏览知识与服务介绍。",linkLabel:"打开页面",official:"站内页面",morePathsKicker:"更多研究专题",morePathsTitle:"探索科威特各类图书馆",portalTitle:"科威特图书馆门户",portalDesc:"了解本地图书馆及其目录服务。",thesesTitle:"学位论文",thesesDesc:"了解大学研究论文资源。",publicTitle:"公共图书馆目录",publicDesc:"探索公共图书馆与馆藏目录。"}
};
const photographicHeroCopy = {
  ar:{
    heroPhotoUnavailable:"تعذر تحميل الصورة الفوتوغرافية مؤقتاً",
    heroPhotoAlt:"صورة فوتوغرافية حقيقية لمكتبة الكويت الوطنية في مدينة الكويت",
    
  },
  en:{
    heroPhotoUnavailable:"The photograph is temporarily unavailable",
    heroPhotoAlt:"Real photograph of the National Library of Kuwait in Kuwait City",
    
  },
  fr:{
    heroPhotoUnavailable:"La photographie est temporairement indisponible",
    heroPhotoAlt:"Photographie réelle de la Bibliothèque nationale du Koweït",
    
  },
  ur:{
    heroPhotoUnavailable:"تصویر عارضی طور پر دستیاب نہیں",
    heroPhotoAlt:"کویت کی قومی لائبریری کی حقیقی تصویر",
    
  },
  hi:{
    heroPhotoUnavailable:"फ़ोटो अस्थायी रूप से उपलब्ध नहीं है",
    heroPhotoAlt:"कुवैत राष्ट्रीय पुस्तकालय की वास्तविक फ़ोटो",
    
  },
  zh:{
    heroPhotoUnavailable:"照片暂时无法加载",
    heroPhotoAlt:"科威特国家图书馆的真实照片",
    
  }
};
for (const language of Object.keys(internalCopy)) {
  Object.assign(translations[language], internalCopy[language], photographicHeroCopy[language]);
}

const dom = {
  language:document.getElementById("language"), search:document.getElementById("search"),
  grid:document.getElementById("service-grid"),filters:document.querySelectorAll("[data-filter]"),
  status:document.getElementById("search-status"),empty:document.getElementById("empty-state"),
  voice:document.getElementById("voice-btn"),font:document.getElementById("font-btn"),
  contrast:document.getElementById("contrast-btn"),menu:document.getElementById("menu-btn"),
  nav:document.getElementById("primary-nav")
};
const speechLocales={ar:"ar-KW",en:"en-US",fr:"fr-FR",ur:"ur-PK",hi:"hi-IN",zh:"zh-CN"};
const rtlLanguages=new Set(["ar","ur"]);
const params=new URLSearchParams(location.search);
let locale=translations[params.get("lang")]?params.get("lang"):"ar";
let category="all";
let voiceStatus="";
const storage={
  get:function(key){try{return localStorage.getItem(key);}catch{return null;}},
  set:function(key,value){try{localStorage.setItem(key,value);}catch{/* unavailable */}}
};
if(!params.has("lang")&&translations[storage.get("nlk-lang")])locale=storage.get("nlk-lang");
let contrast=storage.get("nlk-contrast")==="1";
let fontIndex=Number(storage.get("nlk-font")||"0");
if(!Number.isInteger(fontIndex)||fontIndex<0||fontIndex>2)fontIndex=0;
const fontScales=[1,1.12,1.24];
function tr(key){return translations[locale][key]||translations.en[key]||key;}
function normalize(value){return String(value||"").normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g,"").toLocaleLowerCase().trim();}
function createElement(tag,className,textValue){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(textValue!==undefined)node.textContent=textValue;
  return node;
}
function makeCard(item){
  const texts=translations[locale].service[item.id];
  const a=createElement("a","service-card");
  a.href=item.url+"&lang="+encodeURIComponent(locale);
  a.setAttribute("aria-label",texts[0]+" — "+tr("linkLabel"));
  const icon=createElement("span","service-icon",item.icon);
  icon.setAttribute("aria-hidden","true");
  const h=createElement("h3","",texts[0]);
  const p=createElement("p","",texts[1]);
  const bottom=createElement("span","service-bottom");
  const link=createElement("span","",tr("linkLabel"));
  const arrow=createElement("span","","↗");
  arrow.setAttribute("aria-hidden","true");
  bottom.append(link,arrow);
  a.append(icon,h,p,bottom);
  return a;
}
function renderServices(){
  const query=normalize(dom.search.value);
  const matches=serviceData.filter(function(service){
    if(category!=="all"&&service.category!==category)return false;
    const text=translations[locale].service[service.id].join(" ")+" "+
      translations.en.service[service.id].join(" ")+" "+service.tag;
    return normalize(text).includes(query);
  });
  const fragment=document.createDocumentFragment();
  matches.forEach(function(item){fragment.appendChild(makeCard(item));});
  dom.grid.replaceChildren(fragment);
  dom.empty.hidden=matches.length>0;
  dom.status.textContent=voiceStatus||(
    matches.length?tr("statusMatches").replace("{n}",String(matches.length)):tr("statusNoMatches")
  );
}
function applyLocale(){
  document.documentElement.lang=locale;
  document.documentElement.dir=rtlLanguages.has(locale)?"rtl":"ltr";
  document.title=tr("brand")+" | "+(locale==="ar"?"نموذج تطويري مستقل":"Independent design prototype");
  dom.language.value=locale;
  document.querySelectorAll("[data-i18n]").forEach(function(el){
    el.textContent=tr(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el){
    el.placeholder=tr(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(function(el){
    el.title=tr(el.getAttribute("data-i18n-title"));
  });
  dom.search.setAttribute("aria-label",tr("searchLabel"));
  dom.voice.setAttribute("aria-label",tr("voiceTitle"));
  dom.font.setAttribute("aria-label",tr("fontTitle"));
  dom.font.title=tr("fontTitle");
  dom.contrast.setAttribute("aria-label",tr("contrastTitle"));
  dom.contrast.title=tr("contrastTitle");
  dom.menu.setAttribute("aria-label",tr("menuTitle"));
  dom.nav.setAttribute("aria-label",tr("navServices"));
  dom.language.setAttribute("aria-label",tr("language"));
  const image=document.getElementById("library-hero-photo");
  if(image) image.alt=tr("heroPhotoAlt");

  document.getElementById("filters").setAttribute("aria-label",tr("filterAll"));
  voiceStatus="";
  renderServices();
  document.querySelectorAll('a[href^="./page.html?topic="]').forEach(function(anchor){
    const url = new URL(anchor.getAttribute("href"), location.href);
    url.searchParams.set("lang",locale);
    anchor.setAttribute("href","./page.html"+url.search);
  });
}
function setContrast(enabled){
  contrast=enabled;
  document.documentElement.classList.toggle("high-contrast",enabled);
  dom.contrast.setAttribute("aria-pressed",enabled?"true":"false");
  storage.set("nlk-contrast",enabled?"1":"0");
}
function setFont(index){
  fontIndex=index;
  document.documentElement.style.setProperty("--type-scale",String(fontScales[index]));
  storage.set("nlk-font",String(index));
}
function closeMenu(){dom.nav.classList.remove("open");dom.menu.setAttribute("aria-expanded","false");}
dom.language.addEventListener("change",function(){
  locale=translations[dom.language.value]?dom.language.value:"ar";
  storage.set("nlk-lang",locale);
  const url=new URL(location.href);
  url.searchParams.set("lang",locale);
  history.replaceState(null,"",url.pathname+url.search+url.hash);
  applyLocale();
});
dom.search.addEventListener("input",function(){voiceStatus="";renderServices();});
dom.filters.forEach(function(btn){
  btn.addEventListener("click",function(){
    category=btn.getAttribute("data-filter");
    dom.filters.forEach(function(b){const active=b===btn;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
    voiceStatus="";
    renderServices();
  });
});
dom.font.addEventListener("click",function(){setFont((fontIndex+1)%fontScales.length);});
dom.contrast.addEventListener("click",function(){setContrast(!contrast);});
dom.menu.addEventListener("click",function(){
  const open=dom.nav.classList.toggle("open");
  dom.menu.setAttribute("aria-expanded",String(open));
});
dom.nav.querySelectorAll("a").forEach(function(link){link.addEventListener("click",closeMenu);});
document.addEventListener("keydown",function(event){if(event.key==="Escape")closeMenu();});
dom.voice.addEventListener("click",function(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){voiceStatus=tr("voiceUnsupported");renderServices();return;}
  const recognition=new Recognition();
  recognition.lang=speechLocales[locale];
  recognition.interimResults=false;
  recognition.maxAlternatives=1;
  recognition.onstart=function(){dom.voice.classList.add("listening");voiceStatus=tr("voiceListening");renderServices();};
  recognition.onresult=function(event){
    dom.search.value=event.results[0][0].transcript;
    voiceStatus="";
    renderServices();
  };
  recognition.onerror=function(){voiceStatus=tr("voiceDenied");renderServices();};
  recognition.onend=function(){dom.voice.classList.remove("listening");if(voiceStatus===tr("voiceListening")){voiceStatus="";renderServices();}};
  try{recognition.start();}catch{voiceStatus=tr("voiceDenied");renderServices();}
});
// The image is a real library photograph, not a generated graphic.
// Preserve a credited secondary real photo if the original publisher blocks hotlinking.
const libraryPhoto=document.getElementById("library-hero-photo");
if(libraryPhoto){
  const handleLibraryPhotoError=function(){
    if(libraryPhoto.dataset.fallbackUsed!=="true"){
      libraryPhoto.dataset.fallbackUsed="true";
      libraryPhoto.src=libraryPhoto.dataset.fallbackSrc;
    } else {
      libraryPhoto.closest(".hero-photo-frame")?.classList.add("photo-failed");
      const unavailable=document.querySelector(".hero-photo-unavailable");
      if(unavailable)unavailable.hidden=false;
    }
  };
  libraryPhoto.addEventListener("error",handleLibraryPhotoError);
  // A fast image failure may occur before deferred scripts attach their listeners.
  if(libraryPhoto.complete && libraryPhoto.naturalWidth===0){
    handleLibraryPhotoError();
  }
}
setContrast(contrast);
setFont(fontIndex);
applyLocale();
