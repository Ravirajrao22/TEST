export * from "./database";

export type TargetClass = 8 | 9 | 10 | 11 | 12;

export type UserRole = "admin" | "student";

export type MCQOptionKey = "A" | "B" | "C" | "D";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  selectedClass?: TargetClass;
  createdAt: string;
}

export interface SubjectItem {
  id: string;
  classId: string;
  className: string;
  name: string;
  createdAt: string;
}

export interface PublicTestQuestion {
  id: string;
  testId: string;
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface TestWithDetails {
  id: string;
  subjectId: string;
  subjectName?: string;
  classGrade?: number;
  title: string;
  durationMinutes: number | null;
  marksPerQuestion: number;
  negativeMarks: number;
  showResult: boolean;
  isPublished: boolean;
  createdAt: string;
}
