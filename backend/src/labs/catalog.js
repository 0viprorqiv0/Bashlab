import { createHash, timingSafeEqual } from 'node:crypto';

// One fixed flag per lab, plus the files that are placed in the learner's home
// directory when the lab's sandbox session is created (and again after Reset).
//
// Keyed by the lesson slug. This file only ever runs on the server: the browser
// never receives a flag, it can only submit one (POST /api/labs/:lessonId/flag).
//
// Two kinds of labs:
//   * "find it"  - the flag is inside a file that only the lab's commands reveal;
//   * "do it"    - a ./check.sh script prints the flag once the lab's work is in place.
// check.sh only uses what the runner image ships (bash, coreutils).

const b64 = (text) => Buffer.from(text).toString('base64');

// Prints the flag from a script, lightly encoded so a plain `cat` of the script
// does not show it. (Flags are shared by every learner, so this is only a speed bump.)
const reveal = (flag) => `echo "Well done! FLAG: $(echo ${b64(flag)} | base64 -d)"`;

const script = (flag, checks, hint) => `#!/bin/bash
# Self-check for this lab: prints the flag once the work is in place.
cd "$(dirname "$0")" || exit 1
ok=1
${checks}
if [ "$ok" = 1 ]; then
  ${reveal(flag)}
else
  echo "Not yet. ${hint}"
fi
`;

const lines = (count, make) => Array.from({ length: count }, (_, i) => make(i)).join('\n') + '\n';
const stamp = (i) => `2026-10-02T09:${String(i).padStart(2, '0')}:00Z`;

const APP_ENV = `APP_NAME=bashlab-demo
DATABASE_URL=postgres://app:secret@db-local:5432/app
CACHE_HOST=db-local
LOG_LEVEL=info
`;

