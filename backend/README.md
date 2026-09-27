# BashLab Backend

This directory documents the planned backend for BashLab. No implementation exists yet.

## Planned Scope (Future Phase)

- **Runtime**: Node.js + Express
- **API**: REST + WebSocket for real-time terminal sessions
- **Database**: PostgreSQL (users, courses, progress, sessions)
- **Auth**: JWT-based authentication with email verification, password reset
- **Sandbox**: Docker containers on Linux VPS for isolated Bash execution
- **Admin**: Content management (courses, chapters, lessons), user management, activity logs

## API Surface (Planned)

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/verify-email` |
| Users | `GET /users/me`, `POST /users/me/password-reset-request` |
| Courses | `GET /courses`, `GET /courses/:slug`, `GET /courses/:slug/progress` |
| Lessons | `GET /lessons/:id`, `POST /lessons/:id/check` |
| Sessions | `POST /sessions`, `GET /sessions/:id`, `DELETE /sessions/:id`, `WS /sessions/:id/pty` |
| Admin (Content) | `CRUD /admin/courses`, `CRUD /admin/chapters`, `CRUD /admin/lessons` |
| Admin (Users) | `GET /admin/users`, `PATCH /admin/users/:id/role`, `PATCH /admin/users/:id/status` |
| Admin (Activity) | `GET /admin/sessions`, `GET /admin/logs` |

## Sandbox Architecture (Planned)

- Each practice session spawns a short-lived Docker container
- Container includes: Bash, coreutils, git, vim/nano, man pages
- Resource limits: CPU, memory, disk, network (egress blocked)
- Session TTL: 10–15 minutes idle, max 60 minutes
- WebSocket PTY stream for real-time terminal I/O
- Filesystem snapshots for `Check Solution` verification

## Environment Variables (Planned)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
EMAIL_PROVIDER_API_KEY=...
DOCKER_HOST=...
SANDBOX_IMAGE=bashlab-sandbox:latest
SANDBOX_CPU_LIMIT=0.5
SANDBOX_MEMORY_LIMIT=256m
SANDBOX_TTL_SECONDS=900
```

## Links to Update When Backend Exists

The following frontend links currently point to non-existent routes and should be updated when the backend is implemented:

- `Navbar` → `/login`, `/courses`
- `Lookbook` → CTAs link to `/courses`; the demo `courses` command references `/courses/shell-101`
- `Footer` → `/courses`, `#how-it-works`, `#faq`

## Development

No commands available yet. This README will be updated with setup instructions when backend implementation begins.
