import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({ username: z.string(), password: z.string() })
          .safeParse(credentials);
        if (!parsed.success) return null;
        if (parsed.data.username !== process.env.AUTH_USERNAME) return null;
        const hashB64 = process.env.AUTH_PASSWORD_HASH_B64;
        if (!hashB64) return null;
        const hash = Buffer.from(hashB64, "base64").toString("utf-8");
        const valid = await bcrypt.compare(parsed.data.password, hash);
        if (!valid) return null;
        return { id: "1", name: parsed.data.username };
      },
    }),
  ],
});
