export const initialLabs = [
  {
    id: 1,
    slug: 'terminal-fundamentals-navigation',
    title: 'Terminal Fundamentals & Navigation',
    commands: ['pwd', 'cd', 'ls'],
    category: 'Core Commands',
    tag: 'Navigation',
    acceptance: '95.4%',
    difficulty: 'Easy',
    status: 'solved',
    shortObjective: 'Explore your current directory and navigate between root, home, and nested directories using relative and absolute paths.',
    scenario: 'You are deployed as a DevOps Junior Engineer on a newly provisioned Linux server. Before configuring services, you must orient yourself in the directory hierarchy and inspect system layout.',
    steps: [
      { id: 's1', text: 'Print your current working directory using `pwd`', targetCmd: 'pwd' },
      { id: 's2', text: 'List all files and hidden entries in the directory using `ls -la`', targetCmd: 'ls' },
      { id: 's3', text: 'Navigate into the `/var/log` directory using `cd /var/log`', targetCmd: 'cd' },
      { id: 's4', text: 'Return to your user home directory using `cd ~` or `cd`', targetCmd: 'cd' }
    ],
    commandSyntax: [
      { cmd: 'pwd', desc: 'Print working directory path' },
      { cmd: 'ls [options] [path]', desc: 'List directory contents (-l for long listing, -a for all)' },
      { cmd: 'cd [directory]', desc: 'Change the current working directory' }
    ],
    examples: [
      {
        title: 'Listing details including hidden files',
        code: 'ls -lah',
        explanation: 'Displays file permissions, ownership, byte size in human format, and hidden dotfiles like .bashrc.'
      },
      {
        title: 'Navigating to parent directory',
        code: 'cd ..',
        explanation: 'Moves up one level in the directory hierarchy.'
      }
    ],
    hint: 'Use `pwd` to check where you are. To list hidden files starting with a dot (.), always append the `-a` flag: `ls -la`.',
    solutionExplanation: 'The POSIX file system begins at root (`/`). Your personal workspace is typically `/home/<username>` (shortened to `~`). Absolute paths always start with `/`, while relative paths are evaluated from your current location (`pwd`).',
    expectedCommands: ['pwd', 'ls', 'cd']
  },
  {
    id: 2,
    slug: 'inspecting-files-output-pagers',
    title: 'Inspecting Files & Output Pagers',
    commands: ['cat', 'head', 'tail', 'less'],
    category: 'Core Commands',
    tag: 'File Ops',
    acceptance: '91.2%',
    difficulty: 'Easy',
    status: 'solved',
    shortObjective: 'Display the first 10 lines of a server log with head and inspect streaming log entries with tail.',
    scenario: 'An application is generating high volumes of telemetry. Rather than loading massive gigabyte files into memory, use Unix streaming pagers to inspect targeted slices of log files.',
    steps: [
      { id: 's1', text: 'Inspect the contents of `app.env` using `cat app.env`', targetCmd: 'cat' },
      { id: 's2', text: 'View the first 5 lines of `audit.log` using `head -n 5 audit.log`', targetCmd: 'head' },
      { id: 's3', text: 'View the last 10 lines of `audit.log` using `tail -n 10 audit.log`', targetCmd: 'tail' }
    ],
    commandSyntax: [
      { cmd: 'cat [file...]', desc: 'Concatenate and print file contents to stdout' },
      { cmd: 'head [-n lines] [file]', desc: 'Output the first part of files (defaults to 10 lines)' },
      { cmd: 'tail [-n lines] [-f] [file]', desc: 'Output the last part of files or follow growth live' }
    ],
    examples: [
      {
        title: 'Viewing top 5 lines of a configuration',
        code: 'head -n 5 nginx.conf',
        explanation: 'Safely previews header directives without flooding your terminal screen.'
      }
    ],
    hint: 'Use `head -n <num>` for top lines and `tail -n <num>` for trailing lines. Use `cat` for small files only.',
    solutionExplanation: 'For production debugging, `tail -f` streams incoming logs continuously. For large files, `less` provides scrollable pagination without reading the entire file into RAM upfront.',
    expectedCommands: ['cat', 'head', 'tail']
  },
  {
    id: 3,
    slug: 'directory-creation-file-manipulation',
    title: 'Directory Creation & File Manipulation',
    commands: ['mkdir', 'touch', 'cp', 'mv'],
    category: 'Core Commands',
    tag: 'File Ops',
    acceptance: '87.8%',
    difficulty: 'Easy',
    status: 'solved',
    shortObjective: 'Create a recursive directory tree with mkdir -p and safely duplicate configuration files with cp.',
    scenario: 'You are setting up scaffolding for a microservice project. You need to create nested folders and copy boilerplate configuration templates.',
    steps: [
      { id: 's1', text: 'Create nested directories `project/src` and `project/config` using `mkdir -p`', targetCmd: 'mkdir' },
      { id: 's2', text: 'Create an empty file `project/config/app.json` using `touch`', targetCmd: 'touch' },
      { id: 's3', text: 'Copy `project/config/app.json` to `project/config/app.json.bak` using `cp`', targetCmd: 'cp' }
    ],
    commandSyntax: [
      { cmd: 'mkdir [-p] <dir>', desc: 'Create directory; -p creates parent directories as needed' },
      { cmd: 'touch <file>', desc: 'Update timestamp or create an empty file if not present' },
      { cmd: 'cp [-r] <source> <dest>', desc: 'Copy files; use -r to copy directories recursively' },
      { cmd: 'mv <source> <dest>', desc: 'Move or rename files or directories' }
    ],
    examples: [
      {
        title: 'Making deep nested trees in one command',
        code: 'mkdir -p api/v1/controllers',
        explanation: 'Avoids "No such file or directory" error by creating missing parent directories.'
      }
    ],
    hint: 'Always pass `-p` to `mkdir` when creating paths with subfolders: `mkdir -p src/utils/helpers`.',
    solutionExplanation: 'The `-p` flag ensures idempotency: it creates intermediate parent directories and does not fail if the directory already exists.',
    expectedCommands: ['mkdir', 'touch', 'cp', 'mv']
  },
  {
    id: 4,
    slug: 'safe-file-deletion-symbolic-links',
    title: 'Safe File Deletion & Symbolic Links',
    commands: ['rm', 'rmdir', 'ln -s'],
    category: 'Core Commands',
    tag: 'File Ops',
    acceptance: '81.4%',
    difficulty: 'Easy',
    status: 'solved',
    shortObjective: 'Create soft links pointing to configuration files and clean up temporary build cache files.',
    scenario: 'A service requires accessing a centralized configuration file stored in `/etc/bashlab/config.json`. Create a symbolic link in the current workspace pointing to it, then remove old cache files.',
    steps: [
      { id: 's1', text: 'Create a symlink `app-config` pointing to `/etc/bashlab/config.json` using `ln -s`', targetCmd: 'ln' },
      { id: 's2', text: 'Inspect the link target using `ls -l app-config`', targetCmd: 'ls' },
      { id: 's3', text: 'Remove outdated temporary file `temp.cache` using `rm -f temp.cache`', targetCmd: 'rm' }
    ],
    commandSyntax: [
      { cmd: 'ln -s <target> <link_name>', desc: 'Create a symbolic (soft) link to a file or directory' },
      { cmd: 'rm [-r] [-f] <target>', desc: 'Remove file (-r for recursive directory, -f for force without prompt)' }
    ],
    examples: [
      {
        title: 'Creating an Nginx enabled site symlink',
        code: 'ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/',
        explanation: 'Common Linux administration pattern to enable configs without duplicating files.'
      }
    ],
    hint: 'In `ln -s target link_name`, remember: TARGET comes first, then the LINK NAME second.',
    solutionExplanation: 'Soft links (symlinks) store the path of the original file, behaving like modern shortcuts across different filesystems.',
    expectedCommands: ['ln', 'rm']
  },
  {
    id: 5,
    slug: 'standard-output-append-redirection',
    title: 'Standard Output & Append Redirection',
    commands: ['>', '>>'],
    category: 'Streams & Redirection',
    tag: 'Streams',
    acceptance: '74.6%',
    difficulty: 'Medium',
    status: 'solved',
    shortObjective: 'Redirect command output to overwrite files (>) and append diagnostic messages without truncation (>>).',
    scenario: 'You are writing an automated deployment hook. Diagnostic status lines must be preserved in a run log rather than printed directly to the terminal stdout.',
    steps: [
      { id: 's1', text: 'Write "BUILD_VERSION=2.4.0" into `build.env` using `>` redirection', targetCmd: '>' },
      { id: 's2', text: 'Append "DEPLOY_TIME=$(date)" into `build.env` using `>>` redirection', targetCmd: '>>' },
      { id: 's3', text: 'Verify both lines exist using `cat build.env`', targetCmd: 'cat' }
    ],
    commandSyntax: [
      { cmd: 'command > file', desc: 'Redirect stdout to file, overwriting existing contents' },
      { cmd: 'command >> file', desc: 'Redirect stdout to file, appending to end of file' }
    ],
    examples: [
      {
        title: 'Saving system date into status file',
        code: 'date >> uptime.log',
        explanation: 'Appends current date/time without wiping out previous timestamps.'
      }
    ],
    hint: 'Single `>` clobbers/overwrites the file completely. Double `>>` appends to the bottom.',
    solutionExplanation: 'Redirection operators instruct the shell to open the target file descriptor and swap file descriptor 1 (stdout) before executing the child command.',
    expectedCommands: ['>', '>>', 'cat']
  },
  {
    id: 6,
    slug: 'standard-input-error-descriptors',
    title: 'Standard Input & Error Descriptors',
    commands: ['<', '2>', '2>&1', '/dev/null'],
    category: 'Streams & Redirection',
    tag: 'Streams',
    acceptance: '63.2%',
    difficulty: 'Medium',
    status: 'in_progress',
    shortObjective: 'Suppress noisy stderr output by redirecting file descriptor 2 to /dev/null and merge stdout with stderr.',
    scenario: 'Searching the entire filesystem with find produces hundreds of "Permission denied" errors. Silence stderr to reveal only the valid matches.',
    steps: [
      { id: 's1', text: 'Run `find / -name "*.conf" 2>/dev/null` to discard stderr permission warnings', targetCmd: 'find' },
      { id: 's2', text: 'Redirect both stdout and stderr into `output.log` using `&>` or `2>&1`', targetCmd: '2>&1' }
    ],
    commandSyntax: [
      { cmd: 'cmd 2> /dev/null', desc: 'Discard all error output from stream 2 (stderr)' },
      { cmd: 'cmd > file 2>&1', desc: 'Redirect stdout to file, then redirect stderr (2) to stdout (1)' },
      { cmd: 'cmd &> file', desc: 'Bash shorthand to redirect both stdout and stderr into a file' }
    ],
    examples: [
      {
        title: 'Running a cron job quietly',
        code: 'backup.sh > /var/log/backup.log 2>&1',
        explanation: 'Ensures both normal output and potential error stack traces are captured together in the log file.'
      }
    ],
    hint: 'Descriptor 0 is stdin, 1 is stdout, and 2 is stderr. `/dev/null` is the Linux "black hole" device.',
    solutionExplanation: 'When redirecting `2>&1`, the order matters: `> file 2>&1` directs descriptor 1 to file first, then redirects descriptor 2 to point to where descriptor 1 is currently pointing.',
    expectedCommands: ['find', '2>/dev/null', '2>&1']
  },
  {
    id: 7,
    slug: 'the-power-of-pipes-combining-tools',
    title: 'The Power of Pipes: Combining Tools',
    commands: ['|', 'sort', 'uniq', 'wc'],
    category: 'Streams & Redirection',
    tag: 'Streams',
    acceptance: '68.9%',
    difficulty: 'Medium',
    status: 'solved',
    shortObjective: 'Stream directory contents into sort and count unique occurrence counts of user login attempts.',
    scenario: 'An authentication log contains thousands of raw IP addresses. Chain standard Unix filter utilities with pipes to compute the top 5 most frequent IP occurrences.',
    steps: [
      { id: 's1', text: 'Count total lines in `audit.log` using `wc -l audit.log`', targetCmd: 'wc' },
      { id: 's2', text: 'Sort all entries alphabetically using `cat audit.log | sort`', targetCmd: 'sort' },
      { id: 's3', text: 'Count unique occurrences using `sort audit.log | uniq -c`', targetCmd: 'uniq' },
      { id: 's4', text: 'Sort unique occurrences in descending numerical order using `sort audit.log | uniq -c | sort -nr`', targetCmd: 'sort' }
    ],
    commandSyntax: [
      { cmd: 'cmd1 | cmd2', desc: 'Send stdout of cmd1 directly into stdin of cmd2' },
      { cmd: 'sort [-n] [-r]', desc: 'Sort lines textually (-n numeric, -r reverse)' },
      { cmd: 'uniq [-c]', desc: 'Report or omit repeated adjacent lines (-c for count)' },
      { cmd: 'wc [-l] [-w]', desc: 'Count lines (-l), words (-w), or bytes in input' }
    ],
    examples: [
      {
        title: 'Counting unique logged-in users',
        code: 'who | awk "{print $1}" | sort | uniq | wc -l',
        explanation: 'Classic Unix philosophy: combining small, single-purpose tools into powerful pipelines.'
      }
    ],
    hint: 'Remember that `uniq` ONLY merges ADJACENT duplicate lines. You MUST always pipe through `sort` before `uniq`!',
    solutionExplanation: 'The pipe character (`|`) connects the output buffer of one process directly to the input stream of another via an anonymous in-memory kernel pipe buffer.',
    expectedCommands: ['|', 'sort', 'uniq', 'wc']
  },
  {
    id: 8,
    slug: 'pattern-matching-with-grep',
    title: 'Pattern Matching with Basic grep',
    commands: ['grep', 'grep -i', 'grep -rn'],
    category: 'Text Processing',
    tag: 'Text',
    acceptance: '83.1%',
    difficulty: 'Easy',
    status: 'solved',
    shortObjective: 'Search recursively across source code for function definitions and case-insensitive strings.',
    scenario: 'You need to locate all occurrences of the variable "DATABASE_URL" across a legacy codebase without opening every file manually.',
    steps: [
      { id: 's1', text: 'Search for "DATABASE_URL" in `app.env` using `grep "DATABASE_URL" app.env`', targetCmd: 'grep' },
      { id: 's2', text: 'Search case-insensitively for "error" using `grep -i "error" audit.log`', targetCmd: 'grep' },
      { id: 's3', text: 'Search recursively showing line numbers using `grep -rn "config" ./src`', targetCmd: 'grep' }
    ],
    commandSyntax: [
      { cmd: 'grep [-i] [-r] [-n] "pattern" [file...]', desc: 'Search for matching regular expression lines' }
    ],
    examples: [
      {
        title: 'Finding active listen ports in config files',
        code: 'grep -rn "listen 80" /etc/nginx/',
        explanation: 'Recursively searches directory, displaying file path and line numbers.'
      }
    ],
    hint: 'Combine flags: `-r` (recursive), `-n` (show line numbers), `-i` (ignore case) -> `grep -rni "text" .`',
    solutionExplanation: 'grep stands for Globally search a Regular Expression and Print. It is the premier Unix text filtering standard.',
    expectedCommands: ['grep']
  },
  {
    id: 9,
    slug: 'stream-editing-with-sed',
    title: 'Stream Line Editing with sed',
    commands: ['sed', 's/find/replace/g'],
    category: 'Text Processing',
    tag: 'Text',
    acceptance: '48.2%',
    difficulty: 'Hard',
    status: 'todo',
    shortObjective: 'Automate search-and-replace in streaming text and edit configuration files in-place using sed -i.',
    scenario: 'During server migration, the database host changed from "db-local:5432" to "postgres.internal:5432". Replace all occurrences in `app.env` automatically.',
    steps: [
      { id: 's1', text: 'Preview substitution using `sed "s/db-local/postgres.internal/g" app.env`', targetCmd: 'sed' },
      { id: 's2', text: 'Perform in-place replacement directly on the file using `sed -i "s/db-local/postgres.internal/g" app.env`', targetCmd: 'sed' },
      { id: 's3', text: 'Verify the file was updated with `cat app.env`', targetCmd: 'cat' }
    ],
    commandSyntax: [
      { cmd: 'sed "s/target/replacement/g" file', desc: 'Stream substitute target with replacement globally' },
      { cmd: 'sed -i "s/.../.../g" file', desc: 'Edit file in-place instead of printing to stdout' }
    ],
    examples: [
      {
        title: 'Stripping trailing whitespace',
        code: 'sed -i "s/[ \\t]*$//" script.sh',
        explanation: 'Removes invisible spaces at line endings.'
      }
    ],
    hint: 'The `s` command format is `s/pattern/replacement/flags`. The `g` flag at the end replaces all occurrences on every line.',
    solutionExplanation: 'sed (Stream Editor) parses streams line-by-line, applying instructions from the cycle buffer, making it extraordinarily fast on massive files.',
    expectedCommands: ['sed', 'cat']
  },
  {
    id: 10,
    slug: 'columnar-data-extraction-with-awk',
    title: 'Columnar Data Extraction with AWK',
    commands: ['awk', 'NR', 'NF'],
    category: 'Text Processing',
    tag: 'Text',
    acceptance: '42.5%',
    difficulty: 'Hard',
    status: 'todo',
    shortObjective: 'Calculate memory consumption sums and filter server process outputs where CPU usage exceeds threshold.',
    scenario: 'Analyze `ps_output.txt` to find processes consuming more than 5.0% CPU and print their PID, User, and Command name.',
    steps: [
      { id: 's1', text: 'Print the 1st and 11th columns using `awk "{print $1, $11}" ps_output.txt`', targetCmd: 'awk' },
      { id: 's2', text: 'Filter lines where column 3 (CPU) > 5.0 using `awk "$3 > 5.0 {print $1, $2, $3}" ps_output.txt`', targetCmd: 'awk' }
    ],
    commandSyntax: [
      { cmd: 'awk "{print $1, $2}" file', desc: 'Print specific whitespace-delimited columns' },
      { cmd: 'awk -F: "{print $1}" /etc/passwd', desc: 'Use custom delimiter with -F flag' }
    ],
    examples: [
      {
        title: 'Summing total sizes in a directory',
        code: 'ls -l | awk "{sum += $5} END {print sum / 1024, \"KB\"}"',
        explanation: 'Uses internal accumulator variable and END block.'
      }
    ],
    hint: 'In AWK, `$0` is the whole line, `$1` is the first field, `$2` is the second field, and so forth.',
    solutionExplanation: 'AWK is a complete Turing-complete text-processing programming language tailored for tabular data manipulation.',
    expectedCommands: ['awk']
  },
  {
    id: 11,
    slug: 'posix-permissions-octal-chmod',
    title: 'POSIX Permissions: Octal & chmod 755',
    commands: ['chmod 755', 'chmod 644', 'chmod 600'],
    category: 'Security & Permissions',
    tag: 'Permissions',
    acceptance: '71.2%',
    difficulty: 'Medium',
    status: 'solved',
    shortObjective: 'Assign appropriate read, write, and execute bits for owners, groups, and others using octal notation.',
    scenario: 'SSH private keys must be restricted to 600 (owner read/write only), while web scripts need 755 (owner all, others read/execute). Fix improper permissions.',
    steps: [
      { id: 's1', text: 'Inspect existing permissions with `ls -l id_rsa deploy.sh`', targetCmd: 'ls' },
      { id: 's2', text: 'Set secure permissions on SSH key using `chmod 600 id_rsa`', targetCmd: 'chmod' },
      { id: 's3', text: 'Make `deploy.sh` executable by all using `chmod 755 deploy.sh`', targetCmd: 'chmod' }
    ],
    commandSyntax: [
      { cmd: 'chmod <octal> <file>', desc: 'Set permissions: 4 (Read), 2 (Write), 1 (Execute)' }
    ],
    examples: [
      {
        title: 'Restricting private SSH key',
        code: 'chmod 600 ~/.ssh/id_ed25519',
        explanation: 'SSH client refuses connections if key is readable by other users.'
      }
    ],
    hint: 'Calculate octal bits: Read=4, Write=2, Execute=1. Owner: 4+2=6. Group: 0. Other: 0 -> 600.',
    solutionExplanation: 'The first digit represents User (owner), second represents Group, third represents Others.',
    expectedCommands: ['chmod', 'ls']
  },
  {
    id: 12,
    slug: 'active-process-inspection-ps-aux',
    title: 'Active Process Inspection: ps aux & top',
    commands: ['ps aux', 'top', 'htop', 'pgrep'],
    category: 'Core Commands',
    tag: 'Processes',
    acceptance: '84.9%',
    difficulty: 'Easy',
    status: 'solved',
    shortObjective: 'Identify background worker PIDs, parent processes, and sort running tasks by memory footprint.',
    scenario: 'An unknown background process is consuming excessive server CPU. Locate its process identifier (PID) and command arguments.',
    steps: [
      { id: 's1', text: 'List all running system processes using `ps aux`', targetCmd: 'ps' },
      { id: 's2', text: 'Filter specifically for node or python processes with `ps aux | grep node`', targetCmd: 'grep' },
      { id: 's3', text: 'Find PID directly with `pgrep -l node`', targetCmd: 'pgrep' }
    ],
    commandSyntax: [
      { cmd: 'ps aux', desc: 'Display all running processes across all users with terminal info' },
      { cmd: 'pgrep <name>', desc: 'Look up processes matching pattern and return PIDs' }
    ],
    examples: [
      {
        title: 'Viewing process tree hierarchy',
        code: 'pstree -p',
        explanation: 'Visualizes parent and child process trees with PIDs.'
      }
    ],
    hint: 'In `ps aux`: `a` shows all users, `u` shows process owner/user format, `x` shows processes without a controlling TTY.',
    solutionExplanation: 'The kernel exposes process information dynamically through the `/proc` virtual filesystem, which `ps` formats.',
    expectedCommands: ['ps', 'grep', 'pgrep']
  }
];

export function getLabById(id) {
  const numericId = Number(id);
  const found = initialLabs.find((lab) => lab.id === numericId);
  if (found) return found;
  // Fallback to lab 1
  return initialLabs[0];
}
