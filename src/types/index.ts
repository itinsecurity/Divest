export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type HoldingWithProfile = {
  id: string;
  instrumentIdentifier: string;
  instrumentType: "STOCK" | "FUND";
  accountName: string;
  shares: number | null;
  pricePerShare: number | null;
  currentValue: number | null;
  displayValue: number;
  enrichmentStatus: "PENDING" | "COMPLETE" | "PARTIAL" | "NOT_FOUND";
  lastUpdated: string;
  assetProfile: AssetProfileData | null;
};

export type AssetProfileData = {
  id: string;
  instrumentType: "STOCK" | "FUND";
  isin: string | null;
  ticker: string | null;
  name: string | null;
  exchange: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
  fundManager: string | null;
  fundCategory: "EQUITY" | "BOND" | "COMBINATION" | null;
  equityPct: number | null;
  bondPct: number | null;
  sectorWeightings: Record<string, number> | null;
  geographicWeightings: Record<string, number> | null;
  fieldSources: FieldSources;
};

export type FieldSourceEntry = {
  source: "enrichment" | "user" | "ai_extraction";
  enrichedAt?: string;
  provider?: string;
};

export type FieldSources = Record<string, FieldSourceEntry>;

export type SpreadBucket = {
  name: string;
  value: number;
  percentage: number;
  isUnclassified: boolean;
};

export type StockInterestBalance = {
  equity: SpreadBucket;
  interest: SpreadBucket;
  unclassified: SpreadBucket;
  total: number;
};

export type SpreadAnalysis = {
  buckets: SpreadBucket[];
  total: number;
  incompleteHoldings: number;
};
