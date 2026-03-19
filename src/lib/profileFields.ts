export const EDITABLE_PROFILE_FIELDS = [
  "name",
  "isin",
  "ticker",
  "exchange",
  "country",
  "sector",
  "industry",
  "fundManager",
  "fundCategory",
  "equityPct",
  "bondPct",
  "sectorWeightings",
  "geographicWeightings",
] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];
