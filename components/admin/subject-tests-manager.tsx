"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileCheck2,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
  Plus,
  Users,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  updateTestShowResultAction,
  updateTestPublishStatusAction,
  bulkUpdateSubjectTestsShowResultAction,
} from "@/app/admin/tests/actions";

export interface SubjectTestRow {
  id: string;
  title: string;
  durationMinutes: number | null;
  marksPerQuestion: number;
  negativeMarks: number;
  showResult: boolean;
  isPublished: boolean;
  createdAt: string;
}

interface SubjectTestsManagerProps {
  grade: number;
  subjectId: string;
  subjectName: string;
  initialTests: SubjectTestRow[];
}

export function SubjectTestsManager({
  grade,
  subjectId,
  subjectName,
  initialTests,
}: SubjectTestsManagerProps) {
  const { toast } = useToast();
  const [tests, setTests] = React.useState<SubjectTestRow[]>(initialTests);
  const [updatingTestId, setUpdatingTestId] = React.useState<string | null>(null);
  const [updatingPublishId, setUpdatingPublishId] = React.useState<string | null>(null);

  // Bulk dialog state
  const [bulkAction, setBulkAction] = React.useState<"show" | "hide" | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);

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
    setUpdatingPublishId(testId);

    try {
      const res = await updateTestPublishStatusAction(testId, newVal);
      if (res.success) {
        toast.success(res.message);
      } else {
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
      setUpdatingPublishId(null);
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
        setTests((prev) =>
          prev.map((t) => (t.id === testId ? { ...t, showResult: currentVal } : t))
        );
        toast.error(res.message || "Failed to update visibility.");
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

  // Handle Bulk Action
  const handleConfirmBulkAction = async () => {
    if (!bulkAction) return;

    const showResult = bulkAction === "show";
    setIsBulkUpdating(true);

    try {
      const res = await bulkUpdateSubjectTestsShowResultAction(subjectId, showResult);
      if (res.success) {
        setTests((prev) => prev.map((t) => ({ ...t, showResult })));
        toast.success(res.message);
      } else {
        toast.error(res.message || "Bulk update failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsBulkUpdating(false);
      setBulkAction(null);
    }
  };

  const visibleCount = tests.filter((t) => t.showResult).length;
  const hiddenCount = tests.length - visibleCount;

  return (
    <div className="space-y-4">
      {/* Bulk Action Controls Bar */}
      {tests.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-[8px] border border-slate-200">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-900 block">
              Result Visibility for {subjectName}
            </span>
            <span className="text-xs text-slate-500">
              {visibleCount} visible to students • {hiddenCount} hidden
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBulkAction("show")}
              className="text-xs font-semibold min-h-[38px]"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Show results for all tests
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBulkAction("hide")}
              className="text-xs font-semibold min-h-[38px]"
            >
              <EyeOff className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Hide results for all tests
            </Button>
          </div>
        </div>
      )}

      {/* Test Items List */}
      {tests.length > 0 ? (
        <div className="space-y-3">
          {tests.map((t) => {
            const isUpdating = updatingTestId === t.id;

            return (
              <Card
                key={t.id}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={t.isPublished ? "success" : "secondary"}
                          className={`text-[11px] font-semibold ${
                            !t.isPublished ? "bg-amber-100 text-amber-800 border-amber-200" : ""
                          }`}
                        >
                          {t.isPublished ? "Published" : "Draft (Unpublished)"}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {t.durationMinutes ? `${t.durationMinutes} mins` : "Untimed"}
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900 text-base leading-snug">
                        {t.title}
                      </h3>

                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>+{t.marksPerQuestion} mark / correct</span>
                        {t.negativeMarks > 0 ? (
                          <span className="text-amber-700 font-medium">
                            • -{t.negativeMarks} neg mark
                          </span>
                        ) : (
                          <span className="text-slate-500">• No negative marking</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Publish Switch & Show Result Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                      {/* Switch: Publish Status (Draft vs Published) */}
                      <div className={`flex items-center justify-between sm:justify-start gap-3 p-2.5 rounded-[6px] border ${
                        t.isPublished
                          ? "bg-green-50/70 border-green-200"
                          : "bg-amber-50/80 border-amber-200"
                      }`}>
                        <div className="text-left space-y-0.5">
                          <span className="text-xs font-semibold text-slate-900 block">
                            {t.isPublished ? "Published" : "Draft"}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {t.isPublished ? "Active for students" : "Hidden"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!t.isPublished && (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              disabled={updatingPublishId === t.id}
                              onClick={() => handleTogglePublish(t.id, false)}
                              className="text-xs font-bold py-1 px-2.5 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Send className="w-3.5 h-3.5 mr-1" />
                              Publish
                            </Button>
                          )}
                          <Switch
                            id={`sub-pub-${t.id}`}
                            checked={t.isPublished}
                            disabled={updatingPublishId === t.id}
                            onCheckedChange={() => handleTogglePublish(t.id, t.isPublished)}
                          />
                        </div>
                      </div>

                      {/* Switch: Show result to students */}
                      <div className="flex items-center justify-between sm:justify-start gap-3 p-2.5 rounded-[6px] bg-slate-50 border border-slate-200">
                        <div className="text-left space-y-0.5">
                          <span className="text-xs font-semibold text-slate-900 block">
                            Show results
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {t.showResult ? "Immediate" : "Hidden"}
                          </span>
                        </div>

                        <Switch
                          id={`sub-res-${t.id}`}
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
          icon={<FileCheck2 className="w-8 h-8 text-slate-500" />}
          title={`No tests created for ${subjectName} yet`}
          description={`Create manual tests, upload questions via CSV, or generate questions with Gemini AI for Class ${grade} ${subjectName}.`}
          action={
            <Link href={`/admin/ai-generator?class=${grade}&subject=${encodeURIComponent(subjectId)}`}>
              <Button variant="primary">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Questions with AI
              </Button>
            </Link>
          }
        />
      )}

      {/* Bulk Confirm Dialog */}
      <ConfirmDialog
        isOpen={bulkAction !== null}
        onClose={() => setBulkAction(null)}
        onConfirm={handleConfirmBulkAction}
        isLoading={isBulkUpdating}
        title={
          bulkAction === "show"
            ? "Show Results for All Tests?"
            : "Hide Results for All Tests?"
        }
        description={
          bulkAction === "show"
            ? `This will make results visible to students immediately for all ${tests.length} tests in ${subjectName}. Proceed?`
            : `This will hide results from students for all ${tests.length} tests in ${subjectName}. Proceed?`
        }
        confirmText={
          bulkAction === "show" ? "Show All Results" : "Hide All Results"
        }
      />
    </div>
  );
}
