import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import bcrypt from "bcryptjs";

// We test the signIn callback logic directly, not through NextAuth internals.
// Extract the callback logic into a testable function matching the shape used in auth.ts.

function makeSignInCallback(
  ownerIdEnv: string | undefined,
  nodeEnv: string = "production"
) {
  process.env.AUTH_GITHUB_OWNER_ID = ownerIdEnv as string;
  return function signIn({
    account,
    profile,
  }: {
    account: { provider: string } | null;
    profile?: { id?: number | string } | null;
  }): boolean {
    if (account?.provider === "credentials") {
      return nodeEnv === "development";
    }
    if (account?.provider !== "github") return false;
    const ownerId = process.env.AUTH_GITHUB_OWNER_ID;
    if (!ownerId) return false;
    return String(profile?.id) === ownerId;
  };
}

// ---------------------------------------------------------------------------
// Credentials authorize() tests (T003)
// ---------------------------------------------------------------------------

// Mirror the authorize() logic from src/auth.ts (credentials provider)
async function makeAuthorize(
  usernameEnv: string | undefined,
  passwordHashB64Env: string | undefined
) {
  process.env.AUTH_USERNAME = usernameEnv as string;
  process.env.AUTH_PASSWORD_HASH_B64 = passwordHashB64Env as string;

  return async function authorize(credentials: {
    username?: string;
    password?: string;
  } | null): Promise<{ id: string; name: string } | null> {
    const username = process.env.AUTH_USERNAME;
    const hashB64 = process.env.AUTH_PASSWORD_HASH_B64;
    if (!username || !hashB64) return null;
    if (!credentials?.username || !credentials?.password) return null;
    if (credentials.username !== username) return null;
    const hash = Buffer.from(hashB64, "base64").toString("utf8");
    const valid = await bcrypt.compare(credentials.password, hash);
    if (!valid) return null;
    return { id: "dev", name: username };
  };
}

describe("credentials authorize() callback", () => {
  const USERNAME = "admin";
  const PASSWORD = "secret";
  let hashB64: string;

  beforeEach(async () => {
    const hash = await bcrypt.hash(PASSWORD, 12);
    hashB64 = Buffer.from(hash).toString("base64");
    process.env.AUTH_USERNAME = USERNAME;
    process.env.AUTH_PASSWORD_HASH_B64 = hashB64;
  });

  afterEach(() => {
    delete process.env.AUTH_USERNAME;
    delete process.env.AUTH_PASSWORD_HASH_B64;
  });

  it("returns a user object for valid credentials", async () => {
    const authorize = await makeAuthorize(USERNAME, hashB64);
    const result = await authorize({ username: USERNAME, password: PASSWORD });
    expect(result).toEqual({ id: "dev", name: USERNAME });
  });

  it("returns null for wrong password", async () => {
    const authorize = await makeAuthorize(USERNAME, hashB64);
    const result = await authorize({
      username: USERNAME,
      password: "wrongpassword",
    });
    expect(result).toBeNull();
  });

  it("returns null for wrong username", async () => {
    const authorize = await makeAuthorize(USERNAME, hashB64);
    const result = await authorize({ username: "notadmin", password: PASSWORD });
    expect(result).toBeNull();
  });

  it("returns null when AUTH_USERNAME env var is missing", async () => {
    const authorize = await makeAuthorize(undefined, hashB64);
    const result = await authorize({ username: USERNAME, password: PASSWORD });
    expect(result).toBeNull();
  });

  it("returns null when AUTH_PASSWORD_HASH_B64 env var is missing", async () => {
    const authorize = await makeAuthorize(USERNAME, undefined);
    const result = await authorize({ username: USERNAME, password: PASSWORD });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Original signIn callback tests
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// T006: signIn callback — credentials provider env-gating
// ---------------------------------------------------------------------------

describe("auth signIn callback — credentials provider gating", () => {
  const OWNER_ID = "12345678";

  afterEach(() => {
    delete process.env.AUTH_GITHUB_OWNER_ID;
  });

  it("allows credentials provider in development", () => {
    const signIn = makeSignInCallback(OWNER_ID, "development");
    const result = signIn({ account: { provider: "credentials" } });
    expect(result).toBe(true);
  });

  it("denies credentials provider in production regardless of input", () => {
    const signIn = makeSignInCallback(OWNER_ID, "production");
    const result = signIn({ account: { provider: "credentials" } });
    expect(result).toBe(false);
  });

  it("allows GitHub provider when profile.id matches owner ID (any env)", () => {
    const signIn = makeSignInCallback(OWNER_ID, "production");
    const result = signIn({
      account: { provider: "github" },
      profile: { id: Number(OWNER_ID) },
    });
    expect(result).toBe(true);
  });

  it("denies GitHub provider when profile.id does not match owner ID", () => {
    const signIn = makeSignInCallback(OWNER_ID, "production");
    const result = signIn({
      account: { provider: "github" },
      profile: { id: 99999999 },
    });
    expect(result).toBe(false);
  });
});
