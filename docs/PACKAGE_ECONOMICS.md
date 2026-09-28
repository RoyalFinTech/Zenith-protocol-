# ZENIT Protocol — Canonical Package Economics

**Status:** Operator-confirmed canonical catalog  
**Effective checkpoint:** 2026-09-28  
**Primary settlement asset:** USDT on BNB Smart Chain

This file is the repository-level source of truth for package pricing and the settlement allocation model. Future engineering work must not replace these values with historical values from older migrations or stale UI copy without an explicit operator-approved change.

## Package catalog

| Program | Tier | Package code | Price |
|---|---|---|---:|
| 2x4 | Starter | `2x4-starter` | **10 USDT** |
| 2x4 | Growth | `2x4-growth` | **25 USDT** |
| 2x4 | Elite | `2x4-elite` | **50 USDT** |
| 2x6 | Starter | `2x6-starter` | **30 USDT** |
| 2x6 | Growth | `2x6-growth` | **60 USDT** |
| 2x6 | Elite | `2x6-elite` | **120 USDT** |

The **2x4 Starter entry is 10 USDT**.  
The **2x6 Starter entry is 30 USDT**.

Growth and Elite are not separate matrix positions. They upgrade the existing position in the same program and must follow the Starter → Growth → Elite sequence.

## Settlement allocation

Every confirmed package purchase uses:

- **20% direct/referral**
- **70% matrix**
- **10% platform administration revenue**

The 10% administration share is platform revenue and must be recorded separately in `platform_revenue_ledger` as `admin_revenue`. It must not be represented as a member earning.

If a direct sponsor is absent, the 20% is recorded as `unallocated_direct`.  
If matrix ancestors are unavailable for any configured level, the undistributed portion of the 70% is recorded as `unallocated_matrix`. Neither amount is silently reassigned to admin revenue.

## Exact allocation examples

| Package | Gross | Direct 20% | Matrix 70% | Admin 10% |
|---|---:|---:|---:|---:|
| 2x4 Starter | 10 | 2.00 | 7.00 | 1.00 |
| 2x4 Growth | 25 | 5.00 | 17.50 | 2.50 |
| 2x4 Elite | 50 | 10.00 | 35.00 | 5.00 |
| 2x6 Starter | 30 | 6.00 | 21.00 | 3.00 |
| 2x6 Growth | 60 | 12.00 | 42.00 | 6.00 |
| 2x6 Elite | 120 | 24.00 | 84.00 | 12.00 |

## Matrix-level distribution

### 2x4 — four levels

The matrix pool is divided **30% / 25% / 25% / 20%** across levels 1–4.

For the 2x4 Starter 10 USDT package, the 7 USDT matrix pool distributes as:
- L1: 2.10 USDT
- L2: 1.75 USDT
- L3: 1.75 USDT
- L4: 1.40 USDT

For Growth and Elite, the same percentages apply to their respective 70% matrix pools.

### 2x6 — six levels

The matrix pool is divided **30% / 20% / 15% / 10% / 10% / 15%** across levels 1–6.

For the 2x6 Starter 30 USDT package, the 21 USDT matrix pool distributes as:
- L1: 6.30 USDT
- L2: 4.20 USDT
- L3: 3.15 USDT
- L4: 2.10 USDT
- L5: 2.10 USDT
- L6: 3.15 USDT

For Growth and Elite, the same percentages apply to their respective 70% matrix pools.

## Purchase integrity requirements

1. The amount charged for a new purchase must come from the live package catalog.
2. The package economics `entry_amount` must equal the package catalog `price` before a new purchase intent is created.
3. The purchase stores its own immutable settlement snapshot so later package/economics changes cannot rewrite an existing purchase.
4. A pending purchase created under an older price must not be silently reused as a new current-price purchase. Existing historical pending intents remain untouched; they require explicit operational resolution.
5. Settlement uses the purchase snapshot, not mutable catalog rows.

## Production observation on 2026-09-28

Production currently reports the canonical six-package catalog above, including:
- 2x4 Starter = 10 USDT
- 2x4 Growth = 25 USDT
- 2x4 Elite = 50 USDT
- 2x6 Starter = 30 USDT
- 2x6 Growth = 60 USDT
- 2x6 Elite = 120 USDT

Two older pending 2x6 Starter purchase intents were observed at **10 USDT**. They were created on 2026-09-19 and remain **pending**. They were not rewritten because purchase records are treated as historical financial intents.

**Important:** those two historical pending rows do **not** define the current 2x6 Starter price. The current catalog/economics value is **30 USDT**.

## Change control

Any future price change must update, in the same engineering change:
- database package catalog configuration
- package economics
- distribution rules when applicable
- purchase-flow guards/tests
- frontend catalog presentation
- admin/revenue documentation
- `ENGINEERING_PROGRESS.md`
- `DEPLOYMENT_STATE.md`

Never use an old migration such as the historical 2x6 10 USDT configuration as the current source of truth.
