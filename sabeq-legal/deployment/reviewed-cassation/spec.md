# Source-matched cassation principles

## Problem
The active file-only legislation adapter returns no judgments, although seven uploaded judicial collections (5108 PDF pages) exist in the production catalogue. OCR flags and a collection title do not verify an individual appeal. Several files contain reversed digits or damaged character maps.

## Scope and assumptions
- Keep the bound legislation source and its file-only restriction unchanged.
- Add only individually source-page-reviewed principles from the user's existing judicial collections. No external legal research, public case archive retrieval, invented references, or blanket approval of a book.
- Identify each principle with its source hash, PDF/printed page, appeal number/year, session date, chamber, exact reviewed quotation and extraction limitations.
- A judicial digest is not the full judgment or independent verification of its current authority.
- Match the legal issue and material facts; a keyword hit is a candidate only. The checked memo plan must explicitly distinguish an analogous principle from a different or insufficient case before citing it.
- Keep source excerpts and corpus data server-side and out of the public GitHub mirror and browser bundles.

## Acceptance
- The assistant and memo retrieve the same reviewed records, and handoff IDs are re-read from the server.
- Unreviewed/OCR-only records, invalid dates, missing appeal identity and corrupted source metadata cannot become evidence.
- A fabricated appeal number, year, date, or source marker fails citation review.
- Memo citations to a reviewed principle require a checked plan's analogous match tied to the actual fact quote and issue; distinguished/insufficient matches are not supporting authority.
- Unknown or nonmatching questions return no invented judicial fallback.
- Source coverage reports the reviewed sample and remaining collection pages separately, with human legal review still required.

## Limits
Visual review is a bounded sample, not verification of every judgment in 5108 pages. No live paid model call or external official judgment retrieval is included.
