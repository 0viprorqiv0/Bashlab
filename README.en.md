# BashLab

[Tiếng Việt](README.md) | English

BashLab teaches Bash through short lessons and hands-on practice. The frontend uses Supabase Auth and database; a Node.js backend provides a Docker-based Bash sandbox API.

## What works today

| Part | Current state |
| --- | --- |
| Home page `/` | `app/(site)/page.js` renders `components/landing/Lookbook.jsx`: introduction, command demo, learning method, Shell 101, and FAQ; Lookbook snapping can be toggled |
| Home page terminal | A simulation with predefined responses. It does not run operating system commands |
| Visual effects | Lookbook navigation, terminal resize controls, and visual components; check scripts exist for curiosity and backdrop effects |
| Login `/login` and registration `/register` | Supabase Auth; learners land on `/` after login and admins on `/admin/content` |
| Email verification and password recovery | Supabase Auth sends verification/reset emails and handles their links |
| Course catalog `/courses` | Reads courses from Supabase; `published` courses are available, while `upcoming` teasers show to guests and learners after migration 013 |
| My Learning `/my-learning` | Reads progress and activity from Supabase for the current account |
| Account & Security `/account` | Reads and updates the Supabase profile/avatar; supports password reset and sign out |
| 404 page | Implemented in `app/not-found.js` |
| 403 interface | Present in `app/forbidden.js`, but there is no implemented backend permission flow or dedicated route using it |
| Courses, lessons, and admin pages | Course details, lesson workspace, and admin content/users/activity pages are implemented |
| Backend sandbox | Express API and Docker runner; see [backend/RUNNING.md](backend/RUNNING.md). Workspaces are not yet tied to BashLab accounts |

The landing page terminal is simulated and does not execute operating-system commands. The lesson workspace uses the backend sandbox.

## Feature groups

| Group | Purpose | Page numbers | Stitch screens |
| --- | --- | --- | --- |
| A — Product introduction | Introduce BashLab and guide visitors to courses | 01 | 01 |
| B — Account authentication | Login, registration, email verification, and password recovery | 02–06 | 02–06 |
| C — Course discovery | Browse courses, view lessons, and check course progress | 07–08 | 07–08 |
| D — Learning and practice | View personal progress, continue lessons, and practice Bash | 09–10 | 09–10 |
| E — Personal account | View account details, request a password reset, and sign out | 11 | 12 |
| F — Content administration | Manage courses, chapters, and lesson content | 12–13 | 14, 16 |
| G — Operations administration | Manage users, practice sessions, and admin logs | 14–15 | 17–18 |
| H — System pages | Explain denied access or a missing page | 16–17 | 20–21 |

These groups organize documentation and work. They do not add pages or features. Groups F and G are for administrators. Group H is shown when an access or routing problem occurs. From page 11 onward, the page number and Stitch screen number are different.

## The 17 planned pages

This table describes design requirements, not a list of completed features.

| Page | Group | Screen | Name | What it should do |
| --- | --- | --- | --- | --- |
| 01 | A | 01 | Landing | Introduce BashLab; offer a simulated command demo; present Shell 101 and FAQ; guide visitors to courses |
| 02 | B | 02 | Login | `/login` authenticates with Supabase Auth; learners land on `/`, admins on `/admin/content` |
| 03 | B | 03 | Register | `/register` creates accounts through Supabase Auth and validates form data |
| 04 | B | 04 | Verify Email | `/verify-email` handles verification and resend through Supabase Auth |
| 05 | B | 05 | Forgot Password | `/forgot-password` requests a password reset through Supabase Auth |
| 06 | B | 06 | Reset Password | `/reset-password` updates the password through Supabase Auth after a valid link |
| 07 | C | 07 | Course Catalog | `/courses` reads courses from Supabase, with All/Core Tracks/Security filters and Coming next teasers |
| 08 | C | 08 | Course Overview | Explain the course and learning outcomes; show chapters, lesson states, and progress; continue learning |
| 09 | D | 09 | My Learning | `/my-learning` displays the account's progress and activity from Supabase with a course catalog link |
| 10 | D | 10 | Interactive Lesson Workspace | Read and navigate lessons; view goals and hints; use a sandbox terminal; view session state; check solutions and receive feedback |
| 11 | E | 12 | Account | `/account` reads and updates the Supabase profile/avatar and supports password settings and sign out |
| 12 | F | 14 | Content | Admin page manages courses, chapters, lessons, ordering, and publication status |
| 13 | F | 16 | Lesson Editor | Edit lesson details, Markdown, goals, and check templates; preview content; manage drafts/publication; save or cancel |
| 14 | G | 17 | Users | Admin page searches users, changes roles, and locks/unlocks accounts |
| 15 | G | 18 | Activity | Admin page views/stops sessions and filters the admin log |
| 16 | H | 20 | Access Denied | Explain that the user does not have permission to access the page |
| 17 | H | 21 | Page Not Found | Explain that the requested page or path does not exist |

