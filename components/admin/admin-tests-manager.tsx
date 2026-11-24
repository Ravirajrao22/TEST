"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileCheck2,
  Sparkles,
  Plus,
  Clock,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  Users,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  updateTestShowResultAction,
  updateTestPublishStatusAction,
  type AdminTestOverviewItem,
} from "@/app/admin/tests/actions";

interface AdminTestsManagerProps {
  initialTests: AdminTestOverviewItem[];
}

export function AdminTestsManager({ initialTests }: AdminTestsManagerProps) {
  const { toast } = useToast();
  const [tests, setTests] = React.useState<AdminTestOverviewItem[]>(initialTests);
  const [selectedGrade, setSelectedGrade] = React.useState<string>("all");
  const [updatingTestId, setUpdatingTestId] = React.useState<string | null>(null);
  const [updatingPublishTestId, setUpdatingPublishTestId] = React.useState<string | null>(null);

  // Sync with prop changes
  React.useEffect(() => {
    setTests(initialTests);
  }, [initialTests]);

  // Handle Switch Toggle for Individual Test Publish Status
  const handleTogglePublish = async (testId: string, currentVal: boolean) => {
    const newVal = !currentVal;

    // Optimistic UI update
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, isPublished: newVal } : t))
    );
    setUpdatingPublishTestId(testId);

    try {
      const res = await updateTestPublishStatusAction(testId, newVal);
      if (res.success) {
        toast.success(res.message);
      } else {
        // Rollback on failure
        setTests((prev) =>
          prev.map((t) => (t.id === testId ? { ...t, isPublished: currentVal } : t))
        );
        toast.error(res.message || "Failed to update publish status.");
      }
    } catch (err: any) {
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, isPublished: currentVal } : t))
      );
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setUpdatingPublishTestId(null);
    }
  };

  // Handle Switch Toggle for Individual Test
  const handleToggleShowResult = async (testId: string, currentVal: boolean) => {
    const newVal = !currentVal;

    // Optimistic UI update
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, showResult: newVal } : t))
    );
    setUpdatingTestId(testId);

    try {
      const res = await updateTestShowResultAction(testId, newVal);
      if (res.success) {
        toast.success(res.message);
      } else {
        // Rollback on failure
        setTests((prev) =>
          prev.map((t) => (t.id === testId ? { ...t, showResult: currentVal } : t))
        );
        toast.error(res.message || "Failed to update result visibility.");
      }
    } catch (err: any) {
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, showResult: currentVal } : t))
      );
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setUpdatingTestId(null);
    }
  };

  // Filter tests by selected grade
  const filteredTests = tests.filter((t) => {
    if (selectedGrade === "all") return true;
    return t.grade === parseInt(selectedGrade, 10);
  });

  return (
    <div className="space-y-6">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-[8px] border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              options={[
                { value: "all", label: "All Classes (8-12)" },
                { value: "8", label: "Class 8" },
                { value: "9", label: "Class 9" },
                { value: "10", label: "Class 10" },
                { value: "11", label: "Class 11" },
                { value: "12", label: "Class 12" },
              ]}
            />
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline-block">
            Showing {filteredTests.length} {filteredTests.length === 1 ? "test" : "tests"}
          </span>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <Link href="/admin/ai-generator" className="flex-1 sm:flex-initial">
            <Button variant="secondary" size="sm" className="min-h-[40px] w-full sm:w-auto">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#1E3A8A]" />
              Generate with AI
            </Button>
          </Link>
          <Link href="/admin/classes" className="flex-1 sm:flex-initial">
            <Button variant="primary" size="sm" className="min-h-[40px] w-full sm:w-auto">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Classes & Tests
            </Button>
          </Link>
        </div>
      </div>

      {/* Tests List */}
      {filteredTests.length > 0 ? (
        <div className="space-y-3">
          {filteredTests.map((t) => {
            const isUpdating = updatingTestId === t.id;

            return (
              <Card
                key={t.id}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: Test Details */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={t.isPublished ? "success" : "secondary"}
                          className={`text-xs font-semibold ${
                            !t.isPublished ? "bg-amber-100 text-amber-800 border-amber-200" : ""
                          }`}
                        >
                          {t.isPublished ? "Published" : "Draft (Unpublished)"}
                        </Badge>
                        <Badge variant="primary" className="text-xs font-semibold">
                          Class {t.grade}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-700">
                          {t.subjectName}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {t.durationMinutes ? `${t.durationMinutes} mins` : "Untimed"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {t.questionCount} {t.questionCount === 1 ? "Question" : "Questions"}
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900 text-base leading-snug">
                        {t.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {t.submissionCount} {t.submissionCount === 1 ? "student attempt" : "student attempts"}
                        </span>
                        <span>•</span>
                        <span>+{t.marksPerQuestion} mark / correct</span>
                        {t.negativeMarks > 0 ? (
                          <span className="text-amber-700 font-medium">
                            • -{t.negativeMarks} neg marks
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: Publish Switch & Visibility Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      {/* Publish to Students Switch */}
                      <div className={`flex items-center justify-between sm:justify-start gap-3 p-2.5 rounded-[6px] border ${
                        t.isPublished
                          ? "bg-green-50/70 border-green-200"
                          : "bg-amber-50/80 border-amber-200"
                      }`}>
                        <div className="text-left space-y-0.5">
                          <span className="text-xs font-semibold text-slate-900 block">
                            {t.isPublished ? "Published" : "Draft Test"}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {t.isPublished ? "Students can attempt" : "Hidden from students"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!t.isPublished && (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              disabled={updatingPublishTestId === t.id}
                              onClick={() => handleTogglePublish(t.id, false)}
                              className="text-xs font-bold py-1 px-2.5 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Send className="w-3.5 h-3.5 mr-1" />
                              Publish Now
                            </Button>
                          )}
                          <Switch
                            id={`publish-${t.id}`}
                            checked={t.isPublished}
                            disabled={updatingPublishTestId === t.id}
                            onCheckedChange={() => handleTogglePublish(t.id, t.isPublished)}
                          />
                        </div>
                      </div>

                      {/* Show result to students Switch */}
                      <div className="flex items-center justify-between sm:justify-start gap-3 p-2.5 rounded-[6px] bg-slate-50 border border-slate-200">
                        <div className="text-left space-y-0.5">
                          <span className="text-xs font-semibold text-slate-900 block">
                            Show results
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {t.showResult
                              ? "Immediate"
                              : "On release"}
                          </span>
                        </div>

                        <Switch
                          id={`show-res-${t.id}`}
                          checked={t.showResult}
                          disabled={isUpdating}
                          onCheckedChange={() => handleToggleShowResult(t.id, t.showResult)}
                        />
                      </div>
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
          title="No tests found"
          description={
            selectedGrade === "all"
              ? "No tests have been created yet. Generate one with AI or create tests inside a class subject."
              : `No tests found for Class ${selectedGrade}.`
          }
          action={
            <Link href="/admin/ai-generator">
              <Button variant="primary">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Questions with AI
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
