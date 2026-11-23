/**
 * CSV Import Parser & Validator for TestHub MCQ Questions.
 */

export interface ParsedCsvQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
}

export interface CsvValidationIssue {
  rowNumber: number;
  field?: string;
  message: string;
}

export interface CsvParseResult {
  success: boolean;
  questions: ParsedCsvQuestion[];
  errors: CsvValidationIssue[];
  totalRowsProcessed: number;
}

/**
 * Splits CSV content into rows and cells supporting quotes and escaped quotes.
 */
export function parseCsvRows(csvText: string): string[][] {
  // Strip UTF-8 Byte Order Mark if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip LF after CR
      }
      currentRow.push(currentCell.trim());
      // Only push non-empty rows
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Validates and converts parsed rows into typed questions.
 */
export function validateAndParseQuestionsCsv(csvText: string): CsvParseResult {
  const rows = parseCsvRows(csvText);
  const questions: ParsedCsvQuestion[] = [];
  const errors: CsvValidationIssue[] = [];

  if (rows.length === 0) {
    return {
      success: false,
      questions: [],
      errors: [{ rowNumber: 0, message: "The CSV file is empty." }],
      totalRowsProcessed: 0,
    };
  }

  // Check if first row is header
  let startIndex = 0;
  const firstRow = rows[0];
  const isHeader =
    firstRow[0]?.toLowerCase().includes("question") ||
    firstRow[1]?.toLowerCase().includes("option");

  if (isHeader) {
    startIndex = 1;
  }

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    const rowNumber = r + 1;

    // Must have at least 6 columns (question, optA, optB, optC, optD, correct)
    if (row.length < 6) {
      errors.push({
        rowNumber,
        message: `Row has ${row.length} columns, expected at least 6 (Question, Option A, Option B, Option C, Option D, Correct Option).`,
      });
      continue;
    }

    const questionText = row[0]?.trim();
    const optionA = row[1]?.trim();
    const optionB = row[2]?.trim();
    const optionC = row[3]?.trim();
    const optionD = row[4]?.trim();
    const rawCorrect = row[5]?.trim().toUpperCase();
    const explanation = row[6]?.trim() || undefined;

    if (!questionText) {
      errors.push({
        rowNumber,
        field: "question_text",
        message: "Question statement cannot be empty.",
      });
    }

    if (!optionA || !optionB || !optionC || !optionD) {
      errors.push({
        rowNumber,
        field: "options",
        message: "All four options (A, B, C, D) must have non-empty text.",
      });
    }

    if (!rawCorrect || !["A", "B", "C", "D"].includes(rawCorrect)) {
      errors.push({
        rowNumber,
        field: "correct_option",
        message: `Invalid correct option '${rawCorrect || ""}'. Must be exactly A, B, C, or D.`,
      });
    }

    // If no errors for this row, collect valid question
    if (
      questionText &&
      optionA &&
      optionB &&
      optionC &&
      optionD &&
      ["A", "B", "C", "D"].includes(rawCorrect)
    ) {
      questions.push({
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption: rawCorrect as "A" | "B" | "C" | "D",
        explanation,
      });
    }
  }

  return {
    success: errors.length === 0 && questions.length > 0,
    questions,
    errors,
    totalRowsProcessed: rows.length - (isHeader ? 1 : 0),
  };
}
