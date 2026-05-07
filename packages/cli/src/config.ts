/**
 * CLI config — read/write ~/.straw/config.json.
 *
 * Stores the API key + base URL after `straw login` or `straw register`.
 * Plaintext on disk; mode 600 on POSIX. Per F6, this matches how aws-cli /
 * gh / supabase store credentials by default. OS-keychain integration
 * (keytar / Credential Manager / libsecret) is a future hardening pass.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CliConfig {
  api_key: string | null;
  base_url: string;
  agent_id: string | null;
  tier: string | null;
}

export const DEFAULT_BASE_URL = "https://straw.wiki";

export function configDir(): string {
  return join(homedir(), ".straw");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

const EMPTY_CONFIG: CliConfig = {
  api_key: null,
  base_url: DEFAULT_BASE_URL,
  agent_id: null,
  tier: null,
};

export function loadConfig(): CliConfig {
  try {
    const raw = readFileSync(configPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    return { ...EMPTY_CONFIG, ...parsed };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export function saveConfig(config: CliConfig): void {
  const dir = configDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n", "utf8");
  // POSIX-only — Windows ignores the mode but the user's profile already
  // restricts access by default.
  try {
    chmodSync(configPath(), 0o600);
  } catch {
    // best-effort
  }
}

export function clearConfig(): void {
  saveConfig({ ...EMPTY_CONFIG });
}
