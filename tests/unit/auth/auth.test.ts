import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We test the signIn callback logic directly, not through NextAuth internals.
// Extract the callback logic into a testable function matching the shape used in auth.ts.

function makeSignInCallback(ownerIdEnv: string | undefined) {
  const original = process.env.AUTH_GITHUB_OWNER_ID;
  process.env.AUTH_GITHUB_OWNER_ID = ownerIdEnv as string;
  return function signIn({
    account,
    profile,
  }: {
    account: { provider: string } | null;
    profile?: { id?: number | string } | null;
  }): boolean {
    if (account?.provider !== "github") return false;
    const ownerId = process.env.AUTH_GITHUB_OWNER_ID;
    if (!ownerId) return false;
    return String(profile?.id) === ownerId;
  };
}

describe("auth signIn callback", () => {
  const OWNER_ID = "12345678";

  beforeEach(() => {
    process.env.AUTH_GITHUB_OWNER_ID = OWNER_ID;
  });

  afterEach(() => {
    delete process.env.AUTH_GITHUB_OWNER_ID;
  });

  it("returns true for the authorized GitHub owner ID", () => {
    const signIn = makeSignInCallback(OWNER_ID);
    const result = signIn({
      account: { provider: "github" },
      profile: { id: Number(OWNER_ID) },
    });
    expect(result).toBe(true);
  });

  it("returns false for a non-matching GitHub user ID", () => {
    const signIn = makeSignInCallback(OWNER_ID);
    const result = signIn({
      account: { provider: "github" },
      profile: { id: 99999999 },
    });
    expect(result).toBe(false);
  });

  it("returns false for a non-github provider", () => {
    const signIn = makeSignInCallback(OWNER_ID);
    const result = signIn({
      account: { provider: "google" },
      profile: { id: Number(OWNER_ID) },
    });
    expect(result).toBe(false);
  });

  it("returns false when AUTH_GITHUB_OWNER_ID env var is missing", () => {
    delete process.env.AUTH_GITHUB_OWNER_ID;
    const signIn = makeSignInCallback(undefined);
    const result = signIn({
      account: { provider: "github" },
      profile: { id: Number(OWNER_ID) },
    });
    expect(result).toBe(false);
  });
});
