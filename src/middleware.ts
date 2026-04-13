import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PROTECTED_EXACT = ["/onboarding"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tasks/new",
  "/agents/profile",
  "/messages",
];

const AUTH_ROUTES = ["/auth/signin"];

function isProtectedRoute(pathname: string): boolean {
  if (PROTECTED_EXACT.includes(pathname)) return true;
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // Task enter pages require auth (e.g. /tasks/uuid/enter)
  if (/^\/tasks\/[^/]+\/enter/.test(pathname)) return true;
  return false;
}

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
  const isProtected = isProtectedRoute(pathname);
  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to onboarding if not yet completed
  if (
    isAuthenticated &&
    (!session.user.onboarded || !session.user.role) &&
    isProtected &&
    !pathname.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // /dashboard → default view. Sidebar handles switching between views.
  if (isAuthenticated && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/dashboard/company", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
