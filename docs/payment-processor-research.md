# Payment Processor Research — Energi Electric App

**Date:** 2026-04-24
**Owner:** Kenny
**Decision needed for:** [M2-01](https://github.com/BlueWaveCreative/Operations/issues/14)
**Joe's stated preference:** "whatever will be easiest" — implying not strongly opinionated, will trust Kenny's recommendation.

## TL;DR — Recommendation: **Stripe**

For Joe's scale and use case, Stripe wins on developer experience, ACH cost, and integration libraries. The marginal savings from interchange-plus pricing (Helcim) don't justify the integration complexity at Joe's likely volume. Stax's $99-199/month subscription model overshoots a small electrician.

**Confirmed:** card 2.9% + 30¢, ACH 0.8% capped at $5. No monthly fees.

---

## Side-by-side comparison

### Card payments (online / card-not-present)

| Processor | Rate | Effective fee on $1,000 invoice | Effective fee on $6,000 invoice |
|---|---|---|---|
| **Stripe** | 2.9% + 30¢ | $29.30 | $174.30 |
| **Square** (Free plan) | 3.3% + 30¢ | $33.30 | $198.30 |
| **Square** (Premium plan) | 2.9% + 30¢ | $29.30 | $174.30 |
| **Helcim** (low-volume tier, interchange+0.40%+8¢) | ~1.83% blended Visa/MC, ~2.61% Amex | ~$18.30 | ~$109.80 |
| **Stax** | Interchange + $0.15 + $99-199/mo | ~$17.15 *plus* $99/mo fixed | ~$102.15 *plus* $99/mo fixed |

### ACH bank transfers

| Processor | Rate | Cap | Effective fee on $1,000 | Effective fee on $6,000 |
|---|---|---|---|---|
| **Stripe** | 0.8% | $5 | $5.00 | $5.00 |
| **Square** | 1.0% | $10 | $10.00 | $10.00 |
| **Helcim** | 0.5% + 25¢ | $6 (under $25K) | ~$5.25 | $6.00 |
| **Stax** | 1.0% | $10 | $10.00 | $10.00 |

### Other costs / friction

| Factor | Stripe | Square | Helcim | Stax |
|---|---|---|---|---|
| Monthly fee | $0 | $0 (Free plan) | $0 | $99–199 |
| Setup fee | $0 | $0 | $0 | varies |
| Refund of original fee | ❌ Not refunded | varies | varies | varies |
| Chargeback fee (lost) | $15 | varies | $15 | $25 |
| Chargeback fee (won) | $0 (refunded) | varies | $0 | $25 |
| Payout speed | 2 business days standard, instant available (1.5%) | varies by plan | Next business day (no fee) | Next business day |
| Developer experience | ⭐ Industry leader. Best docs, SDKs, webhooks. | Decent but more retail-focused | Decent, smaller ecosystem | Sales-led, less developer-friendly |
| Built-in invoicing | Yes (Stripe Invoicing) | Yes (Square Invoices) | Yes (free) | Yes |
| ACH UX | Plaid (clean) or manual account # | Manual entry | Manual / Plaid | Manual |

---

## Volume break-even analysis (when does each processor become cheaper?)

**Stax vs Stripe:** Stax's $99/mo fixed + ~1.85% blended (interchange + 0.15¢) saves roughly 1.05% per card transaction vs Stripe's 2.9%. Break-even: **$99 / 0.0105 ≈ $9,400/month** in card-only volume. Below that, Stripe is cheaper. Above that, Stax pulls ahead.

**Helcim vs Stripe:** Helcim's interchange+0.40%+8¢ saves roughly 1% per card transaction vs Stripe at low volumes (more at higher volumes due to volume discounts). No fixed cost, so Helcim is cheaper from $1 of volume onwards — but the savings only matter at scale.

**For Joe at small contractor scale** (estimated ~$10–30K/month in invoices, mix of card + ACH, maybe 5–15 invoices/month): savings vs Stripe are real (~$50–150/month in fees) but the integration cost + Helcim's smaller ecosystem make it a wash for the V1 build.

---

## Why I'm recommending Stripe (judgment)

1. **Best-in-class developer experience.** Stripe.js, Stripe Elements, webhooks, and TypeScript SDKs are the industry gold standard. Faster to implement, fewer surprises in production.

2. **Joe-friendly ACH.** Stripe ACH at 0.8% capped at $5 is the lowest of the four for invoices over ~$625. Joe's $6,000 invoice example: $5 ACH on Stripe vs $10 on Square/Stax. Aligns with Joe saying "ACH on big tickets to avoid the 2.9% bite."

3. **Card-on-file workflow.** Stripe SetupIntents + customer payment methods + admin-initiated charges (PRD Issue M2-07) are first-class API features. Other processors require more glue code.

4. **No platform tax.** Stripe doesn't charge monthly fees, doesn't lock you into a long-term contract, and migration off is straightforward if we ever change our mind.

5. **Joe's "whatever's easiest" plus PRD lean.** PRD already named Stripe as the recommended path. Confirming after research keeps consistency.

6. **Volume reality.** At Joe's scale, the absolute fee savings from Helcim/Stax (~$50-150/mo) don't justify the integration time + ongoing maintenance vs Stripe.

## When to revisit

If Energi Electric grows past **$50K/month in card-only volume**, revisit Helcim. If Joe ever takes a side-business that generates **$150K+/year in card volume**, Stax's subscription model starts to pencil.

## Decision

**Move forward with Stripe.** Update PRD's "Open Question — Payment processor" to resolved. Unblock M2-02 (Joe creates Stripe account) and M2-03 (Stripe SDK + scaffolding).

## Sources

- Stripe pricing: https://stripe.com/pricing (fetched 2026-04-24)
- Square invoice pricing: https://squareup.com/help/us/en/article/5068
- Helcim pricing: https://www.helcim.com/pricing/
- Stax pricing: https://staxpayments.com/pricing/
