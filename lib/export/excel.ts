import * as XLSX from "xlsx";

export interface StudentResultExportRow {
  rank: number;
  studentName: string;
  studentEmail: string;
  classGrade: number;
  subjectName: string;
  testTitle: string;
  totalMarks: number;
  score: number;
  percent: number;
  correct: number;
  wrong: number;
  unanswered: number;
  submittedAt: string;
}

export interface QuestionAnalysisExportRow {
  questionNumber: number;
  questionText: string;
  correctOption: string;
  numberCorrect: number;
  percentCorrect: number;
}

export interface ResultsExportPayload {
  results: StudentResultExportRow[];
  passMarkPercent: number;
  oneTestSelected: boolean;
  questionAnalysis?: QuestionAnalysisExportRow[];
  gradeName?: string;
  subjectName?: string;
  testName?: string;
}

export interface ClassSummaryExportRow {
  classGrade: number;
  subjectName: string;
  testTitle: string;
  totalQuestions: number;
  marksPerQuestion: number;
  attemptsCount: number;
  averageScore: number;
  averagePercent: number;
  highestScore: number;
  lowestScore: number;
}

/**
 * Clean a string component for safe use in file names.
 * Removes forbidden characters [/\\?%*:|"<>], replaces spaces with underscores, and limits length.
 */
export function sanitizeFileNamePart(str: string): string {
  if (!str || str.trim().toLowerCase() === "all") {
    return "All";
  }
  return str
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\u0900-\u097F\u0A00-\u0A7F-]/g, "") // support English, Hindi, Punjabi characters
    .substring(0, 30);
}

/**
 * Generates standard file name:
 * Class{grade}_{Subject}_{TestTitle}_{YYYY-MM-DD}.[xlsx|csv]
 */
export function generateExportFileName(
  grade: number | null | undefined,
  subject: string | null | undefined,
  testTitle: string | null | undefined,
  extension: "xlsx" | "csv"
): string {
  const gradePart = grade ? `Class${grade}` : "ClassAll";
  const subjectPart = subject ? sanitizeFileNamePart(subject) : "All";
  const testPart = testTitle ? sanitizeFileNamePart(testTitle) : "All";

  // Indian Standard Time Date YYYY-MM-DD
  const now = new Date();
  const istDateString = now
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) // en-CA gives YYYY-MM-DD
    .substring(0, 10);

  return `${gradePart}_${subjectPart}_${testPart}_${istDateString}.${extension}`;
}

/**
 * Format timestamp in Indian Standard Time (IST): DD/MM/YYYY, hh:mm A
 */
export function formatISTDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Compute auto-fitted column widths for a worksheet from Array-of-Arrays data.
 */
function getWorksheetColumnWidths(dataAOA: any[][]): { wch: number }[] {
  if (!dataAOA || dataAOA.length === 0) return [];
  const colCount = Math.max(...dataAOA.map((r) => r.length));
  const widths: { wch: number }[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = 10;
    for (let r = 0; r < dataAOA.length; r++) {
      const val = dataAOA[r][c];
      const str = val !== null && val !== undefined ? String(val) : "";
      if (str.length > maxLen) {
        maxLen = str.length;
      }
    }
    widths.push({ wch: Math.min(maxLen + 3, 60) });
  }

  return widths;
}

/**
 * Applies frozen first row and column width styles to a worksheet.
 */
function applyWorksheetFormatting(ws: XLSX.WorkSheet, dataAOA: any[][]) {
  ws["!cols"] = getWorksheetColumnWidths(dataAOA);

  // Freeze first header row
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };
  (ws as any)["!views"] = [{ state: "frozen", ySplit: 1 }];

  // Bold header row with light grey fill styling
  if (ws["!ref"]) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: "E2E8F0" } }, // light grey fill
        alignment: { vertical: "center", horizontal: "center" },
      };
    }
  }
}

/**
 * Builds the 3-sheet Excel workbook for results export.
 * Sheet 1: Results
 * Sheet 2: Summary
 * Sheet 3: Question analysis (only if one test is selected)
 */
