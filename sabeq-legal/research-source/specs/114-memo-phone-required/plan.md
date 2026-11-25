# Plan

Update the existing shared contact parser and localized field labels. Remove only the email input's required attribute. Both public API gates already share this parser, so no API shape, database or integration change is needed. Retain the existing private customer-contact display, which supports phone-only records.

Verify parser, form rendering, generation, checkout and contact display with synthetic data, then run the required build. Publish the backend and the scoped GitHub public client built from its existing source variant.
