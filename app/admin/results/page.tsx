import * as React from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { AdminResultsManager } from "@/components/admin/admin-results-manager";
import { getResultsOverviewAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const { results = [], filterOptions = { classes: [8, 9, 10, 11, 12], subjects: [], tests: [] } } =
    await getResultsOverviewAction();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Results" },
        ]}
      />

      <PageHeader
        title="Test Results & Export"
        description="View student scores, filter attempts by class or subject, and export spreadsheets formatted with summary analytics."
      />

      <AdminResultsManager
        initialResults={results}
        filterOptions={filterOptions}
      />
    </div>
  );
}
