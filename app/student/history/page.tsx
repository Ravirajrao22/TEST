import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  History,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { getStudentHistoryAction } from "@/app/student/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentHistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/student/history");
  }

  const { history = [] } = await getStudentHistoryAction();

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Student Portal</span>
        </Link>
      </div>

      <PageHeader
        title="Test Attempt History"
        description="Review all your past test attempts and view scorecards when released by your coaching centre."
      />

      {history.length > 0 ? (
        <div className="space-y-3">
          {history.map((att) => {
            const maxScore = (att.totalQuestions || 0) * (att.marksPerQuestion || 1);

            return (
              <Card
                key={att.attemptId}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary" className="text-xs font-semibold">
                          Class {att.classGrade}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-700">
                          {att.subjectName}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {new Date(att.submittedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900 text-base leading-snug">
                        {att.testTitle}
                      </h3>

                      {/* Visibility Rule: Show score if showResult is true, otherwise Result Pending */}
                      <div className="pt-1 flex items-center gap-2">
                        {att.showResult ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="success" className="text-xs font-bold">
                              Score: {att.score} / {maxScore} ({att.percentage}%)
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Result Released
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-medium">
                              <Clock className="w-3 h-3 mr-1 text-slate-500" />
                              Result Pending
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Awaiting Teacher Release
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action link */}
                    <div className="shrink-0 pt-2 sm:pt-0">
                      <Link href={`/student/result/${att.attemptId}`}>
                        <Button
                          variant={att.showResult ? "primary" : "secondary"}
                          size="md"
                          className="w-full sm:w-auto min-h-[44px]"
                        >
                          {att.showResult ? (
                            <>
                              <Award className="w-4 h-4 mr-1.5" />
                              View Scorecard
                            </>
                          ) : (
                            <>
                              <span>View Submission</span>
                              <ArrowRight className="w-4 h-4 ml-1.5" />
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<History className="w-8 h-8 text-slate-400" />}
          title="No test attempts yet"
          description="You have not submitted any tests yet. Go to your enrolled subjects to take a test."
          action={
            <Link href="/student">
              <Button variant="primary">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Go to Subjects
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
