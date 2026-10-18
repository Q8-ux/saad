import type { Language } from "./site-content";
type News = { id: string; publishedAt: string; eventDate?: string; source: string; title: Record<Language,string>; summary: Record<Language,string> };
// Public editorial summaries only. Dates displayed are judgment dates, never post dates.
export const groupNews: News[] = [
  {
    "id": "Dd1XMbJgQNx",
    "publishedAt": "2026-09-28",
    "source": "https://www.instagram.com/sabik_legal/p/Dd1XMbJgQNx/",
    "title": {
      "ar": "العقوبات التكميلية للشخص الاعتباري في جرائم غسل الأموال",
      "en": "Supplementary penalties for legal entities in money laundering cases",
      "ur": "منی لانڈرنگ میں قانونی اشخاص کی اضافی سزائیں"
    },
    "summary": {
      "ar": "منشور توعوي للمجموعة يعرض صوراً للعقوبات التكميلية التي يتناولها موضوع غسل الأموال وتمويل الإرهاب للشخص الاعتباري.",
      "en": "The Group’s awareness post outlines supplementary penalties discussed in relation to money laundering and terrorism financing by legal entities.",
      "ur": "گروپ کی آگاہی پوسٹ قانونی اشخاص کی منی لانڈرنگ اور دہشت گردی کی مالی معاونت سے متعلق اضافی سزاؤں پر روشنی ڈالتی ہے۔"
    }
  },
  {
    "id": "Dd1XCoUzBsu",
    "publishedAt": "2026-09-28",
    "source": "https://www.instagram.com/sabik_legal/reel/Dd1XCoUzBsu/",
    "title": {
      "ar": "توعية قانونية مصوّرة من سابق",
      "en": "Legal awareness video from Sabeq",
      "ur": "سابق کی قانونی آگاہی ویڈیو"
    },
    "summary": {
      "ar": "مقطع توعوي منشور في حساب المجموعة؛ يمكن متابعة الشرح الكامل من رابط المنشور الأصلي.",
      "en": "An awareness video published on the Group’s account. Follow the original post for the full explanation.",
      "ur": "گروپ کے اکاؤنٹ پر شائع آگاہی ویڈیو؛ مکمل وضاحت اصل پوسٹ کے رابطے میں ہے۔"
    }
  },
  {
    "id": "Dd1W9bwAIxK",
    "publishedAt": "2026-09-28",
    "source": "https://www.instagram.com/sabik_legal/p/Dd1W9bwAIxK/",
    "title": {
      "ar": "الفرق بين التمويه والإخفاء في غسل الأموال",
      "en": "Concealment and disguise in money laundering",
      "ur": "منی لانڈرنگ میں اخفا اور تمویہ کا فرق"
    },
    "summary": {
      "ar": "تتناول المجموعة الفرق بين إخفاء طبيعة الأموال وتمويه مصدرها في محتواها القانوني التوعوي.",
      "en": "The Group’s awareness content discusses the distinction between hiding the nature of funds and disguising their origin.",
      "ur": "گروپ کا آگاہی مواد اموال کی حقیقت چھپانے اور ماخذ بدل کر پیش کرنے کا فرق بیان کرتا ہے۔"
    }
  },
  {
    "id": "DdoBgeVgGV3",
    "publishedAt": "2026-09-23",
    "source": "https://www.instagram.com/sabik_legal/p/DdoBgeVgGV3/",
    "title": {
      "ar": "الشك في الدليل الجنائي",
      "en": "Doubt in criminal evidence",
      "ur": "فوجداری ثبوت میں شک"
    },
    "summary": {
      "ar": "توعية من المجموعة حول تقييم الأدلة وأثر الشك في الإسناد الجنائي، مع الرجوع إلى المنشور لقراءة السياق.",
      "en": "The Group discusses the assessment of evidence and the role of doubt in criminal attribution. Read the original post for context.",
      "ur": "گروپ شواہد کے جائزے اور فوجداری الزام میں شک کی اہمیت پر آگاہی دیتا ہے؛ سیاق اصل پوسٹ میں ہے۔"
    }
  },
  {
    "id": "DdoBZ65AguI",
    "publishedAt": "2026-09-23",
    "eventDate": "2026-09-21",
    "source": "https://www.instagram.com/sabik_legal/p/DdoBZ65AguI/",
    "title": {
      "ar": "تأييد حكم بالبراءة ورفض طعن النيابة العامة",
      "en": "Acquittal upheld; prosecution appeal dismissed",
      "ur": "براءت برقرار، استغاثہ کی اپیل مسترد"
    },
    "summary": {
      "ar": "بحسب منشور المجموعة، أُيّد حكم البراءة ورُفض طعن النيابة العامة بعد المرافعة وتقديم الدفاع من المحامي مشعل متعب الشمري.",
      "en": "The Group reports an acquittal upheld and the prosecution appeal dismissed following advocacy by lawyer Mishal Mutaib Al-Shammari.",
      "ur": "گروپ کے مطابق وکیل مشعل متعب الشمری کی وکالت کے بعد براءت برقرار اور استغاثہ کی اپیل مسترد ہوئی۔"
    }
  },
  {
    "id": "DdoBXdrgT8H",
    "publishedAt": "2026-09-23",
    "source": "https://www.instagram.com/sabik_legal/p/DdoBXdrgT8H/",
    "title": {
      "ar": "حرية التعبير والنقد المباح",
      "en": "Freedom of expression and permissible criticism",
      "ur": "اظہار رائے اور جائز تنقید"
    },
    "summary": {
      "ar": "تتناول المجموعة موضوع حرية التعبير وحدود النقد المباح وأهمية فهم العبارات ضمن سياقها.",
      "en": "The Group discusses freedom of expression, permissible criticism and the importance of reading statements in context.",
      "ur": "گروپ اظہار رائے، جائز تنقید اور عبارت کو اس کے سیاق میں سمجھنے کی اہمیت بیان کرتا ہے۔"
    }
  },
  {
    "id": "Ddgy5_9gvKC",
    "publishedAt": "2026-09-20",
    "source": "https://www.instagram.com/sabik_legal/p/Ddgy5_9gvKC/",
    "title": {
      "ar": "التعدي على العلامة التجارية",
      "en": "Trademark infringement",
      "ur": "تجارتی نشان کی خلاف ورزی"
    },
    "summary": {
      "ar": "منشور توعوي عن صور التعدي على العلامات التجارية والحماية القانونية التي يتناولها المحتوى المنشور.",
      "en": "An awareness post about forms of trademark infringement and the legal protections discussed by the Group.",
      "ur": "تجارتی نشان کی خلاف ورزی کی صورتوں اور متعلقہ قانونی تحفظ کے بارے میں گروپ کی آگاہی پوسٹ۔"
    }
  },
  {
    "id": "Ddgy2L5geSN",
    "publishedAt": "2026-09-20",
    "eventDate": "2026-09-20",
    "source": "https://www.instagram.com/sabik_legal/p/Ddgy2L5geSN/",
    "title": {
      "ar": "براءة في قضية عرض وتداول سلعة بعلامة تجارية مقلّدة",
      "en": "Acquittal in a counterfeit trademark goods case",
      "ur": "جعلی تجارتی نشان والی شے کے مقدمے میں براءت"
    },
    "summary": {
      "ar": "أعلنت المجموعة صدور حكم بالبراءة في قضية عرض وتداول سلعة تحمل علامة تجارية مقلّدة، بعد تقديم الدفاع من المحامي خالد مشعل الحزيم.",
      "en": "The Group reports an acquittal in a case concerning goods bearing a counterfeit trademark, following advocacy by lawyer Khalid Mishal Al-Huzaim.",
      "ur": "گروپ نے وکیل خالد مشعل الحزیم کی وکالت کے بعد جعلی تجارتی نشان والی شے کے مقدمے میں براءت کی خبر دی۔"
    }
  },
  {
    "id": "DdgyzBMgX64",
    "publishedAt": "2026-09-20",
    "source": "https://www.instagram.com/sabik_legal/p/DdgyzBMgX64/",
    "title": {
      "ar": "العلامات التجارية والملكية الفكرية في الكويت",
      "en": "Trademarks and intellectual property in Kuwait",
      "ur": "کویت میں تجارتی نشان اور دانشورانہ ملکیت"
    },
    "summary": {
      "ar": "تقدم المجموعة محتوى تعريفياً حول تنظيم العلامات التجارية والملكية الفكرية في الكويت.",
      "en": "The Group introduces trademark regulation and intellectual property in Kuwait.",
      "ur": "گروپ کویت میں تجارتی نشان کے قواعد اور دانشورانہ ملکیت کا تعارف پیش کرتا ہے۔"
    }
  },
  {
    "id": "DdeVd3LAMxb",
    "publishedAt": "2026-09-19",
    "source": "https://www.instagram.com/sabik_legal/p/DdeVd3LAMxb/",
    "title": {
      "ar": "حالات الإخلاء في علاقة الإيجار",
      "en": "Eviction issues in rental relationships",
      "ur": "کرایہ داری میں تخلیہ کے معاملات"
    },
    "summary": {
      "ar": "تستعرض المجموعة حالات يناقش فيها موضوع إخلاء العقار ضمن منشورها التوعوي عن الإيجارات.",
      "en": "The Group’s rental awareness post outlines circumstances discussed in relation to eviction.",
      "ur": "گروپ کی کرایہ داری کی آگاہی پوسٹ تخلیہ سے متعلق صورتوں پر روشنی ڈالتی ہے۔"
    }
  },
  {
    "id": "DdeVRb7B-Ur",
    "publishedAt": "2026-09-19",
    "source": "https://www.instagram.com/sabik_legal/reel/DdeVRb7B-Ur/",
    "title": {
      "ar": "توعية حول حقوق المالك والمستأجر — المحامي خالد الحزيم",
      "en": "Landlord and tenant awareness — lawyer Khalid Al-Huzaim",
      "ur": "مالک اور کرایہ دار کے حقوق — وکیل خالد الحزیم"
    },
    "summary": {
      "ar": "مقطع توعوي للمحامي خالد الحزيم في حساب المجموعة يتناول مسائل العلاقة بين مالك العقار والمستأجر.",
      "en": "An awareness video by lawyer Khalid Al-Huzaim on the Group’s account addresses landlord and tenant issues.",
      "ur": "گروپ کے اکاؤنٹ پر وکیل خالد الحزیم کی آگاہی ویڈیو مالک اور کرایہ دار کے مسائل بیان کرتی ہے۔"
    }
  },
  {
    "id": "DdeVMougYCg",
    "publishedAt": "2026-09-19",
    "source": "https://www.instagram.com/sabik_legal/p/DdeVMougYCg/",
    "title": {
      "ar": "التعريف بعقد الإيجار",
      "en": "Understanding a rental agreement",
      "ur": "کرایہ نامے کا تعارف"
    },
    "summary": {
      "ar": "منشور تعريفي من المجموعة يوضح فكرة عقد الإيجار وعلاقة الانتفاع بالعقار بالأجرة المتفق عليها.",
      "en": "The Group introduces rental agreements and the relationship between property use and agreed rent.",
      "ur": "گروپ کرایہ نامے اور جائیداد کے استعمال کے بدلے طے شدہ کرایے کا تعارف دیتا ہے۔"
    }
  },
  {
    "id": "DdWSuU5RAG3",
    "publishedAt": "2026-09-16",
    "source": "https://www.instagram.com/sabik_legal/p/DdWSuU5RAG3/",
    "title": {
      "ar": "عبء الإثبات في المطالبات",
      "en": "The burden of proof in claims",
      "ur": "دعویٰ میں ثبوت کی ذمہ داری"
    },
    "summary": {
      "ar": "توعية حول مسؤولية إثبات الحق والدفع بانقضائه، بحسب ما يعرضه منشور المجموعة.",
      "en": "The Group discusses responsibility for proving a claimed right and an argument that it has ended.",
      "ur": "گروپ حق کے دعوے اور اس کے ختم ہونے کی دلیل کے ثبوت کی ذمہ داری پر آگاہی دیتا ہے۔"
    }
  },
  {
    "id": "DdWSqBrg19a",
    "publishedAt": "2026-09-16",
    "eventDate": "2026-09-14",
    "source": "https://www.instagram.com/sabik_legal/p/DdWSqBrg19a/",
    "title": {
      "ar": "حكم لصالح الموكل أمام محكمة التمييز في نزاع مدني",
      "en": "Ruling in the client’s favour in a civil cassation dispute",
      "ur": "دیوانی تمییز کے تنازع میں موکل کے حق میں فیصلہ"
    },
    "summary": {
      "ar": "بحسب منشور المجموعة، قُضي بتمييز الحكم المطعون فيه وتأييد رفض الدعوى، بعد تقديم الدفاع من المحامي الدكتور خليفة محمد الخليفة.",
      "en": "The Group reports that a challenged judgment was quashed and dismissal of the claim upheld following advocacy by lawyer Dr Khalifa Mohammed Al-Khalifa.",
      "ur": "گروپ کے مطابق وکیل ڈاکٹر خلیفہ محمد الخلیفہ کی وکالت کے بعد زیر اعتراض فیصلہ منسوخ اور دعویٰ مسترد کرنے کا فیصلہ برقرار رہا۔"
    }
  },
  {
    "id": "DdWSnM3Afrd",
    "publishedAt": "2026-09-16",
    "source": "https://www.instagram.com/sabik_legal/p/DdWSnM3Afrd/",
    "title": {
      "ar": "حجية الأحكام وقوة الأمر المقضي",
      "en": "Judgments and res judicata",
      "ur": "فیصلوں کی حجیت اور امر مقضیٰ"
    },
    "summary": {
      "ar": "تناقش المجموعة أثر الحكم الحائز للحجية على إعادة طرح النزاع، ضمن محتواها القانوني التوعوي.",
      "en": "The Group’s awareness content discusses the effect of a binding judgment on bringing the same dispute again.",
      "ur": "گروپ کا آگاہی مواد ایک ہی تنازع دوبارہ پیش کرنے پر حتمی فیصلے کی حجیت کے اثر پر گفتگو کرتا ہے۔"
    }
  }
];
