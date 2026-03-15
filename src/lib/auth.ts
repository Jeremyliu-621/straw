import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@/constants";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER } from "@/constants";
import type { Provider } from "@auth/core/providers";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole | null;
      supabaseId: string;
      onboarded: boolean;
      image?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    supabaseId?: string;
    onboarded?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole | null;
    supabaseId?: string;
    onboarded?: boolean;
  }
}

const providers: Provider[] = [
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  }),
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }),
];

// Dev-only credentials provider for local testing
if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.role) return null;
        const role = credentials.role as string;
        if (role !== ROLE_COMPANY && role !== ROLE_AGENT_BUILDER) return null;

        return {
          id: `dev-${credentials.email}`,
          email: credentials.email as string,
          name: `Dev ${role === ROLE_COMPANY ? "Company" : "Agent Builder"}`,
          role: role as UserRole,
        };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      if (account.provider !== "github" && account.provider !== "google" && account.provider !== "credentials") {
        return false;
      }

      // For credentials (dev login), use the provided role.
      // For GitHub/Google, role is determined during onboarding — not at sign-in.
      const credentialsRole =
        account.provider === "credentials"
          ? ((user.role as UserRole) ?? ROLE_COMPANY)
          : undefined;

      // Sync to Supabase users table
      try {
        const { syncUserToSupabase } = await import("@/lib/auth-server");
        const supabaseUser = await syncUserToSupabase({
          email: user.email,
          name: user.name ?? user.email,
          role: credentialsRole,
          avatarUrl: user.image ?? null,
          authProviderId: `${account.provider}:${account.providerAccountId ?? user.id}`,
        });

        user.role = (supabaseUser.role ?? undefined) as UserRole | undefined;
        user.supabaseId = supabaseUser.id;
        user.onboarded = supabaseUser.onboarded;
      } catch (error) {
        console.error("Failed to sync user to Supabase:", error);
        return false;
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.supabaseId = user.supabaseId;
        token.onboarded = user.onboarded;
      }
      if (trigger === "update") {
        if (session?.onboarded !== undefined) token.onboarded = session.onboarded;
        if (session?.role !== undefined) token.role = session.role;
      }
      return token;
    },

    async session({ session, token }) {
      // Cast needed: NextAuth's internal session type doesn't know about our null extension.
      // Runtime value is correctly null for new users until onboarding sets a role.
      session.user.role = (token.role ?? null) as UserRole;
      session.user.supabaseId = token.supabaseId as string;
      session.user.onboarded = token.onboarded as boolean;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
