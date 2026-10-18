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
];
