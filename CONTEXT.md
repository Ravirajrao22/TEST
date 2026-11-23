# TestHub - Project Context & Guidelines

## Product Summary
TestHub is an online MCQ test platform designed for a village coaching centre that teaches students across Classes 8 to 12.

### Roles & Capabilities
- **ADMIN** (The coaching centre owner, authenticated via one designated Gmail account defined by `ADMIN_EMAIL`):
  - Creates and manages subjects under each class (Classes 8, 9, 10, 11, and 12).
  - Creates, configures, and schedules MCQ tests.
  - Adds questions via three methods: manual entry, CSV upload, or AI question generation powered by Gemini API.
  - Controls test settings, notably result visibility: toggling whether students can view results/scores immediately after submitting or only after admin release.
  - Analyzes, views, and exports student results and scorecards by class and subject using SheetJS (XLSX) and Recharts.
- **STUDENT** (Anyone signing in with Google):
  - Signs in with Google authentication.
  - Selects their enrolled class (8, 9, 10, 11, or 12) and enters their full name.
  - Browses assigned subjects and available tests.
  - Takes tests with a clean, responsive, distraction-free MCQ interface.
  - Submits answers and views score / detailed review only when permitted by admin configuration.
- **Device Support**:
  - Must work smoothly on mobile phones (the primary device used by most students), tablets, and laptops.

---

## Tech Stack
- **Framework**: Next.js 14+ (App Router, TypeScript in strict mode)
- **Styling & UI**: Tailwind CSS and shadcn/ui
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth with Google OAuth provider, and Row Level Security)
- **AI Service**: Google Gemini API for question generation (called only from a server route, never client-side)
- **Export & Analytics**: SheetJS (`xlsx`) for data export, Recharts for visual progress and score charts
- **Form Validation**: Zod for client and server-side schema validation

---

## Folder Structure
```text
├── app/
│   ├── (auth)/             # Authentication routes & callbacks (OAuth handlers)
│   ├── admin/              # Admin dashboard, subjects, tests, questions, results
│   ├── student/            # Student portal: class select, test taking, results
│   ├── api/                # Secure server API routes (AI generation, export, admin endpoints)
│   ├── globals.css         # Tailwind global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (TestHub branding and Sign in with Google)
├── components/
│   ├── ui/                 # Reusable primitive UI components (Button, Card, Input, etc.)
│   ├── admin/              # Admin-specific components (CSV upload, question builder, AI modal)
│   └── student/            # Student-specific components (Question viewer, timer, result card)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client helper
│   │   └── server.ts       # Server Supabase client & service role helpers
│   ├── ai/
│   │   └── gemini.ts       # Server-only Gemini API client for MCQ generation
│   ├── export/
│   │   └── excel.ts        # SheetJS (xlsx) export utilities
│   └── utils.ts            # UI helper utilities (clsx, twMerge)
├── types/
│   └── index.ts            # Shared TypeScript domain types
├── .env.example            # Environment variables template
└── CONTEXT.md              # Project specifications and rules
```

---

## Rules for All Future Work
1. **Mobile-first**: Design for a 360px wide screen first, then scale up.
2. **Comprehensive UI States**: Every page has loading, empty and error states.
3. **Zod Validation**: All forms validate input with zod and show clear messages.
4. **Server-Enforced Security**: Admin-only logic is enforced on the server and in database rules, never only in the UI.
5. **Component Modularity**: Keep components small and reusable; no duplicated code.

---

## Design System & App Shells Specification
- **Visual Style**: Minimal, professional, calm school portal. No gradients, no neon colors, no heavy shadows. Light theme only.
- **Typography**: Inter with system sans-serif fallback. 16px minimum base font for inputs (avoids iOS safari auto-zoom).
- **Colors**:
  - Background: White (`#ffffff`)
  - Page Surface: Slate-50 (`#f8fafc`)
  - Borders: Slate-200 (`#e2e8f0`)
  - Text: Slate-900 (`#0f172a`), Muted text: Slate-600 (`#475569`)
  - Accent: Deep Blue (`#1E3A8A`)
  - Status Only: Success (`#15803d` / green-700), Error (`#b91c1c` / red-700), Warning (`#b45309` / amber-700)
- **Geometry & Spacing**:
  - Radii: 8px for cards and inputs, 6px for buttons.
  - Spacing on 4px scale.
  - Soft shadow only on desktop modals (`sm:shadow-[0_10px_30px_rgba(0,0,0,0.08)]`).
