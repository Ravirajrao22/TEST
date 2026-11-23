"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient, getCurrentUser } from "@/lib/supabase/server";

export interface AdminTestOverviewItem {
  id: string;
  title: string;
  grade: number;
  subjectId: string;
  subjectName: string;
  durationMinutes: number | null;
  marksPerQuestion: number;
  negativeMarks: number;
  showResult: boolean;
  isPublished: boolean;
  questionCount: number;
  submissionCount: number;
  createdAt: string;
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
 * Returns all tests with their subjects, classes, question counts, and submission counts.
 */
export async function getAllAdminTestsAction(): Promise<{
  success: boolean;
  tests: AdminTestOverviewItem[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Fetch tests with subjects and classes
    const { data: tests = [], error: testsErr } = await supabase
      .from("tests")
      .select(`
        id,
        title,
        duration_minutes,
        marks_per_question,
        negative_marks,
        show_result,
        is_published,
        subject_id,
        created_at,
        subjects (
          id,
          name,
          class_id,
          classes (
            id,
            grade
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (testsErr) {
      return { success: false, tests: [], error: testsErr.message };
    }

    const testIds = (tests || []).map((t) => t.id);
    const questionCounts = new Map<string, number>();
    const submissionCounts = new Map<string, number>();

    if (testIds.length > 0) {
      const adminSupabase = createAdminClient();

      // Aggregate question counts
      const { data: qRows } = await adminSupabase
        .from("questions")
        .select("test_id")
        .in("test_id", testIds);

      qRows?.forEach((q) => {
        questionCounts.set(q.test_id, (questionCounts.get(q.test_id) || 0) + 1);
      });

      // Aggregate submission counts
      const { data: aRows } = await adminSupabase
        .from("attempts")
        .select("test_id")
        .in("test_id", testIds);

      aRows?.forEach((a) => {
        submissionCounts.set(a.test_id, (submissionCounts.get(a.test_id) || 0) + 1);
      });
    }

    const formattedTests: AdminTestOverviewItem[] = (tests || []).map((t) => {
      const rawSubject: any = t.subjects;
      const rawClass: any = rawSubject?.classes;

      return {
        id: t.id,
        title: t.title,
        grade: rawClass?.grade || 10,
        subjectId: t.subject_id,
        subjectName: rawSubject?.name || "Subject",
        durationMinutes: t.duration_minutes,
        marksPerQuestion: Number(t.marks_per_question),
        negativeMarks: Number(t.negative_marks),
        showResult: Boolean(t.show_result),
        isPublished: Boolean(t.is_published),
        questionCount: questionCounts.get(t.id) || 0,
        submissionCount: submissionCounts.get(t.id) || 0,
        createdAt: t.created_at,
      };
    });

    return {
      success: true,
      tests: formattedTests,
    };
  } catch (err: any) {
    return {
      success: false,
      tests: [],
      error: err?.message || "Failed to load tests.",
    };
  }
}

/**
 * Updates an individual test's show_result visibility switch.
 */
export async function updateTestShowResultAction(
  testId: string,
  showResult: boolean
): Promise<{
  success: boolean;
  showResult: boolean;
  message: string;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("tests")
      .update({ show_result: showResult })
      .eq("id", testId);

    if (error) {
      return {
        success: false,
        showResult: !showResult,
        message: "Failed to update test result visibility.",
        error: error.message,
      };
    }

    revalidatePath("/admin/tests");
    revalidatePath("/admin/classes");
    revalidatePath("/student");

    const message = showResult
      ? "Students will see results right after submitting"
      : "Results are hidden from students";

    return {
      success: true,
      showResult,
      message,
    };
  } catch (err: any) {
    return {
      success: false,
      showResult: !showResult,
      message: err?.message || "Failed to update result visibility.",
      error: err?.message,
    };
  }
}

/**
 * Bulk updates show_result for all tests under a specific subject.
 */
export async function bulkUpdateSubjectTestsShowResultAction(
  subjectId: string,
  showResult: boolean
): Promise<{
  success: boolean;
  count: number;
  message: string;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // 1. Count tests under subject
    const { data: subjectTests, error: findErr } = await supabase
      .from("tests")
      .select("id")
      .eq("subject_id", subjectId);

    if (findErr) {
      return { success: false, count: 0, message: findErr.message };
    }

    const count = subjectTests?.length || 0;
    if (count === 0) {
      return { success: true, count: 0, message: "No tests found in this subject." };
    }

    // 2. Perform bulk update
    const { error: updateErr } = await supabase
      .from("tests")
      .update({ show_result: showResult })
      .eq("subject_id", subjectId);

    if (updateErr) {
      return { success: false, count: 0, message: updateErr.message };
    }

    revalidatePath("/admin/classes");
    revalidatePath("/admin/tests");
    revalidatePath("/student");

    const message = showResult
      ? `Results are now visible for all ${count} tests in this subject.`
      : `Results are now hidden for all ${count} tests in this subject.`;

    return {
      success: true,
      count,
      message,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err?.message || "Failed to bulk update tests.",
      error: err?.message,
    };
  }
}

/**
 * Bulk updates show_result for all tests under an entire class.
 */
export async function bulkUpdateClassTestsShowResultAction(
  grade: number,
  showResult: boolean
): Promise<{
  success: boolean;
  count: number;
  message: string;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // 1. Find class by grade
    const { data: classRow } = await supabase
      .from("classes")
      .select("id")
      .eq("grade", grade)
      .maybeSingle();

    if (!classRow) {
      return { success: false, count: 0, message: `Class ${grade} not found.` };
    }

    // 2. Find subject IDs in this class
    const { data: subjects = [] } = await supabase
      .from("subjects")
      .select("id")
      .eq("class_id", classRow.id);

    const subjectIds = (subjects || []).map((s) => s.id);
    if (subjectIds.length === 0) {
      return { success: true, count: 0, message: `No subjects in Class ${grade}.` };
    }

    // 3. Count tests in this class
    const { data: testsInClass = [] } = await supabase
      .from("tests")
      .select("id")
      .in("subject_id", subjectIds);

    const count = testsInClass?.length || 0;
    if (count === 0) {
      return { success: true, count: 0, message: `No tests found in Class ${grade}.` };
    }

    // 4. Perform bulk update
    const { error: updateErr } = await supabase
      .from("tests")
      .update({ show_result: showResult })
      .in("subject_id", subjectIds);

    if (updateErr) {
      return { success: false, count: 0, message: updateErr.message };
    }

    revalidatePath("/admin/classes");
    revalidatePath("/admin/tests");
    revalidatePath("/student");

    const message = showResult
      ? `Results are now visible for all ${count} tests in Class ${grade}.`
      : `Results are now hidden for all ${count} tests in Class ${grade}.`;

    return {
      success: true,
      count,
      message,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err?.message || "Failed to bulk update tests.",
      error: err?.message,
    };
  }
}
