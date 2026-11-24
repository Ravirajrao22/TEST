"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient, hasServiceRoleKey, getCurrentUser } from "@/lib/supabase/server";
import {
  subjectInputSchema,
  type ClassCardData,
  type SubjectWithCounts,
} from "@/lib/validations/subject";

/**
 * Ensures grades 8 to 12 exist in the database and returns them with counts.
 */
export async function getClassesOverview(): Promise<{
  success: boolean;
  data: ClassCardData[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Fetch classes
    let { data: classesList, error } = await supabase
      .from("classes")
      .select("id, grade")
      .order("grade", { ascending: true });

    if (error) {
      console.error("Error fetching classes:", error);
    }

    // Fallback/auto-seed if classes table is empty
    if (!classesList || classesList.length === 0) {
      const adminClient = hasServiceRoleKey() ? createAdminClient() : supabase;
      const seedGrades = [8, 9, 10, 11, 12];
      for (const grade of seedGrades) {
        await adminClient.from("classes").insert({ grade }).select();
      }

      const refreshed = await supabase
        .from("classes")
        .select("id, grade")
        .order("grade", { ascending: true });

      classesList = refreshed.data || [];
    }

    // 2. Fetch counts for each class
    const results: ClassCardData[] = [];

    for (const c of classesList) {
      // Subjects count
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id")
        .eq("class_id", c.id);

      const subjectCount = subjects ? subjects.length : 0;
      let testCount = 0;

      if (subjects && subjects.length > 0) {
        const subjectIds = subjects.map((s) => s.id);
        const { count } = await supabase
          .from("tests")
          .select("id", { count: "exact", head: true })
          .in("subject_id", subjectIds);

        testCount = count || 0;
      }

      results.push({
        id: c.id,
        grade: c.grade,
        subjectCount,
        testCount,
      });
    }

    return { success: true, data: results };
  } catch (err: any) {
    console.error("getClassesOverview failed:", err);
    return {
      success: false,
      data: [
        { id: "class-8", grade: 8, subjectCount: 0, testCount: 0 },
        { id: "class-9", grade: 9, subjectCount: 0, testCount: 0 },
        { id: "class-10", grade: 10, subjectCount: 0, testCount: 0 },
        { id: "class-11", grade: 11, subjectCount: 0, testCount: 0 },
        { id: "class-12", grade: 12, subjectCount: 0, testCount: 0 },
      ],
      error: err?.message,
    };
  }
}

/**
 * Returns a class and its list of subjects with counts of tests and questions.
 */
export async function getClassSubjects(grade: number): Promise<{
  success: boolean;
  classData?: { id: string; grade: number };
  subjects?: SubjectWithCounts[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Fetch class record
    let { data: classRow, error: classErr } = await supabase
      .from("classes")
      .select("id, grade")
      .eq("grade", grade)
      .maybeSingle();

    if (!classRow) {
      // Ensure class exists
      const adminClient = hasServiceRoleKey() ? createAdminClient() : supabase;
      const { data: created } = await adminClient
        .from("classes")
        .insert({ grade })
        .select()
        .single();
      classRow = created;
    }

    if (!classRow) {
      return { success: false, error: `Class ${grade} not found.` };
    }

    // 2. Fetch subjects for this class
    const { data: subjectsList, error: subjectsErr } = await supabase
      .from("subjects")
      .select("id, class_id, name, created_at")
      .eq("class_id", classRow.id)
      .order("name", { ascending: true });

    if (subjectsErr) {
      return { success: false, error: subjectsErr.message };
    }

    // 3. For each subject, calculate testsCount and questionsCount
    const subjectsWithCounts: SubjectWithCounts[] = [];

    for (const sub of subjectsList || []) {
      // Fetch tests under this subject
      const { data: tests } = await supabase
        .from("tests")
        .select("id")
        .eq("subject_id", sub.id);

      const testsCount = tests ? tests.length : 0;
      let questionsCount = 0;

      if (tests && tests.length > 0) {
        const testIds = tests.map((t) => t.id);
        const { count: qCount } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .in("test_id", testIds);

        questionsCount = qCount || 0;
      }

      subjectsWithCounts.push({
        id: sub.id,
        classId: sub.class_id,
        name: sub.name,
        createdAt: sub.created_at,
        testsCount,
        questionsCount,
      });
    }

    return {
      success: true,
      classData: { id: classRow.id, grade: classRow.grade },
      subjects: subjectsWithCounts,
    };
  } catch (err: any) {
    console.error("getClassSubjects error:", err);
    return { success: false, error: err?.message || "Failed to load subjects." };
  }
}

/**
 * Creates a new subject under a class with Zod validation and duplicate prevention.
 */
export async function createSubjectAction(
  classId: string,
  grade: number,
  rawName: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // 1. Authorization check
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    // 2. Zod validation
    const parsed = subjectInputSchema.safeParse({ name: rawName });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid subject name",
      };
    }
    const validatedName = parsed.data.name;

    const supabase = await createClient();

    // 3. Duplicate check within the same class (case-insensitive)
    const { data: existing } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("class_id", classId);

    const isDuplicate = existing?.some(
      (s) => s.name.trim().toLowerCase() === validatedName.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `A subject named "${validatedName}" already exists in Class ${grade}.`,
      };
    }

    // 4. Insert into database
    const { data: newSubject, error } = await supabase
      .from("subjects")
      .insert({
        class_id: classId,
        name: validatedName,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: `A subject named "${validatedName}" already exists in Class ${grade}.`,
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${grade}`);

    return { success: true, data: newSubject };
  } catch (err: any) {
    console.error("createSubjectAction error:", err);
    return { success: false, error: err?.message || "Failed to create subject" };
  }
}

/**
 * Renames an existing subject with Zod validation and duplicate prevention.
 */
export async function renameSubjectAction(
  subjectId: string,
  classId: string,
  grade: number,
  rawNewName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Authorization check
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    // 2. Zod validation
    const parsed = subjectInputSchema.safeParse({ name: rawNewName });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid subject name",
      };
    }
    const validatedName = parsed.data.name;

    const supabase = await createClient();

    // 3. Duplicate check within the same class (excluding current subject)
    const { data: existing } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("class_id", classId);

    const isDuplicate = existing?.some(
      (s) =>
        s.id !== subjectId &&
        s.name.trim().toLowerCase() === validatedName.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `Another subject named "${validatedName}" already exists in Class ${grade}.`,
      };
    }

    // 4. Update in database
    const { error } = await supabase
      .from("subjects")
      .update({ name: validatedName })
      .eq("id", subjectId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${grade}`);

    return { success: true };
  } catch (err: any) {
    console.error("renameSubjectAction error:", err);
    return { success: false, error: err?.message || "Failed to rename subject" };
  }
}

/**
 * Deletes a subject.
 * Note: Database cascading delete removes linked tests, questions, and attempts.
 */
export async function deleteSubjectAction(
  subjectId: string,
  grade: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Authorization check
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subjectId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${grade}`);

    return { success: true };
  } catch (err: any) {
    console.error("deleteSubjectAction error:", err);
    return { success: false, error: err?.message || "Failed to delete subject" };
  }
}
