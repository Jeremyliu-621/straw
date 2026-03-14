/**
 * Authentication configuration and utilities
 * Handles NextAuth setup with Supabase + GitHub/Google OAuth
 */

import { type NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env";

// Credential provider for development/testing
const credentialsProvider = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    // This is a placeholder. Real credential auth happens via Supabase
    // Only used in development for testing
    if (
      credentials?.email === "company@example.com" &&
      credentials?.password === "password"
    ) {
      return {
        id: "dev-company",
        email: "company@example.com",
        role: "company",
      };
    }
    if (
      credentials?.email === "agent@example.com" &&
      credentials?.password === "password"
    ) {
      return {
        id: "dev-agent",
        email: "agent@example.com",
        role: "agent_builder",
      };
    }
    return null;
  },
});

export const authConfig: NextAuthOptions = {
  providers: [
    GitHub({
      clientId: env.NEXTAUTH_GITHUB_ID,
      clientSecret: env.NEXTAUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: env.NEXTAUTH_GOOGLE_ID,
      clientSecret: env.NEXTAUTH_GOOGLE_SECRET,
    }),
    ...(env.NODE_ENV === "development" ? [credentialsProvider] : []),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    // Redirect users based on their role after sign in
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    // Add user info to JWT
    async jwt({ token, user }: any) {
      if (user) {
        // User just signed in - this is where we'd sync with Supabase
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role || "agent_builder"; // Default to agent
      }
      return token;
    },

    // Add user info to session
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as any).role = token.role || "agent_builder";
      }
      return session;
    },

    // Control who can sign in
    async signIn({ user }: any) {
      // Only allow email providers (GitHub and Google sign up as new users)
      if (!user.email) return false;
      return true;
    },
  },
} satisfies NextAuthOptions;

/**
 * Helper to get user role from session
 */
export function getUserRole(role?: string): "company" | "agent_builder" | "admin" | null {
  if (role === "company" || role === "agent_builder" || role === "admin") {
    return role;
  }
  return null;
}
