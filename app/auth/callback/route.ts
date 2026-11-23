import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const userEmail = data.user.email?.toLowerCase().trim() || "";
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim() || "";

      let role: "admin" | "student" = "student";

      if (adminEmail && userEmail === adminEmail) {
        role = "admin";
      } else {
        // Query user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          role = "admin";
        } else {
          // Check admin_emails table
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

      // If next param is specified and valid, respect it for admins or valid student paths
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        if (next.startsWith("/admin") && role !== "admin") {
          return NextResponse.redirect(`${origin}/student`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Default role landing page
      if (role === "admin") {
        return NextResponse.redirect(`${origin}/admin`);
      } else {
        return NextResponse.redirect(`${origin}/student`);
      }
    }
  }

  // Return the user to login with an error message
  return NextResponse.redirect(
    `${origin}/login?error=Authentication%20failed.%20Please%20try%20signing%20in%20again.`
  );
}