My Learning remains a separate page. Sessions and Admin log are tabs on the same Activity page. Real Bash practice belongs to the planned Workspace; the Landing demo is simulated.

See [bashlab-pages.md](bashlab-pages.md) for the detailed specification in Vietnamese. Its image links point to `exports/stitch-2026-09-12/`, which is not included in this repository.

## Repository layout

```text
Bash_lab/
├── frontend/
│   ├── app/                 # App Router, layouts, and error interfaces
│   ├── components/
│   │   ├── courses/         # Course catalog
│   │   ├── landing/         # Lookbook and landing page sections
│   │   ├── layout/          # Shared navbar, footer, and page shell
│   │   └── shared/          # Shared UI components
│   ├── scripts/             # Curiosity and backdrop checks
│   ├── package.json
│   └── package-lock.json
├── backend/README.md        # Backend plans; no implementation yet
├── bashlab-pages.md         # Requirements for the 17 Stitch pages
├── rule.md                  # Vietnamese workflow rules
├── rule.en.md               # English workflow rules
├── README.md                # Vietnamese project guide
├── README.en.md             # English project guide
└── .gitignore
```

## Current technology

Versions declared in [frontend/package.json](frontend/package.json):

- Next.js `14.2.5` with the App Router.
- React and React DOM `18.3.1`.
- JavaScript/JSX, CSS Modules, and global CSS.
- Three.js `^0.170.0`; Tailwind CSS `^3.4.13`, PostCSS, and Autoprefixer.
- ESLint `8.57.0` with the Next.js configuration.

The frontend uses Supabase Auth/Postgres; the backend uses Node.js/Express and a Docker sandbox. See [backend/RUNNING.md](backend/RUNNING.md) to run the API and runner.

## Run the frontend locally

You need Git, Node.js/npm compatible with the locked Next.js version, and an internet connection to install packages. The repository does not pin Node.js through `.nvmrc` or `engines` yet. Contributors should agree on the Node.js version used for testing.

```bash
git clone https://github.com/0viprorqiv0/Bashlab.git
cd Bashlab/frontend
npm ci
npm run dev
```

Create `frontend/.env.local` with the project URL and anon key from Supabase **Project Settings → API**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-anon-key>
```

Open [localhost:3000](http://localhost:3000). Run npm commands inside `frontend`; the repository root has no `package.json`. Never put the service-role key or database password in the frontend.

### Applying Supabase schema migrations

Migrations are in `backend/db/migrations/` and should be applied in numeric order on a new database. To enable the Coming next catalog for guests and learners on a database that already has migrations 001–012, open the correct project in **Supabase Dashboard → SQL Editor** and run `backend/db/migrations/013_public_upcoming_courses.sql`. Confirm `shell-201` and `linux-security` have status `upcoming`. This only makes course metadata public; chapter and lesson policies remain unchanged.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run test:curiosity` | Run the curiosity check script |
| `npm run test:backdrop` | Run the backdrop check script |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server after a successful build |

The two check scripts do not cover the whole application or replace end-to-end testing. To run a production build locally:

```bash
npm run build
npm run start
```

## Working with branches

`main` is the integration branch. The eight `feature/a-...` to `feature/h-...` branches organize work by group, as listed in [rule.en.md](rule.en.md). Every branch contains the full project. Do not remove other groups' folders to separate the work.

The normal flow is: task branch → group branch → `main`, with pull requests and relevant checks. Read [rule.en.md](rule.en.md) before editing, committing, or merging.

## Files and data to keep out of Git

`.gitignore` excludes dependencies, build/cache output (including `.next-*`), the listed environment files, logs, coverage, and IDE files. Keep `package-lock.json` in Git so package installation is repeatable.

Do not commit passwords, tokens, private keys, user data, or database dumps containing real data. When adding a new environment filename, check it with `git check-ignore -v <file>`. Do not assume every `.env.*` filename is already ignored.

## Usage rights

Proprietary — All rights reserved. The repository does not currently include a separate LICENSE file granting usage rights.
