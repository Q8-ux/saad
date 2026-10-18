import type { Language } from "./site-content";
type News = { kind: "case-result" | "group-news"; id: string; publishedAt: string; eventDate?: string; source: string; title: Record<Language,string>; summary: Record<Language,string> };
// Actual Group news only: reviewed case outcomes or Group announcements.
// Exclude awareness, advice, instructions, warnings and alerts. Display judgment dates only.
export const groupNews: News[] = [
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
    },
    "kind": "case-result"
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
    },
    "kind": "case-result"
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
    },
    "kind": "case-result"
  }
  ,{
    kind: "case-result", id: "DbIv9QSgRzf", publishedAt: "2026-07-23", eventDate: "2026-07-22",
    source: "https://www.instagram.com/sabik_legal/p/DbIv9QSgRzf/",
    title: {ar: "إلغاء حكم غيابي بالحبس والقضاء مجدداً بالامتناع عن النطق بالعقاب", en: "Prison judgment set aside; court refrains from pronouncing punishment", ur: "غیابی قید کا فیصلہ منسوخ، سزا سنانے سے گریز کا نیا فیصلہ"},
    summary: {ar: "بحسب منشور المجموعة، ألغت محكمة الجنايات، الدائرة السابعة، حكماً غيابياً بالحبس ثلاث سنوات وقضت مجدداً بالامتناع عن النطق بالعقاب، بعد تقديم الدفاع من المحامي الدكتور خليفة محمد الخليفة.", en: "The Group reports that Criminal Court Circuit Seven set aside an in absentia three-year prison judgment and refrained from pronouncing punishment following advocacy by Dr Khalifa Mohammed Al-Khalifa.", ur: "گروپ کے مطابق ڈاکٹر خلیفہ محمد الخلیفہ کی وکالت کے بعد تین سال قید کا غیابی فیصلہ منسوخ کرکے سزا سنانے سے گریز کا فیصلہ دیا گیا۔"}
  },{
    kind: "case-result", id: "DaabrqsguOJ", publishedAt: "2026-07-05", eventDate: "2026-07-01",
    source: "https://www.instagram.com/sabik_legal/p/DaabrqsguOJ/",
    title: {ar: "حكم بالبراءة في قضية جنايات لانتفاء أركان الجريمة", en: "Acquittal where the elements of the offence were not established", ur: "جرم کے عناصر ثابت نہ ہونے پر فوجداری مقدمے میں براءت"},
    summary: {ar: "أعلنت المجموعة أن محكمة الجنايات، الدائرة الثانية عشرة، قضت بالبراءة في قضية جلب حشيش من مطار الكويت لانتفاء أركان الجريمة، بعد تقديم الدفاع من المحامي حمد ناصر الماضي.", en: "The Group reports an acquittal by Criminal Court Circuit Twelve in a cannabis importation case at Kuwait Airport because the elements of the offence were not established, following advocacy by Hamad Nasser Al-Madhi.", ur: "گروپ کے مطابق حمد ناصر الماضی کی وکالت کے بعد کویت ایئرپورٹ سے حشیش لانے کے مقدمے میں جرم کے عناصر ثابت نہ ہونے پر براءت دی گئی۔"}
  },{
    kind: "case-result", id: "DaYIFrmK8kH", publishedAt: "2026-07-04", eventDate: "2026-06-24",
    source: "https://www.instagram.com/sabik_legal/p/DaYIFrmK8kH/",
    title: {ar: "تأييد أحقية الموكل بالتكليف برعاية معاق", en: "Client’s entitlement to assignment as a disability caregiver upheld", ur: "معذور شخص کی دیکھ بھال پر تقرری کا موکل کا حق برقرار"},
    summary: {ar: "بحسب منشور المجموعة، أيدت محكمة الاستئناف، الدائرة الإدارية الثامنة، حكم أول درجة بأحقية الموكل بالتكليف برعاية معاق رغم تقاعد المكلف السابق، بعد تقديم الدفاع من المحامي الدكتور خليفة محمد الخليفة.", en: "The Group reports that Administrative Appeal Circuit Eight upheld the client’s entitlement to assignment as a disability caregiver despite the previous caregiver’s retirement, following advocacy by Dr Khalifa Mohammed Al-Khalifa.", ur: "گروپ کے مطابق ڈاکٹر خلیفہ محمد الخلیفہ کی وکالت کے بعد سابق دیکھ بھال کنندہ کی ریٹائرمنٹ کے باوجود موکل کی تقرری کا حق برقرار رہا۔"}
  }
];
