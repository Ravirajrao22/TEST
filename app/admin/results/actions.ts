"use server";

import { createClient, createAdminClient, getCurrentUser } from "@/lib/supabase/server";

export interface AdminResultRow {
  id: string;
  rank: number;
  studentName: string;
  studentEmail: string;
  classGrade: number;
  subjectId: string;
  subjectName: string;
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percent: number;
  correct: number;
  wrong: number;
  unanswered: number;
  submittedAt: string;
}

export interface AdminResultsFilterOptions {
  classes: number[];
  subjects: { id: string; name: string; classGrade: number }[];
  tests: { id: string; title: string; subjectId: string; classGrade: number }[];
}

/**
 * Ensures caller is an authenticated admin.
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required.");
  }
  return user;
}

/**
 * Returns all results with filter options for the /admin/results page.
 */
export async function getResultsOverviewAction(): Promise<{
  success: boolean;
  filterOptions: AdminResultsFilterOptions;
  results: AdminResultRow[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const adminSupabase = createAdminClient();

    // 1. Fetch subjects with class grades
    const { data: rawSubjects = [] } = await adminSupabase
      .from("subjects")
      .select(`
        id,
        name,
        classes (
          grade
        )
      `)
      .order("name", { ascending: true });

    const subjects = (rawSubjects || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      classGrade: s.classes?.grade || 10,
    }));

    // 2. Fetch tests
    const { data: rawTests = [] } = await adminSupabase
      .from("tests")
      .select(`
        id,
        title,
        subject_id,
        subjects (
          classes (
            grade
          )
        )
      `)
      .order("title", { ascending: true });

    const tests = (rawTests || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      subjectId: t.subject_id,
      classGrade: t.subjects?.classes?.grade || 10,
    }));

    // 3. Fetch all attempts
    const { data: attempts = [], error: attErr } = await adminSupabase
      .from("attempts")
      .select(`
        id,
        test_id,
        student_id,
        student_name,
        total_questions,
        correct,
        wrong,
        unanswered,
        score,
        submitted_at,
        tests (
          id,
          title,
          marks_per_question,
          subject_id,
          subjects (
            id,
            name,
            classes (
              grade
            )
          )
        ),
        profiles (
          email,
          full_name
        )
      `)
      .order("score", { ascending: false });

    if (attErr) {
      return {
        success: false,
        filterOptions: { classes: [8, 9, 10, 11, 12], subjects: [], tests: [] },
        results: [],
        error: attErr.message,
      };
    }

    // Sort by score desc and assign ranks
    const sorted = [...(attempts || [])].sort(
      (a: any, b: any) => Number(b.score) - Number(a.score)
    );

    let currentRank = 1;
    const results: AdminResultRow[] = sorted.map((att: any, idx: number) => {
      const rawTest = att.tests;
      const rawSub = rawTest?.subjects;
      const rawCls = rawSub?.classes;
      const marksPerQ = Number(rawTest?.marks_per_question || 1);
      const totalMarks = (att.total_questions || 0) * marksPerQ;
      const score = Number(att.score || 0);
      const percent = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

      if (idx > 0 && Number(sorted[idx - 1].score) > score) {
        currentRank = idx + 1;
      }

      return {
        id: att.id,
        rank: currentRank,
        studentName: att.student_name || att.profiles?.full_name || "Student",
        studentEmail: att.profiles?.email || "N/A",
        classGrade: rawCls?.grade || 10,
        subjectId: rawSub?.id || "",
        subjectName: rawSub?.name || "Subject",
        testId: att.test_id,
        testTitle: rawTest?.title || "Test",
        score,
        totalMarks,
        percent: Number(percent.toFixed(1)),
        correct: att.correct || 0,
        wrong: att.wrong || 0,
        unanswered: att.unanswered || 0,
        submittedAt: att.submitted_at,
      };
    });

    return {
      success: true,
      filterOptions: {
        classes: [8, 9, 10, 11, 12],
        subjects,
        tests,
      },
      results,
    };
  } catch (err: any) {
    return {
      success: false,
      filterOptions: { classes: [8, 9, 10, 11, 12], subjects: [], tests: [] },
      results: [],
      error: err?.message || "Failed to load results.",
    };
  }
}
