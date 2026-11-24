"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Sparkles,
  AlertCircle,
  Edit2,
  Award,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { CurrentUser } from "@/lib/supabase/server";
import {
  saveStudentProfileAction,
  getStudentPortalDataAction,
  type StudentSubjectItem,
  type StudentTestItem,
} from "@/app/student/actions";

const GRADES = [8, 9, 10, 11, 12];

interface StudentPortalClientProps {
  user: CurrentUser;
}

export function StudentPortalClient({ user }: StudentPortalClientProps) {
  const { toast } = useToast();

  // Profile Form State
  const [fullName, setFullName] = React.useState<string>(user.fullName || "");
  const [selectedGrade, setSelectedGrade] = React.useState<number>(
    user.grade && GRADES.includes(user.grade) ? user.grade : 10
  );
  const [isConfirmed, setIsConfirmed] = React.useState<boolean>(
    Boolean(user.fullName && user.grade)
  );
  const [isEditingProfile, setIsEditingProfile] = React.useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState<boolean>(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  // Portal Content State
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [subjects, setSubjects] = React.useState<StudentSubjectItem[]>([]);
  const [tests, setTests] = React.useState<StudentTestItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(null);

  // Load portal data whenever selected grade changes
  const loadPortalData = React.useCallback(
    async (grade: number) => {
      setIsLoading(true);
      try {
        const res = await getStudentPortalDataAction(grade);
        if (res.success) {
          setSubjects(res.subjects);
          setTests(res.tests);
        } else {
          toast.error(res.error || "Failed to load subjects and tests.");
        }
      } catch (err: any) {
        toast.error(err?.message || "Error connecting to portal.");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  React.useEffect(() => {
    if (isConfirmed) {
      loadPortalData(selectedGrade);
    }
  }, [isConfirmed, selectedGrade, loadPortalData]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setProfileError("Full name must be at least 3 characters.");
      return;
    }
    if (trimmedName.length > 60) {
      setProfileError("Full name cannot exceed 60 characters.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await saveStudentProfileAction({
        fullName: trimmedName,
        grade: selectedGrade,
      });

      if (res.success) {
        toast.success(`Profile saved. Welcome, ${trimmedName}!`);
        setIsConfirmed(true);
        setIsEditingProfile(false);
        loadPortalData(selectedGrade);
      } else {
        setProfileError(res.error || "Failed to save profile.");
        toast.error(res.error || "Failed to save profile.");
      }
    } catch (err: any) {
      setProfileError(err?.message || "Network error. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Selected Subject Details
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectTests = tests.filter((t) => t.subjectId === selectedSubjectId);

  // --------------------------------------------------------------------------
  // STEP 1: Profile & Class Selection Screen (Initial or Edit mode)
  // --------------------------------------------------------------------------
  if (!isConfirmed || isEditingProfile) {
    return (
      <div className="space-y-6 max-w-md mx-auto py-2 sm:py-6">
        <div className="text-center space-y-2">
          <img
            src="/logo.jpg"
            alt="Ayushman Shikshan Sansthan Logo"
            className="w-16 h-16 rounded-full object-cover mx-auto border border-slate-200 shadow-xs"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isEditingProfile ? "Change Your Details" : "Welcome to Ayushman Sansthan"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {isEditingProfile
              ? "Update your enrolled class or displayed full name."
              : "Please enter your full name and select your enrolled class to start practice tests."}
          </p>
        </div>

        <Card className="border border-slate-200 bg-white">
          <form onSubmit={handleSaveProfile} className="p-5 sm:p-6 space-y-5">
            {profileError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-[6px] border border-red-200 bg-red-50 text-red-700 text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{profileError}</span>
              </div>
            )}

            {/* Full Name Input */}
            <Input
              label="Full Name *"
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (profileError) setProfileError(null);
              }}
              helperText="This name will appear on your test scorecards."
              required
              minLength={3}
              maxLength={60}
            />

            {/* Class Selection Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 block">
                Select Your Class *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {GRADES.map((cls) => {
                  const isSelected = selectedGrade === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedGrade(cls)}
                      className={`flex flex-col items-center justify-center min-h-[50px] py-2 rounded-[8px] border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] cursor-pointer ${
                        isSelected
                          ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[10px] text-opacity-80">Class</span>
                      <span className="text-base font-bold leading-tight">{cls}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                You will see tests aligned with the NCERT syllabus for Class {selectedGrade}.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSavingProfile}
                className="w-full min-h-[44px]"
              >
                {isEditingProfile ? "Save Changes" : "Continue to Portal"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              {isEditingProfile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsEditingProfile(false)}
                  className="w-full min-h-[44px]"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 1A: SUBJECTS & TESTS PORTAL VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Student Profile Capsule & Class Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-[8px] border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-bold text-base shrink-0 border border-blue-100">
            {selectedGrade}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-base leading-snug">
                {fullName || "Student"}
              </h2>
              <Badge variant="primary" className="text-[11px]">
                Class {selectedGrade}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Coaching Portal • {subjects.length} Subjects Available
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsEditingProfile(true)}
          className="self-start sm:self-auto min-h-[40px] text-xs font-semibold"
          title="Change your class or full name"
        >
          <Edit2 className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
          Change Class
        </Button>
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-44" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full rounded-[8px]" />
            <Skeleton className="h-28 w-full rounded-[8px]" />
            <Skeleton className="h-28 w-full rounded-[8px]" />
            <Skeleton className="h-28 w-full rounded-[8px]" />
          </div>
        </div>
      ) : selectedSubjectId === null ? (
        /* -------------------------------------------------------------------- */
        /* SUBJECTS SELECTION VIEW: Large Tappable Cards                         */
        /* -------------------------------------------------------------------- */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Choose a Subject</h2>
            <span className="text-xs text-slate-500">
              Class {selectedGrade} Syllabus
            </span>
          </div>

          {subjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className="flex items-center justify-between p-4 sm:p-5 rounded-[8px] bg-white border border-slate-200 hover:border-[#1E3A8A] hover:bg-slate-50/70 transition-all text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] min-h-[72px]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-[6px] bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-[#1E3A8A] flex items-center justify-center shrink-0 transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base group-hover:text-[#1E3A8A] transition-colors">
                        {sub.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {sub.testsCount === 0
                          ? "No tests scheduled"
                          : `${sub.testsCount} ${sub.testsCount === 1 ? "Test" : "Tests"} Ready`}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#1E3A8A] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Layers className="w-8 h-8 text-slate-400" />}
              title={`No subjects available for Class ${selectedGrade}`}
              description="Your coaching centre has not added subjects for this class yet. Please check back later."
            />
          )}
        </div>
      ) : (
        /* -------------------------------------------------------------------- */
        /* TESTS SELECTION VIEW: Published Tests for Selected Subject           */
        /* -------------------------------------------------------------------- */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubjectId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer min-h-[44px] px-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Subjects</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-600 truncate">
              {currentSubject?.name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {currentSubject?.name} Tests
            </h2>
            <Badge variant="secondary" className="text-xs font-medium">
              {subjectTests.length} {subjectTests.length === 1 ? "Test" : "Tests"}
            </Badge>
          </div>

          {subjectTests.length > 0 ? (
            <div className="space-y-3">
              {subjectTests.map((t) => {
                return (
                  <Card
                    key={t.id}
                    className={`transition-colors ${
                      t.isAttempted
                        ? "bg-slate-50/60 border-slate-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {t.isAttempted ? (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800 border-green-200 font-semibold text-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-700" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge
                                variant="primary"
                                className="bg-blue-50 text-[#1E3A8A] border-blue-200 font-semibold text-xs"
                              >
                                Ready to take
                              </Badge>
                            )}

                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {t.durationMinutes
                                ? `${t.durationMinutes} mins`
                                : "Untimed"}
                            </span>

                            <span className="text-xs text-slate-500">
                              • {t.questionCount} {t.questionCount === 1 ? "Question" : "Questions"}
                            </span>
                          </div>

                          <h3 className="font-semibold text-slate-900 text-base leading-snug">
                            {t.title}
                          </h3>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                            <span>+{t.marksPerQuestion} mark / correct</span>
                            {t.negativeMarks > 0 ? (
                              <span className="text-amber-700 font-medium">
                                • -{t.negativeMarks} neg marking
                              </span>
                            ) : (
                              <span className="text-slate-500">• No negative marks</span>
                            )}
                          </div>
                        </div>

                        {/* Action: Cannot open again if attempted */}
                        <div className="shrink-0 pt-2 sm:pt-0">
                          {t.isAttempted ? (
                            t.attemptId ? (
                              <Link href={`/student/result/${t.attemptId}`}>
                                <Button
                                  variant="secondary"
                                  size="md"
                                  className="w-full sm:w-auto min-h-[44px]"
                                >
                                  {t.showResult ? (
                                    <>
                                      <Award className="w-4 h-4 mr-1.5 text-slate-600" />
                                      View Scorecard
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-700" />
                                      View Submission
                                    </>
                                  )}
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="secondary"
                                size="md"
                                disabled
                                className="w-full sm:w-auto min-h-[44px] opacity-70 cursor-not-allowed"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-700" />
                                Completed
                              </Button>
                            )
                          ) : (
                            <Link href={`/student/test/${t.id}`}>
                              <Button
                                variant="primary"
                                size="md"
                                className="w-full sm:w-auto min-h-[44px] px-5"
                              >
                                Start Test
                                <ArrowRight className="w-4 h-4 ml-1.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<FileCheck2 className="w-8 h-8 text-slate-400" />}
              title={`No published tests for ${currentSubject?.name}`}
              description="Your teacher has not published tests for this subject yet. Please check back later."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedSubjectId(null)}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  View Other Subjects
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
