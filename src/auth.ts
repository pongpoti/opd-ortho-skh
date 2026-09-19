import NextAuth from "next-auth";
import Line from "next-auth/providers/line";
import { eq } from "drizzle-orm";

import { db } from "./db";
import { users } from "./db/schema";
import { ADMIN_LINE_USER_IDS } from "./lib/admins";

export type UserRole = "admin" | "doctor" | "nurse";

declare module "next-auth" {
  interface Session {
    user: {
      lineUserId: string;
      lineDisplayName?: string;
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
    isRegistered?: boolean;
    firstName?: string;
    role?: UserRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Line({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.providerAccountId) {
        token.lineUserId = account.providerAccountId;
      }
      if (profile && typeof profile.name === "string") {
        token.lineDisplayName = profile.name;
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
