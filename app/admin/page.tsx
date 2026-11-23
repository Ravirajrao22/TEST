import * as React from "react";
import Link from "next/link";
import { Plus, BookOpen, FileCheck2, Users, ArrowRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/server";
import { DashboardClassTabs } from "@/components/admin/dashboard-class-tabs";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const adminSupabase = createAdminClient();

  // 1. Fetch classes
  const { data: classesList = [] } = await adminSupabase
    .from("classes")
    .select("id, grade")
    .order("grade", { ascending: true });

  const grades = [8, 9, 10, 11, 12];
  const classMap = new Map(classesList?.map((c) => [c.grade, c.id]));

  // 2. Fetch subjects
  const { data: allSubjects = [] } = await adminSupabase
    .from("subjects")
    .select("id, name, class_id");

  // 3. Fetch tests
  const { data: allTests = [] } = await adminSupabase
    .from("tests")
    .select("id, title, is_published, subject_id, created_at")
    .order("created_at", { ascending: false });

  // 4. Fetch attempts
  const { data: allAttempts = [] } = await adminSupabase
    .from("attempts")
    .select("id, test_id, class_id, score");

  // Map subjects to class_id
  const subjectToClassId = new Map(allSubjects?.map((s) => [s.id, s.class_id]));

  // Build class-by-class summary
  const classSummaries = grades.map((g) => {
    const classId = classMap.get(g);
    const subjectsInClass = (allSubjects || []).filter((s) => s.class_id === classId);
    const subjectIdsInClass = new Set(subjectsInClass.map((s) => s.id));
    const testsInClass = (allTests || []).filter((t) => subjectIdsInClass.has(t.subject_id));
    const attemptsInClass = (allAttempts || []).filter((a) => a.class_id === classId);

    return {
      grade: g,
      subjectsCount: subjectsInClass.length,
      testsCount: testsInClass.length,
      attemptsCount: attemptsInClass.length,
    };
  });

  const totalSubjects = allSubjects?.length || 0;
  const totalTests = allTests?.length || 0;
  const totalAttempts = allAttempts?.length || 0;

  // Recent tests (top 5)
  const recentTestsRows = (allTests || []).slice(0, 5).map((t) => {
    const classId = subjectToClassId.get(t.subject_id);
    const grade = (classesList || []).find((c) => c.id === classId)?.grade || 10;
    const subject = (allSubjects || []).find((s) => s.id === t.subject_id)?.name || "General";
    const submissions = (allAttempts || []).filter((a) => a.test_id === t.id).length;

    return {
      id: t.id,
      title: t.title,
      classLevel: grade,
      subject,
      totalSubmissions: submissions,
      status: t.is_published ? ("Active" as const) : ("Draft" as const),
    };
  });

  const tableColumns = [
    {
      key: "title",
      header: "Test Title",
      render: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.title}</span>
          <span className="text-xs text-slate-500">
            Class {row.classLevel} • {row.subject}
          </span>
        </div>
      ),
    },
    {
      key: "totalSubmissions",
      header: "Submissions",
      render: (row: any) => (
        <span className="text-sm font-medium text-slate-700">
          {row.totalSubmissions} {row.totalSubmissions === 1 ? "student" : "students"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={row.status === "Active" ? "success" : "warning"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      render: (row: any) => (
        <Link href={`/admin/tests`}>
          <Button variant="ghost" size="sm" className="h-9 min-h-[36px] text-xs">
            Manage
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Manage classes, subjects, tests, questions, and view results for classes 8 to 12."
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/ai-generator">
              <Button variant="secondary" size="md">
                <Sparkles className="w-4 h-4 mr-1.5 text-[#1E3A8A]" />
                AI Generator
              </Button>
            </Link>
            <Link href="/admin/tests">
              <Button variant="primary" size="md">
                <Plus className="w-4 h-4 mr-1.5" />
                New Test
              </Button>
            </Link>
          </div>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Classes
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">5</div>
            <div className="text-xs text-slate-600 mt-1">Classes 8, 9, 10, 11, 12</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Subjects
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{totalSubjects}</div>
            <div className="text-xs text-slate-600 mt-1">Across all 5 classes</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Active Tests
            </div>
            <div className="mt-1 text-2xl font-bold text-[#1E3A8A]">{totalTests}</div>
            <div className="text-xs text-slate-600 mt-1">Configured for students</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Submissions
            </div>
            <div className="mt-1 text-2xl font-bold text-green-700">{totalAttempts}</div>
            <div className="text-xs text-slate-600 mt-1">Recorded student attempts</div>
          </CardContent>
        </Card>
      </div>

      {/* Class Tabs Section with "Export Class Summary" */}
      <DashboardClassTabs initialClasses={classSummaries} />

      {/* Recent Tests Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Tests</h2>
          <Link
            href="/admin/tests"
            className="text-xs font-semibold text-[#1E3A8A] hover:underline inline-flex items-center gap-1 min-h-[44px] px-2"
          >
            <span>View all tests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTestsRows.length > 0 ? (
          <ResponsiveTable
            columns={tableColumns}
            data={recentTestsRows}
            keyExtractor={(row) => row.id}
          />
        ) : (
          <Card className="p-6 text-center text-slate-500 bg-white border-slate-200 text-sm">
            No tests created yet.
          </Card>
        )}
      </div>
    </div>
  );
}
