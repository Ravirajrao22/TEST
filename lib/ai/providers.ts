import { generatedMCQSchema, type GeneratedMCQ } from "../validations/ai.ts";
import { getGeminiClient } from "./gemini.ts";

export type AIProvider = "groq" | "openrouter" | "openai" | "gemini";

export interface AIProviderStatus {
  availableProviders: AIProvider[];
  primaryProvider: AIProvider | null;
}

/**
 * Helper to ensure no API call hangs indefinitely
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s`));
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise,
  ]);
}

/**
 * Returns available AI providers based on present environment variables
 */
export function getAvailableAIProviders(): AIProviderStatus {
  const providers: AIProvider[] = [];

  if (process.env.GROQ_API_KEY?.trim()) {
    providers.push("groq");
  }
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    providers.push("openrouter");
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    providers.push("openai");
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    providers.push("gemini");
  }

  const explicitPreference = process.env.AI_PROVIDER?.trim().toLowerCase() as AIProvider | undefined;
  let primaryProvider: AIProvider | null = null;

  if (explicitPreference && providers.includes(explicitPreference)) {
    primaryProvider = explicitPreference;
  } else if (providers.length > 0) {
    primaryProvider = providers[0];
  }

  return {
    availableProviders: providers,
    primaryProvider,
  };
}

/**
 * Parses and strictly validates AI raw text output into GeneratedMCQ[]
 * Handles markdown code fences, trailing commas, different object wrappers, and key case variations.
 */
export function parseAndValidateMCQs(rawText: string): GeneratedMCQ[] {
  if (!rawText || typeof rawText !== "string") return [];

  // Strip markdown code fences if present
  let cleanText = rawText
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  // Find start and end of JSON payload if there's pre/post text
  const firstBrace = cleanText.indexOf("{");
  const firstBracket = cleanText.indexOf("[");

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleanText.lastIndexOf("}");
    if (lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = cleanText.lastIndexOf("]");
    if (lastBracket > firstBracket) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanText);
  } catch {
    // Attempt fallback cleanup for common JSON issues (e.g. trailing commas before } or ])
    try {
      const fixedJson = cleanText.replace(/,\s*([}\]])/g, "$1");
      parsed = JSON.parse(fixedJson);
    } catch {
      console.warn("Failed to parse AI JSON response. Raw snippet:", rawText.slice(0, 200));
      return [];
    }
  }

  // Extract array of questions from various possible structures
  let rawList: any[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.questions)) {
      rawList = parsed.questions;
    } else if (Array.isArray(parsed.mcqs)) {
      rawList = parsed.mcqs;
    } else if (Array.isArray(parsed.data)) {
      rawList = parsed.data;
    } else {
      const values = Object.values(parsed);
      if (values.length > 0 && typeof values[0] === "object" && !Array.isArray(values[0])) {
        rawList = values;
      } else {
        rawList = [parsed];
      }
    }
  }

  const validQuestions: GeneratedMCQ[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;

    const normalizedItem = {
      question: String(item.question || item.q || item.questionText || item.title || "").trim(),
      option_a: String(
        item.option_a ?? item.optionA ?? item.A ?? item.a ?? (Array.isArray(item.options) ? item.options[0] : "")
      ).trim(),
      option_b: String(
        item.option_b ?? item.optionB ?? item.B ?? item.b ?? (Array.isArray(item.options) ? item.options[1] : "")
      ).trim(),
      option_c: String(
        item.option_c ?? item.optionC ?? item.C ?? item.c ?? (Array.isArray(item.options) ? item.options[2] : "")
      ).trim(),
      option_d: String(
        item.option_d ?? item.optionD ?? item.D ?? item.d ?? (Array.isArray(item.options) ? item.options[3] : "")
      ).trim(),
      correct: String(
        item.correct ?? item.correct_option ?? item.correctOption ?? item.answer ?? "A"
      ).trim().toUpperCase(),
      explanation: String(item.explanation ?? item.reason ?? item.solution ?? "").trim(),
    };

    const result = generatedMCQSchema.safeParse(normalizedItem);
    if (result.success) {
      validQuestions.push(result.data);
    }
  }

  return validQuestions;
}

const SYSTEM_INSTRUCTION =
  "You are an expert exam paper setter and CBSE/NCERT curriculum teacher in India. " +
  "You generate high-quality multiple choice questions (MCQs) for school students. " +
  "You must respond ONLY with a valid JSON object matching this schema: " +
  '{"questions": [{"question": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct": "A" | "B" | "C" | "D", "explanation": "..."}]}. ' +
  "Return pure JSON only without markdown formatting.";

/**
 * 1. Groq Provider (100% Free, 14,400 req/day, blazing fast ~1.5s, 0 queue spikes)
 */
