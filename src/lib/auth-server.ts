/**
 * Server-side auth utilities for middleware and API routes
 */

import { getServerSession, type Session } from "next-auth";
import { authConfig } from "./auth";

/**
 * Get the current user session on the server
 */
export async function auth(): Promise<Session | null> {
  const session = await getServerSession(authConfig as any);
  return session as Session | null;
}

/**
 * Get the current user ID from server session
 * Throws if user is not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  return session.user.email;
}

/**
 * Get the current user ID with role check
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<
  | {
      id: string;
      email: string;
      role: string;
    }
  | null
> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return {
    id: (session.user as any).id || "",
    email: session.user.email || "",
    role: (session.user as any).role || "agent_builder",
  };
}

/**
 * Require a specific role
 * Throws if user doesn't have the required role
 */
export async function requireRole(
  requiredRole: "company" | "agent_builder" | "admin"
) {
  const user = await getCurrentUser();
  if (!user || user.role !== requiredRole) {
    throw new Error("Insufficient permissions");
  }
  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return requireRole("admin");
}

/**
 * Require company role
 */
export async function requireCompany() {
  return requireRole("company");
}

/**
 * Require agent builder role
 */
export async function requireAgent() {
  return requireRole("agent_builder");
}
