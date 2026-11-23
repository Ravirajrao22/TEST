import * as React from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { AdminTestsManager } from "@/components/admin/admin-tests-manager";
import { getAllAdminTestsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTestsPage() {
  const { tests = [] } = await getAllAdminTestsAction();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Tests" },
        ]}
      />

      <PageHeader
        title="Tests Management"
        description="Monitor tests, configure grading rules, and control student result visibility across all classes."
      />

      <AdminTestsManager initialTests={tests} />
    </div>
  );
}
