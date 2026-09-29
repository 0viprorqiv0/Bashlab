// Minimal .env reader (no extra dependency). Pulls the service role key from
// backend/.env and the public URL/anon key from frontend/.env.local, because
// Playwright runs as plain Node, outside Next.js's own env loading.
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

const repoRoot = path.resolve(__dirname, '../../../..');
const backendEnv = parseEnvFile(path.join(repoRoot, 'backend', '.env'));
const frontendEnv = parseEnvFile(path.join(repoRoot, 'frontend', '.env.local'));

const env = {
  SUPABASE_URL: frontendEnv.NEXT_PUBLIC_SUPABASE_URL || backendEnv.SUPABASE_URL,
  SUPABASE_ANON_KEY: frontendEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || backendEnv.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: backendEnv.SUPABASE_SERVICE_ROLE_KEY,
};

for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!env[key]) throw new Error(`Missing ${key} — check backend/.env and frontend/.env.local`);
}

module.exports = { env };
