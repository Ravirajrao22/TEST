import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/ai/gemini";
import {
  generateQuestionsRequestSchema,
  generatedMCQSchema,
  type GeneratedMCQ,
} from "@/lib/validations/ai";

export const dynamic = "force-dynamic";

// In-memory rate limiting: 20 generations per hour per admin
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const HOURLY_LIMIT = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

function checkRateLimit(adminId: string): { allowed: boolean; retryAfterMinutes?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(adminId);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(adminId, { count: 1, resetAt: now + ONE_HOUR_MS });
    return { allowed: true };
  }

  if (record.count >= HOURLY_LIMIT) {
    const retryAfterMinutes = Math.ceil((record.resetAt - now) / (60 * 1000));
    return { allowed: false, retryAfterMinutes };
  }

  record.count += 1;
  return { allowed: true };
}

/**
 * OpenRouter fallback helper if Google AI Studio free tier has spikes
 */
async function callOpenRouterBatch(prompt: string): Promise<GeneratedMCQ[]> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return [];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://testhub.coaching",
      "X-Title": "TestHub",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content:
            "You are an expert exam question generator for Indian schools (CBSE/NCERT). Return only a valid JSON array of question objects without markdown wrapping.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const cleanJson = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleanJson);
  const list = Array.isArray(parsed) ? parsed : parsed.questions || [parsed];
  const validQuestions: GeneratedMCQ[] = [];

  for (const item of list) {
    const result = generatedMCQSchema.safeParse(item);
    if (result.success) {
      validQuestions.push(result.data);
    }
  }

  return validQuestions;
}

/**
 * Executes a single batch call to Gemini with high-capacity models first,
 * instant failover on spikes, and optional OpenRouter backup.
 */
async function callGeminiBatch(
  gemini: ReturnType<typeof getGeminiClient> | null,
  prompt: string,
  batchSize: number
): Promise<GeneratedMCQ[]> {
  // Always prioritize high-throughput lite models (1.3s response, zero 503 spikes)
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
  ];

  if (gemini) {
    for (const model of candidateModels) {
      try {
        const response = await gemini.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const text = response.text?.trim() || "";
        if (!text) continue;

        // Parse JSON
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          const cleanJson = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleanJson);
        }

        const list = Array.isArray(parsed) ? parsed : parsed.questions || [parsed];
        const validQuestions: GeneratedMCQ[] = [];

        for (const item of list) {
          const result = generatedMCQSchema.safeParse(item);
          if (result.success) {
            validQuestions.push(result.data);
          }
        }

        if (validQuestions.length > 0) {
          return validQuestions;
        }
      } catch (err: any) {
        console.warn(
          `Model ${model} unavailable (${err?.message}). Instantly cascading to next model in pool...`
        );
      }
    }
  }

  // OpenRouter fallback if configured
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.info("Using OpenRouter fallback for question generation...");
      const openRouterQuestions = await callOpenRouterBatch(prompt);
      if (openRouterQuestions.length > 0) {
        return openRouterQuestions;
      }
    } catch (openRouterErr: any) {
      console.error("OpenRouter fallback error:", openRouterErr?.message);
    }
  }

  throw new Error(
    "AI models are temporarily experiencing high demand across all endpoints. Please retry in 30 seconds."
  );
}

