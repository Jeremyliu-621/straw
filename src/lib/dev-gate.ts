import { NextResponse } from "next/server";

/**
 * Guards `/api/dev/*` routes with a two-factor gate.
 *
 * The route is only enabled when BOTH:
 *  1. `NODE_ENV === "development"`, AND
 *  2. `ALLOW_DEV_ENDPOINTS === "true"`
 *
 * Requiring both eliminates the single-misconfiguration risk: if
 * `NODE_ENV` is accidentally set to "development" in production (e.g.
 * via a Vercel env var mistake), the second gate still holds the door
 * closed. `ALLOW_DEV_ENDPOINTS` must be set explicitly per environment.
 *
 * Returns `null` when the route is allowed; returns a 403 response
 * otherwise, ready to be returned from the route handler.
 */
export function assertDevEndpointEnabled(): NextResponse | null {
  const nodeEnv = process.env.NODE_ENV;
  const allowDev = process.env.ALLOW_DEV_ENDPOINTS;

  if (nodeEnv === "development" && allowDev === "true") {
    return null;
  }

  return NextResponse.json({ error: "Dev only" }, { status: 403 });
}
