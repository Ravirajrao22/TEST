import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const rawSupabaseAnonKey = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )?.trim();

    // If Supabase credentials are missing or placeholder, allow navigation without crashing
    if (
      !rawSupabaseUrl ||
      !rawSupabaseAnonKey ||
      !rawSupabaseUrl.startsWith("http") ||
      rawSupabaseUrl.includes("placeholder")
    ) {
      return supabaseResponse;
    }

    const supabase = createServerClient<Database>(rawSupabaseUrl, rawSupabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Safely retrieve user session without throwing unhandled edge exceptions
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch (authError) {
      console.warn("Proxy auth retrieval notice:", authError);
    }

    const pathname = request.nextUrl.pathname;

    // 1. Unauthenticated users visiting /admin or /student must go to /login
    if (!user && (pathname.startsWith("/admin") || pathname.startsWith("/student"))) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Logic for authenticated users
    if (user) {
      const userEmail = user.email?.toLowerCase().trim() || "";
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim() || "";

      // Fast check: if email matches configured admin email
      const isAdminByEmail = Boolean(adminEmail && userEmail === adminEmail);

      // Signed-in users visiting /login or / are redirected to their home dashboard
      if (pathname === "/login" || pathname === "/") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = isAdminByEmail ? "/admin" : "/student";
        return NextResponse.redirect(redirectUrl);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Proxy invocation error handled safely:", error);
    // Never crash the entire site with 500 error.
    // Allow request to proceed to server components where errors are handled with user-friendly UI.
    return supabaseResponse;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
