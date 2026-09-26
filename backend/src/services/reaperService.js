export async function reapOnce(manager, now = Date.now(), ttlMs = 30 * 60 * 1000) {
  let count = 0;
  for (const session of manager.sessions.values()) {
    if (session.busy || session.quarantined || now - session.lastActiveAt <= ttlMs) continue;
    const release = manager.acquire(session.id);
    try { await manager.remove(session); count++; } finally { release(); }
  }
  for (const session of manager.orphans.values()) {
    if (now - session.lastActiveAt <= ttlMs) continue;
    await manager.remove(session);
    count++;
  }
  return count;
}

export function startReaper(manager, { intervalMs = 5 * 60 * 1000, logger = console } = {}) {
  let scanning = false;
  const timer = setInterval(async () => {
    if (scanning) return;
    scanning = true;
    try { await reapOnce(manager); } catch (error) { logger.error('Reaper failed:', error.message); }
    finally { scanning = false; }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
