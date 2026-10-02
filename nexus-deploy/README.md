# Fainance Bot

An original Arabic/English Bitcoin and Polymarket research terminal. Replaces the previous NEXUS application at the existing deployment URL: https://nexus-markets.onrender.com.

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

Stops are checked using available depth on refresh while the browser is open; no background execution, stop guarantees, or limit-queue simulation. Daily risk uses realized losses since UTC midnight. Risk settings apply to new entries; each spot position retains its entry stop/take percentages. A halted wallet may still perform risk-reducing exits. The terminal is publicly viewable; private paper state stays in the local browser. There is no login, brokerage connection, cloud account, or server-side paper balance to share accidentally. Browser storage can be lost; export backups. Browser Locks and storage events coordinate tabs; no claim of tamper-proof accounting is made.

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

`node --test test/*.test.js` exercises fee-negative pairs, multi-level fills, stale and mismatched markets, missing fee schedules, capital conservation, risk gates and chronological holdout/look-ahead protection. Browser checks cover both directions, narrow screens, navigation, paper order/close, risk controls, bot stop, backtests, hedging and data-error states. Production endpoints expose version 2.0.0 via `/api/health`; `/api/snapshot` and `/api/candles` are read-only.
