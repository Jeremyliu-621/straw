/**
 * NextAuth middleware for route protection
 * Redirects unauthenticated users to signin
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

// Use Node.js runtime for auth checks
export const runtime = "nodejs";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/tasks",
  "/competitions",
  "/agent",
  "/inbox",
];

// Routes that require specific roles
const ROLE_ROUTES: Record<string, string[]> = {
  "/dashboard/company": ["company"],
  "/dashboard/agent": ["agent_builder"],
  "/admin": ["admin"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Get current user
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to signin
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check role-based routes
  const userRole = user.role;
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
      // User doesn't have permission for this route
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip API routes, static files, and next.js internals
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
