import fs from 'node:fs/promises';
import path from 'node:path';
import { seedFilesFor } from './catalog.js';

// Writes a lab's starting files into the learner's home directory. The files are
// created by the API process, which shares its UID with the runner's sandbox user
// (see RUNNING.md), so the learner can read and edit them from the terminal.
// Called when a lab's session is created and again after Reset, which wipes home.
export async function seedLabWorkspace(session, slug) {
  const home = path.join(session.workspacePath, 'home');
  for (const file of seedFilesFor(slug)) {
    const target = path.join(home, file.path);
    if (path.relative(home, target).startsWith('..')) throw new Error(`lab file escapes home: ${file.path}`);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o770 });
    await fs.writeFile(target, file.content, { mode: file.mode ?? 0o660, flag: 'w' });
    await fs.chmod(target, file.mode ?? 0o660); // the process umask must not change the intended mode
  }
}
