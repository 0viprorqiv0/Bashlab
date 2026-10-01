export const BLOG_CATEGORIES = [
  'All',
  'Linux Basics',
  'Shell Scripting',
  'Security & SysAdmin',
  'Tips & Tricks'
];

export const BLOG_POSTS = [
  {
    id: '1',
    slug: 'getting-started-with-linux-terminal',
    title: 'Getting Started with Linux Terminal: A Beginner’s Essential Guide',
    excerpt: 'Step into the command line world. Learn essential navigation commands, terminal shortcuts, and how to feel right at home inside Linux.',
    category: 'Linux Basics',
    author: {
      name: 'Alex Chen',
      role: 'DevOps & Linux Educator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
    },
    publishedAt: '2026-09-28',
    readTime: '5 min read',
    featured: true,
    tags: ['Linux', 'Terminal', 'Beginner', 'Bash'],
    content: `
The Linux Command Line (CLI) might seem daunting at first glance with its plain text cursor and mysterious shell prompts. However, once you learn a few core commands, you unlock an incredible speed and degree of control over your operating system that traditional Graphical User Interfaces (GUIs) simply cannot match.

In this guide, we will walk through the core concepts every beginner needs to feel confident inside a terminal.

---

## 1. What is the Terminal & Shell?

Before typing commands, let's understand the terminology:
- **Terminal**: The text-based application interface where you type commands and view output.
- **Shell**: The underlying program executing your commands. **Bash** (Bourne Again Shell) is the default on most modern Linux distributions.

---

## 2. Navigating the File System

When you open a shell, you start inside your **Home Directory** (\`~\`). Let's inspect where you are and navigate around:

\`\`\`bash
# Print your current working directory
pwd

# List contents in the current directory
ls -la

# Change directory into /var/log
cd /var/log

# Return to your home directory
cd ~
\`\`\`

> 💡 **Tip:** Press the \`Tab\` key to auto-complete file and directory names. Pressing \`Tab\` twice shows all available suggestions!

---

## 3. Working with Files and Folders

Creating, inspecting, and managing files is seamless on the command line:

\`\`\`bash
# Create a new directory
mkdir my_project

# Create an empty file
touch my_project/notes.txt

# Inspect file content without opening an editor
cat my_project/notes.txt
\`\`\`

To view larger files page by page, use \`less\`:

\`\`\`bash
less /var/log/syslog
\`\`\`
*(Press \`q\` to exit \`less\` at any time).*

---

## 4. Key Terminal Shortcuts

Speed up your CLI productivity with these essential key combinations:

| Shortcut | Action |
| :--- | :--- |
| **Ctrl + L** | Clear the screen (same as typing \`clear\`) |
| **Ctrl + C** | Cancel/interrupt current executing command |
| **Ctrl + A** | Move cursor to beginning of the line |
| **Ctrl + E** | Move cursor to end of the line |
| **Up / Down Arrows** | Cycle through command history |

---

## 5. Next Steps

Now that you know the basics, the best way to learn is by **practicing in an isolated environment**. Check out the interactive Linux hands-on labs here on **BashLab** to put these commands into action safely!
`
  },
  {
    id: '2',
    slug: 'understanding-absolute-relative-paths',
    title: 'Mastering File Paths: Absolute vs. Relative Paths in Linux',
    excerpt: 'Never get lost in the directory tree again. Master the fundamental difference between absolute and relative paths with clear visual examples.',
    category: 'Linux Basics',
    author: {
      name: 'Sarah Jenkins',
      role: 'System Architect',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80'
    },
    publishedAt: '2026-09-25',
    readTime: '4 min read',
    featured: false,
    tags: ['File System', 'Paths', 'Linux', 'Bash'],
    content: `
Whether you are writing Bash scripts, setting up web servers, or configuring environment variables, understanding **paths** is fundamental.

A path is simply the address of a file or directory in your system. In Linux, there are two distinct ways to express a path: **Absolute Paths** and **Relative Paths**.

---

## 1. Absolute Paths: Starting from Root (\`/\`)

An **Absolute Path** always specifies the exact location from the very top of the Linux file hierarchy—the root directory (\`/\`).

### Characteristics of Absolute Paths:
- Always starts with a leading slash (\`/\`).
- Works regardless of your current location in the file system.
- Unambiguous and safe for production scripts.

### Examples:
\`\`\`bash
# Absolute path to SSH configuration file
/etc/ssh/sshd_config

# Absolute path to user logs
/var/log/nginx/access.log

# Absolute path to your user home
/home/learner/documents/script.sh
\`\`\`

---

## 2. Relative Paths: Starting from Current Location

A **Relative Path** specifies a location relative to where you currently are (\`pwd\`).

### Key Symbols in Relative Navigation:
- \`.\` (single dot): Represents the current directory.
- \`..\` (double dot): Represents the parent directory (one level up).

### Examples:
Suppose you are currently in \`/home/learner/projects\`:

\`\`\`bash
# Accessing a subfolder inside current directory
cd website/src

# Moving up to parent directory (/home/learner)
cd ..

# Moving up two levels to /home
cd ../..

# Executing a script in the current directory
./deploy.sh
\`\`\`

---

## 3. Quick Comparison Table

| Scenario | Absolute Path | Relative Path |
| :--- | :--- | :--- |
| **Starts with** | \`/\` | Name of directory or \`.\` / \`..\` |
| **Portability in scripts** | Requires fixed system layout | High (moves with project root) |
| **Typing length** | Usually longer | Usually shorter |

---

## 4. Pro-tip: Using \`~\` for User Home

The tilde (\`~\`) symbol expands to your current user's home directory (e.g. \`/home/learner\`).

\`\`\`bash
# Equivalent to /home/learner/downloads
cd ~/downloads
\`\`\`

Practice navigating with both path types in BashLab's **Shell 101 Sandbox** to build muscle memory!
`
  },
  {
    id: '3',
    slug: 'demystifying-pipes-and-redirection',
    title: 'Demystifying Pipes and Redirection in Bash: Connect Commands Like Lego',
    excerpt: 'Chain small, powerful Linux utilities together using standard streams, redirection operators (>, >>), and pipes (|).',
    category: 'Shell Scripting',
    author: {
      name: 'Alex Chen',
      role: 'DevOps & Linux Educator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
    },
    publishedAt: '2026-09-20',
    readTime: '6 min read',
    featured: false,
    tags: ['Bash', 'Pipes', 'I/O Redirection', 'CLI'],
    content: `
One of the core philosophies of Unix is: **"Write programs that do one thing and do it well. Write programs to work together."**

In Bash, commands work together through **Input/Output (I/O) Streams** and **Pipes**. Let's break down how you can harness this power to automate complex file processing with simple one-liners.

---

## 1. The Three Standard Streams

Every command running in Linux automatically receives 3 default communication channels:

1. **stdin (Standard Input - File Descriptor 0)**: Input coming from keyboard or input stream.
2. **stdout (Standard Output - File Descriptor 1)**: Normal output printed to terminal.
3. **stderr (Standard Error - File Descriptor 2)**: Error messages printed to terminal.

---

## 2. Redirection Operators (\`>\`, \`>>\`, \`<\`)

### Redirecting Output to a File (\`>\` and \`>>\`)
- **\`>\` (Overwrite)**: Creates a new file or completely overwrites an existing file.
- **\`>>\` (Append)**: Appends output to the end of an existing file without deleting prior contents.

\`\`\`bash
# Overwrite file with system uptime info
uptime > status.log

# Append timestamp to the log file
date >> status.log
\`\`\`

### Redirecting Errors (\`2>\`)
Sometimes you want to capture errors or silence annoying error logs:

\`\`\`bash
# Redirect errors to error.log
ls /non_existent_dir 2> error.log

# Silence errors completely by throwing into null device
ls /root 2> /dev/null
\`\`\`

---

## 3. The Power of Pipes (\`|\`)

A **pipe** connects the **stdout** of one command directly into the **stdin** of the next command.

\`\`\`bash
command1 | command2 | command3
\`\`\`

### Real-World Examples:

**Example 1: Find memory-hungry processes**
\`\`\`bash
# List all processes, sort numerically by column 4 (RAM), show top 5
ps aux | sort -nr -k4 | head -n 5
\`\`\`

**Example 2: Count unique web server visitors**
\`\`\`bash
# Extract IP addresses from access log, sort, filter unique, count total
cat /var/log/nginx/access.log | awk '{print $1}' | sort | uniq | wc -l
\`\`\`

---

## Summary Cheat Sheet

- \`>\` Overwrite file with standard output
- \`>>\` Append standard output to file
- \`2>\` Redirect error messages
- \`|\` Pass stdout of left command as stdin to right command

Try combining pipes and redirection in the **BashLab Shell Automation Sandbox**!
`
  },
  {
    id: '4',
    slug: 'linux-file-permissions-explained',
    title: 'Linux File Permissions & chmod Demystified: Symbolic vs Octal',
    excerpt: 'Understand rwx permissions, user ownership, group privileges, and how to safely run chmod and chown without breaking system security.',
    category: 'Security & SysAdmin',
    author: {
      name: 'Marcus Vance',
      role: 'Security Engineer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
    },
    publishedAt: '2026-09-15',
    readTime: '7 min read',
    featured: false,
    tags: ['Permissions', 'chmod', 'chown', 'Security'],
    content: `
Ever encountered the frustrating error: **"Permission denied"** when executing a Bash script? 

In Linux, file permissions are the frontline of operating system security. Understanding how permissions work ensures your application stays secure while functioning properly.

---

## 1. Reading Permission Strings (\`-rwxr-xr--\`)

When you run \`ls -l\`, you see a 10-character string like \`-rwxr-xr--\`:

| Character Position | Meaning | Example Value |
| :--- | :--- | :--- |
| 1st char | File Type (\`-\` for file, \`d\` for directory) | \`-\` |
| 2nd - 4th | **User (Owner)** permissions | \`rwx\` (Read, Write, Execute) |
| 5th - 7th | **Group** permissions | \`r-x\` (Read, Execute) |
| 8th - 10th | **Others (World)** permissions | \`r--\` (Read-only) |

---

## 2. Permission Types & Octal Numeric Values

Each permission mode has a corresponding numeric value:

- **Read (\`r\`)** = 4
- **Write (\`w\`)** = 2
- **Execute (\`x\`)** = 1

To calculate octal numbers, sum the permissions for each scope:

| Scope | Permissions | Calculation | Octal |
| :--- | :--- | :--- | :--- |
| Owner | Read + Write + Execute | 4 + 2 + 1 | **7** |
| Group | Read + Execute | 4 + 0 + 1 | **5** |
| Others | Read only | 4 + 0 + 0 | **4** |

Combining them yields **754**!

---

## 3. Modifying Permissions with \`chmod\`

### Octal Mode:
\`\`\`bash
# Grant Owner all permissions, Group read & execute, Others none
chmod 750 deploy.sh

# Recommended permissions for standard web files
chmod 644 index.html

# Recommended permissions for directories
chmod 755 /var/www/html
\`\`\`

### Symbolic Mode:
You can also add (\`+\`) or remove (\`-\`) permissions for User (\`u\`), Group (\`g\`), or Others (\`o\`):

\`\`\`bash
# Make a script executable for the owner only
chmod u+x script.sh

# Remove write access for others
chmod o-w sensitive_config.json
\`\`\`

---

## 4. Changing Ownership with \`chown\`

Permissions govern actions, but **ownership** determines who gets evaluated as Owner or Group:

\`\`\`bash
# Change owner to learner and group to www-data
sudo chown learner:www-data /var/www/html/app.py
\`\`\`

> ⚠️ **Warning:** Avoid running \`chmod -R 777\`! It gives every user full write and execute rights, creating massive security vulnerabilities.
`
  },
  {
    id: '5',
    slug: 'grep-vs-find-when-to-use-which',
    title: 'grep vs. find: How to Search Content and Files Efficiently',
    excerpt: 'Stop confusing file searching with text content searching. Learn when to reach for find vs grep (or combine them together!).',
    category: 'Tips & Tricks',
    author: {
      name: 'Sarah Jenkins',
      role: 'System Architect',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80'
    },
    publishedAt: '2026-09-10',
    readTime: '5 min read',
    featured: false,
    tags: ['grep', 'find', 'CLI', 'Productivity'],
    content: `
When working on large codebases or troubleshooting Linux server logs, finding information quickly is crucial. Beginners often confuse **\`find\`** and **\`grep\`**.

Here is the simple golden rule to remember:
- **\`find\`** searches for **FILES & DIRECTORIES** based on metadata (name, size, mod time).
- **\`grep\`** searches for **TEXT CONTENT** inside files.

---

## 1. Using \`find\` (Finding File Metadata)

Use \`find\` when you know *something about the file itself*, but not necessarily what is inside it.

\`\`\`bash
# Find all files ending in .log inside /var/log
find /var/log -type f -name "*.log"

# Find directories modified in the last 24 hours
find ~/projects -type d -mtime -1

# Find files larger than 100 Megabytes
find / -size +100M 2>/dev/null
\`\`\`

---

## 2. Using \`grep\` (Searching Text Content)

Use \`grep\` when looking for specific error messages, strings, or regex patterns inside files.

\`\`\`bash
# Search for "DB_PASSWORD" inside config.env
grep "DB_PASSWORD" config.env

# Recursive search for "404 Not Found" across all logs (case-insensitive)
grep -ri "404 not found" /var/log/nginx/

# Show 3 lines of context around the match
grep -C 3 "FATAL ERROR" server.log
\`\`\`

---

## 3. The Ultimate Combo: \`find\` + \`grep\`

What if you want to find all \`.json\` files and search inside them for a specific setting? Combine them!

\`\`\`bash
# Using find with -exec
find . -type f -name "*.json" -exec grep -H "enable_auth" {} +

# Or using xargs (faster for large file lists)
find . -type f -name "*.py" | xargs grep "import os"
\`\`\`

Mastering \`grep\` and \`find\` will double your CLI troubleshooting speed. Practice both in **BashLab's Command Line Mastery track** today!
`
  }
];
