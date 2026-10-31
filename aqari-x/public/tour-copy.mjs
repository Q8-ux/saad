import {getLocale} from './i18n.mjs?v=1.4.0';
export const TOUR_COPY = {
  tours: ['جولات العقارات 3D', '3D property tours', 'جائیداد کی 3D سیر'],
  title: ['جولة داخل العقار', 'Explore the property in 3D', 'جائیداد کی اندرونی سیر'],
  intro: ['استكشف المساحة باللمس قبل ترتيب معاينتك مع المكتب.', 'Explore the space before arranging a viewing with the office.', 'دفتر کے ساتھ معائنہ طے کرنے سے پہلے جگہ دیکھیں۔'],
  start: ['ابدأ الجولة', 'Start tour', 'سیر شروع کریں'],
  stop: ['إغلاق الجولة والعودة للصور', 'Close tour and return to photos', 'سیر بند کریں اور تصاویر پر واپس جائیں'],
  fullscreen: ['ملء الشاشة', 'Full screen', 'مکمل اسکرین'],
  help: ['اسحب للتجول وكبّر بإصبعين. يمكنك الرجوع للصور في أي وقت.', 'Drag to explore and pinch to zoom. You can return to photos at any time.', 'دیکھنے کے لیے کھینچیں اور زوم کے لیے دو انگلیاں استعمال کریں۔ تصاویر پر کبھی بھی واپس جائیں۔'],
  loading: ['جارٍ فتح الجولة… قد يستغرق تحميل المشهد بعض الوقت.', 'Opening the tour… loading the scene may take a moment.', 'سیر کھل رہی ہے… منظر لوڈ ہونے میں کچھ وقت لگ سکتا ہے۔'],
  fallback: ['إذا لم يعمل العرض على جهازك، تابع صور العقار أو تواصل مع المكتب.', 'If the tour does not work on your device, use the photos or contact the office.', 'اگر سیر آپ کے آلے پر نہ چلے تو تصاویر دیکھیں یا دفتر سے رابطہ کریں۔'],
  note: ['الجولة تساعد على المعاينة الأولية؛ تحقق من الحالة والقياسات مع المكتب.', 'Use the tour for an initial look; confirm condition and dimensions with the office.', 'یہ ابتدائی جائزہ ہے؛ حالت اور پیمائش کی تصدیق دفتر سے کریں۔'],
  empty: ['لم تُضف جولات للعروض بعد', 'No property tours added yet', 'ابھی جائیداد کی سیر شامل نہیں کی گئی'],
  emptyBody: ['تظهر هنا العقارات التي أرفق المكتب بها مسحاً ثلاثي الأبعاد. يمكنك الآن تصفح الصور والعروض.', 'Properties with a 3D scan attached by the office will appear here. Browse the photos and listings for now.', 'دفتر کی جانب سے 3D اسکین شامل کرنے والی جائیدادیں یہاں ظاہر ہوں گی۔ فی الحال تصاویر اور اشتہارات دیکھیں۔'],
  browse: ['استعرض العقارات', 'Browse properties', 'جائیدادیں دیکھیں'],
  badge: ['جولة 3D', '3D tour', '3D سیر'],
};
export const tourText = (key, locale = getLocale()) => TOUR_COPY[key]?.[{ar: 0, en: 1, ur: 2}[locale] ?? 0] || key;
