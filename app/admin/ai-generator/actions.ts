"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient, getCurrentUser } from "@/lib/supabase/server";
import type { GeneratedMCQ } from "@/lib/validations/ai";

/**
 * Returns subjects for a specific class level.
 */
export async function getSubjectsForClassAction(grade: number): Promise<{
  success: boolean;
  classId?: string;
  subjects: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: classRow } = await supabase
      .from("classes")
      .select("id")
      .eq("grade", grade)
      .maybeSingle();

    if (!classRow) {
      return { success: false, subjects: [], error: `Class ${grade} not found.` };
    }

    const { data: subjects = [], error } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("class_id", classRow.id)
      .order("name", { ascending: true });

    if (error) {
      return { success: false, subjects: [], error: error.message };
    }

    return {
      success: true,
      classId: classRow.id,
      subjects: subjects || [],
    };
  } catch (err: any) {
    return { success: false, subjects: [], error: err?.message };
  }
}

/**
 * Returns existing tests for a subject.
 */
export async function getExistingTestsForSubjectAction(subjectId: string): Promise<{
  success: boolean;
  tests: { id: string; title: string; durationMinutes: number | null }[];
  error?: string;
}> {
  try {
    if (!subjectId || !subjectId.trim()) {
      return { success: true, tests: [] };
    }

    const supabase = await createClient();

    const { data: tests = [], error } = await supabase
      .from("tests")
      .select("id, title, duration_minutes")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, tests: [], error: error.message };
    }

    return {
      success: true,
      tests: (tests || []).map((t) => ({
        id: t.id,
        title: t.title,
        durationMinutes: t.duration_minutes,
      })),
    };
  } catch (err: any) {
    return { success: false, tests: [], error: err?.message };
  }
}

/**
 * Inserts questions into an existing test.
 */
export async function addQuestionsToExistingTestAction(
  testId: string,
  questions: GeneratedMCQ[]
): Promise<{ success: boolean; insertedCount?: number; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    if (!testId || !testId.trim()) {
      return { success: false, error: "Target test ID is required." };
    }

    if (!questions || questions.length === 0) {
      return { success: false, error: "No questions to add." };
    }

    const supabase = await createClient();

    // Find current highest position in the test
    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("position")
      .eq("test_id", testId)
      .order("position", { ascending: false })
      .limit(1);

    const basePosition = existingQuestions?.[0]?.position || 0;

    const rowsToInsert = questions.map((q, idx) => ({
      test_id: testId,
      position: basePosition + idx + 1,
      question_text: q.question.trim(),
      option_a: q.option_a.trim(),
      option_b: q.option_b.trim(),
      option_c: q.option_c.trim(),
      option_d: q.option_d.trim(),
      correct_option: q.correct,
      explanation: q.explanation?.trim() || null,
    }));

    let { error } = await supabase.from("questions").insert(rowsToInsert);

    // Fallback to admin client if service role is configured
    if (error && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")) {
      try {
        const adminClient = createAdminClient();
        const res = await adminClient.from("questions").insert(rowsToInsert);
        error = res.error;
      } catch {
        // keep original error
      }
    }

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/tests");
    revalidatePath("/admin/classes");

    return { success: true, insertedCount: rowsToInsert.length };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to insert questions." };
  }
}

/**
 * Creates a new test and inserts all selected questions in one operation.
 */
export async function createTestWithQuestionsAction(payload: {
  subjectId: string;
  title: string;
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarks: number;
  showResult: boolean;
  questions: GeneratedMCQ[];
}): Promise<{
  success: boolean;
  testId?: string;
  testTitle?: string;
  insertedCount?: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    const {
      subjectId,
      title,
      durationMinutes,
      marksPerQuestion,
      negativeMarks,
      showResult,
      questions,
    } = payload;

    if (!title || title.trim().length < 2) {
      return { success: false, error: "Test title must be at least 2 characters." };
    }

    if (!subjectId || !subjectId.trim()) {
      return { success: false, error: "Please select a valid subject for this test." };
    }

    if (!questions || questions.length === 0) {
      return { success: false, error: "No questions provided." };
    }

    const supabase = await createClient();

    // Validate that the subject exists
    const { data: subjectRow, error: subErr } = await supabase
      .from("subjects")
      .select("id, name, class_id")
      .eq("id", subjectId.trim())
      .maybeSingle();

    if (subErr || !subjectRow) {
      return {
        success: false,
        error: "The selected subject could not be found. Please ensure a valid subject is chosen.",
      };
    }

    // 1. Create Test
    const testData = {
      subject_id: subjectRow.id,
      title: title.trim(),
      duration_minutes: durationMinutes > 0 ? durationMinutes : null,
      marks_per_question: marksPerQuestion,
      negative_marks: negativeMarks,
      show_result: showResult,
      is_published: false, // drafted by default so admin can review
    };

    let newTest: any = null;
    let testErr: any = null;

    const userRes = await supabase.from("tests").insert(testData).select().single();
    newTest = userRes.data;
    testErr = userRes.error;

    // Fallback to service role client if RLS blocked the insert
    if (testErr && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")) {
      try {
        const adminClient = createAdminClient();
        const adminRes = await adminClient.from("tests").insert(testData).select().single();
        newTest = adminRes.data;
        testErr = adminRes.error;
      } catch {
        // keep original error
      }
    }

    if (testErr || !newTest) {
      console.error("Test creation error in Supabase:", testErr);
      if (testErr?.code === "42501" || testErr?.message?.includes("policy")) {
        return {
          success: false,
          error: "Permission denied by database RLS. Ensure your email is added to the admin_emails table in Supabase.",
        };
      }
      return { success: false, error: testErr?.message || "Failed to create test." };
    }

    // 2. Insert Questions
    const rowsToInsert = questions.map((q, idx) => ({
      test_id: newTest.id,
      position: idx + 1,
      question_text: q.question.trim(),
      option_a: q.option_a.trim(),
      option_b: q.option_b.trim(),
      option_c: q.option_c.trim(),
      option_d: q.option_d.trim(),
      correct_option: q.correct,
      explanation: q.explanation?.trim() || null,
    }));

    let { error: questionsErr } = await supabase.from("questions").insert(rowsToInsert);

    if (questionsErr && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")) {
      try {
        const adminClient = createAdminClient();
        const adminRes = await adminClient.from("questions").insert(rowsToInsert);
        questionsErr = adminRes.error;
      } catch {
        // keep original error
      }
    }

    if (questionsErr) {
      console.error("Questions insertion error in Supabase:", questionsErr);
      return {
        success: false,
        testId: newTest.id,
        testTitle: newTest.title,
        error: `Test was created, but questions failed to insert: ${questionsErr.message}`,
      };
    }

    revalidatePath("/admin/tests");
    revalidatePath("/admin/classes");

    return {
      success: true,
      testId: newTest.id,
      testTitle: newTest.title,
      insertedCount: rowsToInsert.length,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create test with questions." };
  }
}
