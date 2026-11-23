import { GoogleGenAI } from "@google/genai";

/**
 * Server-only helper to get an initialized Google Gen AI instance.
 * Must only be called from server routes or server actions.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
  }
  return new GoogleGenAI({ apiKey });
}
