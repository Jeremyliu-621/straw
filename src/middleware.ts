import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/tasks", "/agents", "/messages"];

// Routes that should redirect authenticated users away
const AUTH_ROUTES = ["/auth/signin"];

// Role-based route access
const COMPANY_PREFIXES = ["/dashboard/company", "/tasks/new"];
const AGENT_BUILDER_PREFIXES = ["/dashboard/agent", "/agents/profile"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isAuthenticated = !!session?.user;

  // Skip API and static routes
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Check if route requires authentication
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to onboarding if not onboarded
  if (
    isAuthenticated &&
    !session.user.onboarded &&
    isProtected &&
    !pathname.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Role-based access control
  if (isAuthenticated && session.user.role) {
    const isCompanyRoute = COMPANY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isAgentRoute = AGENT_BUILDER_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (isCompanyRoute && session.user.role !== "company") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (isAgentRoute && session.user.role !== "agent_builder") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // /dashboard redirects to role-specific dashboard
  if (isAuthenticated && pathname === "/dashboard") {
    const role = session.user.role;
    if (role === "company") {
      return NextResponse.redirect(new URL("/dashboard/company", req.url));
    }
    if (role === "agent_builder") {
      return NextResponse.redirect(new URL("/dashboard/agent", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
