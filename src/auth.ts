import NextAuth from "next-auth";
import Line from "next-auth/providers/line";
import { eq } from "drizzle-orm";

import { db } from "./db";
import { users } from "./db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      lineUserId: string;
      isRegistered: boolean;
      firstName?: string;
      position?: "doctor" | "nurse";
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    lineUserId?: string;
    isRegistered?: boolean;
    firstName?: string;
    position?: "doctor" | "nurse";
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
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.lineUserId = account.providerAccountId;
      }
      if (token.lineUserId && !token.isRegistered) {
        const existing = await db.query.users.findFirst({
          where: eq(users.lineUserId, token.lineUserId),
        });
        if (existing) {
          token.isRegistered = true;
          token.firstName = existing.firstName;
          token.position = existing.position;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.lineUserId = token.lineUserId ?? "";
      session.user.isRegistered = token.isRegistered ?? false;
      session.user.firstName = token.firstName;
      session.user.position = token.position;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
