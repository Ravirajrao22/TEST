"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient, getCurrentUser } from "@/lib/supabase/server";
import { studentProfileSchema, submitAttemptSchema } from "@/lib/validations/student";

export interface StudentSubjectItem {
  id: string;
  name: string;
  testsCount: number;
}

export interface StudentTestItem {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number | null;
  marksPerQuestion: number;
  negativeMarks: number;
  showResult: boolean;
  questionCount: number;
  isAttempted: boolean;
  attemptId?: string;
  score?: number;
}

/**
 * Saves or updates student full name and selected class.
 */
export async function saveStudentProfileAction(payload: {
  fullName: string;
  grade: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please sign in to update your profile." };
    }

    const validation = studentProfileSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid input",
      };
    }

    const { fullName, grade } = validation.data;
    const supabase = await createClient();

    // 1. Update Auth user metadata
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        grade: grade,
      },
    });

    // 2. Update profiles table
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          grade: grade,
        })
        .eq("id", user.id);
    } catch {
      // Graceful fallback if columns are still propagating
    }

    revalidatePath("/student");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update profile." };
  }
}

/**
 * Loads subjects and published tests for the student's selected class.
 */
export async function getStudentPortalDataAction(grade: number): Promise<{
  success: boolean;
  classId?: string;
  subjects: StudentSubjectItem[];
  tests: StudentTestItem[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, subjects: [], tests: [], error: "Unauthorized" };
    }

    const supabase = await createClient();

    // 1. Find class by grade
    const { data: classRow } = await supabase
      .from("classes")
      .select("id, grade")
      .eq("grade", grade)
      .maybeSingle();

    if (!classRow) {
      return {
        success: false,
        subjects: [],
        tests: [],
        error: `Class ${grade} not found.`,
      };
    }

    // 2. Find subjects for this class
    const { data: subjects = [] } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("class_id", classRow.id)
      .order("name", { ascending: true });

    if (!subjects || subjects.length === 0) {
      return {
        success: true,
        classId: classRow.id,
        subjects: [],
        tests: [],
      };
    }

    const subjectIds = subjects.map((s) => s.id);
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    // 3. Find published tests for these subjects
    const { data: publishedTests = [] } = await supabase
      .from("tests")
      .select(
        "id, title, duration_minutes, marks_per_question, negative_marks, show_result, is_published, subject_id, created_at"
      )
      .in("subject_id", subjectIds)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    // 4. Find student attempts for this student
    const { data: studentAttempts = [] } = await supabase
      .from("attempts")
      .select("id, test_id, score, submitted_at")
      .eq("student_id", user.id);

    const attemptMap = new Map<string, { id: string; score: number }>();
    studentAttempts?.forEach((att) => {
      attemptMap.set(att.test_id, { id: att.id, score: att.score });
    });

    // 5. Get question count for tests using admin client (safe aggregate count)
    const adminSupabase = createAdminClient();
    const testIds = (publishedTests || []).map((t) => t.id);
    const questionCounts = new Map<string, number>();

    if (testIds.length > 0) {
      const { data: qRows } = await adminSupabase
        .from("questions")
        .select("test_id")
        .in("test_id", testIds);

      qRows?.forEach((q) => {
        questionCounts.set(q.test_id, (questionCounts.get(q.test_id) || 0) + 1);
      });
    }

    // 6. Build test items
    const tests: StudentTestItem[] = (publishedTests || []).map((t) => {
      const attempt = attemptMap.get(t.id);
      return {
        id: t.id,
        title: t.title,
        subjectId: t.subject_id,
        subjectName: subjectMap.get(t.subject_id) || "Subject",
        durationMinutes: t.duration_minutes,
        marksPerQuestion: Number(t.marks_per_question),
        negativeMarks: Number(t.negative_marks),
        showResult: t.show_result,
        questionCount: questionCounts.get(t.id) || 0,
        isAttempted: !!attempt,
        attemptId: attempt?.id,
        score: attempt?.score,
      };
    });

    // 7. Calculate test counts per subject
    const subjectTestCounts = new Map<string, number>();
    tests.forEach((t) => {
      subjectTestCounts.set(t.subjectId, (subjectTestCounts.get(t.subjectId) || 0) + 1);
    });

    const subjectItems: StudentSubjectItem[] = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      testsCount: subjectTestCounts.get(s.id) || 0,
    }));

    return {
      success: true,
      classId: classRow.id,
      subjects: subjectItems,
      tests,
    };
  } catch (err: any) {
    return {
      success: false,
      subjects: [],
      tests: [],
      error: err?.message || "Failed to load portal data.",
    };
  }
}

