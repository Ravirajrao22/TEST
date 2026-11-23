import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getTestForExamAction } from "@/app/student/actions";
import { StudentExamInterface } from "@/components/student/student-exam-interface";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, FileX } from "lucide-react";

export const dynamic = "force-dynamic";

interface TestPageProps {
  params: Promise<{
    testId: string;
  }>;
}

export default async function StudentTestPage({ params }: TestPageProps) {
  const { testId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/student/test/${testId}`);
  }

  const res = await getTestForExamAction(testId);

  if (!res.success && !res.isAlreadyAttempted) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<FileX className="w-8 h-8 text-slate-400" />}
          title="Test Unavailable"
          description={res.error || "The requested test could not be loaded or is not published."}
          action={
            <Link href="/student">
              <Button variant="secondary" size="md">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Student Portal
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (res.isAlreadyAttempted) {
    return (
      <StudentExamInterface
        user={user}
        test={{
          id: testId,
          title: "Completed Test",
          durationMinutes: null,
          marksPerQuestion: 1,
          negativeMarks: 0,
          showResult: true,
          subjectName: "Subject",
          classGrade: 10,
          classId: "",
        }}
        rawQuestions={[]}
        isAlreadyAttempted={true}
        attemptId={res.attemptId}
      />
    );
  }

  return (
    <StudentExamInterface
      user={user}
      test={res.test!}
      rawQuestions={res.questions || []}
    />
  );
}
