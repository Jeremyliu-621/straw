import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/health — Health check endpoint.
 * Returns 200 if the app is running and can reach the database.
 */
export async function GET() {
  const start = Date.now();

  try {
    const db = createServiceClient();
    const { error } = await db.from("users").select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { status: "unhealthy", database: "unreachable", error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      latency_ms: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "unhealthy", database: "unreachable", error: String(err) },
      { status: 503 }
    );
  }
}
