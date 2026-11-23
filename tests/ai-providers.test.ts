import { describe, it } from "node:test";
import assert from "node:assert";
import { parseAndValidateMCQs, getAvailableAIProviders } from "../lib/ai/providers.ts";

describe("TestHub AI Multi-Provider & MCQ Parser", () => {
  it("parses and validates standard JSON object with questions array", () => {
    const raw = JSON.stringify({
      questions: [
        {
          question: "What is the speed of light in vacuum?",
          option_a: "3 x 10^8 m/s",
          option_b: "3 x 10^6 m/s",
          option_c: "3 x 10^5 km/s",
          option_d: "Both A and C",
          correct: "D",
          explanation: "3 x 10^8 m/s is equivalent to 3 x 10^5 km/s.",
        },
      ],
    });

    const result = parseAndValidateMCQs(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].question, "What is the speed of light in vacuum?");
    assert.strictEqual(result[0].correct, "D");
    assert.strictEqual(result[0].option_a, "3 x 10^8 m/s");
  });

  it("handles markdown code block wrapping (```json ... ```)", () => {
    const raw = "```json\n" +
      JSON.stringify({
        questions: [
          {
            question: "Which organelle is the powerhouse of the cell?",
            option_a: "Ribosome",
            option_b: "Mitochondria",
            option_c: "Nucleus",
            option_d: "Endoplasmic Reticulum",
            correct: "B",
            explanation: "Mitochondria produce cellular ATP.",
          },
        ],
      }) +
      "\n```";

    const result = parseAndValidateMCQs(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].correct, "B");
    assert.strictEqual(result[0].option_b, "Mitochondria");
  });

  it("handles raw JSON array response directly", () => {
    const raw = JSON.stringify([
      {
        question: "What is the chemical formula of water?",
        option_a: "H2O",
        option_b: "CO2",
        option_c: "NaCl",
        option_d: "CH4",
        correct: "A",
        explanation: "Two hydrogen atoms and one oxygen atom.",
      },
    ]);

    const result = parseAndValidateMCQs(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].question, "What is the chemical formula of water?");
    assert.strictEqual(result[0].correct, "A");
  });

  it("normalizes alternative key variations (optionA, A, options array, lowercase correct)", () => {
    const raw = JSON.stringify({
      questions: [
        {
          q: "What is the capital of Punjab?",
          options: ["Chandigarh", "Amritsar", "Ludhiana", "Patiala"],
          correctOption: "a",
          reason: "Chandigarh serves as the shared capital of Punjab and Haryana.",
        },
      ],
    });

    const result = parseAndValidateMCQs(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].question, "What is the capital of Punjab?");
    assert.strictEqual(result[0].option_a, "Chandigarh");
    assert.strictEqual(result[0].option_b, "Amritsar");
    assert.strictEqual(result[0].correct, "A");
  });

  it("recovers from trailing commas in JSON output", () => {
    const rawWithTrailingComma = `{
      "questions": [
        {
          "question": "What is the atomic number of Carbon?",
          "option_a": "6",
          "option_b": "12",
          "option_c": "14",
          "option_d": "8",
          "correct": "A",
          "explanation": "Carbon has 6 protons in its nucleus.",
        },
      ],
    }`;

    const result = parseAndValidateMCQs(rawWithTrailingComma);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].option_a, "6");
    assert.strictEqual(result[0].correct, "A");
  });

  it("rejects invalid questions missing required options or invalid correct key", () => {
    const raw = JSON.stringify({
      questions: [
        {
          question: "Invalid question?",
          option_a: "Option A",
          option_b: "", // empty option
          option_c: "Option C",
          option_d: "Option D",
          correct: "A",
        },
        {
          question: "Invalid correct option?",
          option_a: "A",
          option_b: "B",
          option_c: "C",
          option_d: "D",
          correct: "E", // invalid key
        },
      ],
    });

    const result = parseAndValidateMCQs(raw);
    assert.strictEqual(result.length, 0);
  });

  it("correctly evaluates provider precedence and explicit AI_PROVIDER choice", () => {
    const originalGroq = process.env.GROQ_API_KEY;
    const originalPref = process.env.AI_PROVIDER;

    try {
      process.env.GROQ_API_KEY = "gsk_test123";
      process.env.AI_PROVIDER = "groq";

      const status = getAvailableAIProviders();
      assert.strictEqual(status.availableProviders.includes("groq"), true);
      assert.strictEqual(status.primaryProvider, "groq");
    } finally {
      process.env.GROQ_API_KEY = originalGroq;
      process.env.AI_PROVIDER = originalPref;
    }
  });
});
