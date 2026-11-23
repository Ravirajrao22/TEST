import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * Model simulating get_attempt_result(attempt_id) dynamic security logic.
 */
interface TestRecord {
  id: string;
  title: string;
  showResult: boolean;
  marksPerQuestion: number;
  negativeMarks: number;
}

interface AttemptRecord {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  submittedAt: string;
}

interface StoredQuestion {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
}

class AttemptResultService {
  private tests: Map<string, TestRecord> = new Map();
  private attempts: Map<string, AttemptRecord> = new Map();
  private questions: Map<string, StoredQuestion[]> = new Map();
  private studentAnswers: Map<string, Record<string, "A" | "B" | "C" | "D" | null>> = new Map();

  public seedTest(test: TestRecord, questions: StoredQuestion[]) {
    this.tests.set(test.id, test);
    this.questions.set(test.id, questions);
  }

  public seedAttempt(
    attempt: AttemptRecord,
    answers: Record<string, "A" | "B" | "C" | "D" | null>
  ) {
    this.attempts.set(attempt.id, attempt);
    this.studentAnswers.set(attempt.id, answers);
  }

  public updateTestVisibility(testId: string, showResult: boolean) {
    const test = this.tests.get(testId);
    if (test) {
      test.showResult = showResult;
    }
  }

  /**
   * Replicates get_attempt_result database function behavior
   */
  public getAttemptResult(
    attemptId: string,
    callerId: string,
    isAdmin: boolean = false
  ) {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      throw new Error("Attempt not found");
    }

    if (attempt.studentId !== callerId && !isAdmin) {
      throw new Error("Access denied: You can only view your own test attempt");
    }

    const test = this.tests.get(attempt.testId);
    if (!test) {
      throw new Error("Associated test not found");
    }

    const isVisible = test.showResult || isAdmin;

    if (!isVisible) {
      // Hidden state: zero scores, answers, or question data returned
      return {
        isVisible: false,
        testTitle: test.title,
        studentName: attempt.studentName,
        submittedAt: attempt.submittedAt,
        score: null,
        totalQuestions: null,
        correct: null,
        wrong: null,
        unanswered: null,
        questions: [],
      };
    }

    // Visible state: full scorecard and question review returned
    const testQuestions = this.questions.get(test.id) || [];
    const answers = this.studentAnswers.get(attempt.id) || {};

    const reviewQuestions = testQuestions.map((q) => ({
      questionId: q.id,
      questionText: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      studentSelectedOption: answers[q.id] || null,
      correctOption: q.correctOption,
      isCorrect: (answers[q.id] || null) === q.correctOption,
      explanation: q.explanation,
    }));

    return {
      isVisible: true,
      testTitle: test.title,
      studentName: attempt.studentName,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarks: test.negativeMarks,
      totalQuestions: attempt.totalQuestions,
      correct: attempt.correct,
      wrong: attempt.wrong,
      unanswered: attempt.unanswered,
      questions: reviewQuestions,
    };
  }
}

describe("TestHub Dynamic Result Visibility Control", () => {
  const service = new AttemptResultService();
  const testId = "test-science-10";
  const studentId = "student-rahul";
  const otherStudentId = "student-priya";
  const attemptId = "att-1001";

  service.seedTest(
    {
      id: testId,
      title: "Class 10 Chemical Reactions",
      showResult: false, // Initially hidden
      marksPerQuestion: 2,
      negativeMarks: 0.5,
    },
    [
      {
        id: "q1",
        text: "What is the chemical formula of water?",
        optionA: "H2O",
        optionB: "CO2",
        optionC: "NaCl",
        optionD: "CH4",
        correctOption: "A",
        explanation: "Water consists of two hydrogen atoms and one oxygen atom.",
      },
    ]
  );

  service.seedAttempt(
    {
      id: attemptId,
      testId,
      studentId,
      studentName: "Rahul Sharma",
      score: 2,
      totalQuestions: 1,
      correct: 1,
      wrong: 0,
      unanswered: 0,
      submittedAt: new Date().toISOString(),
    },
    { q1: "A" }
  );

  it("withholds score and question details when test.show_result is false", () => {
    const result = service.getAttemptResult(attemptId, studentId, false);

    assert.strictEqual(result.isVisible, false);
    assert.strictEqual(result.score, null);
    assert.strictEqual(result.totalQuestions, null);
    assert.strictEqual(result.correct, null);
    assert.strictEqual(result.questions.length, 0);
    assert.strictEqual(result.studentName, "Rahul Sharma");
  });

  it("blocks another student from reading Rahul's attempt", () => {
    assert.throws(
      () => service.getAttemptResult(attemptId, otherStudentId, false),
      /Access denied/
    );
  });

  it("allows admin to inspect full scorecard even when show_result is false", () => {
    const adminResult = service.getAttemptResult(attemptId, "admin-user", true);

    assert.strictEqual(adminResult.isVisible, true);
    assert.strictEqual(adminResult.score, 2);
    assert.strictEqual(adminResult.questions.length, 1);
    assert.strictEqual(adminResult.questions[0].correctOption, "A");
  });

  it("dynamically reveals score and answers as soon as admin switches show_result to true", () => {
    // Admin toggles show_result on
    service.updateTestVisibility(testId, true);

    const studentResult = service.getAttemptResult(attemptId, studentId, false);

    assert.strictEqual(studentResult.isVisible, true);
    assert.strictEqual(studentResult.score, 2);
    assert.strictEqual(studentResult.correct, 1);
    assert.strictEqual(studentResult.questions.length, 1);
    assert.strictEqual(studentResult.questions[0].studentSelectedOption, "A");
    assert.strictEqual(studentResult.questions[0].correctOption, "A");
    assert.strictEqual(studentResult.questions[0].isCorrect, true);
    assert.strictEqual(
      studentResult.questions[0].explanation,
      "Water consists of two hydrogen atoms and one oxygen atom."
    );
  });
});
