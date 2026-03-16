import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const isDev = process.env.NODE_ENV === "development";
const hasDevCreds =
  !!process.env.AUTH_USERNAME && !!process.env.AUTH_PASSWORD_HASH_B64;

const credentialsProvider =
  isDev && hasDevCreds
    ? Credentials({
        credentials: {
          username: { label: "Username", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const username = process.env.AUTH_USERNAME;
          const hashB64 = process.env.AUTH_PASSWORD_HASH_B64;
          if (!username || !hashB64) return null;
          if (!credentials?.username || !credentials?.password) return null;
          if (credentials.username !== username) return null;
          const hash = Buffer.from(hashB64, "base64").toString("utf8");
          const valid = await bcrypt.compare(
            credentials.password as string,
            hash
          );
          if (!valid) return null;
          return { id: "dev", name: username };
        },
      })
    : null;

const providers = credentialsProvider
  ? [GitHub, credentialsProvider]
  : [GitHub];

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "credentials") {
        return process.env.NODE_ENV === "development";
      }
      if (account?.provider !== "github") return false;
      const ownerId = process.env.AUTH_GITHUB_OWNER_ID;
      if (!ownerId) return false;
      return String(profile?.id) === ownerId;
    },
  },
});
