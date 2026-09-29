// Lesson Workspace (/learn/[course]/[lesson]) — the real Bash sandbox and
// Check Solution flow need the Express backend (backend/), which only runs
// on Linux/WSL with Docker + Bubblewrap (see backend/RUNNING.md). This
// machine is Windows, so this suite is intentionally left as a placeholder:
// run it on a Linux/WSL box with `npm run runner:start && npm start` in
// backend/ first, then fill in the Check Solution end-to-end assertions.
const { test } = require('@playwright/test');

test.skip('Workspace: Check Solution against the real sandbox (requires Linux/WSL backend)', async () => {});
