import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../errors.js';

export const HOME = '/home/student';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class SessionManager {
  constructor({ root = process.env.WORKSPACE_ROOT || '/var/tmp/bashlab/workspaces', maxSessions = 1000 } = {}) {
    this.root = path.resolve(root);
    this.maxSessions = maxSessions;
    this.sessions = new Map();
    this.orphans = new Map();
    this.removeListeners = new Set();
    this.creating = 0;
  }

  onRemoved(listener) {
    this.removeListeners.add(listener);
    return () => this.removeListeners.delete(listener);
  }

  async create({ id = randomUUID(), workspaceId = id } = {}) {
    if (this.sessions.size + this.orphans.size + this.creating >= this.maxSessions) {
      throw new HttpError(503, 'SESSION_CAPACITY', 'Session capacity reached');
    }
    this.creating++;
    const workspacePath = path.join(this.root, workspaceId);
    try {
      await fs.mkdir(this.root, { recursive: true, mode: 0o2770 });
      // Refuse a symlink root. It must be the same local bind source as the runner.
      if (!(await fs.lstat(this.root)).isDirectory()) throw new Error('Invalid workspace root');
      await fs.mkdir(workspacePath, { recursive: true, mode: 0o2770 });
      await fs.chmod(workspacePath, 0o2770);
      const session = { id, workspaceId, workspacePath, cwd: HOME, lastActiveAt: Date.now(), commandCount: 0,
        busy: false, quarantined: false };
      await this.makeDirectories(session);
      this.sessions.set(id, session);
      return session;
    } catch (error) {
      await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => {});
      throw error;
    } finally { this.creating--; }
  }

  async discoverOrphans(now = Date.now()) {
    await fs.mkdir(this.root, { recursive: true, mode: 0o2770 });
    for await (const item of await fs.opendir(this.root)) {
      if (UUID.test(item.name) && item.isDirectory() && !this.sessions.has(item.name)) {
        // These IDs are not restored as live sessions. Give old bounded helpers
        // a full idle TTL to finish before touching their workspace.
        this.orphans.set(item.name, { id: item.name, workspacePath: path.join(this.root, item.name), lastActiveAt: now });
      }
    }
  }

  async removableTree(root) {
    // Only called with the session lock and after confirmed job completion.
    // lstat prevents traversal through symlinks. Same UID ownership is required.
    const pending = [root];
    while (pending.length) {
      const dir = pending.pop();
      let info;
      try { info = await fs.lstat(dir); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      if (!info.isDirectory()) continue;
      await fs.chmod(dir, (info.mode & 0o7777) | 0o700);
      for await (const entry of await fs.opendir(dir)) {
        if (entry.isDirectory()) pending.push(path.join(dir, entry.name));
      }
    }
  }

  async makeDirectories(session) {
    for (const name of ['home', 'tmp']) {
      const dir = path.join(session.workspacePath, name);
      await fs.mkdir(dir, { recursive: true, mode: 0o2770 });
      await fs.chmod(dir, 0o2770);
    }
  }

  async attach({ id, workspaceId }) {
    const existing = this.sessions.get(id);
    const expected = path.join(this.root, workspaceId);
    if (existing) {
      if (existing.workspacePath !== expected) throw new HttpError(409, 'LEASE_WORKSPACE_CONFLICT', 'Lease workspace mismatch');
      return existing;
    }
    return this.create({ id, workspaceId });
  }

  get(id) {
    if (!UUID.test(id || '') || !this.sessions.has(id)) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', 'Session not found or expired');
    }
    return this.sessions.get(id);
  }

  // All execute/check/reset/delete/reaper paths share this synchronous lock.
  acquire(id, { allowQuarantined = false } = {}) {
    const session = this.get(id);
    if (session.busy) throw new HttpError(409, 'SESSION_BUSY', 'Another operation is using this session');
    if (session.quarantined && !allowQuarantined) {
      throw new HttpError(503, 'SESSION_QUARANTINED', 'Runner completion is unknown; restart runner and API before recovery');
    }
    session.busy = true;
    session.lastActiveAt = Date.now();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      session.busy = false;
      session.lastActiveAt = Date.now();
    };
  }

  async withSession(id, operation, options = {}) {
    const release = this.acquire(id, options);
    try { return await operation(this.get(id)); } finally { release(); }
  }

  async checkQuota(session) {
    let bytes = 0;
    let entries = 0;
    // Bounded traversal, no symlink following; include directories to bound work.
    const pending = ['home', 'tmp'].map(name => path.join(session.workspacePath, name));
    while (pending.length) {
      const dir = pending.pop();
      let dirStat;
      try {
        dirStat = await fs.lstat(dir);
      } catch (err) {
        if (err.code === 'ENOENT') {
          await fs.mkdir(dir, { recursive: true, mode: 0o2770 });
          await fs.chmod(dir, 0o2770);
          dirStat = await fs.lstat(dir);
        } else {
          throw err;
        }
      }
      if (!dirStat.isDirectory()) throw new HttpError(413, 'INVALID_WORKSPACE', 'Workspace directory is invalid');
      let handle;
      try {
        await fs.access(dir, fs.constants.R_OK | fs.constants.X_OK);
        handle = await fs.opendir(dir);
      }
      catch (error) {
        if (error.code === 'EACCES') throw new HttpError(413, 'WORKSPACE_PERMISSIONS', 'Workspace permissions prevent quota inspection; reset the session');
        throw error;
      }
      for await (const entry of handle) {
        const file = path.join(dir, entry.name);
        const info = await fs.lstat(file);
        entries++;
        bytes += Math.max(info.isFile() ? info.size : 0, info.blocks * 512);
        if (entries > 100 || bytes > 30 * 1024 * 1024) {
          throw new HttpError(413, 'WORKSPACE_QUOTA', 'Workspace exceeds 30 MiB or 100 entries; reset the session');
        }
        if (info.isDirectory()) pending.push(file);
      }
    }
    return { bytes, entries };
  }

  async reset(session) {
    await this.removableTree(session.workspacePath);
    for (const name of ['home', 'tmp']) await fs.rm(path.join(session.workspacePath, name), { recursive: true, force: true });
    await this.makeDirectories(session);
    session.cwd = HOME;
    session.commandCount = 0;
  }

  async remove(session) {
    await this.removableTree(session.workspacePath);
    await fs.rm(session.workspacePath, { recursive: true, force: true });
    this.sessions.delete(session.id);
    this.orphans.delete(session.id);
    for (const listener of this.removeListeners) {
      try { listener(session.id); } catch { /* cleanup observers must not break removal */ }
    }
  }

  describe(session) {
    return { sessionId: session.id, cwd: session.cwd, commandCount: session.commandCount, lastActiveAt: session.lastActiveAt };
  }
}