- **Touch Targets**: Minimum 44px height on all interactive elements.
- **Responsive Table**: Automatically shifts from semantic table (`>= 640px`) to stacked cards (`< 640px`) to eliminate horizontal scroll.
- **Modal / Dialog**: Full-screen layout on mobile (`< 640px`), centered card with soft shadow on desktop.
- **Admin Shell**: Fixed 260px left sidebar on laptop (`>= 1024px`), slide-out drawer on mobile. 1200px max width content.
- **Student Shell**: Top bar with brand and sign out, 720px max width centered content.
- **Component Showcase**: `/design-preview` route.

---

## Database & Security Architecture (/supabase)
- **Tables**:
  - `admin_emails`: Pre-approved owner Gmail accounts for admin role elevation.
  - `profiles`: User profiles linked to `auth.users`, role defaults to `student`, elevated to `admin` via trigger `handle_new_user()`.
  - `classes`: Grades 8 to 12.
  - `subjects`: Class subjects with `unique(class_id, name)`.
  - `tests`: MCQ test configurations with `marks_per_question`, `negative_marks`, `show_result`, `is_published`.
  - `questions`: MCQ questions with `correct_option` ('A', 'B', 'C', 'D') and `explanation`.
  - `attempts`: Graded student attempts with unique constraint `unique(test_id, student_id)`.
  - `attempt_answers`: Individual question selections and correctness flags.
  - `app_settings`: Global key-value store (e.g. `default_show_result = false`).
- **Security & Row Level Security (RLS)**:
  - `is_admin()` security definer function checks whether `auth.uid()` has `role = 'admin'`.
  - Admins have full read/write on every table.
  - Students can read `classes`, `subjects`, and only `is_published = true` tests.
  - **No Direct Question Access**: Students have **zero** `SELECT` access on the `questions` table. They must call `get_test_questions(test_id)` which **never returns `correct_option` or `explanation`**.
  - **Server-Side Grading**: Submissions execute through `submit_attempt(test_id, student_name, class_id, answers)` security definer function, which verifies publication, rejects duplicate attempts, grades against `correct_option` and `negative_marks`, writes to `attempts` and `attempt_answers`, and returns results only if `tests.show_result = true`.
- **Database Types**: Generated and maintained in `/types/database.ts`.

---

## Authentication & Route Protection
- **Google OAuth**: Users authenticate via Supabase Auth Google provider at `/login`.
- **OAuth Callback (`/auth/callback`)**: Exchanges the auth code for a cookie-backed session and redirects:
  - Admin (matching `ADMIN_EMAIL` or `admin_emails` table) -> `/admin`
  - Student -> `/student`
- **Session Helper (`getCurrentUser()`)**: Server helper in `lib/supabase/server.ts` returning `{ id, email, role, avatarUrl, fullName }`.
- **Route Protection (`middleware.ts`)**:
  - Unauthenticated visitors to `/admin` or `/student` are redirected to `/login?next=...`.
  - Authenticated visitors to `/login` or `/` are redirected to their respective role dashboard.
  - Students accessing `/admin` are strictly redirected to `/student`.
  - Admins can access both `/admin` and `/student` (for previewing student experience).
- **Server-Side Enforcement**:
  - `app/admin/layout.tsx` re-checks the user's role on the server and redirects non-admins immediately, ensuring security is never delegated solely to middleware.
- **Top Bar Profile & Sign Out**:
  - Both `AdminShell` and `StudentShell` show the user's Google avatar, email address, role `Badge`, and a `Sign out` action calling `supabase.auth.signOut()` and clearing session cookies.

---

## Classes & Subjects Management (/admin/classes)
- **Class Grid (`/admin/classes`)**:
  - Shows 5 responsive cards (Class 8 to 12) on desktop grid and single-column on mobile.
  - Each card details subject count and test count.
  - Clicking any class navigates to `/admin/classes/[grade]`.
- **Subject Management (`/admin/classes/[grade]`)**:
  - Breadcrumbs: `Classes > Class [grade]`.
  - Add Subject: Modal with Zod validation (2 to 40 characters) and duplicate name checks.
  - Subject Row: Displays name, test count, question count, and actions (Rename, Delete, Open).
  - Rename: Modal with Zod validation (2 to 40 characters) and duplicate validation.
  - Delete: `ConfirmDialog` stating exact number of tests and questions affected before deletion.
  - Empty State: Illustrated `EmptyState` when a class has no subjects.
  - Open Action: Navigates to `/admin/classes/[grade]/[subjectId]`.
  - Optimistic updates with instant toast notifications (`useToast`).

