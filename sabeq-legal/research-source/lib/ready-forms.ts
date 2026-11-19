import { getD1 } from "@/db";
import { RequestError } from "./request-security";

// Office blueprints contain structure and empty fields only, never uploaded case text.
function form(kind: string, title: string, category: string, lines: string[]) {
  const content = [title, "", ...lines].join("\n");
  const fields = [...new Set(Array.from(content.matchAll(/\{\{([^{}]+)\}\}/g), match => match[1]))];
  return { id: `sabeq-ready-form-${kind}-v1`, kind, title, category, version: 1, status: "draft", fields, content, sourceMode: "blank_structure_only", caseDataIncluded: false, originalFileStored: false };
}
export const readyFormCatalog = [
  form("cassation_petition", "صحيفة طعن بالتمييز", "الطعون", [
    "المحكمة والدائرة: {{المحكمة والدائرة}}", "تاريخ الإعلان: {{تاريخ الإعلان}}",
    "بناء على طلب: {{بيانات الطاعن وصفته}}", "وموطنه المختار: {{الموطن المختار}}",
    "ضد: {{بيانات المطعون ضدهم وصفاتهم وعناوينهم}}", "الحكم المطعون فيه: {{بيانات الحكم المطعون فيه}}",
    "الوقائع والإجراءات", "{{الوقائع والإجراءات ذات الصلة}}", "أسباب الطعن", "{{أسباب الطعن وأسانيدها الموثقة}}",
    "الطلبات", "{{الطلبات الأصلية والاحتياطية المأذون بها}}", "المستندات", "{{بيان المستندات المرفقة فعلياً}}", "التوقيع: {{التوقيع}}",
  ]),
  form("execution_objection", "صحيفة إشكال في التنفيذ", "التنفيذ", [
    "المحكمة والدائرة: {{المحكمة والدائرة}}", "تاريخ الإعلان: {{تاريخ الإعلان}}",
    "بناء على طلب: {{بيانات المستشكل وصفته}}", "ضد: {{بيانات المستشكل ضدهم وصفاتهم وعناوينهم}}",
    "السند وإجراء التنفيذ محل الإشكال: {{بيانات السند وإجراء التنفيذ}}",
    "الوقائع", "{{الوقائع المرتبطة بالإشكال}}", "أسباب الإشكال وأسانيده", "{{أسباب الإشكال وأسانيدها الموثقة}}",
    "الطلبات", "{{الطلبات الوقتية والموضوعية المأذون بها}}", "المرفقات", "{{بيان المستندات المرفقة فعلياً}}", "التوقيع: {{التوقيع}}",
  ]),
  form("travel_ban_grievance", "تظلم من أمر منع سفر", "التظلمات", [
    "الجهة المختصة: {{الجهة المختصة}}", "المتظلم: {{بيانات المتظلم وصفته}}", "المتظلم ضدهم: {{بيانات المتظلم ضدهم}}",
    "الأمر المتظلم منه: {{بيانات الأمر وتاريخ العلم به}}", "الوقائع", "{{الوقائع ذات الصلة بالأمر}}",
    "أسباب التظلم", "{{أسباب التظلم وأسانيدها الموثقة}}", "الطلبات", "{{الطلبات المأذون بها}}",
    "المرفقات", "{{بيان المستندات المرفقة فعلياً}}", "مقدم التظلم وتاريخه: {{التوقيع والتاريخ}}",
  ]),
  form("complaint_archive_grievance", "تظلم من قرار حفظ شكوى", "التظلمات", [
    "السيد / {{الجهة المختصة بنظر التظلم}}", "مقدم التظلم: {{بيانات مقدم التظلم وصفته}}", "ضد: {{بيانات المتظلم ضدهم}}",
    "الشكوى وقرار الحفظ: {{بيانات الشكوى والقرار وتاريخ العلم به}}", "الوقائع والإجراءات", "{{الوقائع والإجراءات ذات الصلة}}",
    "أسباب التظلم وأوجه الاعتراض", "{{أسباب التظلم وأوجه الاعتراض الموثقة}}", "الطلبات", "{{طلبات التظلم المأذون بها}}",
    "المرفقات", "{{بيان المستندات المرفقة فعلياً}}", "التوقيع والتاريخ: {{التوقيع والتاريخ}}",
  ]),
  form("document_inventory", "حافظة مستندات", "المستندات", [
    "مقدمة من: {{بيانات مقدم الحافظة وصفته}}", "ضد: {{بيانات الخصم وصفته}}",
    "في: {{بيانات الدعوى والمحكمة والدائرة}}", "جلسة: {{تاريخ الجلسة}}", "بيان المستندات",
    "التاريخ | عدد الصفحات | البيان", "{{تاريخ المستند}} | {{عدد صفحاته}} | {{وصف المستند المرفق فعلياً}}",
    "{{صفوف المستندات الإضافية المرفقة فعلياً}}", "مقدم الحافظة: {{التوقيع}}",
  ]),
  form("criminal_complaint", "شكوى جزائية", "الشكاوى", [
    "السيد / {{جهة تقديم الشكوى}}", "مقدمة من: {{بيانات الشاكي وصفته}}", "ضد: {{بيانات المشكو ضدهم بحسب المتاح}}",
    "الموضوع: {{موضوع الشكوى}}", "الوقائع", "{{الوقائع والتسلسل الزمني دون افتراض بيانات}}",
    "الأدلة والمستندات", "{{الأدلة والمستندات المقدمة فعلياً}}", "الأسانيد", "{{الأسانيد الموثقة المرتبطة بالوقائع}}",
    "الطلبات", "{{الطلبات المأذون بها}}", "التوقيع والتاريخ: {{التوقيع والتاريخ}}",
  ]),
  form("rent_payment_notice", "إنذار بسداد متأخرات أجرة", "الإنذارات", [
    "تاريخ الإعلان: {{تاريخ الإعلان}}", "بناء على طلب: {{بيانات المنذر وصفته وموطنه}}",
    "إلى: {{بيانات المنذر إليه وصفته وعنوانه}}", "موضوع الإنذار", "{{بيانات العلاقة الإيجارية والمحل المؤجر}}",
    "بيان المطالبة", "{{فترات الأجرة والمبالغ المطالب بها وسند احتسابها}}", "مضمون الإنذار",
    "ينذر الطالب المعلن إليه بما يلي:", "{{مضمون الإنذار والمهلة المطلوبة وسندها عند الاقتضاء}}",
    "المرفقات: {{بيان المستندات المرفقة فعلياً}}", "مندوب الإعلان والتوقيع: {{بيانات الإعلان والتوقيع}}",
  ]),
  form("petition_order", "طلب استصدار أمر على عريضة", "الطلبات والأوامر", [
    "السيد / {{القاضي أو الجهة المختصة}}", "مقدم الطلب: {{بيانات مقدم الطلب وصفته}}", "ضد: {{بيانات ذوي الشأن وصفاتهم}}",
    "موضوع الطلب: {{موضوع الأمر المطلوب}}", "الوقائع والإجراءات السابقة", "{{الوقائع والإجراءات السابقة ذات الصلة}}",
    "أسباب الطلب وأسانيده", "{{أسباب الطلب وأسانيده الموثقة}}", "وجه الاستعجال إن كان لازماً", "{{الوقائع الدالة على الاستعجال عند الاقتضاء}}",
    "الطلبات", "{{صيغة الأمر المطلوب دون إضافة طلبات غير مأذون بها}}", "المرفقات: {{بيان المستندات المرفقة فعلياً}}", "التوقيع والتاريخ: {{التوقيع والتاريخ}}",
  ]),
];

