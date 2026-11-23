import { z } from "zod";

export const studentProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(60, "Full name cannot exceed 60 characters"),
  grade: z
    .coerce
    .number()
    .int()
    .min(8, "Class must be between 8 and 12")
    .max(12, "Class must be between 8 and 12"),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;

export const submitAttemptSchema = z.object({
  testId: z.string().uuid("Invalid test ID"),
  studentName: z.string().trim().min(3).max(60),
  classId: z.string().uuid("Invalid class ID"),
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"]).nullable()),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
