# SADAD administration only by default

Created: 2026-10-20. Latest user instruction supersedes public checkout assumptions in feature 042.

US1: The owner manages SADAD inside the independent authenticated Sabeq dashboard; configuring keys or a price does not expose payment UI to ordinary site visitors.
US2: A direct dashboard link opens Payments after authorized sign-in without bypassing authentication.

FR-001: Default publicCheckoutEnabled=false, persisted only through existing protected management settings.
FR-002: Reject required payments while public checkout is hidden; block new invoices in that mode even if an older service setting requires payment. Keep existing paid attempts and recovery usable.
FR-003: Public memo fee UI and payment labels require explicit visibility plus required payments. No provider-specific public labels; free generation uses its normal progress text.
FR-004: Dashboard shows admin-only visibility, secure keys, price, connection testing and ledger. Opening #payments or completing sign-in preserves the selected section. Unknown sections use the overview.

Acceptance: default and configured-but-hidden public policy returns false; no invoice on hidden checkout; no unintentional activation; existing paid recovery survives hiding; manager settings are protected; direct links do not fetch admin records before authentication. No payment performed with real credentials.
