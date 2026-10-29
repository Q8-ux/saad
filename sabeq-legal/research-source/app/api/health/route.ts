import { getD1 } from "@/db";
import { privateJson } from "@/lib/request-security";
import { officialVerificationSummary } from "@/lib/official-legislation";
import { memoControlRevision } from "@/lib/legal-citation-review";

export async function GET() {
  try {
    const database = getD1();
    const [documents, chunks] = await Promise.all([
      database.prepare("SELECT COUNT(*) AS count FROM legal_documents").first<{ count: number }>(),
      database.prepare("SELECT COUNT(*) AS count FROM legal_chunks WHERE verified = 1").first<{ count: number }>(),
    ]);
    return privateJson({ ok: true, legalDocuments: Number(documents?.count || 0), verifiedLegalChunks: Number(chunks?.count || 0),sourceVerification:officialVerificationSummary(),memoControlRevision,pleadingLayoutRevision:"plain-header-wide-pages-1" });
  } catch {
    return privateJson({ ok: false }, 503);
  }
}
