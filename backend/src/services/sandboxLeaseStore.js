import { randomUUID } from 'node:crypto';

function makeLease({ userId, lessonId, workspaceId = randomUUID(), now = Date.now() }) {
  return { leaseId: randomUUID(), userId, lessonId, workspaceId, state: 'ALLOCATING', createdAt: now(), updatedAt: now(), operationToken: randomUUID() };
}

export function createMemoryLeaseStore({ maxActiveLeases = 100, now = Date } = {}) {
  const leases = new Map();
  const active = () => [...leases.values()].filter(l => l.state !== 'REMOVED').length;
  return {
    async claim({ userId, lessonId }) {
      const old = [...leases.values()].find(l => l.userId === userId && l.state !== 'REMOVED');
      if (old) return { lease: old, created: false };
      if (active() >= maxActiveLeases) throw Object.assign(new Error('capacity'), { status: 503, code: 'LEASE_CAPACITY' });
      const lease = makeLease({ userId, lessonId, now });
      leases.set(lease.leaseId, lease);
      return { lease, created: true };
    },
    async finishAllocation({ leaseId }) { const l = leases.get(leaseId); l.state = 'ACTIVE'; return l; },
    async fail({ leaseId }) { const l = leases.get(leaseId); l.state = 'FAILED'; return l; },
    async beginCommand({ leaseId }) { const l = leases.get(leaseId); if (l.command) throw Object.assign(new Error('busy'), { status: 409 }); l.command = true; return l; },
    async finishCommand({ leaseId }) { const l = leases.get(leaseId); if (l) l.command = false; return l; },
    async beginDeletion({ leaseId }) { const l = leases.get(leaseId); l.state = 'DELETING'; return l; },
    async finishDeletion({ leaseId }) { const l = leases.get(leaseId); l.state = 'REMOVED'; return l; },
    async getForUser({ userId }) { return [...leases.values()].find(l => l.userId === userId && l.state !== 'REMOVED') || null; },
    async expired() { return [...leases.values()].filter(l => l.state !== 'REMOVED'); },
    async all() { return [...leases.values()]; }
  };
}

export function createSupabaseLeaseStore({ admin, maxActiveLeases = 100, now = Date } = {}) {
  return {
    claim(args) { return admin.rpc('claim_sandbox_lease', { ...args, max_active: maxActiveLeases, now: now().toISOString() }); },
    finishAllocation(args) { return admin.rpc('finish_sandbox_allocation', args); },
    fail(args) { return admin.rpc('fail_sandbox_lease', args); },
    beginCommand(args) { return admin.rpc('begin_sandbox_command', args); },
    finishCommand(args) { return admin.rpc('finish_sandbox_command', args); },
    beginDeletion(args) { return admin.rpc('begin_sandbox_deletion', args); },
    finishDeletion(args) { return admin.rpc('finish_sandbox_deletion', args); },
    getForUser(args) { return admin.rpc('get_sandbox_lease', args); },
    expired(args) { return admin.rpc('expired_sandbox_leases', args); }
  };
}
