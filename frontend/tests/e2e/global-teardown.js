// Deletes every e2e.*@bashlab-e2e.test account created by auth.setup.js (and
// any spec that registered extra users in .auth/users.json under its own
// key). Runs once after the whole suite, pass or fail.
const fs = require('fs');
const path = require('path');
const { deleteTestUserSafe } = require('./support/supabaseAdmin');

module.exports = async function globalTeardown() {
  const usersFile = path.join(__dirname, '.auth', 'users.json');
  if (!fs.existsSync(usersFile)) return;
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  await Promise.all(Object.values(users).map((user) => deleteTestUserSafe(user)));
};
