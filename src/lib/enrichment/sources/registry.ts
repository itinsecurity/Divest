import type { AssetProfileUpdateData } from "@/lib/enrichment/types";
import type { IdentifierInfo } from "@/lib/enrichment/normalizer";

export type { IdentifierInfo };

export type CandidateData = {
  name: string;
  ticker: string | null;
  isin: string | null;
  exchange: string | null;
  instrumentType: "STOCK" | "FUND";
  sourceId: string;
  rawData: Record<string, unknown>;
  score: number;
};

export type ScoredCandidate = CandidateData & { score: number };

export type SourceResult =
  | { status: "found"; data: Partial<AssetProfileUpdateData>; sourceId: string }
  | { status: "multiple"; candidates: CandidateData[] }
  | { status: "not_found" }
  | { status: "error"; retryable: boolean; message: string };

export interface DataSource {
  id: string;
  supportedTypes: Array<"STOCK" | "FUND">;
  fetch(
    identifier: IdentifierInfo,
    instrumentType: "STOCK" | "FUND"
  ): Promise<SourceResult>;
}
