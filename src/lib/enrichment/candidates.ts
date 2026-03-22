import type { CandidateData, ScoredCandidate } from "./sources/registry";
import type { IdentifierInfo } from "./normalizer";

const AUTO_SELECT_SCORE_GAP = 40;

export function scoreCandidate(
  candidate: CandidateData,
  identifier: IdentifierInfo
): number {
  const norm = identifier.normalized.toLowerCase();

  // Exact ISIN match
  if (candidate.isin && candidate.isin.toLowerCase() === norm) {
    return 100;
  }

  // Exact ticker match
  if (candidate.ticker && candidate.ticker.toLowerCase() === norm) {
    return 80;
  }

  // Exact name match
  if (candidate.name.toLowerCase() === norm) {
    return 60;
  }

  // Partial name match (candidate name contains the identifier)
  if (candidate.name.toLowerCase().includes(norm)) {
    return 20;
  }

  return 0;
}

export function shouldAutoSelect(
  candidates: ScoredCandidate[]
): ScoredCandidate | null {
  if (candidates.length === 0) return null;

  // Sort descending by score
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  if (sorted.length === 1) return sorted[0];

  const gap = sorted[0].score - sorted[1].score;
  return gap >= AUTO_SELECT_SCORE_GAP ? sorted[0] : null;
}
