export type LegalSourceRecord = {
  sourceUrl: string | null | undefined;
  sourcePage: string | null | undefined;
};

function trustedHttpsUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    // The Ministry serves its official legal-library links from both hostnames,
    // but the www hostname is the canonical one and is more reliable when a
    // mobile browser leaves the installed web app to open a PDF.
    if (url.hostname.toLowerCase() === "moj.gov.kw") {
      url.hostname = "www.moj.gov.kw";
    }

    // A few historical filenames in the imported catalogue contain invisible
    // direction/zero-width marks. Those bytes create a different PDF path on
    // the Ministry server even though the link looks identical to a person.
    // Strip only these non-printing path characters, preserving the official
    // filename and its Arabic URL encoding.
    if (url.hostname.toLowerCase() === "www.moj.gov.kw") {
      url.pathname = url.pathname.replace(
        /%(?:E2%80%8B|E2%80%8C|E2%80%8D|E2%81%A0|EF%BB%BF)/gi,
        "",
      );
    }

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Ministry listing pages are more stable on mobile browsers than historical
 * direct-PDF paths. Prefer that official landing page, then fall back to the
 * exact document URL when a listing page is not available.
 */
export function resolveLegalSource(record: LegalSourceRecord): string | null {
  return trustedHttpsUrl(record.sourcePage) ?? trustedHttpsUrl(record.sourceUrl);
}

/**
 * Return the exact document URL when it is a trusted HTTPS resource. This is
 * kept separate from `resolveLegalSource`, whose purpose is to reach the
 * Ministry's catalogue page when a browser cannot render a large PDF.
 */
export function resolveOfficialDocumentUrl(
  record: LegalSourceRecord,
): string | null {
  return trustedHttpsUrl(record.sourceUrl) ?? trustedHttpsUrl(record.sourcePage);
}
