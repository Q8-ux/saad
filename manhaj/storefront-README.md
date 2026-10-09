# Manhaj storefront

The homepage adopts the reference store's information structure: a navigation/search header, a prominent introductory section, browse-by-need categories, previewable template cards, grouped workspaces, a usage sequence and a footer. Manhaj retains its own name, original copy and code-generated visual artwork. No reference brand assets, product files, pricing, customer testimonials or payment claims are copied.

There are 13 original teacher templates covering plans, lessons, meetings, projects, follow-up tasks, occasions and design. Preview shows actual template content. Using a template fills the existing workspace form or selects a real studio design; it never saves teacher records automatically. Text templates download as printable UTF-8 RTL HTML. Design templates use the existing studio's actual image/export functionality. Favorites store template IDs separately from teacher records. Search and category/favorite filters operate on real definitions.

The storefront is the default empty-hash entry. Existing deep links, the workspace dashboard, reader, analysis, curriculum metadata, teacher assistant, microphone/language editing, evidence, reports, backups and Compositor export remain available. Returning to the workspace restores its original sidebar/header layout.

This release is a teacher template/workspace portal. There is no active checkout, subscription billing, shared cloud storage or licensed Ministry book import. A commercial store would need verified product prices, fulfillment terms and a payment backend before those operations can be activated.

Validation: `node manhaj/storefront-check.cjs`; local integration check `node manhaj/analysis/ui-check.cjs` verifies preview/favorites/search, no template autosave, all prior routes and unchanged existing records. Managed preview/browser QA is unavailable in this environment; real-device visual and printing verification remains required.
