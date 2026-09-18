# BashLab Git Rules

## Branches

`main` is the stable integration branch. Do not develop features directly on it.

| Group | Base branch | Scope |
| --- | --- | --- |
| A | `feature/a-product-introduction` | Landing page and product introduction |
| B | `feature/b-account-authentication` | Login, registration, email verification, password recovery |
| C | `feature/c-course-discovery` | Course catalog and course overview |
| D | `feature/d-learning-practice` | My Learning and lesson workspace |
| E | `feature/e-personal-account` | Account and sign-out |
| F | `feature/f-content-administration` | Course, chapter, and lesson administration |
| G | `feature/g-operations-administration` | Users, sessions, and admin activity |
| H | `feature/h-system-pages` | Access-denied and not-found pages |

Create focused work branches from the matching group branch:

```bash
git switch feature/b-account-authentication
git switch -c feature/b-login-form
```

Use the format `feature/<group>-<short-description>` for work branches.

## Commits and Merge

- Keep one concern per commit.
- Use concise conventional prefixes: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, or `chore:`.
- Run the relevant checks before merging.
- Merge a work branch into its group branch first, then merge the group branch into `main` through review.
- Do not force-push shared branches or commit secrets, `.env` files, dependencies, or build output.

## Access

Groups F and G are administrator-only. Group H is shared and appears only when the relevant routing or permission condition applies.
