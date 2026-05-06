import { config } from "dotenv";
config({ path: ".env.local" });

const required = [
  "REDIS_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

for (const k of required) {
  const v = process.env[k];
  console.log(`${k}: ${v ? `SET (${v.length} chars, starts ${v.slice(0, 10)}...)` : "MISSING"}`);
}
