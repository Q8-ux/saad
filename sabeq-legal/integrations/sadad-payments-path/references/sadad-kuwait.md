# SADAD Kuwait API — verified 2026-10-20

## Identity and sources

فيديو المستخدم «sadad» يعرض لوحة `sadadpay.net` وKWD وإعدادات Profile → Update Profile → API: Client Key, Client Secret, Payment Success Return URL, Payment Failed Return URL, Webhook URL. تظهر مفاتيح كاملة في جزء من الفيديو؛ لا تنقل قيمها أو بيانات الحساب إلى هذه المهارة. ظهور Active لا يثبت تحصيل دفعة أو اعتماد حساب التاجر للمشروع.

Primary sources:
- https://sadadpay.readme.io/reference/api-access
- https://sadadpay.readme.io/reference/api-access-copy
- https://sadadpay.readme.io/reference/refresh-token
- https://sadadpay.readme.io/reference/access-token
- https://sadadpay.readme.io/reference/create-invoice
- https://sadadpay.readme.io/reference/payment-status
- https://sadadpay.readme.io/reference/postman-collection
- https://sadadpay.readme.io/reference/webhook
- https://sadadpay.readme.io/reference/invoice-paid-webhook
- https://api.sadadpay.net/swagger/SadadAPI/swagger.json
- https://github.com/Sadadkw/sadad-flutter-sdk

## Exact endpoints

| Operation | Method/path | Authentication/result |
| --- | --- | --- |
| Refresh | POST /api/User/GenerateRefreshToken | Basic base64(clientKey:clientSecret), no body → response.refreshToken |
| Access | POST /api/User/GenerateAccessToken | Bearer refreshToken, no body → response.accessToken and response.expiredAfterSeconds |
| Invoice | POST /api/Invoice/insert | Bearer accessToken; invoices[] → response.invoiceId |
| Verify | GET /api/Invoice/getbyid?id=… | Bearer accessToken → response invoice object |

Expected envelope: `isValid: true`, `errorKey: null`, `response: {...}`. Treat invalid/missing fields as unverified. Refresh expiry is undocumented. Generate another access token when expired; never blindly repeat an invoice POST after an ambiguous timeout.

Live API: `https://api.sadadpay.net`; sandbox: `https://apisandbox.sadadpay.net`. Checkout: `https://sadadpay.net/pay/{key}` or `https://sandbox.sadadpay.net/pay/{key}`. Accounts are separate and require activation.

## Invoice contract

Use lowercase `invoices` from current Swagger. Invoice: `amount` numeric in KWD, `currency_Code: "KWD"`, `ref_Number`, `customer_Name`, `lang`, optional `items: [{name, quantity, amount}]`, `success_ReturnURL`, `fail_ReturnURL`. Minimize identity fields; do not require phone unless the actual API/account requires it. The guide says amount is KWD even when another currency is selected; the Sabeq path intentionally supports KWD only.

GetById documented fields: `id`, `key`, `code`, `ref_Number`, `currency_Code`, `status`, `amount`, `total`, `subtotal`, `alt_Amount`, `refunded_Amount`, `transactions`, `transactionID`, `paymentGateway`, `paymentGatewayCode`, `url`, `success_ReturnURL`, `fail_ReturnURL`.

Paid state: `Paid`; unpaid example: `Unpaid`. Do not assume arbitrary numeric status codes. The invoice summary uses `transactionID`; transaction rows use `transactionId`, `invoice_Id`, `status`, `response`, `amount`, `currencyCode`. No transaction status enum or paid response schema is documented. Confirm real paid fixtures before claiming live compatibility. Do not infer success merely from an arbitrary transaction row.

## Webhook

Configure the global Webhook URL in Profile → Update Profile → API. Current Swagger has no profile update endpoint and no per-invoice webhook field. Per-invoice success/fail URLs are supported by the DTO; verify actual account behavior.

Paid payload: `InvoiceId`, `InvoiceCode`, `InvoiceKey`, `Status`, `Amount`, `PaymentMethod`, `TransactionId`. No signature/HMAC contract is documented. Verify with GetById before granting service; acknowledge safely processed events with HTTP 200. Documented retry interval: 3 minutes, maximum 5 attempts. Never let an unsigned incoming event modify the authoritative expected amount or local order reference.
