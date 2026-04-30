/**
 * Generates public/og-image.png — 1200x630 canvas with a perimeter ring of
 * randomly-colored pastel cells (matching the landing-page palette) and the
 * straw long-logo centered in a white interior.
 *
 * Deterministic: seeded RNG so re-runs reproduce the same image. Bump
 * SEED to roll a fresh layout.
 *
 * Run: npx tsx scripts/generate-og-image.ts
 */
import path from "node:path";
import sharp from "sharp";

const OUT_PATH = path.join(__dirname, "..", "public", "og-image.png");
const LOGO_PATH = path.join(__dirname, "..", "public", "strawlonglogo.png");

const W = 1200;
const H = 630;
const COLS = 12;
const ROWS = 9;
const CELL_W = W / COLS; // 100
const CELL_H = H / ROWS; // 70

const PASTELS = [
  "#f7d4d0", // peach (Join the Waitlist button)
  "#d9d4f6", // lavender
  "#cfd5e8", // light blue (conference)
  "#e0d6d0", // beige (round table)
  "#ecd0cc", // coral (emoji)
  "#d0d7d1", // sage (ping pong)
];

const SEED = 0x9e3779b9;
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isBorderCell(col: number, row: number): boolean {
  return col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
}

async function main(): Promise<void> {
  const rand = mulberry32(SEED);

  // Avoid two identical neighbors looking like a stripe — re-roll if a
  // cell would match either of the cells above or to the left.
  const grid: (string | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null),
  );
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isBorderCell(c, r)) continue;
      const left = c > 0 ? grid[r][c - 1] : null;
      const above = r > 0 ? grid[r - 1][c] : null;
      let pick: string;
      let attempts = 0;
      do {
        pick = PASTELS[Math.floor(rand() * PASTELS.length)];
        attempts++;
      } while ((pick === left || pick === above) && attempts < 10);
      grid[r][c] = pick;
    }
  }

  const rects: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const fill = grid[r][c] ?? "#ffffff";
      const x = Math.round(c * CELL_W);
      const y = Math.round(r * CELL_H);
      rects.push(
        `<rect x="${x}" y="${y}" width="${Math.ceil(CELL_W)}" height="${Math.ceil(CELL_H)}" fill="${fill}" />`,
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${rects.join("")}</svg>`;

  // Render the grid to PNG, then composite the logo centered in the
  // inner white area.
  const baseBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const logoBuffer = await sharp(LOGO_PATH).resize({ width: 720 }).toBuffer();
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoW = logoMeta.width ?? 720;
  const logoH = logoMeta.height ?? Math.round((720 * 122) / 500);

  await sharp(baseBuffer)
    .composite([
      {
        input: logoBuffer,
        left: Math.round((W - logoW) / 2),
        top: Math.round((H - logoH) / 2),
      },
    ])
    .png()
    .toFile(OUT_PATH);

  console.log(`Wrote ${OUT_PATH} (${W}x${H})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
