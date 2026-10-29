import { getD1 } from "@/db";
import { memoPaymentPolicy } from "./sadad-payments";
import { integrationConfig } from "./management-integrations";

export const engineeringPaths = [
  { id: "spec-kit", name: "المواصفات وضبط التنفيذ", kind: "development", purpose: "توحيد مواصفات الموقع واللوحة وعقود API واختبارات القبول.", status: "installed" },
  { id: "sabeq-quality", name: "التبسيط والتدقيق البرمجي", kind: "development", purpose: "حصر التغيير ومراجعة الصلاحيات ومنع فقد وظائف سابقة.", status: "installed" },
  { id: "interface-craft", name: "جودة الواجهات", kind: "development", purpose: "مراجعة العربية والجوال ووضوح الحالات والتنقل.", status: "installed" },
  { id: "sadad", name: "دفع سداد", kind: "runtime", purpose: "المصادقة والفواتير والتحقق من الدفع والاستحقاق الواحد.", status: "requires_check" },
  { id: "memo-intake", name: "استخلاص الوقائع والمرفقات", kind: "runtime", purpose: "تجهيز بيانات موحدة قبل الدفع والتوليد دون إعادة إدخالها.", status: "available" },
  { id: "legal-sources", name: "التشريعات والأسانيد", kind: "runtime", purpose: "البحث في الملف المربوط ومراجعة الاستشهادات دون اختلاق مصادر.", status: "available" },
  { id: "internal-verification", name: "التحقق الداخلي", kind: "development", purpose: "فحوص العقد والأمان والنشر من أدوات التطوير.", status: "installed" },
  { id: "whatsapp", name: "واتساب المكتب", kind: "integration", purpose: "إعداد ربط OpenWA ومتابعة حالة الاتصال عند تهيئته.", status: "requires_check" },
];
export async function engineeringPathStatus() {
  const [database, payment, whatsapp] = await Promise.allSettled([
    getD1().prepare("SELECT 1 AS ok").first(), memoPaymentPolicy(), integrationConfig<{enabled?:boolean}>("whatsapp"),
  ]);
  return { revision: "sabeq-bridge-20261029", checkedAt: new Date().toISOString(),
    connection: { database: database.status === "fulfilled", sharedDataSource: "sabeq-public-service", authentication: "signed-request-with-replay-protection" },
    paths: engineeringPaths.map(path => ({...path,
      status: path.id === "sadad" ? payment.status === "fulfilled" ? payment.value.ready ? "configured" : "needs_configuration" : "unavailable"
        : path.id === "whatsapp" ? whatsapp.status === "fulfilled" && whatsapp.value?.enabled ? "configured" : "needs_configuration" : path.status,
    })),
    payment: payment.status === "fulfilled" ? payment.value : {ready:false},
    notice: "أدوات التطوير تعليمات وفحوص وليست صلاحية لتنفيذ أوامر أو نشر أو الوصول إلى ملفات العملاء. تهيئة الخدمة لا تثبت نجاح عملية حية.",
  };
}
