# Quick Tunnel demo controller

This directory exposes the complete BashLab browser application through one
temporary public `trycloudflare.com` URL. It is for short demos only: the URL
changes after every fresh start and anyone with that URL can open the app.

```text
browser -> cloudflared -> Caddy (127.0.0.1:8080)
                         /api/*, /health -> API (127.0.0.1:3001)
                         everything else  -> frontend (127.0.0.1:3000)
```

## One-time prerequisites

- Node dependencies are installed in `frontend/` and `backend/`.
- `backend/.env` contains the normal Supabase and application configuration.
- Docker is available to start the `bashlab-box` runner.
- `cloudflared` and `caddy` are installed and available on `PATH`.

The controller starts the Docker runner when necessary. It starts frontend,
backend, Caddy, and cloudflared only on loopback addresses, so it does not open
an inbound firewall port.

Before `start`, stop a separately launched BashLab stack (`./start.sh stop`) if
it occupies ports 3000 or 3001. The controller refuses occupied ports instead
of taking over or stopping processes it does not own.

## Start a demo

```bash
./scripts/quick-tunnel/bashlab-tunnel.sh start
```

Wait for the printed `https://<random>.trycloudflare.com` URL, then open it in
a browser. The script injects that fresh URL into the backend process CORS
configuration and makes the production frontend call relative `/api/...`
paths. Registration, login, token refresh, terminal execution, and Check
Solution therefore use the same public origin.

No Cloudflare email gate is used. BashLab authentication and authorization
remain responsible for access after a visitor reaches the public login page.

## Commands

```bash
./scripts/quick-tunnel/bashlab-tunnel.sh status
./scripts/quick-tunnel/bashlab-tunnel.sh url
./scripts/quick-tunnel/bashlab-tunnel.sh logs
./scripts/quick-tunnel/bashlab-tunnel.sh diagnose
./scripts/quick-tunnel/bashlab-tunnel.sh stop
```

`diagnose` prints local frontend/API health and public Tunnel health. If
cloudflared exits, it reports `RESULT=QUICK_TUNNEL_LOST`; run `start` again to
create a new URL. The controller intentionally does not replace a dead Tunnel
in the background because the replacement needs fresh backend CORS state.

`stop` ends the public URL and stops only frontend, backend, Caddy, and
cloudflared processes whose PID and command line identify them as controller
owned. The Docker runner remains available for later local use.

## Runtime files

Runtime PID files and logs are in `.run/quick-tunnel/`. They are ignored by
Git. `cloudflared.log` and `tunnel-url.txt` are useful when sharing a demo link
or diagnosing a failed Tunnel, but the stored URL is not valid after the
Tunnel process stops.

## Limitations

- This is not a stable deployment, custom domain, WAF, or email-OTP setup.
- The URL rotates whenever a fresh Tunnel starts.
- Backend IP-based request limits are shared through the local Caddy proxy.
- For permanent hosting, use the Named Tunnel configuration in
  [`infra/cloudflare/`](../../infra/cloudflare/README.md).