async function callGroqBatch(prompt: string): Promise<GeneratedMCQ[]> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return [];

  const models = [
    process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ];

  for (const model of models) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(12000), // Max 12s timeout
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Groq (${model}) returned status ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const questions = parseAndValidateMCQs(rawText);
      if (questions.length > 0) {
        return questions;
      }
    } catch (err: any) {
      console.warn(`Groq (${model}) request failed: ${err?.message}`);
    }
  }

  return [];
}

/**
 * 2. OpenRouter Provider (Universal access to Llama 3.3, Gemini, DeepSeek, etc.)
 */
async function callOpenRouterBatch(prompt: string): Promise<GeneratedMCQ[]> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return [];

  const models = [
    process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct",
    "google/gemini-2.0-flash-001",
    "deepseek/deepseek-chat",
  ];

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://testhub.coaching",
          "X-Title": "TestHub",
        },
        signal: AbortSignal.timeout(12000), // Max 12s timeout
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`OpenRouter (${model}) returned status ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const questions = parseAndValidateMCQs(rawText);
      if (questions.length > 0) {
        return questions;
      }
    } catch (err: any) {
      console.warn(`OpenRouter (${model}) request failed: ${err?.message}`);
    }
  }

  return [];
}

/**
 * 3. OpenAI Provider (GPT-4o-mini / GPT-4o)
 */
async function callOpenAIBatch(prompt: string): Promise<GeneratedMCQ[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return [];

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12000), // Max 12s timeout
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`OpenAI returned status ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || "";
    return parseAndValidateMCQs(rawText);
  } catch (err: any) {
    console.warn(`OpenAI request failed: ${err?.message}`);
    return [];
  }
}

/**
 * 4. Google Gemini Provider (with strict 10s timeout and fast-fail on 429 quota exhaustion)
 */
async function callGeminiBatch(prompt: string): Promise<GeneratedMCQ[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return [];

  let gemini: ReturnType<typeof getGeminiClient> | null = null;
  try {
    gemini = getGeminiClient();
  } catch {
    return [];
  }

  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
  ];

  for (const model of candidateModels) {
    try {
      const generatePromise = gemini.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      // Strict 10-second timeout so a hanging Google call never delays the server
      const response = await withTimeout(generatePromise, 10000, `Gemini (${model})`);

      const text = response.text?.trim() || "";
      if (!text) continue;

      const questions = parseAndValidateMCQs(text);
      if (questions.length > 0) {
        return questions;
      }
    } catch (err: any) {
      const msg = err?.message || "";
      console.warn(`Gemini model ${model} unavailable (${msg}).`);

      // Fast-fail: If account quota is exhausted, no other Gemini model will succeed
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        console.warn("Gemini account quota exhausted. Aborting remaining Gemini models immediately.");
        break;
      }
    }
  }

  return [];
}

/**
 * Master multi-provider execution with automatic cascading failover.
 * Prioritizes fast, high-quota providers (Groq > OpenRouter > OpenAI > Gemini).
 */
export async function generateMCQBatchWithFallback(prompt: string): Promise<{
  questions: GeneratedMCQ[];
  providerUsed: AIProvider;
}> {
  const { availableProviders, primaryProvider } = getAvailableAIProviders();

  if (availableProviders.length === 0) {
    throw new Error(
      "No AI API key is configured. Please add GROQ_API_KEY (recommended, 100% free), OPENROUTER_API_KEY, or GEMINI_API_KEY to your environment variables."
    );
  }

  // Build the prioritized provider execution order
  const orderedProviders: AIProvider[] = [];
  if (primaryProvider) {
    orderedProviders.push(primaryProvider);
  }
  for (const p of availableProviders) {
    if (!orderedProviders.includes(p)) {
      orderedProviders.push(p);
    }
  }

  const errors: string[] = [];

  for (const provider of orderedProviders) {
    try {
      let questions: GeneratedMCQ[] = [];

      switch (provider) {
        case "groq":
          questions = await callGroqBatch(prompt);
          break;
        case "openrouter":
          questions = await callOpenRouterBatch(prompt);
          break;
        case "openai":
          questions = await callOpenAIBatch(prompt);
          break;
        case "gemini":
          questions = await callGeminiBatch(prompt);
          break;
      }

      if (questions.length > 0) {
        return {
          questions,
          providerUsed: provider,
        };
      } else {
        errors.push(`${provider}: generated 0 valid questions`);
      }
    } catch (err: any) {
      console.warn(`Provider ${provider} failed: ${err?.message}`);
      errors.push(`${provider}: ${err?.message}`);
    }
  }

  throw new Error(
    `All configured AI providers failed to generate valid questions. Diagnostics: ${errors.join("; ")}`
  );
}
