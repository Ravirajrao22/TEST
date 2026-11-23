import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication check
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/student");
  }

  // An admin may also open /student for testing, so both student and admin are allowed
  return <StudentShell user={user}>{children}</StudentShell>;
}