export interface StudentExamQuestion {
  id: string;
  test_id: string;
  position: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

/**
 * Loads test details and questions using the get_test_questions function.
 * Ensures zero leakage of correct_option or explanation.
 */
export async function getTestForExamAction(testId: string): Promise<{
  success: boolean;
  test?: {
    id: string;
    title: string;
    durationMinutes: number | null;
    marksPerQuestion: number;
    negativeMarks: number;
    showResult: boolean;
    subjectName: string;
    classGrade: number;
    classId: string;
  };
  questions?: StudentExamQuestion[];
  isAlreadyAttempted?: boolean;
  attemptId?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please sign in to access this test." };
    }

    const supabase = await createClient();

    // 1. Check if already attempted
    const { data: existingAttempt } = await supabase
      .from("attempts")
      .select("id, submitted_at")
      .eq("test_id", testId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existingAttempt) {
      return {
        success: false,
        isAlreadyAttempted: true,
        attemptId: existingAttempt.id,
        error: "You have already completed this test. Multiple attempts are not permitted.",
      };
    }

    // 2. Fetch test details
    const { data: test, error: testErr } = await supabase
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
        subjects (
          name,
          class_id,
          classes (
            id,
            grade
          )
        )
      `)
      .eq("id", testId)
      .maybeSingle();

    if (testErr || !test) {
      return { success: false, error: "Test not found." };
    }

    if (!test.is_published && user.role !== "admin") {
      return { success: false, error: "This test is not published yet." };
    }

    // 3. Retrieve questions via get_test_questions security definer RPC
    const { data: questions, error: qErr } = await supabase.rpc("get_test_questions", {
      p_test_id: testId,
    });

    let examQuestions = questions;

    // Fallback: If RPC has an ambiguous column error or fails, query safe fields directly
    if (qErr || !examQuestions || examQuestions.length === 0) {
      const { data: directQuestions } = await supabase
        .from("questions")
        .select("id, test_id, position, question_text, option_a, option_b, option_c, option_d")
        .eq("test_id", testId)
        .order("position", { ascending: true });

      if (directQuestions && directQuestions.length > 0) {
        examQuestions = directQuestions;
      } else if (qErr) {
        return { success: false, error: qErr.message || "Failed to load questions." };
      }
    }

    const rawSubjects: any = test.subjects;
    const subjectName = rawSubjects?.name || "Subject";
    const classGrade = rawSubjects?.classes?.grade || 10;
    const classId = rawSubjects?.classes?.id || rawSubjects?.class_id || "";

    return {
      success: true,
      test: {
        id: test.id,
        title: test.title,
        durationMinutes: test.duration_minutes,
        marksPerQuestion: Number(test.marks_per_question),
        negativeMarks: Number(test.negative_marks),
        showResult: test.show_result,
        subjectName,
        classGrade,
        classId,
      },
      questions: (questions || []) as StudentExamQuestion[],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load exam." };
  }
}

/**
 * Submits the student's exam attempt via the submit_attempt RPC.
 */
export async function submitTestAttemptAction(payload: {
  testId: string;
  studentName: string;
  classId: string;
  answers: Record<string, string | null>;
}): Promise<{
  success: boolean;
  attemptId?: string;
  showResult?: boolean;
  score?: number;
  totalQuestions?: number;
  correct?: number;
  wrong?: number;
  unanswered?: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please sign in to submit your test." };
    }

    const validation = submitAttemptSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid submission parameters.",
      };
    }

    const { testId, studentName, classId, answers } = validation.data;
    const supabase = await createClient();

    // Call submit_attempt RPC
    const { data, error } = await supabase.rpc("submit_attempt", {
      p_test_id: testId,
      p_student_name: studentName.trim(),
      p_class_id: classId,
      p_answers: answers as any,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to submit test attempt.",
      };
    }

    const result = data as any;
    if (!result || result.success === false) {
      return {
        success: false,
        error: result?.error || "Submission rejected by server.",
      };
    }

    revalidatePath("/student");
    return {
      success: true,
      attemptId: result.attempt_id,
      showResult: result.show_result,
      score: result.score,
      totalQuestions: result.total_questions,
      correct: result.correct,
      wrong: result.wrong,
      unanswered: result.unanswered,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during submission.",
    };
  }
}

export interface ReviewQuestionItem {
  questionId: string;
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  studentSelectedOption: "A" | "B" | "C" | "D" | null;
  correctOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  explanation: string;
}

export interface AttemptResultData {
  isVisible: boolean;
  attemptId: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  classGrade: number;
  studentName: string;
  submittedAt: string;
  status: string;
  score?: number;
  marksPerQuestion?: number;
  negativeMarks?: number;
  totalQuestions?: number;
  correct?: number;
  wrong?: number;
  unanswered?: number;
  questions?: ReviewQuestionItem[];
}

/**
 * Fetches attempt result data for /student/result/[attemptId].
 * Calls get_attempt_result RPC.
 * If tests.show_result is false, returns ONLY submission status (no score, no answers).
 */
export async function getAttemptResultAction(attemptId: string): Promise<{
  success: boolean;
  result?: AttemptResultData;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();

    // 1. Try calling the get_attempt_result RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_attempt_result", {
      p_attempt_id: attemptId,
    });

    if (!rpcErr && rpcData) {
      const data = rpcData as any;
      const isVisible = Boolean(data.is_visible);

      const formattedQuestions: ReviewQuestionItem[] = (data.questions || []).map(
        (q: any) => ({
          questionId: q.question_id,
          position: q.position,
          questionText: q.question_text,
          optionA: q.option_a,
          optionB: q.option_b,
          optionC: q.option_c,
          optionD: q.option_d,
          studentSelectedOption: q.student_selected_option,
          correctOption: q.correct_option,
          isCorrect: q.is_correct,
          explanation: q.explanation || "",
        })
      );

      return {
        success: true,
        result: {
          isVisible,
          attemptId: data.attempt_id,
          testId: data.test_id,
          testTitle: data.test_title,
          subjectName: data.subject_name,
          classGrade: data.class_grade,
          studentName: data.student_name,
          submittedAt: data.submitted_at,
          status: data.status || "submitted",
          score: isVisible ? Number(data.score) : undefined,
          marksPerQuestion: isVisible ? Number(data.marks_per_question) : undefined,
          negativeMarks: isVisible ? Number(data.negative_marks) : undefined,
          totalQuestions: isVisible ? Number(data.total_questions) : undefined,
          correct: isVisible ? Number(data.correct) : undefined,
          wrong: isVisible ? Number(data.wrong) : undefined,
          unanswered: isVisible ? Number(data.unanswered) : undefined,
          questions: isVisible ? formattedQuestions : undefined,
        },
      };
    }

    // 2. Fallback in case RPC is still propagating on remote instance
    const { data: attempt, error: attemptErr } = await supabase
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
          negative_marks,
          show_result,
          subjects (
            name,
            classes (
              grade
            )
          )
        )
      `)
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return { success: false, error: "Attempt not found." };
    }

    if (attempt.student_id !== user.id && user.role !== "admin") {
      return { success: false, error: "Unauthorized access to this attempt." };
    }

    const rawTest: any = attempt.tests;
    const rawSubject: any = rawTest?.subjects;
    const isVisible = Boolean(rawTest?.show_result) || user.role === "admin";

    if (!isVisible) {
      return {
        success: true,
        result: {
          isVisible: false,
          attemptId: attempt.id,
          testId: attempt.test_id,
          testTitle: rawTest?.title || "Test",
          subjectName: rawSubject?.name || "Subject",
          classGrade: rawSubject?.classes?.grade || 10,
          studentName: attempt.student_name,
          submittedAt: attempt.submitted_at,
          status: "submitted",
        },
      };
    }

    // Visible: fetch review questions using admin client
    const adminSupabase = createAdminClient();
    const { data: qRows = [] } = await adminSupabase
      .from("questions")
      .select("id, position, question_text, option_a, option_b, option_c, option_d, correct_option, explanation")
      .eq("test_id", attempt.test_id)
      .order("position", { ascending: true });

    const { data: aRows } = await adminSupabase
      .from("attempt_answers")
      .select("question_id, selected_option, is_correct")
      .eq("attempt_id", attempt.id);

    const answerMap = new Map((aRows || []).map((a: any) => [a.question_id, a]));

    const questions: ReviewQuestionItem[] = (qRows || []).map((q) => {
      const studentAns = answerMap.get(q.id);
      return {
        questionId: q.id,
        position: q.position,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        studentSelectedOption: (studentAns?.selected_option as any) || null,
        correctOption: q.correct_option as any,
        isCorrect: Boolean(studentAns?.is_correct),
        explanation: q.explanation || "",
      };
    });

    return {
      success: true,
      result: {
        isVisible: true,
        attemptId: attempt.id,
        testId: attempt.test_id,
        testTitle: rawTest?.title || "Test",
        subjectName: rawSubject?.name || "Subject",
        classGrade: rawSubject?.classes?.grade || 10,
        studentName: attempt.student_name,
        submittedAt: attempt.submitted_at,
        status: "submitted",
        score: Number(attempt.score),
        marksPerQuestion: Number(rawTest?.marks_per_question || 1),
        negativeMarks: Number(rawTest?.negative_marks || 0),
        totalQuestions: attempt.total_questions,
        correct: attempt.correct,
        wrong: attempt.wrong,
        unanswered: attempt.unanswered,
        questions,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load attempt result." };
  }
}

