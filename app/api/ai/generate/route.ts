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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a single batch call to Gemini with retry, backoff, and model fallback logic.
 */
async function callGeminiBatch(
  gemini: ReturnType<typeof getGeminiClient>,
  primaryModel: string,
  prompt: string,
  batchSize: number
): Promise<GeneratedMCQ[]> {
  const fallbackModel = primaryModel === "gemini-3.5-flash" ? "gemini-3.8-flash" : "gemini-3.5-flash";

  const executeCall = async (model: string): Promise<GeneratedMCQ[]> => {
    const response = await gemini.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim() || "";
    if (!text) {
      throw new Error("Empty response received from Gemini API");
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // In case the model wrapped JSON in markdown code blocks
      const cleanJson = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    }

    // Ensure array
    const list = Array.isArray(parsed) ? parsed : parsed.questions || [parsed];
    const validQuestions: GeneratedMCQ[] = [];

    for (const item of list) {
      const result = generatedMCQSchema.safeParse(item);
      if (result.success) {
        validQuestions.push(result.data);
      }
    }

    return validQuestions;
  };

  const executeWithRetry = async (model: string, maxAttempts = 3): Promise<GeneratedMCQ[]> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await executeCall(model);
      } catch (err: any) {
        const errMsg = err?.message?.toLowerCase() || "";
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("fetch failed") ||
          err?.status === 503;

        if (isTransient && attempt < maxAttempts) {
          const waitTime = attempt * 1500;
          console.warn(
            `Model ${model} is experiencing a temporary spike (${err?.message}). Retrying in ${waitTime}ms (attempt ${attempt}/${maxAttempts})...`
          );
          await sleep(waitTime);
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Failed after ${maxAttempts} attempts on ${model}`);
  };

  // Attempt with primary model using backoff retries
  try {
    return await executeWithRetry(primaryModel, 3);
  } catch (primaryErr: any) {
    console.warn(
      `Primary model ${primaryModel} failed after retries (${primaryErr?.message}), attempting fallback model ${fallbackModel}...`
    );
    // Attempt with fallback model using backoff retries
    try {
      await sleep(1000);
      return await executeWithRetry(fallbackModel, 2);
    } catch (fallbackErr: any) {
      console.error("Both primary and fallback Gemini attempts failed:", fallbackErr?.message);
      throw primaryErr || fallbackErr;
    }
  }
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

    // 4. Initialize Gemini client
    let gemini: ReturnType<typeof getGeminiClient>;
    try {
      gemini = getGeminiClient();
    } catch (err: any) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your environment variables.",
        },
        { status: 500 }
      );
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";

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

      const batchResults = await callGeminiBatch(gemini, modelName, prompt, currentBatchSize);
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
