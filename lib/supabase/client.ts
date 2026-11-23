import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Creates a typed browser-side Supabase client for client components.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "placeholder-anon-key";

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