export function buildResultsExcelBuffer(payload: ResultsExportPayload): Buffer {
  const workbook = XLSX.utils.book_new();

  // --------------------------------------------------------------------------
  // SHEET 1: RESULTS
  // Rank, Student name, Email, Class, Subject, Test, Total marks, Score, Percent,
  // Correct, Wrong, Unanswered, Submitted at (IST)
  // --------------------------------------------------------------------------
  const resultsHeaders = [
    "Rank",
    "Student Name",
    "Email",
    "Class",
    "Subject",
    "Test",
    "Total Marks",
    "Score",
    "Percent",
    "Correct",
    "Wrong",
    "Unanswered",
    "Submitted At",
  ];

  const resultsRows = payload.results.map((r) => [
    r.rank,
    r.studentName,
    r.studentEmail,
    `Class ${r.classGrade}`,
    r.subjectName,
    r.testTitle,
    r.totalMarks,
    r.score,
    Number(r.percent.toFixed(1)), // percent as number with one decimal
    r.correct,
    r.wrong,
    r.unanswered,
    formatISTDateTime(r.submittedAt),
  ]);

  const resultsAOA = [resultsHeaders, ...resultsRows];
  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsAOA);
  applyWorksheetFormatting(resultsSheet, resultsAOA);

  // Set number format for Percent column (Index 8)
  if (resultsSheet["!ref"]) {
    const range = XLSX.utils.decode_range(resultsSheet["!ref"]);
    for (let R = 1; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 8 });
      if (resultsSheet[cellAddress]) {
        resultsSheet[cellAddress].z = "0.0";
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, resultsSheet, "Results");

  // --------------------------------------------------------------------------
  // SHEET 2: SUMMARY
  // attempts, average, highest, lowest, pass count, pass percentage, pass mark threshold
  // --------------------------------------------------------------------------
  const totalAttempts = payload.results.length;
  let avgScore = 0;
  let avgPercent = 0;
  let highestScore = 0;
  let lowestScore = 0;
  let passCount = 0;

  if (totalAttempts > 0) {
    const scores = payload.results.map((r) => r.score);
    const percents = payload.results.map((r) => r.percent);
    highestScore = Math.max(...scores);
    lowestScore = Math.min(...scores);
    const totalScoreSum = scores.reduce((sum, s) => sum + s, 0);
    const totalPercentSum = percents.reduce((sum, p) => sum + p, 0);
    avgScore = Number((totalScoreSum / totalAttempts).toFixed(1));
    avgPercent = Number((totalPercentSum / totalAttempts).toFixed(1));

    passCount = payload.results.filter(
      (r) => r.percent >= payload.passMarkPercent
    ).length;
  }

  const passPercent =
    totalAttempts > 0
      ? Number(((passCount / totalAttempts) * 100).toFixed(1))
      : 0;

  const summaryAOA = [
    ["Metric", "Value"],
    ["Total Attempts", totalAttempts],
    ["Pass Mark Threshold (%)", payload.passMarkPercent],
    ["Students Passed", passCount],
    ["Passing Percentage", `${passPercent}%`],
    ["Average Score", avgScore],
    ["Average Percentage", `${avgPercent}%`],
    ["Highest Score", highestScore],
    ["Lowest Score", lowestScore],
    ["Generated At (IST)", formatISTDateTime(new Date().toISOString())],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAOA);
  applyWorksheetFormatting(summarySheet, summaryAOA);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // --------------------------------------------------------------------------
  // SHEET 3: QUESTION ANALYSIS (Only when one test is selected)
  // question number, question text, correct option, number correct, percent correct
  // --------------------------------------------------------------------------
  if (payload.oneTestSelected && payload.questionAnalysis && payload.questionAnalysis.length > 0) {
    const qaHeaders = [
      "Question Number",
      "Question Text",
      "Correct Option",
      "Number Correct",
      "Percent Correct",
    ];

    const qaRows = payload.questionAnalysis.map((qa) => [
      qa.questionNumber,
      qa.questionText,
      qa.correctOption,
      qa.numberCorrect,
      Number(qa.percentCorrect.toFixed(1)), // percent as number with one decimal
    ]);

    const qaAOA = [qaHeaders, ...qaRows];
    const qaSheet = XLSX.utils.aoa_to_sheet(qaAOA);
    applyWorksheetFormatting(qaSheet, qaAOA);

    if (qaSheet["!ref"]) {
      const range = XLSX.utils.decode_range(qaSheet["!ref"]);
      for (let R = 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: 4 });
        if (qaSheet[cellAddress]) {
          qaSheet[cellAddress].z = "0.0";
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, qaSheet, "Question analysis");
  }

  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

