import { getD1 } from "@/db";
import { privateJson } from "@/lib/request-security";
import { officialVerificationSummary } from "@/lib/official-legislation";
import { memoControlRevision } from "@/lib/legal-citation-review";
import { defenseRevision } from "@/lib/case-reasoning";
import { memoLanguageRevision } from "@/lib/memo-language";
import {boundArticleTextReviewSummary} from '@/lib/bound-article-reviews';
import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const database = getD1();
    const [documents, chunks] = await Promise.all([
      database.prepare("SELECT COUNT(*) AS count FROM legal_documents").first<{ count: number }>(),
      database.prepare("SELECT COUNT(*) AS count FROM legal_chunks WHERE verified = 1").first<{ count: number }>(),
    ]);
    const runtime = env as unknown as { LEGAL_AI_PROVIDER?: string; GEMINI_MODEL?: string; OPENAI_MODEL?: string; LEGAL_AI_FALLBACK_PROVIDER?: string; OPENAI_API_KEY?: string };
    const textProvider = runtime.LEGAL_AI_PROVIDER?.trim() || "openai";
    const textFallbackProvider = textProvider === "gemini" && runtime.LEGAL_AI_FALLBACK_PROVIDER?.trim() === "openai" && runtime.OPENAI_API_KEY?.trim() ? "openai" : null;
    return privateJson({ ok: true, legalDocuments: Number(documents?.count || 0), verifiedLegalChunks: Number(chunks?.count || 0),sourceVerification:officialVerificationSummary(),memoControlRevision,defenseRevision,memoLanguageRevision,boundArticleTextReview:boundArticleTextReviewSummary(),pleadingLayoutRevision:"plain-header-wide-pages-1",textProvider,textModel:textProvider === "gemini" ? runtime.GEMINI_MODEL || "gemini-3.8-flash" : runtime.OPENAI_MODEL || "gpt-5.6",textFallbackProvider,textFallbackPolicy:textFallbackProvider ? "explicit-rejection-once" : null,textProviderRevision:"gemini-structured-4" });
  } catch {
    return privateJson({ ok: false }, 503);
  }
}
