import { z } from "zod";

export const generateQuestionsRequestSchema = z.object({
  classLevel: z.coerce.number().int().min(8).max(12),
  subject: z.string().trim().min(1, "Subject is required"),
  topic: z.string().trim().min(2, "Topic or chapter name is required"),
  language: z.enum(["English", "Hindi", "Punjabi"]).default("English"),
  count: z.coerce.number().int().min(1).max(50).default(10),
  difficulty: z.string().trim().min(1).default("Moderate to Hard"),
  board: z.string().trim().default("CBSE"),
  extraInstructions: z.string().trim().optional(),
});

export type GenerateQuestionsRequest = z.infer<typeof generateQuestionsRequestSchema>;

export const generatedMCQSchema = z.object({
  question: z.string().min(3, "Question text must be at least 3 characters"),
  option_a: z.string().min(1, "Option A cannot be empty"),
  option_b: z.string().min(1, "Option B cannot be empty"),
  option_c: z.string().min(1, "Option C cannot be empty"),
  option_d: z.string().min(1, "Option D cannot be empty"),
  correct: z
    .string()
    .transform((val) => val.toUpperCase().trim())
    .refine((val): val is "A" | "B" | "C" | "D" => ["A", "B", "C", "D"].includes(val), {
      message: "Correct option must be A, B, C, or D",
    }),
  explanation: z.string().optional().default(""),
});

export type GeneratedMCQ = z.infer<typeof generatedMCQSchema>;

export interface EditableQuestionItem extends GeneratedMCQ {
  id: string; // temporary client uuid
  selected: boolean;
}
