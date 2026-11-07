import { getD1 } from "@/db";
import { privateJson } from "@/lib/request-security";
import { officialVerificationSummary } from "@/lib/official-legislation";
import { memoControlRevision } from "@/lib/legal-citation-review";
import { defenseRevision } from "@/lib/case-reasoning";
import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const database = getD1();
    const [documents, chunks] = await Promise.all([
      database.prepare("SELECT COUNT(*) AS count FROM legal_documents").first<{ count: number }>(),
      database.prepare("SELECT COUNT(*) AS count FROM legal_chunks WHERE verified = 1").first<{ count: number }>(),
    ]);
    const runtime = env as unknown as { LEGAL_AI_PROVIDER?: string; GEMINI_MODEL?: string; OPENAI_MODEL?: string };
    const textProvider = runtime.LEGAL_AI_PROVIDER?.trim() || "openai";
    return privateJson({ ok: true, legalDocuments: Number(documents?.count || 0), verifiedLegalChunks: Number(chunks?.count || 0),sourceVerification:officialVerificationSummary(),memoControlRevision,defenseRevision,pleadingLayoutRevision:"plain-header-wide-pages-1",textProvider,textModel:textProvider === "gemini" ? runtime.GEMINI_MODEL || "gemini-3.8-flash" : runtime.OPENAI_MODEL || "gpt-5.6",textProviderRevision:"gemini-structured-3" });
  } catch {
    return privateJson({ ok: false }, 503);
  }
}
