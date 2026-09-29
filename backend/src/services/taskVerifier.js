import fs from 'node:fs/promises';
import { constants as C } from 'node:fs';
import path from 'node:path';
import { HttpError } from '../errors.js';

// Rules are server-owned. Never accept filesystem paths or shell code from the client.
const lessons = {
  'files-03': [
    { name: 'Thư mục demo/ đã được tạo', path: 'demo', kind: 'directory' },
    { name: 'demo/README.md chứa Hello BashLab', path: 'demo/README.md', kind: 'file', content: 'Hello BashLab' },
  ],
  'hello-bashlab': [
    { name: 'README.md tồn tại', path: 'README.md', kind: 'file' },
    { name: 'README.md chứa Hello BashLab', path: 'README.md', kind: 'file', content: 'Hello BashLab' },
  ],
};
const DIR_FLAGS = C.O_RDONLY | C.O_DIRECTORY | C.O_NOFOLLOW;

async function check(root, rule) {
  const handles = [];
  try {
    const parts = rule.path.split('/');
    if (parts.some(part => !part || part === '.' || part === '..' || part.includes('\0'))) return false;
    let parent = await fs.open(root, DIR_FLAGS);
    handles.push(parent);
    // Linux /proc/self/fd anchors each lookup to an already opened directory.
    // O_NOFOLLOW applies at every component, not just the final file.
    for (const part of parts.slice(0, -1)) {
      parent = await fs.open(`/proc/self/fd/${parent.fd}/${part}`, DIR_FLAGS);
      handles.push(parent);
    }
    const file = await fs.open(`/proc/self/fd/${parent.fd}/${parts.at(-1)}`,
      rule.kind === 'directory' ? DIR_FLAGS : C.O_RDONLY | C.O_NOFOLLOW | C.O_NONBLOCK);
    handles.push(file);
    const info = await file.stat();
    if (rule.kind === 'directory') return info.isDirectory();
    if (!info.isFile() || info.nlink !== 1 || info.size > 65536) return false;
    if (!rule.content) return true;
    const buffer = Buffer.alloc(65537);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    return bytesRead <= 65536 && buffer.subarray(0, bytesRead).toString('utf8').trimEnd() === rule.content;
  } catch (error) {
    if (['ENOENT', 'ELOOP', 'ENOTDIR', 'EACCES', 'ENXIO'].includes(error.code)) return false;
    throw error;
  } finally {
    await Promise.all(handles.map(handle => handle.close()));
  }
}

// Caller holds the session lock after confirmed runner completion.
export async function verifyTask(session, lessonId) {
  if (!Object.hasOwn(lessons, lessonId || '')) throw new HttpError(400, 'UNKNOWN_LESSON', 'Unknown lessonId');
  const checks = [];
  for (const rule of lessons[lessonId]) checks.push({ name: rule.name, passed: await check(path.join(session.workspacePath, 'home'), rule) });
  return { passed: checks.every(item => item.passed), checks };
}
