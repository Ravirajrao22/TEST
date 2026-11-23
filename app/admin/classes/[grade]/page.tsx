import * as React from "react";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ClassSubjectsManager } from "@/components/admin/class-subjects-manager";
import { getClassSubjects } from "../actions";

export const dynamic = "force-dynamic";

interface ClassDetailPageProps {
  params: Promise<{
    grade: string;
  }>;
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { grade: rawGrade } = await params;
  const grade = parseInt(rawGrade, 10);

  if (isNaN(grade) || grade < 8 || grade > 12) {
    notFound();
  }

  const { classData, subjects = [], error } = await getClassSubjects(grade);

  const classId = classData?.id || `fallback-class-${grade}`;

  return (
    <div className="space-y-4">
      {/* Breadcrumb: Classes > Class 10 */}
      <Breadcrumb
        items={[
          { label: "Classes", href: "/admin/classes" },
          { label: `Class ${grade}` },
        ]}
      />

      <PageHeader
        title={`Class ${grade} Subjects`}
        description={`Manage subjects, test papers, and question banks for Class ${grade}.`}
      />

      <ClassSubjectsManager
        grade={grade}
        classId={classId}
        initialSubjects={subjects}
      />
    </div>
  );
}
