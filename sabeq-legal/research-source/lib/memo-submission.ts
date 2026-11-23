// Transport and session state only. This module never writes or revises a memo.
export type MemoRequestStage = "preparation" | "input_validation" | "access" | "payment" | "generation" | "saving" | "source_review" | "defense_review" | "document_review" | "legal_route_review" | "fact_clarification";
const stages: MemoRequestStage[] = ["preparation", "input_validation", "access", "payment", "generation", "saving", "source_review", "defense_review", "document_review", "legal_route_review", "fact_clarification"];
const reviews = new Set<MemoRequestStage>(["source_review", "defense_review", "document_review", "legal_route_review", "fact_clarification"]);

export class MemoSubmissionError extends Error {
  constructor(message: string, public stage: MemoRequestStage, public requestId = "", public status = 0) {
    super(message); this.name = "MemoSubmissionError";
  }
  get savedForReview() { return this.status === 422 && !!this.requestId && reviews.has(this.stage); }
}

function caseKey(input: Record<string, string>) {
  // importMemoDraft removes blank optional fields between steps.
  return JSON.stringify(Object.keys(input).filter(key => input[key]?.trim()).sort().map(key => [key, input[key]]));
}

export class MemoSubmissionSession {
  private busy = false;
  private preparedKey = "";
  begin() { if (this.busy) return false; this.busy = true; return true; }
  end() { this.busy = false; }
  async prepare(input: Record<string, string>, operation: () => Promise<{ input?: Record<string, string> }>, reviewedInput = false) {
    // Final review adds form defaults; send the reviewed fields unchanged and
    // let the existing server validator check them instead of extracting again.
    if ((reviewedInput && this.preparedKey) || caseKey(input) === this.preparedKey) return input;
    const prepared = await operation();
    if (!prepared.input || typeof prepared.input !== "object" || Array.isArray(prepared.input) || Object.values(prepared.input).some(value => typeof value !== "string")) {
      throw new MemoSubmissionError("", "preparation");
    }
    this.preparedKey = caseKey(prepared.input);
    return prepared.input;
  }
}

export async function readMemoServiceJson<T extends { error?: string }>(response: Response, fallbackStage: MemoRequestStage): Promise<T> {
  let data: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(await response.text());
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_response");
    data = value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && /AbortError|TimeoutError/.test(error.name)) throw error;
    throw new MemoSubmissionError("", fallbackStage, "", response.status);
  }
  if (!response.ok) {
    const stage = stages.includes(data.stage as MemoRequestStage) ? data.stage as MemoRequestStage : fallbackStage;
    const id = typeof data.requestId === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(data.requestId) ? data.requestId : "";
    throw new MemoSubmissionError(typeof data.error === "string" ? data.error : "", stage, id, response.status);
  }
  return data as T;
}

export function memoSubmissionCopy(language: string, stage: MemoRequestStage) {
  const index = language === "en" ? 1 : language === "ur" ? 2 : 0;
  const labels: Record<MemoRequestStage, string[]> = {
    preparation: ["تجهيز البيانات", "Preparing case information", "مقدمے کی معلومات کی تیاری"],
    input_validation: ["التحقق من البيانات", "Checking case information", "معلومات کی جانچ"],
    access: ["التحقق من الجلسة", "Checking your session", "نشست کی جانچ"],
    payment: ["التحقق من الدفع", "Checking payment", "ادائیگی کی جانچ"],
    generation: ["إرسال طلب المذكرة", "Submitting the memorandum request", "یادداشت کی درخواست جمع کرنا"],
    saving: ["حفظ المذكرة", "Saving the memorandum", "یادداشت محفوظ کرنا"],
    source_review: ["مراجعة الأسانيد", "Reviewing legal sources", "قانونی ماخذ کا جائزہ"],
    defense_review: ["مراجعة الدفوع", "Reviewing arguments", "دلائل کا جائزہ"],
    document_review: ["مراجعة المذكرة", "Reviewing the memorandum", "یادداشت کا جائزہ"],
    legal_route_review: ["مراجعة مسار القضية", "Reviewing the case route", "مقدمے کے راستے کا جائزہ"],
    fact_clarification: ["استكمال الوقائع", "Completing case facts", "حقائق کی تکمیل"],
  };
  return {
    stage: labels[stage][index],
    stageLabel: ["مرحلة الطلب", "Request stage", "درخواست کا مرحلہ"][index],
    reference: ["رقم الطلب", "Request number", "درخواست نمبر"][index],
    review: ["طلبك محفوظ للمراجعة", "Your request is saved for review", "درخواست جائزے کے لیے محفوظ ہے"][index],
    failure: ["تعذر إكمال هذه الخطوة. بياناتك ومرفقاتك ما زالت هنا؛ لم يُعد النظام إرسال طلب التوليد تلقائيًا.", "This step could not be completed. Your information and attachments are still here; the generation request was not retried automatically.", "یہ مرحلہ مکمل نہیں ہو سکا۔ معلومات اور منسلکات یہاں موجود ہیں؛ تیاری کی درخواست خودکار طور پر دوبارہ نہیں بھیجی گئی۔"][index],
  };
}
