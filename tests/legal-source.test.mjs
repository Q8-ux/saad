import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveLegalSource,
  resolveOfficialDocumentUrl,
} from "../lib/legal-source.ts";

test("prefers the stable official source page over a direct PDF link", () => {
  assert.equal(
    resolveLegalSource({
      sourceUrl: "https://moj.gov.kw/AR/Documents/MojDocs/law.pdf",
      sourcePage: "https://moj.gov.kw/AR/Pages/MojLaws.aspx",
    }),
    "https://www.moj.gov.kw/AR/Pages/MojLaws.aspx",
  );
});

test("falls back to the exact document when no source page is stored", () => {
  assert.equal(
    resolveLegalSource({ sourceUrl: "https://example.test/law.pdf", sourcePage: "" }),
    "https://example.test/law.pdf",
  );
});

test("rejects unsafe or non-HTTPS source links", () => {
  assert.equal(
    resolveLegalSource({ sourceUrl: "javascript:alert(1)", sourcePage: "http://example.test" }),
    null,
  );
});

test("uses the exact official document for an explicit original-version action", () => {
  assert.equal(
    resolveOfficialDocumentUrl({
      sourceUrl: "https://moj.gov.kw/AR/Documents/MojDocs/law.pdf",
      sourcePage: "https://moj.gov.kw/AR/Pages/MojLaws.aspx",
    }),
    "https://www.moj.gov.kw/AR/Documents/MojDocs/law.pdf",
  );
});

test("removes invisible marks from a Ministry PDF filename", () => {
  assert.equal(
    resolveOfficialDocumentUrl({
      sourceUrl: "https://moj.gov.kw/AR/Documents/MojDocs/%D9%82%D8%A7%D9%86%D9%88%D9%86%E2%80%8B.pdf",
      sourcePage: "",
    }),
    "https://www.moj.gov.kw/AR/Documents/MojDocs/%D9%82%D8%A7%D9%86%D9%88%D9%86.pdf",
  );
});

test("rejects credentials and custom ports in source links", () => {
  assert.equal(
    resolveOfficialDocumentUrl({
      sourceUrl: "https://user:pass@moj.gov.kw:8443/AR/Documents/law.pdf",
      sourcePage: "",
    }),
    null,
  );
});