---

## AI Question Generator (/admin/ai-generator)
- **Overview**: Powered by Google Gemini API (`gemini-2.5-flash`), accessible from the admin sidebar navigation and from within individual class subject pages (`/admin/classes/[grade]/[subjectId]`).
- **Form Card**:
  - **Quick Preset Chips**: "50 Easy to Moderate", "50 Moderate to Hard", "50 Hard", "25 Easy to Moderate", "25 Moderate to Hard", "10 Quick Practice (Easy)". Clicking immediately populates question count and difficulty level.
  - **Input Controls**:
    - Target Class: Dropdown for Classes 8 to 12.
    - Subject: Filtered dynamically based on the selected class.
    - Topic / Chapter: Required text input for syllabus topic (e.g., "Chemical Reactions and Equations").
    - Language: English (default), Hindi, or Punjabi.
    - Number of Questions: 1 to 50 with batch indicator.
    - Difficulty: Easy, Easy to Moderate, Moderate, Moderate to Hard, Hard.
    - Extra Instructions: Optional teacher instructions textarea (e.g., focus on numerical problems).
  - **Generate Button**: Shows loading spinner with exact count and includes a real-time `Cancel` abort controller button.
- **Server Route (`POST /api/ai/generate`)**:
  - Admin-only authorization check returning `403 Forbidden` for non-admins.
  - Zod schema validation on all incoming payload fields.
  - In-memory rate limiting: 20 generations per hour per admin returning `429 Too Many Requests` with retry duration.
  - Large requests split sequentially into batches of 10 questions to eliminate token truncation.
  - Prompt Template: Strict NCERT school teacher framing requiring JSON-only output with `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct` ('A' | 'B' | 'C' | 'D'), and `explanation`.
  - Automatic single retry on batch failure.
  - Post-generation sanitization: drops duplicate questions and discards malformed entries lacking 4 valid options or a correct key.
  - Graceful error mapping for Gemini quota limits (`429`) and network outages (`503`).
- **Result Preview & Question Management**:
  - **Review Notice**: Prominent banner reminding the owner to review AI-generated questions before releasing them to students.
  - **Action Toolbar**: Selection counter, "Select All", "Deselect All", "Copy as CSV" (formatted matching upload template), "Copy as JSON", and "Add to Test".
  - **Editable Question Cards**: Checkboxes (selected by default), editable question statement, 4 option text boxes with quick-select circular badges to designate the correct answer, and an editable explanation field.
  - **Add to Test Modal**:
    - Option 1: Append selected questions to an existing test under the selected subject.
    - Option 2: Create a new test in one click (title, duration in minutes, marks per question, negative marks, show result toggle) and immediately insert all selected questions.

---

## Student Portal & Exam Experience (/student)
- **Step 1: Start at `/student`**:
  - Full Name (required, 3-60 characters, pre-filled from Google Auth profile and editable) and Class (8 to 12).
  - Saved to `profiles` table and `auth.users` metadata so students only confirm it on future visits.
  - After confirmation, presents large tappable subject Cards for the chosen class.
  - Tapping a subject displays published tests with duration, question count, and marks. Completed tests display a `Completed` badge and cannot be reopened.
- **Step 2: Instructions Screen**:
  - Displays test title, number of questions, duration, marks per question, and negative marking rules.
  - "Start Test" button initiates the active attempt.
- **Step 3: Exam Interface at `/student/test/[testId]`**:
  - Questions fetched securely using the `get_test_questions(test_id)` security definer RPC (no correct answers or explanations ever exposed to the client).
  - Question order and Option order shuffled per student with deterministic seeded PRNG (`${userId}_${testId}`) and cached in `localStorage` for complete stability across reloads.
  - **Phone layout (< 640px)**: One question at a time, large option buttons (minimum 52px height, full-width tappable), sticky bottom navigation bar (Previous, Question List drawer, Next/Submit).
  - **Desktop layout (>= 1024px)**: Question area on left, sticky Question Palette sidebar on right (Answered, Marked, Unanswered color-coded grid).
  - **Radio selection**: Tap option to select; tap again to clear selection.
  - **Mark for Review**: Toggle flag on any question.
  - **Autosave**: All answers, marked statuses, current question, and start timestamp continuously saved to `localStorage` on every tap.
  - **Timer**: Live countdown timer in top bar; turns red with pulsating alert in last 5 minutes; automatically submits at 00:00.
  - **Exit Protection**: `beforeunload` warning prevents accidental browser close or back navigation during active attempts.
