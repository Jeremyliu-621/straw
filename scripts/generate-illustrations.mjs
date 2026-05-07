// Generate dashboard tool-card illustrations via OpenAI gpt-image-1.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/generate-illustrations.mjs
//
// Optional flags:
//   --only=<id>     Generate just one illustration (e.g. --only=arena)
//   --force         Overwrite existing PNGs (default: skip ones already on disk)
//
// Outputs to public/illustrations/<id>.png and writes a generation log
// to .recording-tmp/illustration-runs.jsonl (gitignored).
//
// Style + prompts are kept in lockstep with
// tasks/design/illustration-prompts.md — update both when iterating.

import { writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';
import { argv, env, exit, stdout } from 'node:process';

const STYLE_SUFFIX =
  'Flat-shaded illustration. Pastel palette: dusty coral #ecd0cc, dusty blue #cfd5e8, sage green #d0d7d1, soft beige #e0d6d0, peach #f7d4d0, lavender #d9d4f6. Off-white #faf6ef background. Soft shadows. No text, no labels, no letters. Centered subject. Notion / Linear icon-style abstraction. Square framing. No photorealism.';

const ILLUSTRATIONS = [
  {
    id: 'arena',
    audience: 'agent',
    prompt:
      'A stylized circular coliseum or arena floor seen from a slight three-quarter angle. Concentric rings, a tiny silhouette of a competitor in the center.',
  },
  {
    id: 'submission',
    audience: 'agent',
    prompt:
      'A small parcel or wrapped package floating mid-delivery, with a soft glow and a tied ribbon. A subtle motion swoosh under it.',
  },
  {
    id: 'reputation',
    audience: 'agent',
    prompt:
      'An ascending laurel wreath or medal on a ribbon, slightly tilted, with a few sparkle dots around it. Conveys recognition without trophies.',
  },
  {
    id: 'earnings',
    audience: 'agent',
    prompt:
      'A small stack of coins (3 to 4) at a slight perspective angle, with a single sparkle on top. Coins are pastel-toned, not metallic.',
  },
  {
    id: 'post-task',
    audience: 'company',
    prompt:
      'A scroll or sheet of paper unfurled, with a soft glow at the top edge as if just being written. A small quill resting beside it.',
  },
  {
    id: 'submissions-stack',
    audience: 'company',
    prompt:
      'A small stack of layered cards or papers, slightly fanned, with the topmost card showing a tiny check-mark icon shape (no text).',
  },
  {
    id: 'deals',
    audience: 'company',
    prompt:
      'Two abstract simple hands meeting in a gentle handshake, stylized as smooth shapes. Soft, not corporate.',
  },
  {
    id: 'leaderboard',
    audience: 'company',
    prompt:
      'A three-tiered podium (1st, 2nd, 3rd) seen from a slight three-quarter angle, with a small sparkle above the center column. No text.',
  },
];

const OUT_DIR = join(process.cwd(), 'public', 'illustrations');
const LOG_DIR = join(process.cwd(), '.recording-tmp');

function parseFlag(name) {
  const arg = argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
}
function hasFlag(name) {
  return argv.includes(`--${name}`);
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function generateOne(spec) {
  const fullPrompt = `${spec.prompt} ${STYLE_SUFFIX}`;
  const body = {
    model: 'gpt-image-1',
    prompt: fullPrompt,
    size: '1024x1024',
    n: 1,
    // 'low' / 'medium' / 'high' — medium is the right balance for tool-card art
    quality: 'medium',
  };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }
  const json = await res.json();
  // gpt-image-1 returns base64 directly, no URL
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No b64_json in response: ${JSON.stringify(json).slice(0, 400)}`);
  return Buffer.from(b64, 'base64');
}

async function main() {
  if (!env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in env. Pipe it inline:');
    console.error('  OPENAI_API_KEY=sk-... node scripts/generate-illustrations.mjs');
    exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(LOG_DIR, { recursive: true });

  const onlyId = parseFlag('only');
  const force = hasFlag('force');
  const targets = onlyId
    ? ILLUSTRATIONS.filter((i) => i.id === onlyId)
    : ILLUSTRATIONS;
  if (targets.length === 0) {
    console.error(`No illustration matches --only=${onlyId}.`);
    exit(1);
  }

  const logPath = join(LOG_DIR, 'illustration-runs.jsonl');
  const startedAt = new Date().toISOString();
  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const spec of targets) {
    const outPath = join(OUT_DIR, `${spec.id}.png`);
    if (!force && (await fileExists(outPath))) {
      stdout.write(`skip ${spec.id}.png (exists, pass --force to overwrite)\n`);
      skipped++;
      continue;
    }
    stdout.write(`generating ${spec.id}... `);
    try {
      const buf = await generateOne(spec);
      await writeFile(outPath, buf);
      stdout.write(`${(buf.length / 1024).toFixed(0)}KB written\n`);
      await writeFile(
        logPath,
        JSON.stringify({
          ts: new Date().toISOString(),
          id: spec.id,
          bytes: buf.length,
          ok: true,
        }) + '\n',
        { flag: 'a' },
      );
      made++;
    } catch (err) {
      stdout.write(`FAILED: ${err.message}\n`);
      await writeFile(
        logPath,
        JSON.stringify({
          ts: new Date().toISOString(),
          id: spec.id,
          ok: false,
          error: String(err.message),
        }) + '\n',
        { flag: 'a' },
      );
      failed++;
    }
  }

  console.log(
    `\nDone in ${(Date.now() - Date.parse(startedAt)) / 1000}s — made ${made}, skipped ${skipped}, failed ${failed}`,
  );
  if (failed > 0) exit(2);
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
