# TestHub - Coaching Centre Owner Guide

Welcome to TestHub! This guide is written in simple English to help you manage classes, subjects, tests, questions, and student results for your coaching centre.

---

## 1. Signing In as Admin

1. Open TestHub on your phone or laptop.
2. Click **"Continue with Google"**.
3. Sign in using your registered owner Gmail address.
4. You will automatically land on the **Admin Dashboard** (`/admin`).
   *(Any student signing in with their Gmail will automatically land on the Student Portal at `/student`).*

---

## 2. Managing Classes & Subjects

TestHub is organized into five classes: **Class 8, Class 9, Class 10, Class 11, and Class 12**.

### Adding a Subject to a Class
1. On the left menu (or mobile drawer), click **Classes**.
2. Click on the class you want to manage (e.g. **Class 10**).
3. Click the **"Add Subject"** button.
4. Type the subject name (e.g., *Science*, *Mathematics*, *Social Science*, or *Hindi*).
5. Click **"Create Subject"**. Duplicate subject names within the same class are automatically prevented.

### Renaming or Deleting a Subject
- On the subject row, click **Rename** to update the spelling.
- Click **Delete** to remove a subject. A confirmation window will show you exactly how many tests and questions will be deleted before you confirm.
- Click **Open** to view all tests created under that subject.

---

## 3. Creating & Managing Tests

### Creating a New Test
1. Inside any subject page, click **"Create Test"**.
2. Enter the test details:
   - **Test Title**: e.g., *Unit Test 1: Chemical Reactions and Equations*
   - **Duration (minutes)**: Time allowed for the test (e.g., 30 minutes). Leave empty if there is no time limit.
   - **Marks per Question**: Marks awarded for each correct answer (e.g., 1 or 2).
   - **Negative Marks per Wrong Answer**: Marks deducted for each wrong answer (e.g., 0 for no negative marking, or 0.25 / 0.5).
   - **Show Result to Students**: Choose whether students see their score immediately or if results are hidden until you release them.
3. Click **"Save Test"**.

### Publishing a Test
- Newly created tests can remain as drafts while you prepare questions.
- Once ready, toggle the **"Published"** switch to ON. Only published tests appear on students' screens.

---

## 4. Adding Questions to a Test

There are three easy ways to add multiple choice questions:

### Method A: Using the AI Question Generator
1. In the admin menu, click **AI Generator** (or click "Generate with AI" inside any test).
2. Click one of the **Quick Preset Chips**:
   - *50 Easy to Moderate*
   - *50 Moderate to Hard*
   - *50 Hard*
   - *25 Easy to Moderate*
   - *25 Moderate to Hard*
   - *10 Quick Practice (Easy)*
3. Select your **Class**, **Subject**, and enter the **Topic / Chapter** (e.g. *Light Reflection and Refraction*).
4. Choose the language: **English**, **Hindi**, or **Punjabi**.
5. Click **"Generate Questions"**.
6. The AI creates NCERT-standard questions with 4 options and explanations.
7. **Review the Questions**: Read through the generated questions on screen. You can edit any question text, change options, or select the correct answer.
8. Click **"Add to Test"** to attach the selected questions to an existing test or create a brand new test with one click.

### Method B: Uploading Questions via CSV
1. Inside a test, click **"Upload CSV"**.
2. Ensure your CSV file has the following columns:
   `question_text,option_a,option_b,option_c,option_d,correct_option,explanation`
3. The `correct_option` column must be **A**, **B**, **C**, or **D**.
4. TestHub supports Hindi and Punjabi text in CSV files without text distortion.

---

## 5. Result Visibility Switch ("Show Result to Students")

You have complete control over whether students see their scores or answers.

### How it Works:
- **When Switch is OFF (Results Hidden)**:
  - When a student finishes their test, they see a calm green confirmation card:
    > *"Your test has been submitted successfully. Your teacher will share the result."*
  - **No score, no answers, and no review are shown** to the student. This prevents students who finish early from sharing answers with others.
- **When Switch is ON (Results Visible)**:
  - Students immediately see their total score, percentage, correct/wrong counts, and a question-by-question review showing the right answers and teacher explanations.
  - Correct and wrong answers are clearly marked with colors and icons (Green checkmark for correct, Red cross for incorrect).

### Releasing Results Later:
1. Conduct the exam with the switch **OFF**.
2. Once all students have completed the test, go to **Tests** in the admin menu.
3. Toggle the **"Show result to students"** switch to **ON**.
4. Immediately, all students can open `/student/history` or reload their result link to see their full scorecard and review!

### Bulk Actions:
- On any class or subject page, you can click **"Show results for all tests"** or **"Hide results for all tests"** to change all tests at once. A confirmation dialog will confirm the exact count of tests being changed.

---

## 6. Viewing and Exporting Results

1. In the admin menu, click **Results**.
2. Use the filters at the top:
   - Filter by **Class** (Class 8 to 12)
   - Filter by **Subject**
   - Filter by specific **Test**
   - Search by student name
3. TestHub displays a live table showing:
   - Student Rank
   - Candidate Name & Email
   - Score & Total Marks
   - Percentage
   - Correct, Wrong, and Skipped counts
   - Submission Date and Time (in Indian Standard Time, IST)

### Exporting to Excel (.xlsx)
1. Click **"Export Excel (.xlsx)"**.
2. Enter your passing mark threshold (default is **33%**).
3. The downloaded Excel file contains **3 organized sheets**:
   - **Sheet 1 (`Results`)**: Student rank, score, percentage, breakdown, and submission timestamp.
   - **Sheet 2 (`Summary`)**: Total attempts, highest score, lowest score, average score, and number of passing students.
   - **Sheet 3 (`Question Analysis`)**: If one test is selected, shows each question's correct answer and percentage of students who got it right.

### Exporting to CSV
- Click **"Export CSV"**.
- TestHub automatically formats the CSV with a UTF-8 Byte Order Mark (BOM) so that Hindi and Punjabi text opens cleanly in Microsoft Excel without question marks or unreadable symbols.

### Class Summary Export
- On the **Admin Dashboard** (`/admin`), switch between Class 8 to 12 tabs.
- Click **"Export class summary"** to download an Excel sheet summarizing all tests and student performances for that class.

---

## 7. Need Help or Want to Add New Features?
Contact your technical administrator to add new subjects, customize exam time limits, or update the designated owner Gmail.
