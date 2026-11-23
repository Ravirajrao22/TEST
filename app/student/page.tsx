import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { StudentPortalClient } from "@/components/student/student-portal-client";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/student");
  }

  return <StudentPortalClient user={user} />;
}
