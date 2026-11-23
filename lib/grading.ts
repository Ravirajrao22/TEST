/**
 * Pure grading logic utility for TestHub.
 * Matches the PostgreSQL submit_attempt RPC grading rules exactly.
 */

export interface GradingInput {
  correct: number;
  wrong: number;
  unanswered: number;
  marksPerQuestion: number;
  negativeMarks?: number;
}

export interface GradingResult {
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  marksPerQuestion: number;
  negativeMarks: number;
  maxScore: number;
  rawScore: number;
  finalScore: number;
  percentage: number;
}

/**
 * Calculates score and statistics from answer counts.
 */
export function calculateGrading({
  correct,
  wrong,
  unanswered,
  marksPerQuestion,
  negativeMarks = 0,
}: GradingInput): GradingResult {
  const totalQuestions = correct + wrong + unanswered;
  const maxScore = totalQuestions * marksPerQuestion;
  const positiveMarks = correct * marksPerQuestion;
  const penalty = wrong * negativeMarks;
  const rawScore = positiveMarks - penalty;

  // Round score to 2 decimal places to avoid floating point precision artifacts
  const finalScore = Math.round(rawScore * 100) / 100;

  const percentage =
    maxScore > 0 ? Math.round(((finalScore > 0 ? finalScore : 0) / maxScore) * 1000) / 10 : 0;

  return {
    totalQuestions,
    correct,
    wrong,
    unanswered,
    marksPerQuestion,
    negativeMarks,
    maxScore,
    rawScore,
    finalScore,
    percentage,
  };
}

/**
 * Checks if a candidate passed based on their percentage and pass mark percentage.
 */
export function isPassed(percentage: number, passMarkPercent: number = 33): boolean {
  return percentage >= passMarkPercent;
}

export interface QuestionGradingSpec {
  id: string;
  correctOption: "A" | "B" | "C" | "D";
}

/**
 * Grades a set of questions against student submissions.
 */
export function evaluateStudentSubmission(
  questions: QuestionGradingSpec[],
  answers: Record<string, string | null | undefined>,
  marksPerQuestion: number = 1,
  negativeMarks: number = 0
): GradingResult & {
  perQuestion: {
    questionId: string;
    selected: string | null;
    correct: "A" | "B" | "C" | "D";
    isCorrect: boolean;
    isUnanswered: boolean;
  }[];
} {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  const perQuestion = questions.map((q) => {
    const rawChoice = answers[q.id];
    const selected =
      rawChoice && ["A", "B", "C", "D"].includes(rawChoice.toUpperCase().trim())
        ? (rawChoice.toUpperCase().trim() as "A" | "B" | "C" | "D")
        : null;

    if (!selected) {
      unanswered += 1;
      return {
        questionId: q.id,
        selected: null,
        correct: q.correctOption,
        isCorrect: false,
        isUnanswered: true,
      };
    }

    const isMatch = selected === q.correctOption;
    if (isMatch) {
      correct += 1;
    } else {
      wrong += 1;
    }

    return {
      questionId: q.id,
      selected,
      correct: q.correctOption,
      isCorrect: isMatch,
      isUnanswered: false,
    };
  });

  const summary = calculateGrading({
    correct,
    wrong,
    unanswered,
    marksPerQuestion,
    negativeMarks,
  });

  return {
    ...summary,
    perQuestion,
  };
}
