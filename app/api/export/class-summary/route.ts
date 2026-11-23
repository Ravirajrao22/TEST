import { NextResponse } from "next/server";
import { getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import {
  buildClassSummaryExcelBuffer,
  buildClassSummaryCsvWithBOM,
  type ClassSummaryExportRow,
} from "@/lib/export/excel";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { grade = 10, format = "xlsx" } = body;

    const classGrade = parseInt(String(grade), 10);
    const adminSupabase = createAdminClient();

    // 1. Fetch class
    const { data: classRow } = await adminSupabase
      .from("classes")
      .select("id, grade")
      .eq("grade", classGrade)
      .maybeSingle();

    if (!classRow) {
      return NextResponse.json(
        { error: `Class ${classGrade} not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch all subjects for this class
    const { data: subjects = [] } = await adminSupabase
      .from("subjects")
      .select("id, name")
      .eq("class_id", classRow.id)
      .order("name", { ascending: true });

    const subjectIds = (subjects || []).map((s) => s.id);
    const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));

    // 3. Fetch all tests for these subjects
    const { data: tests = [] } = await adminSupabase
      .from("tests")
      .select("id, title, marks_per_question, subject_id")
      .in("subject_id", subjectIds.length > 0 ? subjectIds : ["none"])
      .order("title", { ascending: true });

    const testIds = (tests || []).map((t) => t.id);

    // 4. Fetch question counts per test
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

    // 5. Fetch attempts per test
    const { data: attempts = [] } = await adminSupabase
      .from("attempts")
      .select("test_id, score, total_questions")
      .in("test_id", testIds.length > 0 ? testIds : ["none"]);

    // Aggregate attempts by test_id
    const testAttemptsMap = new Map<
      string,
      { count: number; scores: number[]; percents: number[] }
    >();

    attempts?.forEach((att) => {
      if (!testAttemptsMap.has(att.test_id)) {
        testAttemptsMap.set(att.test_id, { count: 0, scores: [], percents: [] });
      }
      const item = testAttemptsMap.get(att.test_id)!;
      item.count += 1;
      const score = Number(att.score || 0);
      item.scores.push(score);

      // Find test marksPerQ
      const matchingTest = (tests || []).find((t) => t.id === att.test_id);
      const marksPerQ = Number(matchingTest?.marks_per_question || 1);
      const maxMarks = (att.total_questions || 0) * marksPerQ;
      const percent = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
      item.percents.push(percent);
    });

    // 6. Build rows: one row per subject and test
    const rows: ClassSummaryExportRow[] = (tests || []).map((t) => {
      const stats = testAttemptsMap.get(t.id) || {
        count: 0,
        scores: [],
        percents: [],
      };
      const totalQ = questionCounts.get(t.id) || 0;
      const marksPerQ = Number(t.marks_per_question || 1);

      let avgScore = 0;
      let avgPercent = 0;
      let highestScore = 0;
      let lowestScore = 0;

      if (stats.count > 0) {
        avgScore = stats.scores.reduce((sum, s) => sum + s, 0) / stats.count;
        avgPercent = stats.percents.reduce((sum, p) => sum + p, 0) / stats.count;
        highestScore = Math.max(...stats.scores);
        lowestScore = Math.min(...stats.scores);
      }

      return {
        classGrade,
        subjectName: subjectMap.get(t.subject_id) || "Subject",
        testTitle: t.title,
        totalQuestions: totalQ,
        marksPerQuestion: marksPerQ,
        attemptsCount: stats.count,
        averageScore: Number(avgScore.toFixed(1)),
        averagePercent: Number(avgPercent.toFixed(1)),
        highestScore,
        lowestScore,
      };
    });

    const now = new Date();
    const istDateString = now
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      .substring(0, 10);

    const fileName = `Class${classGrade}_Summary_${istDateString}.${format === "csv" ? "csv" : "xlsx"}`;

    if (format === "csv") {
      const csv = buildClassSummaryCsvWithBOM(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    const buffer = buildClassSummaryExcelBuffer(classGrade, rows);
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Export class summary error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export class summary." },
      { status: 500 }
    );
  }
}
