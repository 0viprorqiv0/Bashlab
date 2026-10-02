import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

const API_BASE = 'http://127.0.0.1:3001';

function parseEnv(filePath) {
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

const backendEnv = parseEnv(path.resolve('.env'));
const adminClient = createClient(backendEnv.SUPABASE_URL, backendEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_PASSWORD = 'TestPassword123!@#';
const randomSuffix = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

async function createTempUser(prefix) {
  const email = `manual_audit_${prefix}_${randomSuffix()}@bashlab-audit.test`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`Create user error (${prefix}): ${error.message}`);
  return { id: data.user.id, email, password: TEST_PASSWORD };
}

async function deleteTempUser(id) {
  if (!id) return;
  await adminClient.auth.admin.deleteUser(id).catch(() => {});
}

async function api(endpoint, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('===============================================================');
  console.log('       LIVE USER MANUAL TESTING — BASHLAB BACKEND API          ');
  console.log('===============================================================');
  console.log(`Backend Target: ${API_BASE}`);
  console.log(`Supabase URL: ${backendEnv.SUPABASE_URL}`);

  let user1, user2;
  const results = [];

  try {
    console.log('\n[Setup] Provisioning fresh test users in Supabase...');
    user1 = await createTempUser('learner1');
    user2 = await createTempUser('learner2');
    console.log(`User 1 created: ${user1.email} (ID: ${user1.id})`);
    console.log(`User 2 created: ${user2.email} (ID: ${user2.id})`);

    // Test 1: User 1 Login
    console.log('\n[Test 1] User 1 Login via POST /api/auth/login...');
    const login1 = await api('/api/auth/login', {
      method: 'POST',
      body: { email: user1.email, password: user1.password }
    });
    console.log(`-> HTTP Status: ${login1.status}`);
    const token1 = login1.data?.session?.access_token;
    const pass1 = login1.status === 200 && Boolean(token1);
    results.push({ test: 'User 1 Authentication (POST /api/auth/login)', status: login1.status, pass: pass1 });
    if (!pass1) throw new Error('Cannot proceed without token: ' + JSON.stringify(login1.data));

    // Fetch real lessons from courses API
    const coursesRes = await api('/api/content/courses', { token: token1 });
    let lessonId1 = randomUUID();
    let lessonId2 = randomUUID();
    if (coursesRes.ok && Array.isArray(coursesRes.data) && coursesRes.data.length > 0) {
      const course = coursesRes.data[0];
      if (course.modules?.[0]?.lessons?.[0]?.id) {
        lessonId1 = course.modules[0].lessons[0].id;
        lessonId2 = course.modules[0].lessons[1]?.id || randomUUID();
      }
    }
    console.log(`Using Lesson 1: ${lessonId1}, Lesson 2: ${lessonId2}`);

    // Test 2: Workspace Creation & Lease Claim
    console.log('\n[Test 2] Workspace Allocation & Lease Claim (POST /api/sessions)...');
    const createRes = await api('/api/sessions', {
      method: 'POST',
      token: token1,
      body: { lessonId: lessonId1 }
    });
    console.log(`-> HTTP Status: ${createRes.status}`);
    console.log('-> Response Data:', createRes.data);
    const sessionId = createRes.data?.sessionId;
    const pass2 = createRes.status === 201 && sessionId && createRes.data.cwd === '/home/student';
    results.push({ test: 'Workspace Allocation & Lease Claim (POST /api/sessions)', status: createRes.status, pass: pass2 });

    // Test 3: Standard Command Execution
    console.log('\n[Test 3] Interactive Command Execution (pwd; whoami; id)...');
    const cmdRes = await api(`/api/sessions/${sessionId}/execute`, {
      method: 'POST',
      token: token1,
      body: { command: 'pwd; whoami; id' }
    });
    console.log(`-> HTTP Status: ${cmdRes.status}`);
    console.log('-> Execution Output:', JSON.stringify(cmdRes.data));
    const pass3 = cmdRes.status === 200 && cmdRes.data?.stdout?.includes('/home/student');
    results.push({ test: 'Standard Command Execution in Bubblewrap/Docker', status: cmdRes.status, pass: pass3 });

    // Test 4: Concurrency Mutex (409 Conflict)
    console.log('\n[Test 4] Concurrency Mutex: Long command + Immediate 2nd command...');
    const p1 = api(`/api/sessions/${sessionId}/execute`, {
      method: 'POST',
      token: token1,
      body: { command: 'sleep 2; echo "done sleep"' }
    });
    await new Promise(r => setTimeout(r, 60)); // ensure first request is in flight
    const p2 = api(`/api/sessions/${sessionId}/execute`, {
      method: 'POST',
      token: token1,
      body: { command: 'echo "concurrent test"' }
    });

    const [cmdA, cmdB] = await Promise.all([p1, p2]);
    console.log(`-> Cmd A Status: ${cmdA.status}, exitCode: ${cmdA.data?.exitCode}`);
    console.log(`-> Cmd B Status: ${cmdB.status}, data:`, cmdB.data);
    const pass4 = cmdB.status === 409 || cmdA.status === 409;
    results.push({ test: 'Concurrent Execution Mutex (HTTP 409 Conflict)', status: cmdB.status, pass: pass4 });

    // Test 5: Storage Quota Enforcement (>10MB ulimit / >30MB total)
    console.log('\n[Test 5] Storage Quota Enforcement (attempting >35MB write)...');
    const quotaRes = await api(`/api/sessions/${sessionId}/execute`, {
      method: 'POST',
      token: token1,
      body: { command: 'head -c 35M /dev/zero > large_blob.bin' }
    });
    console.log(`-> HTTP Status: ${quotaRes.status}`);
    console.log('-> Quota result:', quotaRes.data);
    // OS ulimit stops at 10MB with SIGXFSZ (exitCode 153: File size limit exceeded) or backend throws 413 / sets quotaExceeded
    const pass5 = quotaRes.data?.exitCode === 153 || quotaRes.data?.quotaExceeded === true || quotaRes.status === 413 || quotaRes.data?.stderr?.includes('File size limit exceeded');
    results.push({ test: 'Storage Quota & ulimit RLIMIT_FSIZE Enforcement', status: quotaRes.status, pass: pass5 });

    // Test 6: Host Isolation / Minimal Bubblewrap Jail
    console.log('\n[Test 6] Jail Escape / Sensitive File Access (/etc/shadow)...');
    const jailRes = await api(`/api/sessions/${sessionId}/execute`, {
      method: 'POST',
      token: token1,
      body: { command: 'cat /etc/shadow 2>&1 || true' }
    });
    const jailOut = (jailRes.data?.stdout || '') + ' ' + (jailRes.data?.stderr || '');
    console.log(`-> Output: ${jailOut.trim()}`);
    // File must either be completely masked/absent or permission denied
    const pass6 = jailOut.includes('Permission denied') || jailOut.includes('No such file or directory');
    results.push({ test: 'Sandbox Jail Isolation (/etc/shadow masked or forbidden)', status: jailRes.status, pass: pass6 });

    // Test 7: Cross-User Authorization (Learner 2 accessing Learner 1 session)
    console.log('\n[Test 7] Cross-User Authorization Boundary...');
    const login2 = await api('/api/auth/login', {
      method: 'POST',
      body: { email: user2.email, password: user2.password }
    });
    const token2 = login2.data?.session?.access_token;

    const crossGet = await api(`/api/sessions/${sessionId}`, {
      method: 'GET',
      token: token2
    });
    const crossExec = await api(`/api/sessions/${sessionId}/execute`, {
      method: 'POST',
      token: token2,
      body: { command: 'whoami' }
    });
    console.log(`-> User 2 GET foreign session: HTTP ${crossGet.status}`);
    console.log(`-> User 2 POST foreign session: HTTP ${crossExec.status}`);
    const pass7 = crossGet.status === 404 && crossExec.status === 404;
    results.push({ test: 'Cross-User Isolation (HTTP 404 on foreign session)', status: crossGet.status, pass: pass7 });

    // Test 8: Single Active Session Rebind Invariant
    console.log('\n[Test 8] Single Active Session Invariant (User 1 opens second lab)...');
    const rebindRes = await api('/api/sessions', {
      method: 'POST',
      token: token1,
      body: { lessonId: lessonId2 }
    });
    console.log(`-> HTTP Status: ${rebindRes.status}`);
    console.log('-> Reused:', rebindRes.data?.reused, 'Session ID:', rebindRes.data?.sessionId);
    const pass8 = rebindRes.status === 200 && rebindRes.data?.reused === true && rebindRes.data?.sessionId === sessionId;
    results.push({ test: 'Single Active Session Reuse Invariant', status: rebindRes.status, pass: pass8 });

    // Test 9: Session Deletion & Lease Release
    console.log('\n[Test 9] Session Deletion (DELETE /api/sessions/:id)...');
    const deleteRes = await api(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      token: token1
    });
    console.log(`-> HTTP Status: ${deleteRes.status}`);
    const pass9 = deleteRes.status === 204;
    results.push({ test: 'Session Deletion & Lease Cleanup', status: deleteRes.status, pass: pass9 });

    // Test 10: Inactive Session Gone
    console.log('\n[Test 10] Accessing Deleted Session (GET /api/sessions/:id)...');
    const getGone = await api(`/api/sessions/${sessionId}`, {
      method: 'GET',
      token: token1
    });
    console.log(`-> HTTP Status: ${getGone.status}`);
    const pass10 = getGone.status === 404;
    results.push({ test: 'Deleted Session Inaccessibility (HTTP 404)', status: getGone.status, pass: pass10 });

  } finally {
    console.log('\n[Teardown] Cleaning up temporary test users in Supabase...');
    if (user1?.id) await deleteTempUser(user1.id);
    if (user2?.id) await deleteTempUser(user2.id);
    console.log('-> Teardown complete.');
  }

  console.log('\n===============================================================');
  console.log('                 MANUAL TEST SUITE RESULTS                     ');
  console.log('===============================================================');
  let allPass = true;
  for (const r of results) {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} | [HTTP ${r.status}] ${r.test}`);
    if (!r.pass) allPass = false;
  }
  console.log('===============================================================');
  if (allPass) {
    console.log('🎉 ALL 10 REAL-USER LIVE MANUAL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
