import type { HoldingWithProfile, SpreadBucket, StockInterestBalance, SpreadAnalysis } from "@/types";

const UNCLASSIFIED = "Unclassified";

function makeBucket(name: string, value: number, total: number, isUnclassified = false): SpreadBucket {
  return {
    name,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
    isUnclassified,
  };
}

/**
 * Computes the stock/interest/unclassified balance across all holdings.
 * - STOCK → equity
 * - FUND EQUITY → equity
 * - FUND BOND → interest
 * - FUND COMBINATION with equityPct+bondPct → split proportionally
 * - Everything else (no profile, no category, unsplit COMBINATION) → unclassified
 */
export function computeStockInterestBalance(holdings: HoldingWithProfile[]): StockInterestBalance {
  let equity = 0;
  let interest = 0;
  let unclassified = 0;

  for (const holding of holdings) {
    const value = holding.displayValue;
    const profile = holding.assetProfile;

    if (!profile) {
      unclassified += value;
      continue;
    }

    if (holding.instrumentType === "STOCK") {
      equity += value;
      continue;
    }

    // FUND
    const category = profile.fundCategory;
    if (category === "EQUITY") {
      equity += value;
    } else if (category === "BOND") {
      interest += value;
    } else if (category === "COMBINATION") {
      if (profile.equityPct !== null && profile.bondPct !== null) {
        equity += value * (profile.equityPct / 100);
        interest += value * (profile.bondPct / 100);
        const remainder = value - value * (profile.equityPct / 100) - value * (profile.bondPct / 100);
        if (remainder > 0) unclassified += remainder;
      } else {
        unclassified += value;
      }
    } else {
      unclassified += value;
    }
  }

  const total = equity + interest + unclassified;

  return {
    equity: makeBucket("Equity", equity, total),
    interest: makeBucket("Interest", interest, total),
    unclassified: makeBucket(UNCLASSIFIED, unclassified, total, true),
    total,
  };
}

/**
 * Generic helper: distribute a holding's value across named buckets,
 * using either a single string key (for STOCKs) or a weighting map (for FUNDs).
 */
function computeSpread(
  holdings: HoldingWithProfile[],
  getKey: (h: HoldingWithProfile) => string | null,
  getWeightings: (h: HoldingWithProfile) => Record<string, number> | null
): SpreadAnalysis {
  const bucketMap = new Map<string, number>();
  let incompleteHoldings = 0;

  const addValue = (name: string, value: number) => {
    bucketMap.set(name, (bucketMap.get(name) ?? 0) + value);
  };

  for (const holding of holdings) {
    const value = holding.displayValue;

    if (holding.enrichmentStatus !== "COMPLETE") {
      incompleteHoldings++;
    }

    if (!holding.assetProfile) {
      addValue(UNCLASSIFIED, value);
      continue;
    }

    if (holding.instrumentType === "FUND") {
      const weightings = getWeightings(holding);
      if (weightings && Object.keys(weightings).length > 0) {
        let allocated = 0;
        for (const [name, pct] of Object.entries(weightings)) {
          const portion = value * (pct / 100);
          addValue(name, portion);
          allocated += portion;
        }
        const remainder = value - allocated;
        if (remainder > 0.001) {
          addValue(UNCLASSIFIED, remainder);
        }
      } else {
        addValue(UNCLASSIFIED, value);
      }
    } else {
      // STOCK — use single key
      const key = getKey(holding);
      addValue(key ?? UNCLASSIFIED, value);
    }
  }

  const total = Array.from(bucketMap.values()).reduce((sum, v) => sum + v, 0);

  // Build buckets, Unclassified last
  const buckets: SpreadBucket[] = [];
  let unclassifiedBucket: SpreadBucket | null = null;

  for (const [name, value] of bucketMap.entries()) {
    const isUnclassified = name === UNCLASSIFIED;
    const bucket = makeBucket(name, value, total, isUnclassified);
    if (isUnclassified) {
      unclassifiedBucket = bucket;
    } else {
      buckets.push(bucket);
    }
  }

  // Sort named buckets by value descending
  buckets.sort((a, b) => b.value - a.value);

  if (unclassifiedBucket) {
    buckets.push(unclassifiedBucket);
  }

  return { buckets, total, incompleteHoldings };
}

/**
 * Computes sector spread:
 * - STOCK: uses profile.sector
 * - FUND: uses profile.sectorWeightings (proportional attribution)
 */
export function computeSectorSpread(holdings: HoldingWithProfile[]): SpreadAnalysis {
  return computeSpread(
    holdings,
    (h) => h.assetProfile?.sector ?? null,
    (h) => h.assetProfile?.sectorWeightings ?? null
  );
}

/**
 * Computes geographic spread:
 * - STOCK: uses profile.country
 * - FUND: uses profile.geographicWeightings (proportional attribution)
 */
export function computeGeographicSpread(holdings: HoldingWithProfile[]): SpreadAnalysis {
  return computeSpread(
    holdings,
    (h) => h.assetProfile?.country ?? null,
    (h) => h.assetProfile?.geographicWeightings ?? null
  );
}