export async function ensureReadyForms() {
  const db = getD1();
  const existing = await db.prepare("SELECT id FROM legal_drafting_templates WHERE id LIKE 'sabeq-ready-form-%'").all<{id: string}>();
  const ids = new Set(existing.results.map(row => row.id));
  for (const entry of readyFormCatalog) {
    if (ids.has(entry.id)) continue;
    const definition = JSON.stringify(entry);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(definition))), byte => byte.toString(16).padStart(2, "0")).join("");
    await db.prepare("INSERT INTO legal_drafting_templates (id,kind,version,title,source_filename,source_sha256,source_object_key,page_count,definition_json,status,approved_by,approved_at) VALUES (?,?,?,?,?,?,?,0,?,'draft','','') ON CONFLICT(id) DO NOTHING")
      .bind(entry.id, `ready_${entry.kind}`, entry.version, entry.title, "", hash, "", definition).run();
  }
}

export async function listReadyForms() {
  await ensureReadyForms();
  const rows = await getD1().prepare("SELECT id,title,status,definition_json FROM legal_drafting_templates WHERE id LIKE 'sabeq-ready-form-%' ORDER BY id").all<{id: string; title: string; status: string; definition_json: string}>();
  return rows.results.map(row => {
    const definition = JSON.parse(row.definition_json);
    if (definition.sourceMode !== "blank_structure_only" || definition.caseDataIncluded !== false || definition.originalFileStored !== false || !Array.isArray(definition.fields) || typeof definition.content !== "string") throw new RequestError("تعذر قراءة الصيغة المفرغة.", 503);
    return { ...definition, id: row.id, title: row.title, status: row.status };
  });
}
