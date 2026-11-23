import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If Supabase credentials are not configured, allow public navigation without crashing
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  // Retrieve authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

    let role: "admin" | "student" = "student";

    if (adminEmail && userEmail === adminEmail) {
      role = "admin";
    } else {
      // Query profile role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        role = "admin";
      } else {
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

    // Signed-in users visiting /login or / are redirected to their home dashboard
    if (pathname === "/login" || pathname === "/") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = role === "admin" ? "/admin" : "/student";
      return NextResponse.redirect(redirectUrl);
    }

    // A student who opens any /admin URL is redirected to /student
    // (An admin may open /student for testing)
    if (pathname.startsWith("/admin") && role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/student";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
