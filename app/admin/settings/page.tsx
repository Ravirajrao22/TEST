import * as React from "react";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { getDefaultShowResultAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const { defaultShowResult = false } = await getDefaultShowResultAction();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Settings" },
        ]}
      />

      <PageHeader
        title="Settings"
        description="Configure coaching portal defaults and administrative preferences."
      />

      <AdminSettingsForm
        initialDefaultShowResult={defaultShowResult}
        user={user}
      />
    </div>
  );
}
