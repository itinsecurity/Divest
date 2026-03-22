const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Returns true if the string is a valid uppercase ISIN. */
export function detectISIN(identifier: string): boolean {
  return ISIN_REGEX.test(identifier);
}

export type IdentifierInfo = {
  raw: string;
  normalized: string;
  detectedType: "ISIN" | "TICKER" | "NAME";
};

export function normalizeIdentifier(raw: string): IdentifierInfo {
  // Trim and collapse internal whitespace
  const trimmed = raw.trim().replace(/\s+/g, " ");

  // Attempt ISIN detection (uppercase first)
  const upper = trimmed.toUpperCase();
  if (ISIN_REGEX.test(upper)) {
    return { raw, normalized: upper, detectedType: "ISIN" };
  }

  // Ticker: ≤6 characters, no spaces, alphanumeric
  if (trimmed.length <= 6 && /^[A-Za-z0-9]+$/.test(trimmed)) {
    return { raw, normalized: trimmed, detectedType: "TICKER" };
  }

  // Default: name
  return { raw, normalized: trimmed, detectedType: "NAME" };
}
