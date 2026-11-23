import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Requirement 7: Admin pages must re-check the role on the server; do not rely only on middleware.
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "admin") {
    redirect("/student");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
