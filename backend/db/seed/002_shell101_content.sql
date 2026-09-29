-- Nội dung Shell 101 (dev/demo). Khớp 3 chương đang giới thiệu trên landing page.
-- CẢNH BÁO: xoá và tạo lại toàn bộ chương/bài của shell-101 → mất progress của khoá này.
-- test_template.verifier = key trong backend/src/services/taskVerifier.js (bài có chấm tự động).

delete from public.chapters where course_id = (select id from public.courses where slug = 'shell-101');

update public.courses
set description = 'Master command line fundamentals: know where you are, create and organise files, then search text and connect commands with pipes.',
    duration_minutes = 90
where slug = 'shell-101';

with course as (select id from public.courses where slug = 'shell-101'),
ch as (
  insert into public.chapters (course_id, title, sort_order)
  select course.id, t.title, t.ord from course,
  (values ('Find your bearings', 1), ('Make it your own', 2), ('Connect the dots', 3)) as t(title, ord)
  returning id, sort_order
)
insert into public.lessons (chapter_id, title, slug, content_md, status, sort_order, objectives, test_template)
select ch.id, l.title, l.slug, l.content_md, 'published', l.ord, l.objectives::jsonb, l.test_template::jsonb
from ch join (values
  (1, 1, 'Where am I?', 'where-am-i', $md$
# Where am I?

Every command you type runs *somewhere* — in your **current working directory**.

```bash
pwd
```

`pwd` (print working directory) prints the full path of the folder you are in, for example `/home/student`.

A path that starts with `/` is an **absolute path**: it describes the location from the very top of the filesystem.
$md$, '["Run pwd", "Explain what an absolute path is"]', null),
  (1, 2, 'Look around with ls', 'look-around', $md$
# Look around with ls

`ls` lists what is inside a directory.

```bash
ls
ls -l     # long format: permissions, owner, size, date
ls -la    # also show hidden files (names starting with .)
```

Hidden files such as `.bashrc` store settings — `ls` alone does not show them.
$md$, '["List files with ls", "Show hidden files with ls -la"]', null),
  (1, 3, 'Move around with cd', 'move-around', $md$
# Move around with cd

`cd` changes your current directory.

```bash
cd /tmp      # go to an absolute path
cd ..        # go up one level
cd           # go back to your home directory
cd -         # go back to the previous directory
```

Run `pwd` after each `cd` to confirm where you ended up.
$md$, '["Change directory with cd", "Return home with cd"]', null),
  (2, 1, 'Your first file', 'hello-bashlab', $md$
# Your first file

Create a file and put text in it with **output redirection**:

```bash
echo "Hello BashLab" > README.md
cat README.md
```

`>` writes the command's output into a file (and replaces what was there). `>>` appends instead.

**Task:** in your home directory, create `README.md` containing exactly `Hello BashLab`, then press **Check Solution**.
$md$, '["Create README.md in your home directory", "The file contains Hello BashLab"]', '{"verifier": "hello-bashlab", "hint": "Run: echo \"Hello BashLab\" > README.md — make sure you are in your home directory (cd)."}'),
  (2, 2, 'Folders and files together', 'files-03', $md$
# Folders and files together

```bash
mkdir demo              # create a directory
touch demo/notes.txt    # create an empty file
echo "Hello BashLab" > demo/README.md
ls demo
```

**Task:** create a directory `demo`, and inside it a file `README.md` containing `Hello BashLab`. Then press **Check Solution**.
$md$, '["Create the demo/ directory", "demo/README.md contains Hello BashLab"]', '{"verifier": "files-03", "hint": "Run: mkdir demo && echo \"Hello BashLab\" > demo/README.md"}'),
  (2, 3, 'Copy and move', 'copy-and-move', $md$
# Copy and move

```bash
cp README.md backup.md        # copy a file
cp -r demo demo-backup        # copy a whole directory
mv backup.md old.md           # rename (move) a file
rm old.md                     # delete a file — there is no recycle bin!
```

Use `-i` (`cp -i`, `mv -i`, `rm -i`) to be asked before overwriting or deleting.
$md$, '["Copy files with cp", "Rename files with mv"]', null),
  (3, 1, 'Read files with cat', 'read-files', $md$
# Read files with cat

```bash
cat README.md          # print the whole file
head -n 5 log.txt      # first 5 lines
tail -n 5 log.txt      # last 5 lines
wc -l log.txt          # count lines
```

For long files, `less log.txt` lets you scroll (press `q` to quit).
$md$, '["Print a file with cat", "Show the first and last lines of a file"]', null),
  (3, 2, 'Find lines with grep', 'find-with-grep', $md$
# Find lines with grep

`grep` prints the lines that match a pattern.

```bash
grep error log.txt        # lines containing "error"
grep -i error log.txt     # ignore case
grep -n error log.txt     # show line numbers
grep -r TODO .            # search every file under the current directory
```
$md$, '["Search a file with grep", "Use -i and -n options"]', null),
  (3, 3, 'Connect commands with pipes', 'pipes', $md$
# Connect commands with pipes

The pipe `|` sends the output of one command into the next one.

```bash
cat log.txt | grep error | wc -l    # how many error lines?
ls -l | sort -k5 -n                 # files sorted by size
history | tail -n 10                # your last 10 commands
```

Small commands, connected together, become powerful tools.
$md$, '["Chain commands with |", "Count matching lines with grep and wc"]', null)
) as l(chapter_ord, ord, title, slug, content_md, objectives, test_template)
on l.chapter_ord = ch.sort_order;
