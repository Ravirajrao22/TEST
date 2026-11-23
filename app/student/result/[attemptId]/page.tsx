import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ArrowLeft,
  Clock,
  Check,
  X,
  History,
  BookOpen,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAttemptResultAction } from "@/app/student/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface ResultPageProps {
  params: Promise<{
    attemptId: string;
  }>;
}

export default async function StudentResultPage({ params }: ResultPageProps) {
  const { attemptId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/student/result/${attemptId}`);
  }

  const res = await getAttemptResultAction(attemptId);

  if (!res.success || !res.result) {
    notFound();
  }

  const { result } = res;

  // --------------------------------------------------------------------------
  // CASE 1: RESULTS ARE HIDDEN FROM STUDENTS (tests.show_result = false)
  // "show a calm confirmation card, 'Your test has been submitted successfully.
  // Your teacher will share the result.' with a Back to Home button. No score, no answers."
  // --------------------------------------------------------------------------
  if (!result.isVisible) {
    return (
      <div className="max-w-lg mx-auto py-4 sm:py-8 space-y-6">
        <Card className="border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-[#1E3A8A] flex items-center justify-center mx-auto border border-blue-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Test Submitted Successfully
            </h1>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your test has been submitted successfully. Your teacher will share the result.
            </p>
          </div>

          {/* Test Metadata Capsule */}
          <div className="p-4 rounded-[8px] bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Test:</span>
              <span className="font-semibold text-slate-900">{result.testTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Class & Subject:</span>
              <span className="font-semibold text-slate-900">
                Class {result.classGrade} • {result.subjectName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Candidate:</span>
              <span className="font-semibold text-slate-900">{result.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Submitted On:</span>
              <span className="font-semibold text-slate-900">
                {new Date(result.submittedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link href="/student">
              <Button variant="primary" size="md" className="w-full min-h-[44px]">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Home
              </Button>
            </Link>

            <Link href="/student/history">
              <Button variant="secondary" size="md" className="w-full min-h-[44px]">
                <History className="w-4 h-4 mr-1.5 text-slate-500" />
                View Test History
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // CASE 2: RESULTS ARE VISIBLE (tests.show_result = true)
  // "show a summary Card (score, total marks, percentage, correct, wrong, unanswered),
  // then a question-by-question review listing the question, the student's answer,
  // the correct answer, and the explanation, with correct and wrong clearly marked using
  // colour plus an icon (not colour alone)."
  // --------------------------------------------------------------------------
  const score = result.score ?? 0;
  const marksPerQ = result.marksPerQuestion ?? 1;
  const totalQuestions = result.totalQuestions ?? 0;
  const maxScore = totalQuestions * marksPerQ;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const correctCount = result.correct ?? 0;
  const wrongCount = result.wrong ?? 0;
  const unansweredCount = result.unanswered ?? 0;
  const questions = result.questions || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-2 sm:py-6">
      {/* Back to Portal Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <Link
          href="/student/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer min-h-[44px]"
        >
          <History className="w-4 h-4" />
          <span>My History</span>
        </Link>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SUMMARY SCORECARD CARD                                               */}
      {/* -------------------------------------------------------------------- */}
      <Card className="border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="bg-[#1E3A8A] text-white p-5 sm:p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto border border-white/20">
            <Award className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
              Official Scorecard
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              {result.testTitle}
            </h1>
            <p className="text-xs text-blue-200 mt-1">
              Class {result.classGrade} • {result.subjectName} • {result.studentName}
            </p>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Main Score Display Box */}
          <div className="p-5 rounded-[8px] bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Your Total Score
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">
                {score}
              </span>
              <span className="text-lg sm:text-xl font-semibold text-slate-400">
                / {maxScore} Marks
              </span>
            </div>
            <div className="pt-1.5">
              <Badge
                variant={percentage >= 40 ? "success" : "secondary"}
                className="font-bold text-xs px-3 py-1"
              >
                {percentage}% Score ({percentage >= 40 ? "Passed" : "Needs Review"})
              </Badge>
            </div>
          </div>

          {/* Breakdown Grid (Correct, Wrong, Unanswered) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Performance Breakdown
            </span>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-3.5 rounded-[8px] bg-green-50 border border-green-200 text-center">
                <div className="flex items-center justify-center gap-1 text-green-700 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Correct</span>
                </div>
                <span className="text-2xl font-extrabold text-green-800 block mt-1">
                  {correctCount}
                </span>
                <span className="text-[11px] text-green-700 block">
                  +{correctCount * marksPerQ} Marks
                </span>
              </div>

              <div className="p-3.5 rounded-[8px] bg-red-50 border border-red-200 text-center">
                <div className="flex items-center justify-center gap-1 text-red-700 text-xs font-semibold">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Wrong</span>
                </div>
                <span className="text-2xl font-extrabold text-red-800 block mt-1">
                  {wrongCount}
                </span>
                <span className="text-[11px] text-red-700 block">
                  {result.negativeMarks && result.negativeMarks > 0
                    ? `-${wrongCount * result.negativeMarks} Marks`
                    : "0 Deductions"}
                </span>
              </div>

              <div className="p-3.5 rounded-[8px] bg-slate-100 border border-slate-200 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-600 text-xs font-semibold">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Skipped</span>
                </div>
                <span className="text-2xl font-extrabold text-slate-700 block mt-1">
                  {unansweredCount}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Unanswered
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------------- */}
      {/* QUESTION-BY-QUESTION DETAILED REVIEW                                 */}
      {/* "listing the question, the student's answer, the correct answer, and */}
      {/* the explanation, with correct and wrong clearly marked using colour  */}
      {/* plus an icon (not colour alone)."                                    */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Question-by-Question Review
            </h2>
            <p className="text-xs text-slate-500">
              Review your answers, correct answers, and detailed explanations.
            </p>
          </div>
          <Badge variant="primary" className="text-xs">
            {questions.length} Questions
          </Badge>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const hasAnswered = q.studentSelectedOption !== null && q.studentSelectedOption !== undefined;
            const isCorrect = q.isCorrect;

            // Evaluation status capsule
            let statusBadge = (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Skipped</span>
              </div>
            );

            if (hasAnswered) {
              if (isCorrect) {
                statusBadge = (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                    <span>Correct (+{marksPerQ})</span>
                  </div>
                );
              } else {
                statusBadge = (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5 text-red-700" />
                    <span>
                      Incorrect{" "}
                      {result.negativeMarks && result.negativeMarks > 0
                        ? `(-${result.negativeMarks})`
                        : "(0)"}
                    </span>
                  </div>
                );
              }
            }

            const optionsList: { key: "A" | "B" | "C" | "D"; text: string }[] = [
              { key: "A", text: q.optionA },
              { key: "B", text: q.optionB },
              { key: "C", text: q.optionC },
              { key: "D", text: q.optionD },
            ];

            return (
              <Card
                key={q.questionId}
                className={`transition-colors bg-white ${
                  hasAnswered
                    ? isCorrect
                      ? "border-green-300"
                      : "border-red-300"
                    : "border-slate-200"
                }`}
              >
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-3 space-y-0 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Question {idx + 1}
                    </span>
                  </div>
                  <div>{statusBadge}</div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Question Text */}
                  <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {q.questionText}
                  </p>

                  {/* 4 Options Grid */}
                  <div className="space-y-2 pt-1">
                    {optionsList.map((opt) => {
                      const isStudentChoice = q.studentSelectedOption === opt.key;
                      const isActualCorrect = q.correctOption === opt.key;

                      let rowStyle = "bg-white border-slate-200 text-slate-700";
                      let indicator = null;

                      if (isActualCorrect) {
                        rowStyle = "bg-green-50/80 border-green-300 text-green-900 font-semibold ring-1 ring-green-400";
                        indicator = (
                          <div className="flex items-center gap-1 text-green-700 text-xs font-bold shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-green-700" />
                            <span>Correct Answer</span>
                          </div>
                        );
                      } else if (isStudentChoice && !isActualCorrect) {
                        rowStyle = "bg-red-50/80 border-red-300 text-red-900 font-semibold ring-1 ring-red-400";
                        indicator = (
                          <div className="flex items-center gap-1 text-red-700 text-xs font-bold shrink-0">
                            <XCircle className="w-4 h-4 text-red-700" />
                            <span>Your Answer</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={opt.key}
                          className={`p-3 rounded-[6px] border flex items-center justify-between gap-3 text-xs sm:text-sm ${rowStyle}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isActualCorrect
                                  ? "bg-green-700 text-white"
                                  : isStudentChoice
                                  ? "bg-red-700 text-white"
                                  : "bg-slate-100 text-slate-600 border border-slate-300"
                              }`}
                            >
                              {opt.key}
                            </div>
                            <span className="leading-snug">{opt.text}</span>
                          </div>

                          {indicator}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Box */}
                  {q.explanation && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-[6px] space-y-1 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold text-[#1E3A8A]">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Teacher Explanation</span>
                      </div>
                      <p className="leading-relaxed pl-5 text-slate-600">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom Back Button */}
      <div className="pt-4 text-center">
        <Link href="/student">
          <Button variant="primary" size="md" className="min-h-[44px] px-8">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
