import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, withRetry } from "./db";
import { users, teams, teamMembers } from "./schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await withRetry(() =>
          db.query.users.findFirst({
            where: eq(users.email, credentials.email as string),
          })
        );

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // Load user data including Super-Admin status
        const dbUser = await withRetry(() =>
          db.query.users.findFirst({
            where: eq(users.id, user.id as string),
          })
        );
        token.isSuperAdmin = dbUser?.isSuperAdmin ?? false;

        // Load team info
        const membership = await withRetry(() =>
          db.query.teamMembers.findFirst({
            where: eq(teamMembers.userId, user.id as string),
            with: {
              team: true,
            },
          })
        );

        if (membership) {
          token.teamId = membership.teamId;
          token.teamRole = membership.role;
          token.teamPlan = membership.team.plan;
          token.teamName = membership.team.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.teamId = token.teamId as string;
        session.user.teamRole = token.teamRole as string;
        session.user.teamPlan = token.teamPlan as string;
        session.user.teamName = token.teamName as string;
      }
      return session;
    },
  },
});

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isSuperAdmin?: boolean;
      teamId?: string;
      teamRole?: string;
      teamPlan?: string;
      teamName?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    isSuperAdmin?: boolean;
    teamId?: string;
    teamRole?: string;
    teamPlan?: string;
    teamName?: string;
  }
}
