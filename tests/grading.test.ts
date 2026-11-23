import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateGrading,
  evaluateStudentSubmission,
  isPassed,
  type QuestionGradingSpec,
} from "../lib/grading.ts";

describe("TestHub Grading Engine", () => {
  it("grades a perfect submission with standard 1 mark per question correctly", () => {
    const result = calculateGrading({
      correct: 10,
      wrong: 0,
      unanswered: 0,
      marksPerQuestion: 1,
      negativeMarks: 0,
    });

    assert.strictEqual(result.totalQuestions, 10);
    assert.strictEqual(result.correct, 10);
    assert.strictEqual(result.wrong, 0);
    assert.strictEqual(result.unanswered, 0);
    assert.strictEqual(result.finalScore, 10);
    assert.strictEqual(result.maxScore, 10);
    assert.strictEqual(result.percentage, 100);
    assert.strictEqual(isPassed(result.percentage, 33), true);
  });

  it("calculates marks with negative marking penalty correctly", () => {
    // 10 questions, 2 marks each, -0.5 for each wrong answer
    // Student: 6 correct, 2 wrong, 2 unanswered
    // Expected positive: 6 * 2 = 12
    // Expected penalty: 2 * 0.5 = 1.0
    // Expected total score: 12 - 1.0 = 11.0
    // Max score: 10 * 2 = 20
    // Percentage: (11.0 / 20) * 100 = 55.0%
    const result = calculateGrading({
      correct: 6,
      wrong: 2,
      unanswered: 2,
      marksPerQuestion: 2,
      negativeMarks: 0.5,
    });

    assert.strictEqual(result.totalQuestions, 10);
    assert.strictEqual(result.correct, 6);
    assert.strictEqual(result.wrong, 2);
    assert.strictEqual(result.unanswered, 2);
    assert.strictEqual(result.finalScore, 11);
    assert.strictEqual(result.maxScore, 20);
    assert.strictEqual(result.percentage, 55);
    assert.strictEqual(isPassed(result.percentage, 33), true);
  });

  it("handles a completely skipped test (all unanswered) without penalties", () => {
    const result = calculateGrading({
      correct: 0,
      wrong: 0,
      unanswered: 10,
      marksPerQuestion: 4,
      negativeMarks: 1,
    });

    assert.strictEqual(result.correct, 0);
    assert.strictEqual(result.wrong, 0);
    assert.strictEqual(result.unanswered, 10);
    assert.strictEqual(result.finalScore, 0);
    assert.strictEqual(result.maxScore, 40);
    assert.strictEqual(result.percentage, 0);
    assert.strictEqual(isPassed(result.percentage, 33), false);
  });

  it("handles negative scores correctly when incorrect answers exceed correct points", () => {
    // 5 questions, 1 mark per question, -1 negative marks
    // 1 correct (+1), 4 wrong (-4) -> rawScore = -3
    const result = calculateGrading({
      correct: 1,
      wrong: 4,
      unanswered: 0,
      marksPerQuestion: 1,
      negativeMarks: 1,
    });

    assert.strictEqual(result.finalScore, -3);
    assert.strictEqual(result.percentage, 0); // clamped percentage for visual display
    assert.strictEqual(isPassed(result.percentage, 33), false);
  });

  it("evaluates student option selections against question keys accurately", () => {
    const questions: QuestionGradingSpec[] = [
      { id: "q1", correctOption: "A" },
      { id: "q2", correctOption: "B" },
      { id: "q3", correctOption: "C" },
      { id: "q4", correctOption: "D" },
    ];

    const studentAnswers = {
      q1: "A", // Correct
      q2: "C", // Wrong (correct is B)
      q3: null, // Skipped
      // q4 omitted (unanswered)
    };

    const evaluated = evaluateStudentSubmission(
      questions,
      studentAnswers,
      2.5, // 2.5 marks per question
      0.5 // 0.5 negative marks
    );

    assert.strictEqual(evaluated.totalQuestions, 4);
    assert.strictEqual(evaluated.correct, 1);
    assert.strictEqual(evaluated.wrong, 1);
    assert.strictEqual(evaluated.unanswered, 2);
    // Score: 1 * 2.5 - 1 * 0.5 = 2.0
    assert.strictEqual(evaluated.finalScore, 2);
    assert.strictEqual(evaluated.maxScore, 10);
    assert.strictEqual(evaluated.percentage, 20);

    // Question level checks
    assert.strictEqual(evaluated.perQuestion[0].isCorrect, true);
    assert.strictEqual(evaluated.perQuestion[1].isCorrect, false);
    assert.strictEqual(evaluated.perQuestion[2].isUnanswered, true);
    assert.strictEqual(evaluated.perQuestion[3].isUnanswered, true);
  });
});
