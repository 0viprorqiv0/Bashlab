// Thin REST/RPC client bound to one user's access token, for tests that
// assert RLS/RPC boundaries directly (not through the UI). Mirrors exactly
// what the browser's supabase-js client would send — same PostgREST/GoTrue
// endpoints, same headers — just without a browser in the loop.
const { env } = require('./env');

async function signIn(email, password) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`signIn(${email}): ${body.error_description || body.msg || res.status}`);
  return body; // { access_token, refresh_token, user, ... }
}

function forToken(accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };
  const rest = (table) => `${env.SUPABASE_URL}/rest/v1/${table}`;

  return {
    async select(table, query = '') {
      const res = await fetch(`${rest(table)}${query}`, { headers });
      return { status: res.status, data: await res.json() };
    },
    async insert(table, row) {
      const res = await fetch(rest(table), { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return { status: res.status, data: await res.json() };
    },
    async update(table, query, patch) {
      const res = await fetch(`${rest(table)}${query}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      return { status: res.status, data: await res.json() };
    },
    async rpc(fn, args = {}) {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    },
  };
}

module.exports = { signIn, forToken };
