# BashLab Quick Tunnel Controller Design

## Goal

Provide one command that starts a temporary public BashLab URL. A visitor who
opens that URL must be able to use login, registration, the terminal sandbox,
and other normal browser flows exactly as when using localhost.

This is a short-lived demo tool. It does not require a custom domain, Cloudflare
account, email gate, WAF configuration, or a permanent system service.

## Non-goals

- Production hosting, stable hostname, custom WAF rules, or Cloudflare Access.
- Changing authentication, authorization, Docker, Bubblewrap, or API business
  logic.
- Automatically restarting a dead Tunnel with a new URL.
- Killing or taking over frontend/backend processes that the controller did not
  create.

## Architecture

```text
Browser
  -> https://<random>.trycloudflare.com
  -> cloudflared Quick Tunnel
  -> Caddy bound to 127.0.0.1:8080
       /api/*, /health -> BashLab API at 127.0.0.1:3001
       all other paths  -> Next.js at 127.0.0.1:3000
```

The Caddy bridge gives browser code one origin. The controller explicitly sets
`NEXT_PUBLIC_API_URL` to an empty value for the production frontend, so it calls relative `/api/...` URLs. Caddy passes
those requests to the API without rewriting their paths.

## Runtime configuration

The controller starts the API with process-local environment overrides:

```text
HOST=127.0.0.1
NODE_ENV=production
COOKIE_SECURE=true
CORS_ORIGINS=http://localhost:3000,https://<fresh-quick-tunnel-url>
```

The Quick URL is discovered before the API is started. That lets the API accept
the browser Origin for login, refresh-token, registration, and password-reset
flows without writing the random URL to `backend/.env`.

The frontend is served in production mode with no public API origin configured,
so the URL remains valid for every fresh Tunnel without rebuilding the frontend.

## Command interface

```text
./scripts/quick-tunnel/bashlab-tunnel.sh start
./scripts/quick-tunnel/bashlab-tunnel.sh stop
./scripts/quick-tunnel/bashlab-tunnel.sh status
./scripts/quick-tunnel/bashlab-tunnel.sh url
./scripts/quick-tunnel/bashlab-tunnel.sh logs
./scripts/quick-tunnel/bashlab-tunnel.sh diagnose
```

`start` must be idempotent. If it owns an already-running healthy bridge and
Tunnel, it prints the current URL rather than starting duplicate processes.

`stop` only stops PIDs verified as processes created by this controller. It
does not stop unrelated processes that happen to use the same ports.

## Files

```text
scripts/quick-tunnel/
  bashlab-tunnel.sh       # CLI dispatcher
  start-supervisor.sh     # owns start/order/readiness lifecycle
  stop-supervisor.sh      # verified shutdown
  process-helpers.sh      # PID, process and atomic runtime-file helpers
  diagnose.sh             # local/public health diagnostics
  Caddyfile               # local bridge configuration

.run/quick-tunnel/
  frontend.pid
  backend.pid
  caddy.pid
  tunnel.pid
  tunnel-url.txt
  frontend.log
  backend.log
  caddy.log
  cloudflared.log
```

Runtime state and logs remain untracked under `.run/`, which is already ignored.

## Lifecycle

1. Check `cloudflared`, `caddy`, Node, npm, Docker, and required local env
   files; start the existing `bashlab-box` runner or create it through the
   repository runner script when absent.
2. Build the frontend if no production build exists, then start frontend on
   loopback port 3000.
3. Start Caddy on loopback port 8080.
4. Start `cloudflared tunnel --url http://127.0.0.1:8080` and read only the URL
   emitted after this launch began.
5. Start backend on loopback port 3001 with the fresh Tunnel URL in its
   process environment.
6. Wait for local frontend/API health and public `/health` readiness before
   publishing the URL.
7. On shutdown, stop tunnel first, then Caddy, frontend, and backend; remove
   only controller-owned runtime files.

If the Tunnel exits unexpectedly, retain its last URL only as stale diagnostic
information and report `QUICK_TUNNEL_LOST`. Do not create another Tunnel
automatically: a replacement URL needs a backend restart with new CORS.

## Security and operating constraints

- Caddy, frontend, backend, and Tunnel origin each bind/connect through
  loopback only; no new public listener is created.
- Anyone with the random URL can reach the login page. BashLab auth, RBAC,
  rate limits, and sandbox controls continue to enforce access after that.
- The backend intentionally continues to distrust forwarded IP headers. For a
  temporary demo, backend IP-based limits are shared through Caddy.
- The tool is not suitable for permanent or classroom-scale public access.

## Acceptance checks

1. `start` prints one fresh HTTPS `trycloudflare.com` URL only after public
   health succeeds.
2. Opening the URL supports registration, login, refresh, terminal session
   creation, command execution, and Check Solution.
3. A second `start` does not create a second Tunnel.
4. `status`, `url`, and `logs` identify controller-owned runtime state.
5. `stop` invalidates the public URL and leaves unrelated processes untouched.
6. A dead Tunnel is reported as stale/lost rather than silently replaced.
