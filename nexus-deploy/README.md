# Fainance Bot

An original Arabic/English Bitcoin and Polymarket research terminal. Replaces the previous NEXUS application at the existing deployment URL: https://nexus-markets.onrender.com.

## Version 3.0.0 — opportunities, execution and independent risk

The default screen is **Trade opportunities / اقتناص الفرص**. The live-market enhancement prepared in 2.1.0 is included.

- `public/signals.js` computes EMA20/50, Wilder RSI14, MACD12/26/9, ADX14, ATR14, rolling 96-bar VWAP, relative volume, Bollinger bands, OBV change, and top-ten-level book imbalance. Book imbalance is a snapshot, not cumulative trade delta. Five-minute closed candles are checked against closed 15-minute and hourly frames. Invalid, gapped, future or stale data block signals.
- Original rule confluence is scored 0–100; it is **not a calibrated probability**. Trend, volume, momentum, multi-timeframe agreement and liquidity are separate inputs. ADX, volume, spread, volatility and modeled cost gates can force a wait. A sell signal only reduces owned spot BTC. No derivatives or shorting. A decline target is never presented as profit from a short position.
- Buy scenarios use max(1.5 ATR, 0.2% of entry) stop distance and 2.2 times that distance as a target. Reaching the target is conditional; it is not an estimate of expected profit. Fees and adverse slippage are assumptions until an authenticated fee check succeeds.
- `public/execution-core.js` is a broker-independent order state machine: prepared, submitting, live, partial, filled, canceled, rejected, unknown. Stable IDs, cumulative-fill reconciliation, reserved exposure, cash and base-asset fees, IOC depth fills, trade-loss sizing and explicit stale-data gates are implemented. Unknown submissions block new orders.
- **Execution & risk** has a separate device-local paper ledger (`fainance.execution.v3`), manual preview/confirm, optional confluence bot, ownership-checked sells, independent risk form, audit events and JSON export. Browser Locks serialize tabs; unsupported browsers block mutations. Limits apply to every entry; models cannot edit limits. Five-second market quotes and roughly ten-second strategy refresh are not low-latency execution.
- Default paper limits: capital ceiling 1,000 USDT, order cap 100, total exposure 300, daily loss 30, drawdown 5%, per-trade modeled risk 0.5% of ceiling. Daily P&L includes unrealized P&L and resets at Kuwait midnight. Virtual cash remains 10,000 USDT, separately from deployment ceilings.
- The paper bot requires a qualifying rule score, ownership constraints and risk checks, with a 60-second entry cooldown. It starts disabled and works only while the browser is visible. Paper stop/target checks are IOC simulations and may leave residual holdings. Emergency stop blocks new orders, cancels prepared local orders and **does not liquidate holdings**. Resume is separate.
- `lib/okx-demo.js` implements signed OKX **demo-only** spot IOC submission, order lookup by client ID, cancellation, balances, instrument steps and authenticated taker fees. The simulation header is mandatory and cannot be turned off. **No real-money adapter or endpoint is enabled in this release.**
- `lib/execution-service.js` adds owner-only sessions (HttpOnly/Secure/SameSite cookies), same-origin writes, bounded inputs, login throttling, an fsynced atomic journal and a single-writer file lock. It journals before sending, never retries an ambiguous submission, reconciles balances and outstanding orders, and starts halted on every restart. It is disabled in the current deployment because dedicated demo credentials, owner token and durable storage are absent. No keys were obtained or configured.
- Server demo orders are **manual**. Stop and target fields are for risk sizing/documentation; the connector does not place contingent stop/target orders or run the browser's strategy autonomously. There is no real trading or proof of profitability. See [OPERATIONS.md](OPERATIONS.md) for requirements and exact boundaries.
- The new holdout tool tests a **simpler, single-timeframe trend rule**, on the final 30% of available 5m candles, with next-open entries, conservative same-bar stop priority, fees/slippage, drawdown and buy-and-hold baseline. It does not validate the full multi-timeframe/order-book strategy. The few days of available candles are insufficient to qualify deployment with real funds.
- Tardis.dev, Kaiko and TradingView are optional data/research candidates with official links, **not active paid integrations**. No subscription was purchased. Numeric indicators are computed locally. The existing logistic model is retained; no news feed or external LLM is connected.

Validation: 30 deterministic tests cover the legacy engine, live observations, indicators, journal exclusivity, authentication, lost submit responses, cumulative partial fills, duplicate requests, balances, risk and holdout boundaries. Browser tests exercise live sources, both languages, mobile layout, paper buy/sell, emergency stop, risk rejection and API failure. Broker integration tests use controlled fake transport; no demo or real account orders were sent during development.

## Live market board (2.1.0)

The **Live markets / السوق الآن** page displays public spot-market observations independently of paper account balances:

