# Stock Opportunity Radar — Technical Stock Screener

**Status: static interactive prototype committed to GitHub.** No live stock exchange data, brokerage trading, real-money subscriptions, or financial recommendations.

## App

- Browser dashboard: `index.html`.
- Languages: Arabic (RTL), English, Bahasa Indonesia.
- Demo: synthetic OHLCV histories labeled `DEMO-*` and `SYNTHETIC` — **never real market quotes**.
- Import: client-side CSV file with daily bars.
- Features: market filter (ID, IN, VN, US), setup filters, search, minimum setup-match score, close-price charts, explanation of conditions, report CSV export.
- Calculations: SMA20, SMA50, RSI14, ATR14, 20-day prior high, ratio of latest volume to preceding 20-bar average.
- Patterns: breakout, pullback near SMA20, bullish momentum, weak conditions, neutral.
- No data leaves browser via this app; it has no network API calls and no account system.

## CSV import specification

UTF-8 comma-separated values with header:

```csv
date,symbol,market,open,high,low,close,volume
2026-01-05,EXAMPLE-ID,ID,101,105,99,103,480000
2026-01-06,EXAMPLE-ID,ID,103,106,101,104,520000
```

Required: `date` (YYYY-MM-DD), `symbol`, `open`, `high`, `low`, `close`, `volume`.
Optional `market`: `ID` (Indonesia), `IN` (India), `VN` (Vietnam), `US`; omitted market defaults to ID.

At least **55 daily trading records per symbol** are required for screening. Up to **8 MB** and **120,000 input lines**. Data is sorted by date and duplicate dates per symbol take the last occurrence. It is the user's responsibility to verify adjusted/unadjusted prices, splits, trading calendar, corporate actions, data freshness, and data-source licensing.

Download the **synthetic example CSV** using the button in the app: 90 rows for one demo symbol. The example is not appropriate for investment decisions.

## Definitions (education only)

- Breakout: last close higher than maximum high of preceding 20 bars, latest volume >= 1.5× mean preceding 20 bars, SMA20 > SMA50.
- Pullback: SMA20 > SMA50, last close within ±2% of SMA20, RSI14 between 40 and 65, volume ratio >= 0.7.
- Momentum: SMA20 > SMA50, RSI14 55–75, volume ratio > 1.
- Weakness: last close < SMA50 and RSI14 < 45.
- Neutral: other patterns.
- Setup-match score 0–100 is a **deterministic condition-matching score**, not a forecast, recommendation or estimated probability of profit.
- RSI14 is calculated from the final 14 price changes using a simple average of gains/losses (not Wilder smoothing). ATR14 is a simple average of the last 14 true ranges.
- A minimum of 55 sessions ensures indicators and lagged volume averages can be calculated.

## What is NOT implemented

- Market data provider or exchanges' licensing/redistribution agreements.
- Streaming quotes, alerts, broker integrations, order placement.
- Secure user accounts, subscriptions, billing, automatic reports.
- Fundamental analysis, backtesting or validation of expected strategy profitability.
- Exchange-specific rules, taxes or suitability checks.

## Deployment

Project is located at: https://github.com/Q8-ux/saad/tree/main/stock-opportunity-radar

If GitHub Pages is configured to publish repository root from `main`, its expected path is `https://q8-ux.github.io/saad/stock-opportunity-radar/`. **This path is not proof of a successful deployment**. Verify through repository Settings → Pages and the public URL before declaring it live.

Keep this independent directory. **Do not change GitHub Pages publication source** without assessing the impact on other projects using this repository.

## Risk controls

This app is for educational filtering. It does not tell users to buy or sell specific securities. Do not promote its results as personalized recommendations or guaranteed winning trades. Research local licensing, marketing restrictions and data distribution rights before adding paid signals or subscriptions.
