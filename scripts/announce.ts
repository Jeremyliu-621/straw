/**
 * Publish a platform announcement (a "What's new" entry that surfaces
 * in the dashboard TopBar bell dropdown for every signed-in user).
 *
 * Run this whenever a Claude session ships something user-visible
 * (a new page, a new API capability, a UX revamp, etc.). It is the
 * automated end of the ship-time ritual described in CLAUDE.md
 * under "Shipping rituals".
 *
 * Usage:
 *   npx tsx scripts/announce.ts \
 *     --id binary-uploads \
 *     --title "Submit binaries directly via the v1 API" \
 *     --body "quick_submit now accepts base64-encoded binary files." \
 *     --cover lavender \
 *     --href /dashboard/docs
 *
 * The id is the primary key; re-running with the same id is an
 * idempotent upsert (handy if you tweak the body copy after first
 * publishing).
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Loaded from .env.local automatically.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const VALID_COVERS = ["peach", "lavender", "blue", "beige", "coral", "sage"] as const;
type Cover = (typeof VALID_COVERS)[number];

interface Args {
  id?: string;
  title?: string;
  body?: string;
  cover?: string;
  href?: string;
  publishedAt?: string;
  list?: boolean;
  delete?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") {
      out.list = true;
    } else if (a === "--delete") {
      out.delete = argv[++i];
    } else if (a.startsWith("--")) {
      const key = a.slice(2) as keyof Args;
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        console.error(`Missing value for ${a}`);
        process.exit(1);
      }
      // We know all our flag keys map to string fields.
      (out as Record<string, string>)[key as string] = value;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false },
  });

  if (args.list) {
    const { data, error } = await db
      .from("platform_announcements")
      .select("id, title, published_at")
      .order("published_at", { ascending: false });
    if (error) {
      console.error("List failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) {
      console.log("No announcements yet.");
    } else {
      for (const row of data) {
        console.log(`${row.published_at}  ${row.id.padEnd(28)}  ${row.title}`);
      }
    }
    return;
  }

  if (args.delete) {
    const { error } = await db.from("platform_announcements").delete().eq("id", args.delete);
    if (error) {
      console.error("Delete failed:", error.message);
      process.exit(1);
    }
    console.log(`Deleted announcement '${args.delete}'.`);
    return;
  }

  if (!args.id || !args.title || !args.body) {
    console.error("Usage: npx tsx scripts/announce.ts --id <slug> --title <t> --body <b> [--cover <pastel>] [--href <path>]");
    console.error("       npx tsx scripts/announce.ts --list");
    console.error("       npx tsx scripts/announce.ts --delete <id>");
    process.exit(1);
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(args.id)) {
    console.error("--id must be lowercase slug: letters, numbers, hyphens; 1–64 chars.");
    process.exit(1);
  }
  if (args.cover && !VALID_COVERS.includes(args.cover as Cover)) {
    console.error(`--cover must be one of: ${VALID_COVERS.join(", ")}`);
    process.exit(1);
  }

  const row = {
    id: args.id,
    title: args.title,
    body: args.body,
    cover: (args.cover as Cover | undefined) ?? null,
    href: args.href ?? null,
    published_at: args.publishedAt ?? new Date().toISOString(),
  };

  const { error } = await db.from("platform_announcements").upsert(row);
  if (error) {
    console.error("Publish failed:", error.message);
    process.exit(1);
  }
  console.log(`Published '${args.id}': ${args.title}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
