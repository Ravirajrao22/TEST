import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SubjectTestsManager } from "@/components/admin/subject-tests-manager";

export const dynamic = "force-dynamic";

interface SubjectTestsPageProps {
  params: Promise<{
    grade: string;
    subjectId: string;
  }>;
}

export default async function SubjectTestsPage({ params }: SubjectTestsPageProps) {
  const { grade: rawGrade, subjectId } = await params;
  const grade = parseInt(rawGrade, 10);

  if (isNaN(grade) || grade < 8 || grade > 12) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch subject details
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, class_id")
    .eq("id", subjectId)
    .maybeSingle();

  const subjectName = subject?.name || "Subject Tests";

  // Fetch tests for this subject
  const { data: tests = [] } = await supabase
    .from("tests")
    .select(
      "id, title, duration_minutes, marks_per_question, negative_marks, show_result, is_published, created_at"
    )
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  const formattedTests = (tests || []).map((t) => ({
    id: t.id,
    title: t.title,
    durationMinutes: t.duration_minutes,
    marksPerQuestion: Number(t.marks_per_question),
    negativeMarks: Number(t.negative_marks),
    showResult: Boolean(t.show_result),
    isPublished: Boolean(t.is_published),
    createdAt: t.created_at,
  }));

  return (
    <div className="space-y-4">
      {/* Breadcrumb: Classes > Class 10 > Science */}
      <Breadcrumb
        items={[
          { label: "Classes", href: "/admin/classes" },
          { label: `Class ${grade}`, href: `/admin/classes/${grade}` },
          { label: subjectName },
        ]}
      />

      <PageHeader
        title={`${subjectName} (Class ${grade})`}
        description={`Manage tests, question papers, and student result visibility for ${subjectName}.`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/ai-generator?class=${grade}&subject=${encodeURIComponent(subjectId)}`}>
              <Button variant="secondary" size="md">
                <Sparkles className="w-4 h-4 mr-1.5 text-[#1E3A8A]" />
                Generate with AI
              </Button>
            </Link>
          </div>
        }
      />

      <SubjectTestsManager
        grade={grade}
        subjectId={subjectId}
        subjectName={subjectName}
        initialTests={formattedTests}
      />
    </div>
  );
}
