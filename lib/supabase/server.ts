import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export interface CurrentUser {
  id: string;
  email: string;
  role: "admin" | "student";
  avatarUrl?: string;
  fullName?: string;
  grade?: number;
}

/**
 * Creates a typed server-side Supabase client for Server Components,
 * Server Actions, and Route Handlers with cookie-based session management.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "placeholder-anon-key";

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Creates a typed admin Supabase client with the service role key.
 * Strictly for server-side operations that bypass Row Level Security (RLS).
 * NEVER expose this or its key to the client.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Server helper returning the currently authenticated user with their role and profile metadata.
 * Uses supabase.auth.getUser() and queries the profiles table.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const userEmail = user.email?.toLowerCase().trim() || "";
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim() || "";

  let role: "admin" | "student" = "student";

  let profileData: { role?: string; full_name?: string | null; grade?: number | null } | null = null;

  // 1. Check if matches environment ADMIN_EMAIL
  if (adminEmail && userEmail === adminEmail) {
    role = "admin";
  } else {
    // 2. Query user profile from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, grade")
      .eq("id", user.id)
      .maybeSingle();

    profileData = profile;

    if (profile?.role === "admin") {
      role = "admin";
    } else {
      // 3. Check admin_emails table as secondary authority
      const { data: adminRecord } = await supabase
        .from("admin_emails")
        .select("email")
        .eq("email", userEmail)
        .maybeSingle();

      if (adminRecord) {
        role = "admin";
      }
    }
  }

  // If role was admin via env, still attempt to load profileData
  if (!profileData) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, grade")
      .eq("id", user.id)
      .maybeSingle();
    profileData = profile;
  }

  const metadata = user.user_metadata || {};
  const avatarUrl = metadata.avatar_url || metadata.picture || undefined;
  const fullName =
    profileData?.full_name ||
    metadata.full_name ||
    metadata.name ||
    (user.email ? user.email.split("@")[0] : undefined);

  const grade =
    profileData?.grade ||
    (typeof metadata.grade === "number" ? metadata.grade : undefined);

  return {
    id: user.id,
    email: user.email || "",
    role,
    avatarUrl,
    fullName,
    grade,
  };
}
