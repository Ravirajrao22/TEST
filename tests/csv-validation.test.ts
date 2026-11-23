import { describe, it } from "node:test";
import assert from "node:assert";
import {
  validateAndParseQuestionsCsv,
  parseCsvRows,
} from "../lib/csv.ts";

describe("TestHub CSV Import Validation", () => {
  it("parses and validates a clean 7-column CSV with questions, options, and explanation", () => {
    const csv = `question_text,option_a,option_b,option_c,option_d,correct_option,explanation
"What is the SI unit of electric current?","Volt","Ampere","Ohm","Watt","B","Ampere is the SI unit named after Andre-Marie Ampere."
"Which gas is evolved when zinc reacts with dilute sulphuric acid?","Oxygen","Hydrogen","Nitrogen","Carbon dioxide","B","Zinc displaces hydrogen from dilute sulphuric acid."`;

    const result = validateAndParseQuestionsCsv(csv);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.questions.length, 2);
    assert.strictEqual(result.errors.length, 0);

    const q1 = result.questions[0];
    assert.strictEqual(q1.questionText, "What is the SI unit of electric current?");
    assert.strictEqual(q1.optionA, "Volt");
    assert.strictEqual(q1.optionB, "Ampere");
    assert.strictEqual(q1.correctOption, "B");
    assert.strictEqual(
      q1.explanation,
      "Ampere is the SI unit named after Andre-Marie Ampere."
    );
  });

  it("handles UTF-8 characters properly for Hindi and Punjabi syllabus questions", () => {
    const csvWithBOM = `\uFEFFquestion_text,option_a,option_b,option_c,option_d,correct_option,explanation
"प्रकाश संश्लेषण किसमें होता है?","क्लोरोप्लास्ट","माइटोकॉन्ड्रिया","राइबोसोम","केंद्रक","A","प्रकाश संश्लेषण पौधों की पत्तियों के क्लोरोप्लास्ट में होता है।"
"ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਦਾ ਜਨਮ ਕਦੋਂ ਹੋਇਆ ਸੀ?","1469","1539","1604","1699","A","ਸ੍ਰੀ ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਦਾ ਜਨਮ 1469 ਈਸਵੀ ਵਿੱਚ ਹੋਇਆ ਸੀ।"`;

    const result = validateAndParseQuestionsCsv(csvWithBOM);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.questions.length, 2);
    assert.strictEqual(result.questions[0].optionA, "क्लोरोप्लास्ट");
    assert.strictEqual(result.questions[1].questionText, "ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਦਾ ਜਨਮ ਕਦੋਂ ਹੋਇਆ ਸੀ?");
    assert.strictEqual(result.questions[1].correctOption, "A");
  });

  it("correctly handles commas and double quotes within question text", () => {
    const csv = `"In reaction: 2H2 + O2 -> 2H2O, what is the ratio of H to O?","2:1","1:2","1:1","4:1","A","Water maintains a 2:1 atomic ratio."`;

    const result = validateAndParseQuestionsCsv(csv);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.questions.length, 1);
    assert.strictEqual(
      result.questions[0].questionText,
      "In reaction: 2H2 + O2 -> 2H2O, what is the ratio of H to O?"
    );
  });

  it("rejects rows with invalid or missing correct_option", () => {
    const csv = `question_text,option_a,option_b,option_c,option_d,correct_option,explanation
"Valid question?","A1","B1","C1","D1","X","Invalid option X"
"Another question?","A2","B2","C2","D2","","Missing option"`;

    const result = validateAndParseQuestionsCsv(csv);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.questions.length, 0);
    assert.strictEqual(result.errors.length, 2);
    assert.ok(result.errors[0].message.includes("Invalid correct option 'X'"));
    assert.ok(result.errors[1].message.includes("Invalid correct option ''"));
  });

  it("rejects rows missing required options", () => {
    const csv = `question_text,option_a,option_b,option_c,option_d,correct_option
"Question with missing option D?","Option A","Option B","Option C","","A"`;

    const result = validateAndParseQuestionsCsv(csv);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes("All four options (A, B, C, D) must have non-empty text"));
  });

  it("rejects completely empty CSV input gracefully", () => {
    const result = validateAndParseQuestionsCsv("");
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errors[0].message, "The CSV file is empty.");
  });
});
