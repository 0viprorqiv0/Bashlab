# BashLab

Learn Bash by doing. Interactive lessons, real browser-based terminal practice, and requirement-level feedback.

## Project Structure

```
bash_lab/
├── frontend/          # Next.js + React frontend
│   ├── app/           # App Router pages and layouts
│   ├── components/    # React components
│   ├── public/        # Static assets
│   └── package.json
├── backend/           # Planned backend (documentation only)
│   └── README.md
├── README.md          # This file
└── .gitignore
```

## Frontend Setup

### Prerequisites

- Node.js 18.17 or later
- npm 9 or later

### Install Dependencies

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Current Implementation

## Page Catalog

The project documents 17 Stitch screens. The groups below organize existing
design requirements only; they do not add pages or features. Detailed behavior
is maintained in [bashlab-pages.md](bashlab-pages.md).

| Group | Purpose | Pages | Stitch screens |
| --- | --- | --- | --- |
| A — Product introduction | Introduce BashLab and lead into courses | 01 Landing | 01 |
| B — Account authentication | Login, registration, email verification, password recovery | 02 Login; 03 Register; 04 Verify Email; 05 Forgot Password; 06 Reset Password | 02–06 |
| C — Course discovery | Browse courses, course curriculum, and progress | 07 Course Catalog; 08 Course Overview | 07–08 |
| D — Learning and practice | Personal learning progress, lessons, and Bash practice | 09 My Learning; 10 Interactive Lesson Workspace | 09–10 |
| E — Personal account | Account details, password-reset request, and logout | 11 Account | 12 |
| F — Content administration | Manage courses, chapters, and lessons | 12 Content; 13 Lesson Editor | 14, 16 |
| G — Operations administration | Manage users, practice sessions, and admin logs | 14 Users; 15 Activity | 17–18 |
| H — System pages | Insufficient-access and not-found notices | 16 Access Denied; 17 Page Not Found | 20–21 |

Groups F and G are for administrators. Group H is shared and shown only when
the relevant access or routing condition occurs.

### Functional Scope by Group

- **A:** product overview, simulated `pwd`/`ls`/`whoami` demo, course discovery, and FAQ.
- **B:** account credentials, validation, email verification, and password-reset flows.
- **C:** course filters, curriculum, lesson state, and course progress.
- **D:** learning dashboard, lesson navigation, sandbox-terminal workflow, and solution checks.
- **E:** account information, verification state, password-reset request, and sign-out.
- **F:** course/chapter/lesson structure, publishing state, and Markdown lesson authoring.
- **G:** user roles/status, practice-session controls, and auditable admin activity.
- **H:** denied-access and missing-page feedback.

### Landing Page (`/`)

Complete landing page with 5 sections:

1. **Hero** — Centered headline, dual CTAs, subtle radial glow
2. **Try Your First Command** — Interactive terminal demo (pwd, ls, whoami, help, clear)
3. **Learning Method** — Three-step editorial layout (Understand → Practice → Interpret)
4. **Course Spotlight** — Shell 101 overview with chapter index
5. **FAQ** — Three accordion questions

### Navigation

- **Navbar**: Logo, Courses, How it works, Log in, Start learning
- **Mobile**: Collapsible menu with keyboard support
- **Footer**: Logo, tagline, copyright, links to Courses, How it works, FAQ

### Anchor Links (Current Phase)

Since only the landing page exists, navigation uses anchor links:

- `Start learning` / `Courses` → scrolls to Course Spotlight section
- `How it works` → scrolls to Learning Method section
- `Try your first command` → scrolls to Terminal Demo section
- `FAQ` → scrolls to FAQ section

### Links Requiring Backend Implementation

The following links currently show a temporary notice when clicked (or navigate to non-existent routes):

- `/login` — No auth pages yet
- `/courses` — No course catalog yet
- `/courses/shell-101` — No course overview yet

See `backend/README.md` for the planned backend scope and API surface.

## Design Tokens

Defined in `frontend/app/globals.css`:

| Token | Value |
|-------|-------|
| `--color-bg` | `#0A0D14` |
| `--color-surface` | `#1D2027` |
| `--color-primary` | `#00FF66` |
| `--color-secondary` | `#00E5FF` |
| `--color-accent` | `#F59E0B` |
| `--color-on-surface` | `#E8E9F0` |
| `--color-on-surface-variant` | `#9BA3B5` |
| `--font-headline` | `Space Grotesk` |
| `--font-body` | `Inter` |
| `--font-code` | `JetBrains Mono` |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Vanilla CSS + CSS Modules
- **Fonts**: Space Grotesk, Inter, JetBrains Mono (Google Fonts)
- **Icons**: Material Symbols Outlined (Google Fonts)
- **No**: TypeScript, Tailwind CSS, xterm.js, testing libraries

## Browser Support

Modern browsers with ES2020+ support. No polyfills included.

## License

Proprietary — All rights reserved.
