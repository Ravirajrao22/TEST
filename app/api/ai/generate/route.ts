import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  generateQuestionsRequestSchema,
  type GeneratedMCQ,
} from "@/lib/validations/ai";
import {
  generateMCQBatchWithFallback,
  getAvailableAIProviders,
  type AIProvider,
} from "@/lib/ai/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for Vercel serverless functions

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

    // 4. Verify AI provider availability
    const { availableProviders } = getAvailableAIProviders();
    if (availableProviders.length === 0) {
      return NextResponse.json(
        {
          error:
            "No AI API key is configured on the server. Please add GROQ_API_KEY (recommended, 100% free), OPENROUTER_API_KEY, or GEMINI_API_KEY to your environment variables.",
        },
        { status: 500 }
      );
    }

    // 5. Partition requests into optimal batch sizes (up to 25 per batch)
    // and execute them concurrently in parallel to prevent Vercel timeout errors
    const batchSizes: number[] = [];
    let remaining = count;
    while (remaining > 0) {
      const currentBatch = Math.min(remaining, 25);
      batchSizes.push(currentBatch);
      remaining -= currentBatch;
    }

    const extraClause = extraInstructions ? `Additional teacher instructions: ${extraInstructions}` : "";

    // Run batches concurrently in parallel for maximum speed (< 3s)
    const batchPromises = batchSizes.map(async (batchSize, batchIndex) => {
      const batchLabel = batchSizes.length > 1 ? ` (Part ${batchIndex + 1})` : "";
      const prompt = `You are an experienced ${board} school teacher in India. Write ${batchSize} multiple choice questions for Class ${classLevel}, Subject ${subject}, Topic ${topic}${batchLabel}. Difficulty: ${difficulty}. Language: ${language}. Follow the NCERT-style syllabus for this class. Each question has exactly 4 options, exactly one correct option, and a one-line explanation. Do not repeat questions. Avoid ambiguous wording and 'all of the above' options. Return only a JSON array of objects with keys: question, option_a, option_b, option_c, option_d, correct (A, B, C or D), explanation. ${extraClause}`;

      return generateMCQBatchWithFallback(prompt);
    });

    const batchOutputs = await Promise.all(batchPromises);
    const allQuestions: GeneratedMCQ[] = [];
    let lastProviderUsed: AIProvider | null = null;

    for (const output of batchOutputs) {
      allQuestions.push(...output.questions);
      lastProviderUsed = output.providerUsed;
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
      providerUsed: lastProviderUsed,
    });
  } catch (error: any) {
    console.error("AI Generation error:", error);

    const errMsg = error?.message || "";
    if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
      return NextResponse.json(
        {
          error:
            "AI API quota exceeded or rate-limited. Add GROQ_API_KEY (free, 14,400 req/day) in Vercel Environment Variables to avoid quota limits.",
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
            "AI provider is temporarily experiencing high traffic. Please add GROQ_API_KEY in Vercel to bypass Google Gemini spikes.",
        },
        { status: 503 }
      );
    }

    if (errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("timed out")) {
      return NextResponse.json(
        {
          error:
            "AI provider request timed out. Please add GROQ_API_KEY in your environment variables for instant (< 2s) generation.",
        },
        { status: 504 }
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
