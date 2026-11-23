import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * Model simulating database constraint and attempt validation logic.
 */
class AttemptManager {
  private attempts: Map<string, { id: string; testId: string; studentId: string }> = new Map();

  /**
   * Generates a compound key representing UNIQUE(test_id, student_id)
   */
  private makeKey(testId: string, studentId: string): string {
    return `${testId}::${studentId}`;
  }

  public canAttempt(testId: string, studentId: string): boolean {
    return !this.attempts.has(this.makeKey(testId, studentId));
  }

  public submitAttempt(
    testId: string,
    studentId: string,
    isPublished: boolean = true
  ): { success: boolean; attemptId?: string; error?: string } {
    if (!isPublished) {
      return { success: false, error: "Test is not published and cannot be submitted" };
    }

    const key = this.makeKey(testId, studentId);
    if (this.attempts.has(key)) {
      return {
        success: false,
        error: "You have already submitted an attempt for this test",
      };
    }

    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.attempts.set(key, { id: attemptId, testId, studentId });
    return { success: true, attemptId };
  }

  public getAttempt(testId: string, studentId: string) {
    return this.attempts.get(this.makeKey(testId, studentId)) || null;
  }
}

describe("TestHub One-Attempt Rule Enforcement", () => {
  it("allows a student to submit their first attempt for a published test", () => {
    const manager = new AttemptManager();
    const testId = "test-101";
    const studentId = "student-abc";

    assert.strictEqual(manager.canAttempt(testId, studentId), true);
    const result = manager.submitAttempt(testId, studentId, true);

    assert.strictEqual(result.success, true);
    assert.ok(result.attemptId);
    assert.strictEqual(manager.canAttempt(testId, studentId), false);
  });

  it("strictly rejects a duplicate submission from the same student for the same test", () => {
    const manager = new AttemptManager();
    const testId = "test-101";
    const studentId = "student-abc";

    // First attempt succeeds
    const firstSubmission = manager.submitAttempt(testId, studentId, true);
    assert.strictEqual(firstSubmission.success, true);

    // Second attempt must fail with clear duplicate error
    const secondSubmission = manager.submitAttempt(testId, studentId, true);
    assert.strictEqual(secondSubmission.success, false);
    assert.strictEqual(
      secondSubmission.error,
      "You have already submitted an attempt for this test"
    );
  });

  it("allows the same student to attempt a different test", () => {
    const manager = new AttemptManager();
    const studentId = "student-abc";
    const test1 = "test-101";
    const test2 = "test-102";

    const sub1 = manager.submitAttempt(test1, studentId, true);
    const sub2 = manager.submitAttempt(test2, studentId, true);

    assert.strictEqual(sub1.success, true);
    assert.strictEqual(sub2.success, true);
    assert.notStrictEqual(sub1.attemptId, sub2.attemptId);
  });

  it("allows multiple different students to attempt the same test independently", () => {
    const manager = new AttemptManager();
    const testId = "test-101";
    const student1 = "student-1";
    const student2 = "student-2";

    const sub1 = manager.submitAttempt(testId, student1, true);
    const sub2 = manager.submitAttempt(testId, student2, true);

    assert.strictEqual(sub1.success, true);
    assert.strictEqual(sub2.success, true);
  });

  it("blocks submission if the test is not published", () => {
    const manager = new AttemptManager();
    const testId = "test-draft";
    const studentId = "student-abc";

    const result = manager.submitAttempt(testId, studentId, false);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, "Test is not published and cannot be submitted");
  });
});