export const LABS = {
  // Legacy Markdown lesson ("Hello"): read the page, run pwd, find the hidden file.
  'where-am-i': {
    flag: 'BASHLAB{pwd_tells_you_where_you_are}',
    mission: 'Run pwd, then list this directory including hidden files and read the hidden file.',
    files: (flag) => [{ path: '.where_am_i', content: `${flag}\n` }],
  },

  'terminal-fundamentals-navigation': {
    flag: 'BASHLAB{ls_dash_a_shows_hidden_files}',
    mission: 'Look around with ls -la. A hidden file (its name starts with a dot) holds the flag.',
    files: (flag) => [
      { path: '.secret_flag', content: `${flag}\n` },
      { path: 'welcome.txt', content: 'Welcome to the server. Not everything in a directory is listed by a plain ls.\n' },
    ],
  },

  'inspecting-files-output-pagers': {
    flag: 'BASHLAB{tail_reads_the_end_of_a_file}',
    mission: 'Read app.env, then the start and the end of audit.log. The flag is in the last lines.',
    files: (flag) => [
      { path: 'app.env', content: APP_ENV },
      { path: 'audit.log', content: lines(29, (i) => `${stamp(i)} INFO request handled id=${1000 + i}`) + `${stamp(29)} INFO flag=${flag}\n` },
    ],
  },

  'directory-creation-file-manipulation': {
    flag: 'BASHLAB{mkdir_touch_cp_all_done}',
    mission: 'Build project/src, project/config, project/config/app.json and its .bak copy, then run ./check.sh.',
    files: (flag) => [{
      path: 'check.sh', mode: 0o750,
      content: script(flag, `[ -d project/src ] || { echo "missing: project/src"; ok=0; }
[ -d project/config ] || { echo "missing: project/config"; ok=0; }
[ -f project/config/app.json ] || { echo "missing: project/config/app.json"; ok=0; }
[ -f project/config/app.json.bak ] || { echo "missing: project/config/app.json.bak"; ok=0; }`, 'Finish the steps of the lab and run ./check.sh again.'),
    }],
  },

  'safe-file-deletion-symbolic-links': {
    flag: 'BASHLAB{symlinks_point_and_rm_cleans_up}',
    mission: 'Create the app-config symlink, remove temp.cache, then run ./check.sh.',
    files: (flag) => [
      { path: 'temp.cache', content: 'stale cache entry\n' },
      {
        path: 'check.sh', mode: 0o750,
        content: script(flag, `[ -L app-config ] && [ "$(readlink app-config)" = "/etc/bashlab/config.json" ] || { echo "app-config must be a symlink to /etc/bashlab/config.json"; ok=0; }
[ ! -e temp.cache ] || { echo "temp.cache is still there"; ok=0; }`, 'Finish the steps of the lab and run ./check.sh again.'),
      },
    ],
  },

  'active-process-inspection-ps-aux': {
    flag: 'BASHLAB{ps_aux_lists_every_process}',
    mission: 'Inspect the processes (ps_snapshot.txt is a saved copy of ps aux). Find the node process and read its path.',
    files: (flag) => [{
      path: 'ps_snapshot.txt',
      content: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1   4300  3200 ?        Ss   09:00   0:00 /sbin/init
root        20  0.0  0.1   9800  5100 ?        Ss   09:00   0:00 /usr/sbin/cron
student    101  0.2  0.4  21000  8800 pts/0    Ss   09:01   0:00 -bash
student    240  1.8  2.1 912000 43000 pts/0    Sl   09:02   0:05 node /srv/app/${flag}.js
student    311  0.0  0.1  12000  3100 pts/0    R+   09:03   0:00 ps aux
`,
    }],
  },

  'standard-output-append-redirection': {
    flag: 'BASHLAB{redirect_writes_append_adds}',
    mission: 'Create build.env with > and >> as the steps say, then run ./check.sh.',
    files: (flag) => [{
      path: 'check.sh', mode: 0o750,
      content: script(flag, `[ "$(head -n 1 build.env 2>/dev/null)" = "BUILD_VERSION=2.4.0" ] || { echo "line 1 of build.env must be BUILD_VERSION=2.4.0"; ok=0; }
grep -q '^DEPLOY_TIME=' build.env 2>/dev/null || { echo "build.env needs a DEPLOY_TIME= line (use >>)"; ok=0; }`, 'Finish the steps of the lab and run ./check.sh again.'),
    }],
  },

  'standard-input-error-descriptors': {
    flag: 'BASHLAB{stderr_goes_to_dev_null}',
    mission: 'Run the find command and send its output to output.log, then run ./check.sh.',
    files: (flag) => [
      { path: 'settings.conf', content: 'mode=demo\n' },
      {
        path: 'check.sh', mode: 0o750,
        content: script(flag, `[ -s output.log ] || { echo "output.log is missing or empty"; ok=0; }
grep -q '\\.conf' output.log 2>/dev/null || { echo "output.log should list .conf files"; ok=0; }`, 'Finish the steps of the lab and run ./check.sh again.'),
      },
    ],
  },

  'the-power-of-pipes-combining-tools': {
    flag: 'BASHLAB{pipes_chain_small_tools}',
    mission: 'Count and rank the entries in audit.log. The most frequent entry is the flag.',
    files: (flag) => [{
      path: 'audit.log',
      content: [
        ...Array(12).fill(flag),
        ...Array(7).fill('LOGIN ok user=alice'),
        ...Array(5).fill('LOGIN failed user=mallory'),
        ...Array(3).fill('FILE read /etc/hosts'),
        'LOGOUT user=alice',
      ].join('\n') + '\n',
    }],
  },

  'pattern-matching-with-grep': {
    flag: 'BASHLAB{grep_finds_needles_recursively}',
    mission: 'Search app.env, audit.log and the src directory with grep. Search every file under src for "config".',
    files: (flag) => [
      { path: 'app.env', content: APP_ENV },
      { path: 'audit.log', content: lines(12, (i) => `${stamp(i)} ${i % 4 === 0 ? 'ERROR' : 'INFO'} job ${i} finished`) },
      { path: 'src/main.py', content: 'print("hello")\n' },
      { path: 'src/lib/settings.py', content: `# load the config\nconfig_flag = "${flag}"\n` },
    ],
  },

  'stream-editing-with-sed': {
    flag: 'BASHLAB{sed_replaces_in_place}',
    mission: 'Replace db-local with postgres.internal in app.env (in place), then run ./check.sh.',
    files: (flag) => [
      { path: 'app.env', content: APP_ENV },
      {
        path: 'check.sh', mode: 0o750,
        content: script(flag, `grep -q 'db-local' app.env && { echo "app.env still mentions db-local"; ok=0; }
grep -q 'postgres.internal' app.env || { echo "app.env should mention postgres.internal"; ok=0; }`, 'Finish the steps of the lab and run ./check.sh again.'),
      },
    ],
  },

  'columnar-data-extraction-with-awk': {
    flag: 'BASHLAB{awk_slices_columns}',
    mission: 'Use awk on ps_output.txt. Only one process uses more than 5.0 percent CPU: print its last column.',
    files: (flag) => [{
      path: 'ps_output.txt',
      content: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1   4300  3200 ?        Ss   09:00   0:00 /sbin/init
root        20  0.1  0.1   9800  5100 ?        Ss   09:00   0:00 /usr/sbin/cron
student    101  0.2  0.4  21000  8800 pts/0    Ss   09:01   0:00 -bash
student    240 12.5  2.1 912000 43000 pts/0    Sl   09:02   0:05 /opt/worker/${flag}
student    255  0.4  0.3  30000  6100 pts/0    S    09:02   0:00 /usr/bin/python3
student    311  0.0  0.1  12000  3100 pts/0    R+   09:03   0:00 ps
`,
    }],
  },

  'posix-permissions-octal-chmod': {
    flag: 'BASHLAB{chmod_755_makes_it_run}',
    mission: 'Fix the permissions of id_rsa (600) and deploy.sh (755), then run ./deploy.sh.',
    files: (flag) => [
      { path: 'id_rsa', mode: 0o644, content: '-----BEGIN DEMO KEY-----\nnot a real key\n-----END DEMO KEY-----\n' },
      {
        path: 'deploy.sh', mode: 0o644,
        content: `#!/bin/bash
cd "$(dirname "$0")" || exit 1
if [ "$(stat -c %a id_rsa)" = "600" ]; then
  ${reveal(flag)}
else
  echo "Refusing to deploy: id_rsa is readable by others (it must be chmod 600)."
fi
`,
      },
    ],
  },
};

export const hasFlag = (slug) => Object.hasOwn(LABS, slug);

// The files a lab needs, ready to be written under the learner's home directory.
export function seedFilesFor(slug) {
  if (!hasFlag(slug)) return [];
  const lab = LABS[slug];
  const files = lab.files(lab.flag);
  return [...files, { path: 'MISSION.txt', content: `${lab.mission}\nWhen you have the flag, paste it in the "Submit flag" box under the terminal.\n` }];
}

// Constant-time comparison of what the learner pasted with the lab's flag.
export function checkFlag(slug, submitted) {
  if (!hasFlag(slug) || typeof submitted !== 'string' || submitted.length > 256) return false;
  const digest = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(submitted.trim()), digest(LABS[slug].flag));
}
