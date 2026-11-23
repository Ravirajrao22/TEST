import { z } from "zod";

export const subjectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Subject name must be at least 2 characters")
    .max(40, "Subject name cannot exceed 40 characters"),
});

export type SubjectInput = z.infer<typeof subjectInputSchema>;

export interface ClassCardData {
  id: string;
  grade: number;
  subjectCount: number;
  testCount: number;
}

export interface SubjectWithCounts {
  id: string;
  classId: string;
  name: string;
  createdAt: string;
  testsCount: number;
  questionsCount: number;
}
