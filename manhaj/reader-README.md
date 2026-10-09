# Internal document library

The 224 Ministry records remain source metadata. No Ministry textbook files or full-text corpus have been mirrored. The Ministry's official 9 September 2025 announcement of intellectual-property protections prohibits copying/republication of government textbooks and derivative educational summaries/question banks. Public Ministry content import requires a suitable permission/license; merely exposing a public download endpoint is not such permission.

Official announcement: https://www2.moe.edu.kw/news/GetNewsDetail?NewsId=910
Official decision document: https://elibrary.moe.edu.kw/api/File/download/document/102

The reader works with user-supplied documents in IndexedDB. New uploads preserve their original File alongside extracted pages; existing and JSON-restored documents retain text-only reading until the original is added again. Text document backups omit the original binary files, as stated in the UI. Download originals separately. Original uploads are not sent to GitHub or a server.

The reader provides text pagination, lexical search and page references, lazy PDF.js image rendering of the original local PDF, and user-reviewed preparation of lesson/plan forms from a selected page. It never auto-saves lesson/plan drafts. Rules may identify explicit objective phrases; this does not constitute generative pedagogical analysis or verified curriculum alignment. There is no shared server document database or LLM integration in this release. Scanned-only OCR remains unavailable.

Tests exercise real local IndexedDB text retrieval, page navigation, search-to-page, draft preparation and absence of automatic saving. Browser PDF rendering and device-specific Arabic reading order still require real-device visual verification.