- **Step 4: Submission & Results**:
  - Submit confirmation dialog displays summary counts of answered, unanswered, and marked questions.
  - Offline guard: prevents failed submission when offline, keeping answers safely stored in `localStorage`.
  - Server-side grading via `submit_attempt` RPC; rejects duplicate attempts.
  - Redirects to `/student/result/[attemptId]` displaying full scorecard if `tests.show_result = true`, or a confirmation notification if results are withheld by the teacher.

---

## Result Visibility Control
- **Admin Side**:
  - **Individual Test Toggle**: Tests list (`/admin/tests`), subject test list (`/admin/classes/[grade]/[subjectId]`), and test creation modal include an accessible `Switch` labelled "Show result to students" bound to `tests.show_result`. Changing it saves immediately with a toast notification ("Students will see results right after submitting" or "Results are hidden from students").
  - **Admin Settings (`/admin/settings`)**: "Default for new tests" switch bound to `app_settings.default_show_result`.
  - **Bulk Actions**:
    - Subject page (`/admin/classes/[grade]/[subjectId]`): "Show results for all tests" and "Hide results for all tests" with a confirmation dialog stating the exact count of tests that will change.
    - Class page (`/admin/classes/[grade]`): "Show all results" and "Hide all results" across all subjects in the class with a confirmation dialog stating the exact count of affected tests.
- **Student Side**:
  - **Database Function (`get_attempt_result(attempt_id)`)**: Security definer function checking that the attempt belongs to the authenticated student and evaluating the test's **current** `show_result` status.
  - **Dynamic Score Visibility**: Flipping the switch off immediately hides scores and answers for all past and future submissions; flipping it on reveals them.
  - **Hidden State**: Renders a calm confirmation card: "Your test has been submitted successfully. Your teacher will share the result." with a "Back to Home" button. Zero scores, answer keys, or explanations are returned or rendered.
  - **Visible State**:
    - Summary Card: Total Score, Max Marks, Percentage Badge, Correct, Wrong, and Unanswered counts.
    - Question-by-Question Review: Full question text, student's selected answer, correct answer, and teacher explanation.
    - Visual Accessibility: Correct and wrong answers are distinguished using **both color and icons** (Green + `CheckCircle2` for correct, Red + `XCircle` for wrong, Slate + `HelpCircle` for skipped).
  - **Student History (`/student/history`)**: Lists all past student attempts. Each test dynamically reflects its current visibility status (revealing score and review link if `show_result = true`, or showing "Result Pending / Awaiting Teacher Release" if `show_result = false`).

---

## Data Export & Analytics (/admin/results)
- **Export Formats & Controls**:
  - Located next to the filters on `/admin/results`: "Export Excel (.xlsx)" and "Export CSV".
  - Exports **all** matching rows across active filters (Class, Subject, Test, Search), not just the current page.
- **File Naming Standard**:
  - Pattern: `Class{grade}_{Subject}_{TestTitle}_{YYYY-MM-DD}.[xlsx|csv]`.
  - When a filter is omitted, the component falls back to `"All"` (e.g. `Class10_All_All_2026-11-23.xlsx`).
  - Strict sanitization: strips illegal file system characters (`[\/:*?"<>|]`) and replaces whitespace with underscores.
- **Excel Spreadsheet Architecture (.xlsx)**:
  - **Sheet 1 (`Results`)**: Rank, Student Name, Email, Class, Subject, Test, Total Marks, Score, Percent (formatted as a number with 1 decimal), Correct, Wrong, Unanswered, and Submitted At (IST: `DD/MM/YYYY, hh:mm A`).
  - **Sheet 2 (`Summary`)**: Total attempts, pass mark percentage input (default 33%, configurable in export dialog), students passed, pass percentage, average score, average percentage, highest score, and lowest score.
  - **Sheet 3 (`Question analysis`)**: Generated automatically when a single test is selected in filters. Columns: Question Number, Question Text, Correct Option, Number Correct, and Percent Correct.
  - **Visual Formatting**: Bold header row with light grey fill (`#E2E8F0`), frozen first row (`ySplit = 1`), and auto-fitted column widths based on maximum content length.
- **CSV Formatting**:
  - Prefixed with UTF-8 Byte Order Mark (`\uFEFF`) to guarantee that non-English text (such as Hindi and Punjabi question statements) opens cleanly in Microsoft Excel on Windows and Mac without encoding corruption.