export interface StudentHistoryItem {
  attemptId: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  classGrade: number;
  submittedAt: string;
  showResult: boolean;
  score?: number;
  totalQuestions?: number;
  marksPerQuestion?: number;
  percentage?: number;
}

/**
 * Returns past test attempts for the signed-in student.
 * Dynamically enforces tests.show_result: if hidden, hides score.
 */
export async function getStudentHistoryAction(): Promise<{
  success: boolean;
  history: StudentHistoryItem[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, history: [], error: "Unauthorized" };
    }

    const supabase = await createClient();

    const { data: attempts = [], error } = await supabase
      .from("attempts")
      .select(`
        id,
        test_id,
        total_questions,
        score,
        submitted_at,
        tests (
          id,
          title,
          marks_per_question,
          show_result,
          subjects (
            name,
            classes (
              grade
            )
          )
        )
      `)
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      return { success: false, history: [], error: error.message };
    }

    const history: StudentHistoryItem[] = (attempts || []).map((att) => {
      const rawTest: any = att.tests;
      const rawSubject: any = rawTest?.subjects;
      const showResult = Boolean(rawTest?.show_result);

      const marksPerQ = Number(rawTest?.marks_per_question || 1);
      const maxScore = att.total_questions * marksPerQ;
      const percentage = maxScore > 0 ? Math.round((Number(att.score) / maxScore) * 100) : 0;

      return {
        attemptId: att.id,
        testId: att.test_id,
        testTitle: rawTest?.title || "Test",
        subjectName: rawSubject?.name || "Subject",
        classGrade: rawSubject?.classes?.grade || 10,
        submittedAt: att.submitted_at,
        showResult,
        score: showResult ? Number(att.score) : undefined,
        totalQuestions: showResult ? att.total_questions : undefined,
        marksPerQuestion: showResult ? marksPerQ : undefined,
        percentage: showResult ? percentage : undefined,
      };
    });

    return {
      success: true,
      history,
    };
  } catch (err: any) {
    return {
      success: false,
      history: [],
      error: err?.message || "Failed to load attempt history.",
    };
  }
}
