import checks from "@/data/legal-sources/catalogue-checks.json";
import catalogues from "@/data/legal-sources/catalogues.json";
import { officialVerificationSummary } from "./official-legislation";
import { isJudgmentEvidence, type LegalEvidence } from "./legal-search";

// Catalogue links are discovery aids. They NEVER acquire source markers and
// cannot pass as evidence merely because the host is an official institution.
export function legalSourceCoverage(evidence: LegalEvidence[], lookupFailed = false) {
  const verification = officialVerificationSummary();
  const legislation = evidence.filter(item => !isJudgmentEvidence(item) && item.verification?.status === "source_verified").length;
  const judgments = evidence.filter(isJudgmentEvidence).length;
  return {
    revision: catalogues.revision,
    status: lookupFailed ? "lookup_failed" : !evidence.length ? "no_matching_verified_passage" : legislation && judgments ? "passages_found" : "partial_passages",
    legislationPassages: legislation,
    judgmentPassages: judgments,
    reviewedArticleCount: verification.reviewedArticleCount,
    completeCoverage: false,
    currentConsolidationVerified: false,
    cataloguesCheckedAt: checks.checkedAt,
    sources: catalogues.sources.map(source => {
      const check = checks.sources.find(item => item.id === source.id);
      return { ...source, lastFetchStatus: check?.status || "not_checked", downloadedPdfCount: check?.documents.filter(item => (item as {status?:string}).status === "downloaded_pending_review").length || 0 };
    }),
    gaps: [
      ...(lookupFailed ? ["تعذر الاتصال بالمكتبة؛ لا يُفسَّر ذلك بأنه عدم وجود سند قانوني."] : []),
      ...(!legislation ? ["لم يُسترجع نص تشريعي مطابق للمصدر؛ يلزم استكمال البحث والمراجعة."] : []),
      ...(!judgments ? ["لم يُسترجع حكم مرتبط؛ يلزم بحث قضائي مستقل عند الحاجة."] : []),
      "روابط الجهات أدلة اكتشاف وليست أسانيد. لا تُنقل منها أرقام أو أحكام دون نص موثق.",
      "سريان النص وتعديلاته وانطباقه على تاريخ الواقعة يحتاجان مراجعة مستقلة.",
    ],
  };
}
export function formatSourceCoverage(evidence: LegalEvidence[]) {
  const coverage = legalSourceCoverage(evidence);
  return `حالة البحث: ${coverage.status}. فقرات تشريعية مطابقة للمصدر: ${coverage.legislationPassages}. مقاطع قضائية: ${coverage.judgmentPassages}.\nنواقص البحث (للمراجعة خارج نص الصحيفة): ${coverage.gaps.join(" ")}\nدليل استكمال البحث الرسمي — الروابط التالية ليست نصوصاً أو أسانيد ولا يجوز تحويلها إلى إحالات م:\n${coverage.sources.map(s => `${s.title}: ${s.url}${s.access === "licensed_or_on_site" ? " — قد يتطلب وصولاً مرخصاً أو حضوراً للمكتبة" : ""}`).join("\n")}`;
}
