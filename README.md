# TestHub - Online MCQ Examination Platform

TestHub is a responsive, distraction-free MCQ test platform tailored for a village coaching centre teaching students across **Classes 8 to 12**.

---

## 🌟 Key Features

- **Google Authentication with Role-Based Routing**:
  - The designated coaching centre owner Gmail automatically receives the `admin` role and lands on `/admin`.
  - All students authenticate with Google, select their class (8 to 12), and land on the student test portal at `/student`.
- **Dynamic Result Visibility Control**:
  - Teachers control when students see test results. When toggled OFF, students see a calm submission confirmation with zero scores or answers exposed. When toggled ON, students immediately access their full scorecard and question review.
  - Bulk show/hide actions available per subject and class.
- **AI Question Generator Powered by Google Gemini**:
  - Generates NCERT-aligned MCQs with 4 options and detailed explanations.
  - Quick preset chips (e.g., *50 Easy to Moderate*, *25 Hard*, *10 Quick Practice*).
  - Rate-limited and validated with teacher review banner before adding to tests.
- **Student Exam Interface**:
  - Mobile-first (optimized for 360px+ phone screens) with large tappable option rows ($\ge 52$px).
  - Shuffled question and option order with stable seeded PRNG across page reloads.
  - Sticky bottom navigation on phones; question palette on laptops.
  - Autosaves answers locally; countdown timer with 5-minute red warning; one-attempt enforcement.
- **Excel & CSV Data Export**:
  - Exports filtered results with 3 Excel sheets: *Results*, *Summary* (pass counts & statistics), and *Question Analysis*.
  - CSV files prefixed with UTF-8 Byte Order Mark (`\uFEFF`) to render Hindi and Punjabi syllabus text in Excel without distortion.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v20 or higher (v26 recommended)
- **npm** or **pnpm**
- A **Supabase** project (PostgreSQL + Auth)
- A **Google Cloud OAuth 2.0 Client ID**
- A **Google Gemini API Key**

### 2. Clone and Install Dependencies
```bash
git clone <repository-url>
cd testhub
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Owner / Admin Email (designated Gmail account)
ADMIN_EMAIL=owner@gmail.com

# Gemini API Key (Server-only, never exposed to client)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🗄️ Database Setup & Migrations

### 1. Run Schema Migrations
Execute the SQL migration files in order in your Supabase SQL Editor:
1. `supabase/migrations/20261122000000_create_testhub_schema.sql` (Tables, triggers, RLS policies, RPC functions)
2. `supabase/migrations/20261123000000_add_student_profile_fields.sql` (Profile fields for student full name & class)
3. `supabase/migrations/20261123010000_add_get_attempt_result_function.sql` (Security-definer dynamic visibility RPC)

### 2. Seed Initial Admin & Classes
Open `supabase/seed.sql`:
- Replace `'owner@gmail.com'` on line 7 with the **owner's actual Gmail address**.
- Run `supabase/seed.sql` in the Supabase SQL Editor. This sets up admin email elevation, default settings, and standard school subjects for Classes 8 to 12.

### 3. Seed Demo Data (Optional but Recommended)
Run `supabase/seed-demo.sql` in the Supabase SQL Editor:
- Creates sample subjects for Classes 8, 9, 10, 11, and 12.
- Creates 1 published test per class clearly marked `[DEMO]`.
- Inserts 10 NCERT syllabus questions per test (50 questions total) with complete options, correct answers, and teacher explanations.

### 4. Changing the Admin Gmail Address
To change the designated owner Gmail:
- In the Supabase SQL Editor:
  ```sql
  -- Remove previous owner email
  delete from public.admin_emails;

  -- Add the new owner's Gmail
  insert into public.admin_emails (email) values ('newowner@gmail.com');

  -- Elevate profile role if user already signed in
  update public.profiles set role = 'admin' where email = 'newowner@gmail.com';
  ```
- Update `ADMIN_EMAIL=newowner@gmail.com` in `.env.local` and your Vercel project environment variables.

---

## 🧪 Running Automated Tests

Run the built-in test suite verifying grading rules, negative markings, one-attempt constraints, dynamic visibility, and CSV validation:

```bash
npm test
```

All 20 tests across 4 test suites will execute using Node's native test runner with zero external dependencies.

---

## 🚢 Vercel Deployment Guide

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "feat: complete TestHub production build"
git push origin main
```

### Step 2: Import Project in Vercel
1. Log in to [Vercel](https://vercel.com) and click **"Add New" > "Project"**.
2. Select your TestHub repository and click **Import**.
3. Under **Framework Preset**, select **Next.js**.
4. In **Build and Output Settings**:
   - Build Command: `next build --webpack` (or `npm run build`)
   - Output Directory: `.next`

### Step 3: Add Environment Variables in Vercel
Under the **Environment Variables** section, add:
| Key | Example Value | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xyz.supabase.co` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase Anon/Publishable Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` | Supabase Service Role Key (Keep secret) |
| `ADMIN_EMAIL` | `owner@gmail.com` | Coaching Centre Owner's Gmail |
| `GEMINI_API_KEY` | `AIzaSy...` | Google Gemini API Key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |

Click **Deploy**. Vercel will build and deploy the app to `https://<your-project>.vercel.app`.

---

## 🔐 Post-Deploy Supabase & Google OAuth Configuration

After deployment, update redirect URLs to allow students and teachers to sign in on your live Vercel domain:

### 1. Supabase Dashboard Configuration
1. Go to your Supabase Project > **Authentication** > **URL Configuration**.
2. Set **Site URL** to:
   ```text
   https://<your-app>.vercel.app
   ```
3. Add to **Redirect URLs**:
   ```text
   https://<your-app>.vercel.app/**
   https://<your-app>.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Click **Save**.

### 2. Google Cloud Console Configuration
1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Select your coaching website project and edit your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorised JavaScript origins**, add:
   ```text
   https://<your-supabase-project-id>.supabase.co
   https://<your-app>.vercel.app
   http://localhost:3000
   ```
4. Under **Authorised redirect URIs**, add:
   ```text
   https://<your-supabase-project-id>.supabase.co/auth/v1/callback
   ```
5. Click **Save**.

---

## 🛡️ Security Guarantees

1. **Zero Client-Side Question Leakage**:
   - Direct `SELECT` on `public.questions` is blocked by Row Level Security for all non-admin users.
   - Students only receive question text and options through `get_test_questions(test_id)` RPC; `correct_option` and `explanation` are completely omitted.
2. **Server-Side Grading & Single Attempt**:
   - Test evaluation occurs entirely in the PostgreSQL database function `submit_attempt`.
   - Attempts are governed by `UNIQUE(test_id, student_id)`; double submission is rejected.
3. **Role Checks on Server**:
   - All server actions and `/api` routes re-verify `user.role === 'admin'` before performing operations.
4. **Secret Key Isolation**:
   - `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are strictly server-side variables and are never bundled into client JavaScript.

---

## 📚 User Documentation

For a non-technical guide on managing subjects, creating tests, using the AI generator, and exporting results, refer to the [Owner Guide](file:///c:/Users/ravir/OneDrive/Desktop/TEST/docs/OWNER_GUIDE.md).
