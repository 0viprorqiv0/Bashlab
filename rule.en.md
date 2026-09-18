# BashLab Working Rules

[Tiếng Việt](rule.md) | English

## 1. Scope and reference documents

These rules apply to contributors and tools working in this repository. **Must** and **must not** are requirements. Any exception must be approved by the repository owner and recorded in the pull request or work request.

- [README.en.md](README.en.md) explains how to run the project and what is currently implemented.
- [bashlab-pages.md](bashlab-pages.md) is the detailed Vietnamese specification for the 17 designed pages. Keep its page numbers and Stitch screen IDs unchanged.
- The source code determines what is implemented. A design, mock interface, or backend plan does not make a feature complete.
- If documentation and code disagree, explain the difference and update the relevant documentation when fixing it.
- Do not add, remove, or combine pages beyond the approved scope. My Learning is a separate page. Sessions and Admin log are tabs on Activity.

## 2. Branches and responsibilities

| Group | Group integration branch | Pages | Scope |
| --- | --- | --- | --- |
| A | `feature/a-product-introduction` | 01 | Product introduction and Landing |
| B | `feature/b-account-authentication` | 02–06 | Authentication and account recovery |
| C | `feature/c-course-discovery` | 07–08 | Course catalog and overview |
| D | `feature/d-learning-practice` | 09–10 | My Learning and Workspace |
| E | `feature/e-personal-account` | 11 | Personal account |
| F | `feature/f-content-administration` | 12–13 | Content administration |
| G | `feature/g-operations-administration` | 14–15 | Operations administration |
| H | `feature/h-system-pages` | 16–17 | System pages |

- `main` holds integrated work ready for handoff. Do not use it for routine task development.
- Each group branch contains the entire project. Do not delete another group's code to make a branch contain only your group's features.
- Create task branches from the matching group branch. Use `<type>/<group>-<description>` with lowercase ASCII letters and hyphens.
- Branch types are `feature`, `fix`, `docs`, and `chore`; groups are `a` through `h`. Examples: `feature/b-login-form`, `fix/h-not-found-layout`.
- For project-wide documentation or shared maintenance, use `docs/project-<description>` or `chore/shared-<description>`. Branch from `main` and open the pull request (PR) into `main`.
- If work affects several groups, name them in the PR. Split the work into separate PRs when the parts can be checked and integrated independently.
- Do not force-push, rebase, or rewrite shared history on `main` or the eight group branches. Do not delete a group branch without approval.

## 3. Workflow for a task

1. Check `git status`, the current branch, and the remote before making changes. Preserve other people's uncommitted work. Do not use reset or clean to discard it without permission.
2. Fetch the remote and update the base branch with a fast-forward. A fast-forward moves a branch forward without rewriting commits. If the histories have diverged, inspect them before merging; do not force an update to bypass the problem.
3. Create a task branch, make the requested changes, and check their effect on shared components.
4. Run the relevant checks, review the diff, and stage only the intended files.
5. Commit, push the task branch, and open a PR into the correct base branch.
6. After review and checks, merge into the group branch. When the group work is ready for handoff, open a PR from the group branch into `main`.

Start a group B task:

```bash
git status
git fetch origin
git switch feature/b-account-authentication
git pull --ff-only origin feature/b-account-authentication
git switch -c feature/b-login-form
```

Review and commit your changes:

```bash
git diff
git add frontend/path/to/changed-file.jsx
git diff --cached
git diff --cached --check
git commit -m "feat(b): add login form validation"
git push -u origin feature/b-login-form
```

Replace the example file path with a real changed file. When `main` receives shared updates, bring them into a group branch through a merge PR. Do not rebase a shared group branch.

## 4. Commit messages

Use `<type>(<scope>): <description>`.

- Types: `feat` (feature), `fix` (bug fix), `docs` (documentation), `style` (formatting with no behavior change), `refactor` (code restructuring), `test` (tests), and `chore` (configuration or tools).
- Scopes: `a`–`h`, `shared`, or `project`.
- Explain the actual change. Do not use vague messages such as “update”, “fix bug”, or “done”.
- Keep one clear purpose per commit. Do not mix feature work with unrelated bulk formatting or dependency updates.
- Do not commit build/cache output, tokens, real user data, or personal machine files. Inspect staged contents, not just filenames.
- When changing dependencies, update the lockfile using npm and explain why in the PR. Do not edit the lockfile by hand.

Example: `docs(project): clarify page catalog and contribution rules`.

## 5. Review and merge requirements

Every PR must explain its purpose, affected groups/pages, behavior changes, checks run and their results, unfinished work, before/after screenshots for UI changes, and how to recover if the change causes a problem.

Before merging:

- Check the target branch. The diff must match the described scope, with no unresolved conflicts or required review comments.
- Get at least one other person's review when the project has multiple contributors. When working alone, review the full diff yourself and record the results in the PR.
- Keep code, documentation, and configuration consistent. Do not claim a check passed unless it ran. Name any blocked checks and explain the reason.
- For frontend changes, run lint and build. Run curiosity/backdrop scripts when those effects are affected. Separate existing failures from new ones.
- For UI changes, check the affected page on desktop and mobile, including keyboard controls, focus, and error states. For logic changes, include a check that exercises the behavior or reproduces the fixed bug.
- For documentation-only changes, check paths, commands, page lists, and whitespace. An application build is not required.
- If a feature depends on a missing backend, label it as a mock/demo or not connected. Do not mark it as complete from start to finish.
- When resolving conflicts, read both versions, preserve the relevant groups' requirements, and rerun affected checks.
- Use merge commits between long-lived group branches and `main` to preserve their shared history. A task PR may be squash-merged when its commits all belong to one task.
- Fix problems after merging with a new commit or a revert PR. Do not rewrite shared branch history.

Initial setup exception: when the repository owner requests the first GitHub upload and its foundation documents, those changes may be committed directly to `main`. Use the PR workflow for normal tasks afterward.

## 6. Code and security rules

- Reuse existing components and configuration. Add a dependency only when a specific requirement needs it.
- Keep content, routes, and UI states aligned with the approved features. Handle loading, empty data, and errors where those states apply.
- Never run terminal-demo input through the application server's operating system shell.
- Before opening a real sandbox to users, isolate sessions and control resources and access according to the approved design.
- Groups F and G are administrator-only. The backend must check permission for each operation. Hiding a frontend button is not an access check.
- Users may access only the accounts, progress, and sessions they are allowed to use. Group H must show the correct denied-access or missing-page feedback.
- Password recovery must use neutral messages that do not reveal whether an account exists. Handle sensitive actions and logs according to the specification, without logging passwords or tokens.
- Never put secrets in code, commits, logs, screenshots, or PR descriptions. Example environment files must use fake values.
- `.gitignore` does not remove files that Git already tracks. If a secret was committed, stop the release, tell the repository owner, and revoke or replace the secret. Deleting the file alone does not fix the exposure.
- Do not change permissions, deployment environments, or real data outside the assigned scope.

## 7. Documentation and handoff

When adding or changing a feature, update the relevant README, page specification, or backend README. A handoff must name the branch/commit, completed work, checks performed, and remaining limitations.

This file describes the team's rules. It does not enable GitHub branch protection, continuous integration (CI), or required reviews. Automatic enforcement needs separate repository settings and workflows.
