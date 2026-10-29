import { FileText, ShieldCheck } from "lucide-react";
import type { LegalIntakeState } from "@/lib/openai";
import { buildMemoHandoff, canPrepareMemoHandoff, conversationTranscript, memoApprovalNotice, memoConversationGaps, type ConversationMessage, type MemoPrefill } from "@/lib/memo-handoff";

export function AssistantMemoAction({ language, intake, messages, busy, onContinue }: {
  language: "ar" | "en" | "ur";
  intake: LegalIntakeState | null;
  messages: ConversationMessage[];
  busy: boolean;
  onContinue: (data: MemoPrefill) => void;
}) {
  const ready = !!intake && canPrepareMemoHandoff(intake, messages);
  const label = language === "en" ? "Generate memorandum" : language === "ur" ? "یادداشت تیار کریں" : "توليد المذكرة";
  const status = busy
    ? (language === "en" ? "Wait for the current response to finish." : language === "ur" ? "موجودہ جواب مکمل ہونے کا انتظار کریں۔" : "انتظر اكتمال الرد الحالي.")
    : !intake
      ? (language === "en" ? "Describe your case to prepare the memorandum details." : language === "ur" ? "یادداشت کی تیاری کے لیے اپنا مقدمہ بیان کریں۔" : "ابدأ بوصف قضيتك لتجهيز بيانات المذكرة.")
      : conversationTranscript(messages).length > 30000
        ? (language === "en" ? "Export the conversation and shorten it to 30,000 characters before transfer." : language === "ur" ? "منتقلی سے پہلے گفتگو برآمد کریں اور اسے 30,000 حروف تک مختصر کریں۔" : "صدّر المحادثة واختصرها إلى 30,000 حرف قبل نقلها للمذكرة.")
        : !ready
          ? memoConversationGaps(intake, language)[0]?.question || (language === "en" ? "Continue with the assistant to complete the case review." : language === "ur" ? "مقدمے کا جائزہ مکمل کرنے کے لیے معاون کے ساتھ جاری رکھیں۔" : "تابع مع المساعد لاستكمال مراجعة بيانات القضية.")
          : (language === "en" ? "Review the case summary, party role and court. Continue to approve the details before generation." : language === "ur" ? "خلاصہ، فریق کی حیثیت اور عدالت دیکھیں؛ تیاری سے پہلے تفصیلات منظور کرنے کے لیے جاری رکھیں۔" : "سيستكمل المساعد البيانات من المحادثة والمرفقات ويجهّز المسودة للمراجعة دون إعادة الأسئلة.");
  return <div className="memo-consent assistant-memo-action">
    <ShieldCheck size={22} aria-hidden="true" />
    <div><b>{label}</b><p id="assistant-memo-status" role="status">{status}</p>{ready && <p role="note">{memoApprovalNotice[language]}</p>}</div>
    <button type="button" className="button button-primary" disabled={!ready || busy} aria-describedby="assistant-memo-status" onClick={() => {
      if (!intake || !ready || busy) return;
      onContinue({ ...buildMemoHandoff(intake, messages), conversationTranscript: conversationTranscript(messages, language) });
    }}><FileText size={18} aria-hidden="true" />{label}</button>
  </div>;
}
