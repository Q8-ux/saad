# Verification — temporary one-dinar pricing
- GET policy before change: priceFils=50000, currency=KWD, required=true, environment=live, ready=true.
- service_settings.memo in production remains 50000 fils. The runtime flag is scoped to the effective price for new orders; disable/remove SABEQ_MEMO_TEST_ONE_KWD to restore the saved 50 KWD.
- 24 provider-boundary and payment-dialog tests passed, including a 50 KWD existing invoice and a new 1 KWD invoice followed by restoration; all provider calls in these tests were synthetic.
- Official invoice currency documentation rechecked 2026-10-28: https://sadadpay.readme.io/reference/create-invoice .
- No live invoice, payment or refund was initiated by this change. Native v153 deployed successfully with environment revision 17; runtime setting SABEQ_MEMO_TEST_ONE_KWD=true. Verified live GET /api/payments/sadad: priceFils=1000, currency=KWD, ready=true, required=true, environment=live. No invoice, charge or refund was created by the verification.
