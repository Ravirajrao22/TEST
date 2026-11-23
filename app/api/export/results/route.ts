import { NextResponse } from "next/server";
import { getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import {
  buildResultsExcelBuffer,
  buildResultsCsvWithBOM,
  generateExportFileName,
  type StudentResultExportRow,
  type QuestionAnalysisExportRow,
  type ResultsExportPayload,
} from "@/lib/export/excel";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authorization: Admin only
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required to export results." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      grade = null,
      subjectId = null,
      testId = null,
      search = "",
      passMarkPercent = 33,
      format = "xlsx",
    } = body;

    const adminSupabase = createAdminClient();

    // 2. Fetch attempts matching the filters
    let query = adminSupabase
      .from("attempts")
      .select(`
        id,
        test_id,
        student_id,
        student_name,
        class_id,
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
            class_id,
            classes (
              id,
              grade
            )
          )
        ),
        profiles (
          id,
          email,
          full_name
        )
      `)
      .order("score", { ascending: false });

    // Filter by testId if provided
    if (testId) {
      query = query.eq("test_id", testId);
    }

    const { data: attempts = [], error: queryErr } = await query;

    if (queryErr) {
      return NextResponse.json(
        { error: queryErr.message || "Failed to query results." },
        { status: 500 }
      );
    }

    // Filter in-memory for joined subject/class and search text
    let filtered = (attempts || []).filter((att: any) => {
      const rawTest = att.tests;
      const rawSubject = rawTest?.subjects;
      const rawClass = rawSubject?.classes;

      if (grade && rawClass?.grade !== grade) {
        return false;
      }
      if (subjectId && rawSubject?.id !== subjectId) {
        return false;
      }
      if (search && search.trim()) {
        const queryStr = search.trim().toLowerCase();
        const studentName = (att.student_name || "").toLowerCase();
        const studentEmail = (att.profiles?.email || "").toLowerCase();
        if (!studentName.includes(queryStr) && !studentEmail.includes(queryStr)) {
          return false;
        }
      }
      return true;
    });

    // 3. Sort by score descending and assign standard competition ranks
    filtered.sort((a: any, b: any) => Number(b.score) - Number(a.score));

    let currentRank = 1;
    const resultRows: StudentResultExportRow[] = filtered.map(
      (att: any, idx: number) => {
        const rawTest = att.tests;
        const rawSubject = rawTest?.subjects;
        const rawClass = rawSubject?.classes;
        const marksPerQ = Number(rawTest?.marks_per_question || 1);
        const totalMarks = (att.total_questions || 0) * marksPerQ;
        const score = Number(att.score || 0);
        const percent = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

        if (idx > 0 && Number(filtered[idx - 1].score) > score) {
          currentRank = idx + 1;
        }

        return {
          rank: currentRank,
          studentName: att.student_name || att.profiles?.full_name || "Student",
          studentEmail: att.profiles?.email || "N/A",
          classGrade: rawClass?.grade || 10,
          subjectName: rawSubject?.name || "Subject",
          testTitle: rawTest?.title || "Test",
          totalMarks,
          score,
          percent,
          correct: att.correct || 0,
          wrong: att.wrong || 0,
          unanswered: att.unanswered || 0,
          submittedAt: att.submitted_at,
        };
      }
    );

    // 4. If single test is selected, build Question Analysis
    let questionAnalysis: QuestionAnalysisExportRow[] | undefined = undefined;
    let selectedTestTitle = "";
    let selectedSubjectName = "";

    if (testId) {
      const { data: testRow } = await adminSupabase
        .from("tests")
        .select(`
          title,
          subjects (
            name
          )
        `)
        .eq("id", testId)
        .maybeSingle();

      selectedTestTitle = testRow?.title || "";
      selectedSubjectName = (testRow as any)?.subjects?.name || "";

      // Fetch questions for this test
      const { data: qRows = [] } = await adminSupabase
        .from("questions")
        .select("id, position, question_text, correct_option")
        .eq("test_id", testId)
        .order("position", { ascending: true });

      // Fetch attempt answers for attempts on this test
      const attemptIds = filtered.map((a: any) => a.id);
      let answersMap: Map<string, { correctCount: number }> = new Map();

      if (attemptIds.length > 0) {
        const { data: aRows = [] } = await adminSupabase
          .from("attempt_answers")
          .select("question_id, is_correct")
          .in("attempt_id", attemptIds);

        aRows?.forEach((ans) => {
          if (!answersMap.has(ans.question_id)) {
            answersMap.set(ans.question_id, { correctCount: 0 });
          }
          if (ans.is_correct) {
            answersMap.get(ans.question_id)!.correctCount += 1;
          }
        });
      }

      const totalTestAttempts = filtered.length;

      questionAnalysis = (qRows || []).map((q) => {
        const stats = answersMap.get(q.id) || { correctCount: 0 };
        const percent =
          totalTestAttempts > 0
            ? (stats.correctCount / totalTestAttempts) * 100
            : 0;

        return {
          questionNumber: q.position,
          questionText: q.question_text,
          correctOption: q.correct_option,
          numberCorrect: stats.correctCount,
          percentCorrect: percent,
        };
      });
    } else if (subjectId) {
      const { data: subRow } = await adminSupabase
        .from("subjects")
        .select("name")
        .eq("id", subjectId)
        .maybeSingle();
      selectedSubjectName = subRow?.name || "";
    }

    const payload: ResultsExportPayload = {
      results: resultRows,
      passMarkPercent: Number(passMarkPercent) || 33,
      oneTestSelected: Boolean(testId),
      questionAnalysis,
      gradeName: grade ? `Class ${grade}` : undefined,
      subjectName: selectedSubjectName || undefined,
      testName: selectedTestTitle || undefined,
    };

    // 5. Generate File
    const fileName = generateExportFileName(
      grade,
      selectedSubjectName || "All",
      selectedTestTitle || "All",
      format === "csv" ? "csv" : "xlsx"
    );

    if (format === "csv") {
      const csvContent = buildResultsCsvWithBOM(payload);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    // Format is Excel (.xlsx)
    const buffer = buildResultsExcelBuffer(payload);
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Export results API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export results." },
      { status: 500 }
    );
  }
}
