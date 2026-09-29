// Reads .auth/users.json written by auth.setup.js. Must be called lazily
// (inside a hook/test, not at module top level) — Playwright collects every
// spec file before running the "setup" project, so the file doesn't exist
// yet at import time.
const fs = require('fs');
const path = require('path');

function loadUsers() {
  const file = path.join(__dirname, '..', '.auth', 'users.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { loadUsers };