- **Streaming Server Routes**:
  - `POST /api/export/results`: Enforces admin authorization, performs server-side filtering, ranking, and streams the `.xlsx` buffer or `.csv` string with `Content-Disposition: attachment`.
  - `POST /api/export/class-summary`: Powers the "Export class summary" action on each class tab of the admin dashboard, exporting one row per subject and test with attempts, average score, and average percent (`Class{grade}_Summary_{YYYY-MM-DD}.xlsx`).

---

## DESIGN.md: Glassmorphism + Minimalism Design System

### 1. Visual Direction & Background
- **Fixed Page Background**: Light cool gradient (`#F4F7FB` to `#EAF0FA`) with 3 static, heavily blurred off-centre pastel blobs in a fixed `-z-20` layer behind all content:
  - Pale Indigo: `#C7D2FE` at 45% opacity (`blur-[140px]`)
  - Pale Teal: `#BAE6FD` at 40% opacity (`blur-[130px]`)
  - Faint Lavender: `#E9D5FF` at 30% opacity (`blur-[150px]`)
- No animations on background blobs; gives optical depth for glass surfaces to blur.

### 2. Glass Surfaces Specification
- **`glass`** (Cards, sidebar, top bar):
  - `background: rgba(255, 255, 255, 0.60)`
  - `backdrop-filter: blur(16px) saturate(140%)`
  - `border: 1px solid rgba(255, 255, 255, 0.70)`
  - `box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.90), 0 8px 32px 0 rgba(31, 41, 90, 0.08)`
  - `border-radius: 16px`
- **`glass-strong`** (Modals, drawers, dropdowns, toasts):
  - `background: rgba(255, 255, 255, 0.80)`
  - `backdrop-filter: blur(24px) saturate(150%)`
  - `border: 1px solid rgba(255, 255, 255, 0.85)`
  - `box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 12px 40px 0 rgba(31, 41, 90, 0.12)`
  - `border-radius: 16px`
- **`glass-solid`** (Data tables, exam question card, forms with long text):
  - `background: rgba(255, 255, 255, 0.92)`
  - `backdrop-filter: blur(8px)`
  - `border: 1px solid rgba(255, 255, 255, 0.90)`
  - `box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 1.0), 0 4px 20px 0 rgba(31, 41, 90, 0.05)`
  - `border-radius: 16px`
  - *Rule*: Text-heavy content must never sit on a see-through surface.
- **Fallbacks & Accessibility**:
  - Wrapped in `@supports` for environments without `backdrop-filter` (falls back to solid `rgba(255, 255, 255, 0.95)`).
  - Respects `@media (prefers-reduced-transparency: reduce)` and `@media (prefers-reduced-motion: reduce)`.
  - On screens $< 768\text{px}$, blur is reduced to $10\text{px}$ for high-performance rendering.

### 3. Color & Typography Tokens
- **Typography**: Inter for general UI; Plus Jakarta Sans (`font-heading`) for titles. Headings 600 weight, body 400.
- **Headings**: `#0F172A`, **Body**: `#334155`, **Muted**: `#64748B`. Contrast meets WCAG AA (4.5:1).
- **Single Accent**: Indigo `#4338CA` (hover `#3730A3`, soft tint `#EEF2FF`). Used for primary buttons, active nav, and focus rings.
- **Status Colors**: Success `#15803D` (tint `#DCFCE7`), Error `#B91C1C` (tint `#FEE2E2`), Warning `#B45309` (tint `#FEF3C7`).
- **Charts**: Indigo (`#4338CA`), Slate (`#64748B`), and Teal (`#0E7490`).

### 4. Geometry & Radius Family
- **Cards & Modals**: `16px` (`rounded-[16px]`)
- **Inputs & Selects & Textareas**: `12px` (`rounded-[12px]`)
- **Buttons**: `10px` (`rounded-[10px]`)
- **Touch Targets**: Minimum $44\text{px}$ height on all clickable/interactive elements.

### 5. App Shells
- **Admin Shell**:
  - Desktop ($\ge 1024\text{px}$): Floating glass sidebar inset $16\text{px}$, $248\text{px}$ wide, glass top bar, max width $1200\text{px}$ content area.
  - Mobile ($< 1024\text{px}$): Glass top bar with hamburger menu opening `glass-strong` drawer + fixed glass bottom navigation bar (Dashboard, Tests, Results, AI).
- **Student Shell**: Centered column ($720\text{px}$ max width), slim glass top bar, exam question cards on `glass-solid`.





