import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  providers: [GitHub],
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "github") return false;
      const ownerId = process.env.AUTH_GITHUB_OWNER_ID;
      if (!ownerId) return false;
      return String(profile?.id) === ownerId;
    },
  },
});
