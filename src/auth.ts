import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";

import { db } from "./db";
import { users } from "./db/schema";
import { ADMIN_LINE_USER_IDS } from "./lib/admins";

async function verifyLiffIdToken(idToken: string) {
  const clientId = process.env.LINE_CLIENT_ID;
  if (!clientId) return null;

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.aud !== clientId || !data.sub) return null;

  return {
    id: data.sub as string,
    name: typeof data.name === "string" ? data.name : undefined,
    image: typeof data.picture === "string" ? data.picture : undefined,
  };
}

export type UserRole = "admin" | "doctor" | "nurse";

declare module "next-auth" {
  interface Session {
    user: {
      lineUserId: string;
      lineDisplayName?: string;
      lineImage?: string;
      isRegistered: boolean;
      firstName?: string;
      role?: UserRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    lineUserId?: string;
    lineDisplayName?: string;
    lineImage?: string;
    isRegistered?: boolean;
    firstName?: string;
    role?: UserRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { idToken: {} },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (typeof idToken !== "string") return null;
        return verifyLiffIdToken(idToken);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.lineUserId = user.id;
      }
      if (typeof user?.name === "string") {
        token.lineDisplayName = user.name;
      }
      if (typeof user?.image === "string") {
        token.lineImage = user.image;
      }

      if (!token.lineUserId) return token;

      if (ADMIN_LINE_USER_IDS.includes(token.lineUserId)) {
        token.role = "admin";
        token.isRegistered = true;
        return token;
      }

      if (!token.isRegistered) {
        const existing = await db.query.users.findFirst({
          where: eq(users.lineUserId, token.lineUserId),
        });
        if (existing) {
          token.isRegistered = true;
          token.firstName = existing.firstName;
          token.role = existing.position;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.lineUserId = token.lineUserId ?? "";
      session.user.lineDisplayName = token.lineDisplayName;
      session.user.lineImage = token.lineImage;
      session.user.isRegistered = token.isRegistered ?? false;
      session.user.firstName = token.firstName;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
