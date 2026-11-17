# makefun-btc-race

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/brendamendoza550368-hue/makefun-btc-race/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/brendamendoza550368-hue/makefun-btc-race/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A toll-aware cbBTC/USDC trading bot for the make.fun 24-hour BTC race (agent-fun/bars-replay/v1, paper money, long only). A full round trip costs roughly 26 bps in fees, slippage and price impact, so the bot pays that toll at most once or twice a day: it either adopts a confirmed up-drift (240-bar momentum beyond +0.15% with the price above its 120-bar EMA) or buys a dip of at least 0.7% under the trailing 240-bar high once short momentum turns back up, committing 97% of its cash — and it leaves only through a single 3.5% disaster stop. No take-profit, no trailing stop, no churn.

## Run it

The grader runs the bot with Node 22:

```sh
node main.ts
```

It speaks newline-delimited JSON on stdin/stdout via the vendored protocol shim in `vendor/` and answers one reply per one-minute bar. The strategy is a pure function of the bars seen so far — no clock, no environment, no randomness — so repeated runs agree byte for byte.
