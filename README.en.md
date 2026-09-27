# BashLab

[Tiếng Việt](README.md) | English

BashLab aims to teach Bash through short lessons, hands-on practice, and feedback on learning goals. The frontend currently includes a landing page, login and registration interfaces, and a course catalog. Backend authentication and a real Bash sandbox are not implemented yet.

## What works today

| Part | Current state |
| --- | --- |
| Home page `/` | `app/(site)/page.js` renders `components/landing/Lookbook.jsx`: introduction, command demo, learning method, Shell 101, and FAQ; Lookbook snapping can be toggled |
| Home page terminal | A simulation with predefined responses. It does not run operating system commands |
| Visual effects | Lookbook navigation, terminal resize controls, and visual components; check scripts exist for curiosity and backdrop effects |
| Login `/login` and registration `/register` | Forms and client-side validation are implemented; submissions only simulate an unavailable authentication service |
| Course catalog `/courses` | Three courses with All/Core Tracks/Security filters and progress/coming-soon states; View course leads to `/login` |
| 404 page | Implemented in `app/not-found.js` |
| 403 interface | Present in `app/forbidden.js`, but there is no implemented backend permission flow or dedicated route using it |
| Course detail, learning, account, and admin pages | Documented in the designs; not implemented yet |
| Backend, database, email, and sandbox | Plans only; see [backend/README.md](backend/README.md) |

Real sandbox and saved-progress copy describes planned product behavior; those services are not active. `/courses/shell-101` and other course-learning detail pages are not implemented yet.

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
| 02 | B | 02 | Login | `/login` interface implemented: email/password, show/hide password, remember device, loading/error states, and links to registration and password recovery. Backend authentication is not implemented |
| 03 | B | 03 | Register | `/register` interface implemented: email/password confirmation, client-side validation, and error states. Backend account creation is not implemented |
| 04 | B | 04 | Verify Email | Explain how to check email; resend with a waiting period; handle successful verification and invalid or expired links |
| 05 | B | 05 | Forgot Password | Request a reset email; avoid revealing whether an account exists; allow resend or retry after errors |
| 06 | B | 06 | Reset Password | Accept and confirm a new password; validate the reset link; show success or errors; return to login |
| 07 | C | 07 | Course Catalog | `/courses` implemented with three courses, All/Core Tracks/Security filters, level, duration, progress, and coming-soon status; View course leads to login |
| 08 | C | 08 | Course Overview | Explain the course and learning outcomes; show chapters, lesson states, and progress; continue learning |
| 09 | D | 09 | My Learning | Show personal learning progress; resume a lesson; display study time, activity, command count, and skill progress |
| 10 | D | 10 | Interactive Lesson Workspace | Read and navigate lessons; view goals and hints; use a sandbox terminal; view session state; check solutions and receive feedback |
| 11 | E | 12 | Account | Show account details, email, verification status, and read-only role; request a password-reset email; sign out |
| 12 | F | 14 | Content | Manage the course/chapter/lesson tree; create and edit content; change order and publication status; open the lesson editor |
| 13 | F | 16 | Lesson Editor | Edit lesson details, Markdown, goals, and check templates; preview content; manage drafts/publication; save or cancel |
| 14 | G | 17 | Users | Search and paginate users; change roles; lock/unlock accounts with confirmation and a reason; protect the last active administrator |
| 15 | G | 18 | Activity | Sessions tab: manage and stop sessions with a reason. Admin log tab: filter logs and view event details |
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

The planned backend uses Node.js/Express, PostgreSQL, REST/WebSocket, and Docker sandboxes. These are plans, not running services in this repository.

## Run the frontend locally

You need Git, Node.js/npm compatible with the locked Next.js version, and an internet connection to install packages. The repository does not pin Node.js through `.nvmrc` or `engines` yet. Contributors should agree on the Node.js version used for testing.

```bash
git clone https://github.com/0viprorqiv0/Bashlab.git
cd Bashlab/frontend
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Run npm commands inside `frontend`; the repository root has no `package.json`. The current demo does not need database or email configuration.

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
