import { getD1 } from "@/db";
import { privateJson } from "@/lib/request-security";
import { officialVerificationSummary } from "@/lib/official-legislation";
import { memoControlRevision } from "@/lib/legal-citation-review";
import { defenseRevision } from "@/lib/case-reasoning";
import { memoLanguageRevision } from "@/lib/memo-language";
import { pleadingStyleRevision } from "@/lib/bound-draft";
import {boundArticleTextReviewSummary} from '@/lib/bound-article-reviews';
import { env } from "cloudflare:workers";
import { textProviderSummary, type TextProviderEnvironment } from "@/lib/text-providers";

export async function GET() {
  try {
    const database = getD1();
    const [documents, chunks] = await Promise.all([
      database.prepare("SELECT COUNT(*) AS count FROM legal_documents").first<{ count: number }>(),
      database.prepare("SELECT COUNT(*) AS count FROM legal_chunks WHERE verified = 1").first<{ count: number }>(),
    ]);
    const providerSummary = textProviderSummary(env as unknown as TextProviderEnvironment);
    return privateJson({ ok: true, legalDocuments: Number(documents?.count || 0), verifiedLegalChunks: Number(chunks?.count || 0),sourceVerification:officialVerificationSummary(),memoControlRevision,defenseRevision,memoLanguageRevision,pleadingStyleRevision,boundArticleTextReview:boundArticleTextReviewSummary(),pleadingLayoutRevision:"plain-header-wide-pages-1",...providerSummary });
  } catch {
    return privateJson({ ok: false }, 503);
  }
}

