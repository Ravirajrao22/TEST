"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required.");
  }
  return user;
}

/**
 * Reads the default_show_result setting from app_settings table.
 */
export async function getDefaultShowResultAction(): Promise<{
  success: boolean;
  defaultShowResult: boolean;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: setting, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "default_show_result")
      .maybeSingle();

    if (error) {
      return { success: false, defaultShowResult: false, error: error.message };
    }

    let defaultVal = false;
    if (setting?.value) {
      if (typeof setting.value === "boolean") {
        defaultVal = setting.value;
      } else if (typeof setting.value === "string") {
        defaultVal = setting.value === "true";
      }
    }

    return { success: true, defaultShowResult: defaultVal };
  } catch (err: any) {
    return { success: false, defaultShowResult: false, error: err?.message };
  }
}

/**
 * Updates default_show_result in app_settings table.
 */
export async function updateDefaultShowResultAction(
  defaultShowResult: boolean
): Promise<{
  success: boolean;
  defaultShowResult: boolean;
  message: string;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "default_show_result",
          value: defaultShowResult as any,
        },
        { onConflict: "key" }
      );

    if (error) {
      return {
        success: false,
        defaultShowResult: !defaultShowResult,
        message: "Failed to update default setting.",
        error: error.message,
      };
    }

    revalidatePath("/admin/settings");

    const message = defaultShowResult
      ? "New tests will show results to students by default."
      : "New tests will hide results from students by default.";

    return {
      success: true,
      defaultShowResult,
      message,
    };
  } catch (err: any) {
    return {
      success: false,
      defaultShowResult: !defaultShowResult,
      message: err?.message || "Failed to save setting.",
      error: err?.message,
    };
  }
}
