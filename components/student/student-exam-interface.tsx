"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  Bookmark,
  Flag,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Send,
  RefreshCw,
  X,
  Menu,
  HelpCircle,
  Check,
  Award,
  Layers,
  FileCheck2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { CurrentUser } from "@/lib/supabase/server";
import {
  submitTestAttemptAction,
  type StudentExamQuestion,
} from "@/app/student/actions";

// Deterministic Pseudo-random number generator for stable shuffling per student & test
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createRNG(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function shuffleList<T>(list: T[], rng: () => number): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface ExamOption {
  displaySlot: "A" | "B" | "C" | "D";
  originalKey: "A" | "B" | "C" | "D";
  text: string;
}

export interface PreparedQuestion {
  id: string;
  originalPosition: number;
  questionText: string;
  options: ExamOption[];
}

interface StudentExamInterfaceProps {
  user: CurrentUser;
  test: {
    id: string;
    title: string;
    durationMinutes: number | null;
    marksPerQuestion: number;
    negativeMarks: number;
    showResult: boolean;
    subjectName: string;
    classGrade: number;
    classId: string;
  };
  rawQuestions: StudentExamQuestion[];
  isAlreadyAttempted?: boolean;
  attemptId?: string;
}

export function StudentExamInterface({
  user,
  test,
  rawQuestions,
  isAlreadyAttempted = false,
  attemptId,
}: StudentExamInterfaceProps) {
  const router = useRouter();
  const { toast } = useToast();

  const storageKey = `testhub_exam_${test.id}`;

  // --------------------------------------------------------------------------
  // STEP 2: INSTRUCTIONS STATE VS ACTIVE EXAM STATE
  // --------------------------------------------------------------------------
  const [hasStarted, setHasStarted] = React.useState<boolean>(false);
  const [preparedQuestions, setPreparedQuestions] = React.useState<PreparedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [answers, setAnswers] = React.useState<Record<string, "A" | "B" | "C" | "D" | null>>({});
  const [markedQuestions, setMarkedQuestions] = React.useState<Set<string>>(new Set());

  // Timer state
  const totalDurationSeconds = (test.durationMinutes || 0) * 60;
  const [timeRemainingSeconds, setTimeRemainingSeconds] = React.useState<number>(totalDurationSeconds);
  const [startedAtTimestamp, setStartedAtTimestamp] = React.useState<number>(0);

  // Submit Modal & State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isQuestionListDrawerOpen, setIsQuestionListDrawerOpen] = React.useState<boolean>(false);
  const [isOffline, setIsOffline] = React.useState<boolean>(false);

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      toast.warning("You are currently offline. Answers continue to save locally on your phone.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // --------------------------------------------------------------------------
  // PREPARE AND RESTORE SHUFFLED QUESTIONS & SAVED ANSWERS
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    if (rawQuestions.length === 0) return;

    // Check if state exists in localStorage
    let savedState: any = null;
    try {
      const rawStored = localStorage.getItem(storageKey);
      if (rawStored) {
        savedState = JSON.parse(rawStored);
      }
    } catch {
      // Ignore localStorage parse errors
    }

    // Seeded shuffle: stable per student & test
    const seed = hashString(`${user.id}_${test.id}`);
    const rng = createRNG(seed);

    // 1. Shuffled question ordering
    let finalQuestions: StudentExamQuestion[] = [];
    if (savedState?.questionIds && Array.isArray(savedState.questionIds)) {
      const questionMap = new Map(rawQuestions.map((q) => [q.id, q]));
      savedState.questionIds.forEach((id: string) => {
        const found = questionMap.get(id);
        if (found) finalQuestions.push(found);
      });
      // Append any remaining if mismatched
      rawQuestions.forEach((q) => {
        if (!finalQuestions.some((fq) => fq.id === q.id)) {
          finalQuestions.push(q);
        }
      });
    } else {
      finalQuestions = shuffleList(rawQuestions, rng);
    }

    // 2. Shuffled options per question
    const displaySlots: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
    const prepared: PreparedQuestion[] = finalQuestions.map((q) => {
      const originalOptions: { key: "A" | "B" | "C" | "D"; text: string }[] = [
        { key: "A", text: q.option_a },
        { key: "B", text: q.option_b },
        { key: "C", text: q.option_c },
        { key: "D", text: q.option_d },
      ];

      let shuffledOpts: typeof originalOptions = [];
      const savedOptionOrder = savedState?.optionOrderMap?.[q.id];

      if (savedOptionOrder && Array.isArray(savedOptionOrder)) {
        const optMap = new Map(originalOptions.map((o) => [o.key, o]));
        savedOptionOrder.forEach((k: "A" | "B" | "C" | "D") => {
          const opt = optMap.get(k);
          if (opt) shuffledOpts.push(opt);
        });
      } else {
        shuffledOpts = shuffleList(originalOptions, rng);
      }

      const options: ExamOption[] = shuffledOpts.map((opt, idx) => ({
        displaySlot: displaySlots[idx],
        originalKey: opt.key,
        text: opt.text,
      }));

      return {
        id: q.id,
        originalPosition: q.position,
        questionText: q.question_text,
        options,
      };
    });

    setPreparedQuestions(prepared);

    // 3. Restore active state if test was in progress
    if (savedState && savedState.hasStarted) {
      setHasStarted(true);
      if (savedState.answers) setAnswers(savedState.answers);
      if (savedState.marked) setMarkedQuestions(new Set(savedState.marked));
      if (typeof savedState.currentIndex === "number") {
        setCurrentIndex(
          Math.min(Math.max(0, savedState.currentIndex), prepared.length - 1)
        );
      }
      if (savedState.startedAt) {
        setStartedAtTimestamp(savedState.startedAt);
        if (test.durationMinutes) {
          const elapsed = Math.floor((Date.now() - savedState.startedAt) / 1000);
          const remaining = Math.max(0, totalDurationSeconds - elapsed);
          setTimeRemainingSeconds(remaining);
        }
      }
    }
  }, [rawQuestions, storageKey, user.id, test.id, test.durationMinutes, totalDurationSeconds]);

  // --------------------------------------------------------------------------
  // AUTOSAVE ANSWERS TO LOCALSTORAGE ON EVERY TAP
  // --------------------------------------------------------------------------
  const persistState = React.useCallback(
    (
      updatedAnswers: Record<string, "A" | "B" | "C" | "D" | null>,
      updatedMarked: Set<string>,
      updatedIndex: number,
      startedAt: number
    ) => {
      try {
        const optionOrderMap: Record<string, string[]> = {};
        preparedQuestions.forEach((pq) => {
          optionOrderMap[pq.id] = pq.options.map((o) => o.originalKey);
        });

        const payload = {
          hasStarted: true,
          questionIds: preparedQuestions.map((q) => q.id),
          optionOrderMap,
          answers: updatedAnswers,
          marked: Array.from(updatedMarked),
          currentIndex: updatedIndex,
          startedAt,
        };

        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        console.warn("Autosave storage warning:", e);
      }
    },
    [preparedQuestions, storageKey]
  );

  // --------------------------------------------------------------------------
  // TIMER TICK & AUTO-SUBMIT LOGIC
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    if (!hasStarted || !test.durationMinutes || startedAtTimestamp === 0) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtTimestamp) / 1000);
      const remaining = Math.max(0, totalDurationSeconds - elapsed);
      setTimeRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, test.durationMinutes, startedAtTimestamp, totalDurationSeconds]);

  // Format time display (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isLowTime = test.durationMinutes !== null && timeRemainingSeconds <= 300; // <= 5 minutes

  // --------------------------------------------------------------------------
  // ACCIDENTAL CLOSE / BACK WARNING WHILE ATTEMPT IS IN PROGRESS
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    if (!hasStarted) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasStarted]);

  // --------------------------------------------------------------------------
  // ACTION: START TEST (STEP 2 -> STEP 3)
  // --------------------------------------------------------------------------
  const handleStartTest = () => {
    const now = Date.now();
    setHasStarted(true);
    setStartedAtTimestamp(now);
    setTimeRemainingSeconds(totalDurationSeconds);
    persistState(answers, markedQuestions, 0, now);
    toast.success("Exam started. Good luck!");
  };

  // --------------------------------------------------------------------------
  // ACTION: SELECT OR CLEAR OPTION (RADIO GROUP WITH CLEAR-ON-SECOND-TAP)
  // --------------------------------------------------------------------------
  const handleSelectOption = (originalKey: "A" | "B" | "C" | "D") => {
    const currentQ = preparedQuestions[currentIndex];
    if (!currentQ) return;

    const existingAnswer = answers[currentQ.id];
    // If tapped again, clear the selection
    const newAnswer = existingAnswer === originalKey ? null : originalKey;

    const updated = {
      ...answers,
      [currentQ.id]: newAnswer,
    };

    setAnswers(updated);
    persistState(updated, markedQuestions, currentIndex, startedAtTimestamp);
  };

  // --------------------------------------------------------------------------
  // ACTION: TOGGLE MARK FOR REVIEW
  // --------------------------------------------------------------------------
  const handleToggleMark = () => {
    const currentQ = preparedQuestions[currentIndex];
    if (!currentQ) return;

    const updated = new Set(markedQuestions);
    if (updated.has(currentQ.id)) {
      updated.delete(currentQ.id);
    } else {
      updated.add(currentQ.id);
    }

    setMarkedQuestions(updated);
    persistState(answers, updated, currentIndex, startedAtTimestamp);
  };

  // --------------------------------------------------------------------------
  // NAVIGATION: PREVIOUS & NEXT
  // --------------------------------------------------------------------------
  const handleGoToQuestion = (index: number) => {
    if (index >= 0 && index < preparedQuestions.length) {
      setCurrentIndex(index);
      setIsQuestionListDrawerOpen(false);
      persistState(answers, markedQuestions, index, startedAtTimestamp);
    }
  };

  const handleNext = () => {
    if (currentIndex < preparedQuestions.length - 1) {
      handleGoToQuestion(currentIndex + 1);
    } else {
      // Last question -> open Submit modal
      setIsSubmitModalOpen(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      handleGoToQuestion(currentIndex - 1);
    }
  };

  // --------------------------------------------------------------------------
  // SUBMISSION LOGIC (STEP 4)
  // --------------------------------------------------------------------------
  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined).length;
  const unansweredCount = preparedQuestions.length - answeredCount;
  const markedCount = markedQuestions.size;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!navigator.onLine) {
      toast.error(
        "You are offline. Your answers are safely stored on your device. Please reconnect to submit."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitTestAttemptAction({
        testId: test.id,
        studentName: user.fullName || "Student",
        classId: test.classId,
        answers: answers as Record<string, string | null>,
      });

      if (res.success && res.attemptId) {
        // Clear saved exam storage
        try {
          localStorage.removeItem(storageKey);
        } catch {}

        toast.success("Test submitted successfully!");
        router.push(`/student/result/${res.attemptId}`);
      } else {
        toast.error(res.error || "Submission rejected by server.");
        setIsSubmitting(false);
      }
    } catch (e: any) {
      toast.error(e?.message || "An unexpected error occurred during submission.");
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast.info("Time has expired! Submitting your test automatically...");
    setIsSubmitting(true);

    try {
      const res = await submitTestAttemptAction({
        testId: test.id,
        studentName: user.fullName || "Student",
        classId: test.classId,
        answers: answers as Record<string, string | null>,
      });

      if (res.success && res.attemptId) {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        router.push(`/student/result/${res.attemptId}`);
      } else {
        toast.error(res.error || "Failed to submit attempt.");
      }
    } catch {
      toast.error("Auto-submission error. Answers remain saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // ALREADY ATTEMPTED GUARD
  // --------------------------------------------------------------------------
  if (isAlreadyAttempted) {
    return (
      <div className="max-w-md mx-auto py-8">
        <Card className="border border-slate-200 bg-white text-center p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              Test Already Completed
            </h2>
            <p className="text-sm text-slate-600">
              You have already submitted an attempt for &quot;{test.title}&quot;.
              Multiple submissions are not permitted.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {attemptId && test.showResult ? (
              <Link href={`/student/result/${attemptId}`}>
                <Button variant="primary" size="md" className="w-full min-h-[44px]">
                  <Award className="w-4 h-4 mr-1.5" />
                  View Scorecard
                </Button>
              </Link>
            ) : null}

            <Link href="/student">
              <Button variant="secondary" size="md" className="w-full min-h-[44px]">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Student Portal
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 2: INSTRUCTIONS SCREEN (Before Start Test is clicked)
  // --------------------------------------------------------------------------
  if (!hasStarted) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-2 sm:py-4">
        {/* Navigation Breadcrumb */}
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subjects</span>
        </Link>

        {/* Test Header Card */}
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="primary" className="text-xs">
                  Class {test.classGrade}
                </Badge>
                <span className="text-xs font-semibold text-slate-600">
                  {test.subjectName}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {test.title}
              </h1>
            </div>

            {/* Test Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-slate-100">
              <div className="p-3 bg-slate-50 rounded-[6px] text-center space-y-0.5">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">
                  Questions
                </span>
                <span className="text-base font-bold text-slate-900">
                  {rawQuestions.length} MCQs
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-[6px] text-center space-y-0.5">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">
                  Duration
                </span>
                <span className="text-base font-bold text-slate-900">
                  {test.durationMinutes ? `${test.durationMinutes} Mins` : "Untimed"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-[6px] text-center space-y-0.5">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">
                  Marks / Q
                </span>
                <span className="text-base font-bold text-green-700">
                  +{test.marksPerQuestion}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-[6px] text-center space-y-0.5">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">
                  Negative Mark
                </span>
                <span className="text-base font-bold text-amber-700">
                  {test.negativeMarks > 0 ? `-${test.negativeMarks}` : "None"}
                </span>
              </div>
            </div>

            {/* Instructions List */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Exam Instructions & Rules
              </h3>
              <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  All questions are multiple-choice with <strong>exactly one correct answer</strong>.
                </li>
                <li>
                  <strong>Radio selection:</strong> Tap an option to select it. Tapping the same option again clears your answer.
                </li>
                <li>
                  <strong>Autosave:</strong> Every answer is instantly saved to your device. If you refresh or close your browser, your answers will not be lost.
                </li>
                <li>
                  <strong>Mark for Review:</strong> You can flag questions to revisit before final submission.
                </li>
                {test.durationMinutes ? (
                  <li>
                    The countdown timer begins immediately upon starting. When the timer reaches <strong>00:00</strong>, the test will automatically submit.
                  </li>
                ) : null}
                <li>
                  You can only submit this test <strong>once</strong>. Ensure all answers are reviewed before clicking Submit.
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <div className="pt-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleStartTest}
                className="w-full min-h-[50px] text-base font-bold"
                disabled={rawQuestions.length === 0}
              >
                {rawQuestions.length === 0 ? "No questions in test" : "Start Test Now"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 3: ACTIVE EXAM INTERFACE
  // --------------------------------------------------------------------------
  const currentQ = preparedQuestions[currentIndex];
  if (!currentQ) return null;

  const currentSelectedOriginal = answers[currentQ.id];
  const isCurrentMarked = markedQuestions.has(currentQ.id);

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* -------------------------------------------------------------------- */}
      {/* EXAM TOP BAR: Test Title & Live Countdown Timer                      */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white rounded-[8px] border border-slate-200">
        <div className="space-y-0.5 truncate flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px] font-semibold">
              Q {currentIndex + 1} of {preparedQuestions.length}
            </Badge>
            <span className="text-xs text-slate-500 hidden sm:inline-block">
              {test.subjectName}
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {test.title}
          </h2>
        </div>

        {/* Live Timer or Offline Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {isOffline && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}

          {test.durationMinutes ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border text-xs sm:text-sm font-bold min-h-[40px] ${
                isLowTime
                  ? "bg-red-50 text-red-700 border-red-300 animate-pulse"
                  : "bg-blue-50 text-[#1E3A8A] border-blue-200"
              }`}
              title="Time Remaining"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTimer(timeRemainingSeconds)}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-[6px]">
              Untimed
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN EXAM BODY: Mobile (One Question) & Desktop (Question + Palette) */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Question Area) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border border-slate-200 bg-white">
            <CardContent className="p-4 sm:p-6 space-y-5">
              {/* Question Header & Mark for Review Toggle */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Question {currentIndex + 1}
                  </span>
                  <span className="text-xs text-slate-500">
                    (+{test.marksPerQuestion} / -{test.negativeMarks})
                  </span>
                </div>

                {/* Mark for review toggle button */}
                <button
                  type="button"
                  onClick={handleToggleMark}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-[6px] text-xs font-semibold transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                    isCurrentMarked
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      isCurrentMarked ? "fill-amber-600 text-amber-700" : "text-slate-500"
                    }`}
                  />
                  <span>{isCurrentMarked ? "Marked for Review" : "Mark for Review"}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                {currentQ.questionText}
              </div>

              {/* Options List: >= 52px high, whole row tappable, radio group behavior */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Select Option (Tap again to clear)
                </div>

                {currentQ.options.map((opt) => {
                  const isSelected = currentSelectedOriginal === opt.originalKey;

                  return (
                    <button
                      key={opt.displaySlot}
                      type="button"
                      onClick={() => handleSelectOption(opt.originalKey)}
                      className={`w-full min-h-[52px] p-3.5 sm:p-4 rounded-[8px] border text-left transition-all flex items-center gap-3.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                        isSelected
                          ? "bg-blue-50/70 border-[#1E3A8A] text-slate-900 shadow-xs ring-1 ring-[#1E3A8A]"
                          : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Option Radio Capsule */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#1E3A8A] text-white"
                            : "bg-slate-100 text-slate-600 border border-slate-300"
                        }`}
                      >
                        {opt.displaySlot}
                      </div>

                      {/* Option Text */}
                      <span className="text-sm sm:text-base font-normal flex-1 leading-snug">
                        {opt.text}
                      </span>

                      {/* Radio Checkmark Indicator */}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Desktop-only Navigation Buttons in Card Footer */}
              <div className="hidden lg:flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="min-h-[44px] px-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {currentIndex === preparedQuestions.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => setIsSubmitModalOpen(true)}
                      className="min-h-[44px] px-6 bg-green-700 hover:bg-green-800"
                    >
                      <Send className="w-4 h-4 mr-1.5" />
                      Submit Test
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleNext}
                      className="min-h-[44px] px-6"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Desktop Palette Sidebar */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <Card className="border border-slate-200 bg-white sticky top-20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Question Palette
                </h3>
                <span className="text-xs text-slate-500">
                  {answeredCount} of {preparedQuestions.length} answered
                </span>
              </div>

              {/* Color Legend */}
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-[#1E3A8A]" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-amber-400" />
                  <span>Marked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-white" />
                  <span>Unanswered</span>
                </div>
              </div>

              {/* Numbered Buttons Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {preparedQuestions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined;
                  const isMarked = markedQuestions.has(q.id);

                  let btnStyle = "bg-white text-slate-700 border-slate-200 hover:bg-slate-100";
                  if (isMarked) {
                    btnStyle = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
                  } else if (isAnswered) {
                    btnStyle = "bg-[#1E3A8A] text-white border-[#1E3A8A] font-bold";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleGoToQuestion(idx)}
                      className={`h-9 rounded-[6px] text-xs font-semibold transition-all border flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${btnStyle} ${
                        isCurrent ? "ring-2 ring-slate-900 ring-offset-1 font-bold" : ""
                      }`}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Submit Test Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="w-full min-h-[44px] bg-green-700 hover:bg-green-800"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Submit Test ({answeredCount}/{preparedQuestions.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* PHONE STICKY BOTTOM BAR (<640px)                                    */}
      {/* -------------------------------------------------------------------- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2.5 px-4 z-40 flex items-center justify-between gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {/* Previous Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="min-h-[44px] px-3 font-semibold text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Prev
        </Button>

        {/* Question Palette Drawer Trigger Button */}
        <button
          type="button"
          onClick={() => setIsQuestionListDrawerOpen(true)}
          className="min-h-[44px] px-3 rounded-[6px] border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <Layers className="w-4 h-4 text-[#1E3A8A]" />
          <span>
            {answeredCount}/{preparedQuestions.length}
          </span>
        </button>

        {/* Next / Submit Button */}
        {currentIndex === preparedQuestions.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="min-h-[44px] px-4 font-bold text-xs bg-green-700 hover:bg-green-800"
          >
            Submit
            <Send className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleNext}
            className="min-h-[44px] px-4 font-semibold text-xs"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* PHONE QUESTION LIST DRAWER / MODAL SHEET                            */}
      {/* -------------------------------------------------------------------- */}
      <Modal
        isOpen={isQuestionListDrawerOpen}
        onClose={() => setIsQuestionListDrawerOpen(false)}
        title="Question Overview"
        description={`${answeredCount} of ${preparedQuestions.length} questions answered.`}
        maxWidth="sm"
        footer={
          <div className="w-full flex flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setIsQuestionListDrawerOpen(false);
                setIsSubmitModalOpen(true);
              }}
              className="w-full min-h-[44px] bg-green-700 hover:bg-green-800"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Submit Test
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsQuestionListDrawerOpen(false)}
              className="w-full min-h-[44px]"
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 p-2 bg-slate-50 rounded-[6px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#1E3A8A]" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span>Marked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-slate-300 bg-white" />
              <span>Unanswered</span>
            </div>
          </div>

          {/* Numbered Grid */}
          <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-1">
            {preparedQuestions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined;
              const isMarked = markedQuestions.has(q.id);

              let btnStyle = "bg-white text-slate-700 border-slate-200 hover:bg-slate-100";
              if (isMarked) {
                btnStyle = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
              } else if (isAnswered) {
                btnStyle = "bg-[#1E3A8A] text-white border-[#1E3A8A] font-bold";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleGoToQuestion(idx)}
                  className={`h-11 rounded-[6px] text-xs font-semibold transition-all border flex items-center justify-center cursor-pointer min-h-[44px] ${btnStyle} ${
                    isCurrent ? "ring-2 ring-slate-900 ring-offset-1 font-bold" : ""
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------- */}
      {/* SUBMIT CONFIRMATION DIALOG (STEP 4)                                 */}
      {/* -------------------------------------------------------------------- */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsSubmitModalOpen(false);
        }}
        title="Submit Test Confirmation"
        description="Review your progress before submitting your attempt."
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Keep Answering
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] bg-green-700 hover:bg-green-800"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Confirm & Submit
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          {isOffline && (
            <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You are currently offline. Please connect to the internet before confirming submission. Your answers are saved locally.
              </span>
            </div>
          )}

          {/* Counts Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-[6px] text-center">
              <span className="text-[11px] text-blue-700 font-semibold block uppercase">
                Answered
              </span>
              <span className="text-xl font-bold text-[#1E3A8A]">
                {answeredCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-[6px] text-center">
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">
                Unanswered
              </span>
              <span className="text-xl font-bold text-slate-800">
                {unansweredCount}
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-[6px] text-center">
              <span className="text-[11px] text-amber-800 font-semibold block uppercase">
                Marked
              </span>
              <span className="text-xl font-bold text-amber-700">
                {markedCount}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed">
            {unansweredCount > 0 ? (
              <p className="text-amber-700 font-medium">
                Note: You still have {unansweredCount} unanswered {unansweredCount === 1 ? "question" : "questions"}.
              </p>
            ) : (
              <p className="text-green-700 font-medium">
                Great job! You have answered all {preparedQuestions.length} questions.
              </p>
            )}
            <p className="mt-1">
              Once submitted, you cannot change your answers. Do you want to submit now?
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
