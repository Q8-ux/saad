# Execution operations — 3.0.0

## What runs on the current service

Public market data, indicator calculation, legacy paper tools and the new browser execution simulator run without credentials. Real-money trading is unavailable. `/api/execution/status` exposes capability booleans only; account data and controls require an owner session and an explicitly configured demo service. No public route accepts exchange keys.

## Private OKX demo service

This is a **single-owner, single-process, spot BTC-USDT, manual IOC connector**. Use a dedicated OKX demo account with zero initial BTC and only USDT. Withdrawals, funding transfers, leverage, market orders, other symbols and unknown external orders are unsupported. Account balance differences, unsupported fee currencies and unknown order outcomes halt execution rather than silently resetting the ledger.

The existing Render free service has no dedicated persistent disk. Do not enable the connector there using ephemeral storage. Provision a dedicated persistent volume and always-on service when the owner chooses to run private account tests; no infrastructure purchase is part of this update. A free web service may sleep and is not an unattended execution worker.

Set the following **server-only** environment variables through the hosting secret settings. Never commit values to GitHub or paste exchange keys into chat:

| Variable | Requirement |
|---|---|
| `FAINANCE_EXECUTION` | Exactly `okx-demo`; other values do not enable trading |
| `OKX_DEMO_API_KEY` | Key from the dedicated demo account, with read/trade permissions |
| `OKX_DEMO_SECRET` | Matching secret |
| `OKX_DEMO_PASSPHRASE` | Matching API passphrase |
| `FAINANCE_OWNER_TOKEN` | Random secret of at least 32 characters, separate from exchange keys |
| `FAINANCE_STATE_DIR` | Absolute directory on a persistent disk, outside `public` |
| `FAINANCE_DURABLE_STORAGE` | `confirmed`, only after checking the actual mount |
| `FAINANCE_DEDICATED_ACCOUNT` | `confirmed`, only for a dedicated account |
| `FAINANCE_RISK_JSON` | Owner-approved overrides of the limits in `public/execution-core.js`; never model-written |

IP-restrict keys where supported and ensure only the dedicated process can use them. The service contains no withdrawal API. Account ownership, regional access eligibility, key permissions and IP restrictions must be checked in the exchange account; booleans are operator attestations, not proof automatically obtained from the exchange.

Example **non-secret** risk configuration for a demo test:

```json
{"capital":1000,"maxOrder":100,"maxExposure":300,"dailyLoss":30,"maxDrawdownPct":5,"riskPerTradePct":0.5,"feeBps":10,"maxSlippageBps":15}
```

These are demonstration limits, not approved real capital. Actual taker fees exceeding the configured fee ceiling block entries. Tick size, lot size and minimum quantity are queried before preview. Each preview expires after 20 seconds. Confirmation reruns balance reconciliation, market freshness, risk and inventory checks; browser-supplied prices and limits are never trusted.

## Lifecycle and recovery

1. Start paused; journal is acquired exclusively. A second writer fails closed.
2. Owner signs in over HTTPS and requests reconciliation. Ledger initialization requires zero BTC and no open orders. Existing USDT is recorded once.
3. Owner explicitly resumes manual demo execution. Preview then confirm each individual IOC order.
4. Persist `submitting` and stable client ID **before** contacting OKX. A lost response becomes `unknown`; never resend it, even if a first status lookup returns not found.
5. Reconcile cumulative fills and BTC/USDT fees by client ID. Duplicate or older fill reports cannot credit the account twice. Only a confirmed terminal state releases the order reservation.
6. Stop persists the halt immediately, requests cancellation of this engine's pending orders, and confirms their statuses. Cancellation acknowledgement alone is not proof; uncertain cancellation remains unknown. Stop does not sell holdings.
7. Reconciliation polls about every five seconds while the server is running. It does not run the opportunity strategy or place protective stop/target orders. Manual orders retain stop/target fields as risk-sizing metadata only.

After a crash, preserve `execution.json` and any `.next` file. The `.lock` file intentionally prevents an automatic second writer. Confirm the old process has stopped before removing its stale lock and restarting. On restart, unresolved local orders become unknown and must be reconciled; the service stays halted until the owner resumes. Never erase the journal to bypass a mismatch. Investigate deposits, withdrawals, external trades, fee currencies and external open orders first.

`GET /api/execution/account` and POST `sync`, `preview`, `confirm`, `stop`, `resume`, `logout` require an owner cookie. POST `session` requires the owner token and the exact same origin. Sessions last one hour. All exchanges are accessed on the server only. This is an owner console, not a multi-user brokerage.

## Before expanding scope

Real-money execution, autonomous server strategy execution, exchange-native stops, Polymarket execution/settlement and two-leg failure recovery are **not implemented** in this release. Cross-exchange and Polymarket screens remain monitoring or paper tools. No market-making quote is sent to a venue. External news/LLM analysis and paid data subscriptions are also not connected.

The next release requires account/venue selection, eligibility checks, explicit capital and loss limits, deployment-grade persistent storage, several market regimes of out-of-sample/replay results, measured demo fills/reconnect recovery, and separate real-money activation. The 0–100 indicator score and the short holdout chart cannot authorize that activation. There is no promise of a 2–3% edge or continuous profit.

## Primary references checked during development

- OKX API guide (authentication, simulated trading, client IDs, order status, balances and fees): https://www.okx.com/docs-v5/en/
- Binance public market data: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints
- VWAP methodology: https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/
- Optional historical order-book/replay data: https://docs.tardis.dev/
- Optional market-data APIs and streams: https://docs.kaiko.com/

No third-party strategy code or paid indicators were copied. The new modules are original implementations.