export async function POST(request: Request) {
  try {
    // 1. Authorization: Admin only
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required." },
        { status: 403 }
      );
    }

    // 2. Rate Limit: 20 per hour per admin
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit reached. You can generate up to ${HOURLY_LIMIT} AI tests per hour. Please wait ${rateCheck.retryAfterMinutes} minutes before trying again.`,
        },
        { status: 429 }
      );
    }

    // 3. Request validation with Zod
    const body = await request.json();
    const parsedRequest = generateQuestionsRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: parsedRequest.error.issues[0]?.message || "Invalid input parameters.",
        },
        { status: 400 }
      );
    }

    const {
      classLevel,
      subject,
      topic,
      language,
      count,
      difficulty,
      board,
      extraInstructions,
    } = parsedRequest.data;

    // 4. Initialize Gemini client (or use OpenRouter)
    let gemini: ReturnType<typeof getGeminiClient> | null = null;
    try {
      gemini = getGeminiClient();
    } catch {
      gemini = null;
    }

    if (!gemini && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        {
          error:
            "No AI API key is configured on the server. Please add GEMINI_API_KEY or OPENROUTER_API_KEY to your environment variables.",
        },
        { status: 500 }
      );
    }

    // 5. Partition large requests into batches of 10 questions to prevent output truncation
    const batchSizes: number[] = [];
    let remaining = count;
    while (remaining > 0) {
      const currentBatch = Math.min(remaining, 10);
      batchSizes.push(currentBatch);
      remaining -= currentBatch;
    }

    const allQuestions: GeneratedMCQ[] = [];
    const extraClause = extraInstructions ? `Additional teacher instructions: ${extraInstructions}` : "";

    // Run batches sequentially and accumulate results
    for (let i = 0; i < batchSizes.length; i++) {
      const currentBatchSize = batchSizes[i];

      // Format prompt per required prompt template
      const prompt = `You are an experienced ${board} school teacher in India. Write ${currentBatchSize} multiple choice questions for Class ${classLevel}, Subject ${subject}, Topic ${topic}. Difficulty: ${difficulty}. Language: ${language}. Follow the NCERT-style syllabus for this class. Each question has exactly 4 options, exactly one correct option, and a one-line explanation. Do not repeat questions. Avoid ambiguous wording and 'all of the above' options. Return only a JSON array of objects with keys: question, option_a, option_b, option_c, option_d, correct (A, B, C or D), explanation. ${extraClause}`;

      const batchResults = await callGeminiBatch(gemini, prompt, currentBatchSize);
      allQuestions.push(...batchResults);
    }

    // 6. Quality filtering:
    // - Drop duplicate questions (normalized text)
    // - Ensure exactly 4 non-empty options and valid correct answer ('A' | 'B' | 'C' | 'D')
    const seenQuestions = new Set<string>();
    const cleanedQuestions: GeneratedMCQ[] = [];

    for (const q of allQuestions) {
      const normalizedKey = q.question.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

      if (
        !seenQuestions.has(normalizedKey) &&
        ["A", "B", "C", "D"].includes(q.correct) &&
        q.option_a.trim() &&
        q.option_b.trim() &&
        q.option_c.trim() &&
        q.option_d.trim()
      ) {
        seenQuestions.add(normalizedKey);
        cleanedQuestions.push(q);
      }
    }

    if (cleanedQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid questions could be generated. Please try adjusting your topic or instructions.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: cleanedQuestions,
      requestedCount: count,
      generatedCount: cleanedQuestions.length,
      classLevel,
      subject,
      topic,
    });
  } catch (error: any) {
    console.error("AI Generation error:", error);

    // Provide friendly error messages for quota or network failures
    const errMsg = error?.message || "";
    if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
      return NextResponse.json(
        {
          error:
            "Google Gemini API quota exceeded or rate-limited. Please check your Gemini API plan or try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    if (
      errMsg.includes("503") ||
      errMsg.toLowerCase().includes("high demand") ||
      errMsg.toLowerCase().includes("unavailable")
    ) {
      return NextResponse.json(
        {
          error:
            "Google Gemini API is temporarily experiencing high traffic. Please retry in 30 seconds.",
        },
        { status: 503 }
      );
    }

    if (errMsg.includes("404") || errMsg.toLowerCase().includes("not_found")) {
      return NextResponse.json(
        {
          error:
            "Configured Gemini model was not found. Please verify GEMINI_MODEL in your environment settings (recommended: gemini-3.5-flash).",
        },
        { status: 502 }
      );
    }

    if (
      errMsg.includes("400") ||
      errMsg.includes("403") ||
      errMsg.toLowerCase().includes("api key") ||
      errMsg.toLowerCase().includes("auth")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in .env.local.",
        },
        { status: 401 }
      );
    }

    if (errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("fetch")) {
      return NextResponse.json(
        {
          error:
            "Network error communicating with Google Gemini API. Please check your internet connection.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message || "Failed to generate questions. Please try again.",
      },
      { status: 500 }
    );
  }
}
