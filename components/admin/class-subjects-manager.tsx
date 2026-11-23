"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, ArrowRight, BookOpen, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  createSubjectAction,
  renameSubjectAction,
  deleteSubjectAction,
} from "@/app/admin/classes/actions";
import { bulkUpdateClassTestsShowResultAction } from "@/app/admin/tests/actions";
import {
  subjectInputSchema,
  type SubjectWithCounts,
} from "@/lib/validations/subject";

interface ClassSubjectsManagerProps {
  grade: number;
  classId: string;
  initialSubjects: SubjectWithCounts[];
}

export function ClassSubjectsManager({
  grade,
  classId,
  initialSubjects,
}: ClassSubjectsManagerProps) {
  const { toast } = useToast();
  const [subjects, setSubjects] = React.useState<SubjectWithCounts[]>(initialSubjects);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newSubjectName, setNewSubjectName] = React.useState("");
  const [addError, setAddError] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);

  const [renameSubject, setRenameSubject] = React.useState<SubjectWithCounts | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [isRenaming, setIsRenaming] = React.useState(false);

  const [deleteSubject, setDeleteSubject] = React.useState<SubjectWithCounts | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Bulk visibility state
  const [bulkAction, setBulkAction] = React.useState<"show" | "hide" | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);

  const totalClassTests = subjects.reduce((sum, s) => sum + s.testsCount, 0);

  // Synchronize initial subjects when server props update
  React.useEffect(() => {
    setSubjects(initialSubjects);
  }, [initialSubjects]);

  // --------------------------------------------------------------------------
  // ADD SUBJECT
  // --------------------------------------------------------------------------
  const handleOpenAddModal = () => {
    setNewSubjectName("");
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateSubject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddError(null);

    const parsed = subjectInputSchema.safeParse({ name: newSubjectName });
    if (!parsed.success) {
      setAddError(parsed.error.issues[0]?.message || "Invalid subject name");
      return;
    }

    const trimmedName = parsed.data.name;

    const isDuplicate = subjects.some(
      (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddError(`A subject named "${trimmedName}" already exists in Class ${grade}.`);
      return;
    }

    setIsAdding(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticSubject: SubjectWithCounts = {
      id: tempId,
      classId,
      name: trimmedName,
      createdAt: new Date().toISOString(),
      testsCount: 0,
      questionsCount: 0,
    };

    setSubjects((prev) => [...prev, optimisticSubject]);

    try {
      const res = await createSubjectAction(classId, grade, trimmedName);
      if (res.success && res.data) {
        setSubjects((prev) =>
          prev.map((s) =>
            s.id === tempId
              ? {
                  id: res.data.id,
                  classId: res.data.class_id,
                  name: res.data.name,
                  createdAt: res.data.created_at,
                  testsCount: 0,
                  questionsCount: 0,
                }
              : s
          )
        );
        toast.success(`Subject "${trimmedName}" added to Class ${grade}!`);
        setIsAddModalOpen(false);
        setNewSubjectName("");
      } else {
        setSubjects((prev) => prev.filter((s) => s.id !== tempId));
        setAddError(res.error || "Failed to create subject.");
        toast.error(res.error || "Failed to create subject.");
      }
    } catch (err: any) {
      setSubjects((prev) => prev.filter((s) => s.id !== tempId));
      setAddError(err?.message || "An unexpected error occurred.");
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENAME SUBJECT
  // --------------------------------------------------------------------------
  const handleOpenRenameModal = (sub: SubjectWithCounts) => {
    setRenameSubject(sub);
    setRenameValue(sub.name);
    setRenameError(null);
  };

  const handleRenameSubject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renameSubject) return;
    setRenameError(null);

    const parsed = subjectInputSchema.safeParse({ name: renameValue });
    if (!parsed.success) {
      setRenameError(parsed.error.issues[0]?.message || "Invalid subject name");
      return;
    }

    const trimmedName = parsed.data.name;

    if (trimmedName.toLowerCase() === renameSubject.name.toLowerCase()) {
      setRenameSubject(null);
      return;
    }

    const isDuplicate = subjects.some(
      (s) =>
        s.id !== renameSubject.id &&
        s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setRenameError(`Another subject named "${trimmedName}" already exists in Class ${grade}.`);
      return;
    }

    setIsRenaming(true);
    const oldName = renameSubject.name;
    const targetId = renameSubject.id;

    setSubjects((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, name: trimmedName } : s))
    );

    try {
      const res = await renameSubjectAction(targetId, classId, grade, trimmedName);
      if (res.success) {
        toast.success(`Subject renamed to "${trimmedName}".`);
        setRenameSubject(null);
      } else {
        setSubjects((prev) =>
          prev.map((s) => (s.id === targetId ? { ...s, name: oldName } : s))
        );
        setRenameError(res.error || "Failed to rename subject.");
        toast.error(res.error || "Failed to rename subject.");
      }
    } catch (err: any) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, name: oldName } : s))
      );
      setRenameError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsRenaming(false);
    }
  };

  // --------------------------------------------------------------------------
  // DELETE SUBJECT
  // --------------------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteSubject) return;

    setIsDeleting(true);
    const target = deleteSubject;

    setSubjects((prev) => prev.filter((s) => s.id !== target.id));

    try {
      const res = await deleteSubjectAction(target.id, grade);
      if (res.success) {
        toast.success(`Subject "${target.name}" and all linked tests deleted.`);
        setDeleteSubject(null);
      } else {
        setSubjects((prev) => [...prev, target]);
        toast.error(res.error || "Failed to delete subject.");
      }
    } catch (err: any) {
      setSubjects((prev) => [...prev, target]);
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  // --------------------------------------------------------------------------
  // BULK SHOW / HIDE RESULTS
  // --------------------------------------------------------------------------
  const handleConfirmBulkAction = async () => {
    if (!bulkAction) return;

    const showResult = bulkAction === "show";
    setIsBulkUpdating(true);

    try {
      const res = await bulkUpdateClassTestsShowResultAction(grade, showResult);
      if (res.success) {
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

  // Columns for ResponsiveTable
  const columns = [
    {
      key: "name",
      header: "Subject Name",
      render: (row: SubjectWithCounts) => (
        <div>
          <span className="font-semibold text-slate-900 block text-base">
            {row.name}
          </span>
          <span className="text-xs text-slate-500">
            Class {grade} Curriculum
          </span>
        </div>
      ),
    },
    {
      key: "testsCount",
      header: "Tests",
      render: (row: SubjectWithCounts) => (
        <span className="text-sm font-medium text-slate-700">
          {row.testsCount} {row.testsCount === 1 ? "Test" : "Tests"}
        </span>
      ),
    },
    {
      key: "questionsCount",
      header: "Questions",
      render: (row: SubjectWithCounts) => (
        <span className="text-sm font-medium text-slate-700">
          {row.questionsCount} {row.questionsCount === 1 ? "Question" : "Questions"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row: SubjectWithCounts) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 sm:pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenRenameModal(row)}
            className="min-h-[44px] px-2.5 text-xs text-slate-700 hover:text-slate-900"
            title="Rename subject"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span>Rename</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteSubject(row)}
            className="min-h-[44px] px-2.5 text-xs text-red-700 hover:text-red-800 hover:bg-red-50"
            title="Delete subject"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>Delete</span>
          </Button>

          <Link href={`/admin/classes/${grade}/${row.id}`}>
            <Button
              variant="secondary"
              size="sm"
              className="min-h-[44px] px-3 text-xs font-semibold text-[#1E3A8A] border-slate-200"
            >
              <span>Open</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top action bar if subjects exist */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-[8px] border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Class {grade} Subjects ({subjects.length})
          </h2>
          <p className="text-xs text-slate-500">
            {totalClassTests} tests configured across {subjects.length} subjects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalClassTests > 0 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setBulkAction("show")}
                className="text-xs font-semibold min-h-[38px]"
                title="Show results for all tests in Class"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                Show all results
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setBulkAction("hide")}
                className="text-xs font-semibold min-h-[38px]"
                title="Hide results for all tests in Class"
              >
                <EyeOff className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                Hide all results
              </Button>
            </>
          )}

          <Button
            variant="primary"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto min-h-[38px]"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Subjects View: Empty State or Responsive Table */}
      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-7 h-7 text-slate-500" />}
          title={`No subjects in Class ${grade} yet`}
          description="Add your first subject to start building MCQ test papers and question banks for this class."
          action={
            <Button variant="primary" onClick={handleOpenAddModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Subject
            </Button>
          }
        />
      ) : (
        <ResponsiveTable
          columns={columns}
          data={subjects}
          keyExtractor={(row) => row.id}
        />
      )}

      {/* ADD SUBJECT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add Subject to Class ${grade}`}
        description="Enter the subject name (2 to 40 characters). Duplicate names within the class are not allowed."
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isAdding}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateSubject}
              isLoading={isAdding}
              className="w-full sm:w-auto"
            >
              Save Subject
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubject} className="space-y-4 py-1">
          <Input
            label="Subject Name"
            placeholder="e.g. Mathematics, Science, Social Studies"
            value={newSubjectName}
            onChange={(e) => {
              setNewSubjectName(e.target.value);
              if (addError) setAddError(null);
            }}
            error={addError || undefined}
            helperText="2 to 40 characters required."
            autoFocus
          />
        </form>
      </Modal>

      {/* RENAME SUBJECT MODAL */}
      <Modal
        isOpen={Boolean(renameSubject)}
        onClose={() => setRenameSubject(null)}
        title="Rename Subject"
        description={`Update the name of "${renameSubject?.name}" in Class ${grade}.`}
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRenameSubject(null)}
              disabled={isRenaming}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleRenameSubject}
              isLoading={isRenaming}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleRenameSubject} className="space-y-4 py-1">
          <Input
            label="New Subject Name"
            value={renameValue}
            onChange={(e) => {
              setRenameValue(e.target.value);
              if (renameError) setRenameError(null);
            }}
            error={renameError || undefined}
            helperText="2 to 40 characters required."
            autoFocus
          />
        </form>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      {deleteSubject && (
        <ConfirmDialog
          isOpen={Boolean(deleteSubject)}
          onClose={() => setDeleteSubject(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete Subject "${deleteSubject.name}"?`}
          description={
            deleteSubject.testsCount > 0 || deleteSubject.questionsCount > 0
              ? `Warning: Deleting this subject will also delete ${deleteSubject.testsCount} ${deleteSubject.testsCount === 1 ? "test" : "tests"
              } and ${deleteSubject.questionsCount} ${deleteSubject.questionsCount === 1 ? "question" : "questions"
              } linked to it. This action cannot be undone.`
              : `Are you sure you want to delete "${deleteSubject.name}" from Class ${grade}? This action cannot be undone.`
          }
          confirmText="Delete Subject"
          variant="destructive"
          isLoading={isDeleting}
        />
      )}

      {/* BULK SHOW / HIDE RESULTS CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={bulkAction !== null}
        onClose={() => setBulkAction(null)}
        onConfirm={handleConfirmBulkAction}
        isLoading={isBulkUpdating}
        title={
          bulkAction === "show"
            ? `Show Results for All Tests in Class ${grade}?`
            : `Hide Results for All Tests in Class ${grade}?`
        }
        description={
          bulkAction === "show"
            ? `This will make results visible to students immediately for all ${totalClassTests} tests across subjects in Class ${grade}. Proceed?`
            : `This will hide results from students for all ${totalClassTests} tests across subjects in Class ${grade}. Proceed?`
        }
        confirmText={
          bulkAction === "show" ? "Show All Results" : "Hide All Results"
        }
      />
    </div>
  );
}
