// Toll-aware holder for the cbBTC/USDC minute replay.
//
// A full round trip costs roughly 26 bps in fees, slippage and price
// impact, while a single day of cbBTC often moves less than a percent, so
// this bot pays the toll at most once or twice a day and only buys value:
//   entry A (adoption) - the 240-bar momentum is beyond +0.15% and the
//            price sits above its 120-bar EMA: a real up-drift, adopted
//            whole with 97% of the cash.
//   entry B (the dip)  - the price has fallen at least 0.7% under its
//            trailing 240-bar high and short momentum (10 bars) has turned
//            back up: buy the dip the crowd over-sold, same size.
//   exit   - a single disaster stop 3.5% under the entry close. Ordinary
//            intraday dips (the dev day's worst was about 1.2%) ride
//            through; only a genuine crash takes the bot out, after which
//            it waits 240 bars before it may enter once more.
//   No take-profit, no trailing stop, no regime exit: on a one-day
//   horizon each extra round trip is another toll against a move that
//   may only be tens of bps, and late exits kept selling the bottom of
//   the dev day's dip in testing.
// Everything is a pure function of the bars seen so far: no clock, no
// environment, no randomness, so the two graded runs agree byte for byte.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYM = 'CBBTC';
const EMA_MID = 120;
const MOM_WIN = 240;
const MOM_MIN = 0.0015;
const HIGH_WIN = 240;
const DIP_MIN = 0.007;
const TURN_WIN = 10;
const SPEND_FRAC = 0.97;
const HARD_STOP = 0.035;
const COOLDOWN = 240;
const SLIPPAGE_BPS = 250;

const closes: number[] = [];
let emaMid: number | null = null;
let entryClose = 0;
let cooldownLeft = 0;

function ema(prev: number | null, price: number, n: number): number {
  if (prev === null) return price;
  const k = 2 / (n + 1);
  return price * k + prev * (1 - k);
}

function buy(state: BarsState, price: number): OrderInput[] {
  const spend = BigInt(Math.floor(Number(state.cash) * SPEND_FRAC));
  if (spend < 1_000_000n) return [];
  entryClose = price;
  return [{ side: 'buy', symbol: SYM, notional_quote_units: spend, max_slippage_bps: SLIPPAGE_BPS }];
}

function onBatch(state: BarsState): OrderInput[] {
  const raw = state.close(SYM);
  if (raw === null) return [];
  const price = Number(raw);
  closes.push(price);
  emaMid = ema(emaMid, price, EMA_MID);
  if (cooldownLeft > 0) cooldownLeft -= 1;

  const holding = state.positions.get(SYM);
  if (holding !== undefined && holding.qty > 0n) {
    if (price <= entryClose * (1 - HARD_STOP)) {
      entryClose = 0;
      cooldownLeft = COOLDOWN;
      return [{ side: 'sell', symbol: SYM, qty: holding.qty, max_slippage_bps: SLIPPAGE_BPS }];
    }
    return [];
  }

  if (state.warmingUp || cooldownLeft > 0) return [];
  const n = closes.length;
  if (n <= MOM_WIN || emaMid === null) return [];

  const momentum = closes[n - 1] / closes[n - 1 - MOM_WIN] - 1;
  if (momentum > MOM_MIN && price > emaMid) return buy(state, price);

  const window = closes.slice(-HIGH_WIN);
  const dip = 1 - price / Math.max(...window);
  const turningUp = price > closes[n - 1 - TURN_WIN];
  if (dip >= DIP_MIN && turningUp) return buy(state, price);

  return [];
}

await runBars({ onBatch });
