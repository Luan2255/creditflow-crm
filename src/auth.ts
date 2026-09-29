import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validation";

const DUMMY_PASSWORD_HASH = "$2b$12$bfuiuNl1nQ4k2Tfdm4MHCuw0T2bBcy6h.SGnDePjFiedExbaHG6ji";

function isRole(value: unknown): value is Role {
  return value === "ADMIN" || value === "OPERADOR" || value === "PARCEIRO";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
        const passwordMatches = await bcrypt.compare(parsed.data.password, passwordHash);

        if (!user?.isActive || !passwordMatches) {
          return null;
        }

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user && "role" in user && isRole(user.role)) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && isRole(token.role)) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
});