- Actual last-trade prices for BTC, ETH, SOL, XRP, BNB and DOGE against USDT from Binance's official market-data-only REST API.
- Rolling 24-hour change, high/low, base and quote volume; bid/ask spread is identified as a spread, never a profit.
- BTC/USDT last trade and best bid/ask on Binance, OKX and Bybit, with source timestamp and server receipt timestamp separately displayed.
- Five-second browser polling of `/api/market-board`, shared server cache of at most three seconds, and independent provider failures. Requests may take longer during upstream timeouts. No generated or fallback prices are inserted.
- A quote is fresh only if both timestamps are valid and at most 15 seconds old. Freshness ages once per second in the visible browser; response receipt never overwrites an old upstream timestamp. Invalid/future timestamps are flagged. Retained readings after an API failure are marked stale immediately.
- Binance `closeTime` identifies the rolling-statistics window end, not a claim about the last trade's execution time. OKX ticker `ts` and Bybit response `time` are exchange snapshot timestamps. Display timezone is Asia/Kuwait. Prices are denominated in USDT and are not automatically converted to USD.
- Current Bitcoin order-book levels and Polymarket contract asks retain their independent 10-second polling and timestamps. Closed-candle charts are explicitly identified separately from current last-trade prices.
- Timestamped JSON export includes source, values, source time, receipt time and freshness at export.

Live market data does not enable real-money trading or change the device-local paper wallet. The existing manual and automatic paper trading workflows are retained.

## Run

Node 22 or newer; no runtime dependencies and no install step.

```sh
cd nexus-deploy
node server.js
node --test test/*.test.js
```

Render keeps the existing service and `nexus-markets-production` branch. The start command remains `node nexus-deploy/server.js`. All source files for this application are scoped to this directory; unrelated projects in the shared repository are untouched.

## Working features

- Arabic by default, RTL layout and locally hosted Al-Mohanad font already supplied by the repository; full English mode and mobile layout.
- Public BTC/USDT order books from Binance's market-data-only API, OKX, and Bybit, with explicit availability and timestamps. Closed Binance candles across 1m, 5m, 15m and 1h.
- Polymarket BTC UP/DOWN discovery for current/next 5m and 15m markets plus the current hourly market. Exact condition and token validation, executable order-book depth, per-market fee schedule, adverse slippage, minimum size and stale-book checks.
- Cross-exchange spread monitor; maker quote planner with inventory skew; complete-set hedge coverage calculator.
- Device-local paper account: virtual $10,000 initial balance, depth-based spot buys/sells, simulated pairs, full ledger, JSON export/import, per-entry limits, daily realized-loss cap, stop/take-profit checks, emergency stop.
- Optional paired paper bot while the page is visible. No real-money orders are implemented. Polling is approximately 10 seconds and may slow on upstream timeouts. This is not a low-latency trading service.
- Historical long-only EMA and RSI tests, next-open fills, fees/slippage and equity drawdown; original logistic-regression direction model with chronological train/holdout split and majority-class baseline.
- Explainable indicators, model metrics and a local decision audit log. No LLM service is connected or impersonated.

## Modeling boundaries

Paper pairs assume both legs fill and each complete set settles for $1 at market expiry. Actual execution is not atomic; a partial fill exposes the account to price direction. Pair P&L excludes network/settlement costs and does not claim guaranteed returns. Pairs are held at cost until modeled maturity, not marked as a guaranteed profit. The simulator does not verify an actual on-chain resolution.

Polymarket fees come from the market's `feeSchedule` (rate and exponent). Only the verified current exponent 1 is supported; unknown schedules are blocked. Explicit `feesEnabled: false` is required to assume zero fees. Costs are summed across available depth and conservatively rounded up to 5 decimals. Fees are not inferred from promotional spreads. A pair priced at 0.48 + 0.49 costs more than $1 after a rate of 0.07 on each leg.

Spot fees and slippage are editable assumptions, not an authenticated account tier. Cross-venue spreads require inventory on both venues and exclude transfer/rebalancing costs. Maker quotes are not treated as fills. Direction models are uncalibrated, research-only probabilities, not expected profits.

Stops are checked using available depth on refresh while the browser is open; no background execution, stop guarantees, or limit-queue simulation. Daily risk uses realized losses since UTC midnight. Risk settings apply to new entries; each spot position retains its entry stop/take percentages. A halted wallet may still perform risk-reducing exits. The terminal is publicly viewable; private paper state stays in the local browser. The legacy paper wallet has no login or brokerage connection; optional owner authentication belongs only to the new disabled-by-default demo execution service. Browser storage can be lost; export backups. Browser Locks and storage events coordinate tabs; no claim of tamper-proof accounting is made.

## Sources and external projects

Public-source schemas checked against official documentation on 2026-10-02:

- https://docs.polymarket.com/trading/fees
- https://docs.polymarket.com/trading/place-orders
- https://docs.polymarket.com/trading/positions/manage
- https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md
- https://www.okx.com/docs-v5/en/
- https://bybit-exchange.github.io/docs/v5/market/orderbook

Hummingbot, Freqtrade/FreqAI, Polymarket's unified SDK, NautilusTrader, CCXT and LEAN are linked as research references. Their code is not copied, their runtimes are not installed, and their engines are not claimed as active integrations. No funds, wallets, secrets, subscriptions or paid services are created.

## Validation

`node --test test/*.test.js` exercises fee-negative pairs, multi-level fills, stale and mismatched markets, missing fee schedules, capital conservation, risk gates and chronological holdout/look-ahead protection. Market-data tests also verify raw price preservation, percentage/volume normalization, timestamp freshness and rejection of missing/crossed prices. Browser checks cover both directions, narrow screens, navigation, paper order/close, risk controls, bot stop, backtests, hedging, live quote export, automatic refresh and data-error states. The code exposes version 3.0.0 via `/api/health`; `/api/market-board`, `/api/snapshot`, `/api/candles` and `/api/signals` are read-only. The new private execution endpoints are separately authenticated and disabled unless explicitly configured.