/**
 * Builds UTF-8 with BOM CSV string for results export.
 * BOM (\uFEFF) ensures Excel renders non-English (Hindi, Punjabi) characters correctly.
 */
export function buildResultsCsvWithBOM(payload: ResultsExportPayload): string {
  const resultsHeaders = [
    "Rank",
    "Student Name",
    "Email",
    "Class",
    "Subject",
    "Test",
    "Total Marks",
    "Score",
    "Percent",
    "Correct",
    "Wrong",
    "Unanswered",
    "Submitted At",
  ];

  const resultsRows = payload.results.map((r) => [
    r.rank,
    r.studentName,
    r.studentEmail,
    `Class ${r.classGrade}`,
    r.subjectName,
    r.testTitle,
    r.totalMarks,
    r.score,
    r.percent.toFixed(1),
    r.correct,
    r.wrong,
    r.unanswered,
    formatISTDateTime(r.submittedAt),
  ]);

  const resultsAOA = [resultsHeaders, ...resultsRows];
  const sheet = XLSX.utils.aoa_to_sheet(resultsAOA);
  const csvData = XLSX.utils.sheet_to_csv(sheet);

  // Prefix UTF-8 Byte Order Mark
  return "\uFEFF" + csvData;
}

/**
 * Builds Class Summary Excel Buffer:
 * Exports one row per subject and test with attempts and average percent.
 */
export function buildClassSummaryExcelBuffer(
  classGrade: number,
  rows: ClassSummaryExportRow[]
): Buffer {
  const workbook = XLSX.utils.book_new();

  const headers = [
    "Class",
    "Subject",
    "Test Title",
    "Questions",
    "Marks / Q",
    "Attempts",
    "Avg Score",
    "Avg Percent",
    "Highest Score",
    "Lowest Score",
  ];

  const aoaRows = rows.map((r) => [
    `Class ${r.classGrade}`,
    r.subjectName,
    r.testTitle,
    r.totalQuestions,
    r.marksPerQuestion,
    r.attemptsCount,
    Number(r.averageScore.toFixed(1)),
    Number(r.averagePercent.toFixed(1)),
    r.highestScore,
    r.lowestScore,
  ]);

  const dataAOA = [headers, ...aoaRows];
  const sheet = XLSX.utils.aoa_to_sheet(dataAOA);
  applyWorksheetFormatting(sheet, dataAOA);

  XLSX.utils.book_append_sheet(workbook, sheet, `Class ${classGrade} Summary`);

  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

/**
 * Builds Class Summary CSV with UTF-8 BOM.
 */
export function buildClassSummaryCsvWithBOM(
  rows: ClassSummaryExportRow[]
): string {
  const headers = [
    "Class",
    "Subject",
    "Test Title",
    "Questions",
    "Marks / Q",
    "Attempts",
    "Avg Score",
    "Avg Percent",
    "Highest Score",
    "Lowest Score",
  ];

  const aoaRows = rows.map((r) => [
    `Class ${r.classGrade}`,
    r.subjectName,
    r.testTitle,
    r.totalQuestions,
    r.marksPerQuestion,
    r.attemptsCount,
    r.averageScore.toFixed(1),
    r.averagePercent.toFixed(1),
    r.highestScore,
    r.lowestScore,
  ]);

  const dataAOA = [headers, ...aoaRows];
  const sheet = XLSX.utils.aoa_to_sheet(dataAOA);
  const csv = XLSX.utils.sheet_to_csv(sheet);

  return "\uFEFF" + csv;
}
