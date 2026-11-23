"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  Download,
  Award,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  generateExportFileName,
  formatISTDateTime,
} from "@/lib/export/excel";
import type {
  AdminResultRow,
  AdminResultsFilterOptions,
} from "@/app/admin/results/actions";

interface AdminResultsManagerProps {
  initialResults: AdminResultRow[];
  filterOptions: AdminResultsFilterOptions;
}

export function AdminResultsManager({
  initialResults,
  filterOptions,
}: AdminResultsManagerProps) {
  const { toast } = useToast();

  // Filter States
  const [selectedGrade, setSelectedGrade] = React.useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all");
  const [selectedTestId, setSelectedTestId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = React.useState<boolean>(false);
  const [exportFormat, setExportFormat] = React.useState<"xlsx" | "csv">("xlsx");
  const [passMarkPercent, setPassMarkPercent] = React.useState<number>(33);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  // Filter subjects by selected grade
  const availableSubjects = React.useMemo(() => {
    if (selectedGrade === "all") return filterOptions.subjects;
    const gradeNum = parseInt(selectedGrade, 10);
    return filterOptions.subjects.filter((s) => s.classGrade === gradeNum);
  }, [selectedGrade, filterOptions.subjects]);

  // Reset subject filter if it no longer exists in available subjects
  React.useEffect(() => {
    if (
      selectedSubjectId !== "all" &&
      !availableSubjects.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId("all");
    }
  }, [availableSubjects, selectedSubjectId]);

  // Filter tests by selected grade and subject
  const availableTests = React.useMemo(() => {
    return filterOptions.tests.filter((t) => {
      if (selectedGrade !== "all" && t.classGrade !== parseInt(selectedGrade, 10)) {
        return false;
      }
      if (selectedSubjectId !== "all" && t.subjectId !== selectedSubjectId) {
        return false;
      }
      return true;
    });
  }, [selectedGrade, selectedSubjectId, filterOptions.tests]);

  // Reset test filter if it no longer exists
  React.useEffect(() => {
    if (
      selectedTestId !== "all" &&
      !availableTests.some((t) => t.id === selectedTestId)
    ) {
      setSelectedTestId("all");
    }
  }, [availableTests, selectedTestId]);

  // Filtered rows matching all active filters
  const filteredResults = React.useMemo(() => {
    return initialResults.filter((r) => {
      if (selectedGrade !== "all" && r.classGrade !== parseInt(selectedGrade, 10)) {
        return false;
      }
      if (selectedSubjectId !== "all" && r.subjectId !== selectedSubjectId) {
        return false;
      }
      if (selectedTestId !== "all" && r.testId !== selectedTestId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = r.studentName.toLowerCase().includes(q);
        const matchesEmail = r.studentEmail.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [
    initialResults,
    selectedGrade,
    selectedSubjectId,
    selectedTestId,
    searchQuery,
  ]);

  // Selected filter labels for display & file name
  const selectedSubjectName =
    selectedSubjectId === "all"
      ? null
      : filterOptions.subjects.find((s) => s.id === selectedSubjectId)?.name || null;

  const selectedTestName =
    selectedTestId === "all"
      ? null
      : filterOptions.tests.find((t) => t.id === selectedTestId)?.title || null;

  const currentGradeNum = selectedGrade === "all" ? null : parseInt(selectedGrade, 10);

  // File name preview
  const previewFileName = generateExportFileName(
    currentGradeNum,
    selectedSubjectName,
    selectedTestName,
    exportFormat
  );

  // Open Export Modal
  const handleOpenExportModal = (format: "xlsx" | "csv") => {
    setExportFormat(format);
    setIsExportModalOpen(true);
  };

  // Execute Streamed Server Export
  const handleExecuteExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch("/api/export/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: currentGradeNum,
          subjectId: selectedSubjectId === "all" ? null : selectedSubjectId,
          testId: selectedTestId === "all" ? null : selectedTestId,
          search: searchQuery.trim() || undefined,
          passMarkPercent: Number(passMarkPercent) || 33,
          format: exportFormat,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to generate export file.");
      }

      // Stream blob to file download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = previewFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Exported ${previewFileName} successfully!`);
      setIsExportModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "An error occurred while downloading export.");
    } finally {
      setIsExporting(false);
    }
  };

  // Columns for ResponsiveTable
  const columns = [
    {
      key: "rank",
      header: "Rank",
      render: (row: AdminResultRow) => (
        <Badge
          variant={row.rank === 1 ? "primary" : "secondary"}
          className="font-bold text-xs"
        >
          #{row.rank}
        </Badge>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (row: AdminResultRow) => (
        <div>
          <span className="font-semibold text-slate-900 block text-sm">
            {row.studentName}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {row.studentEmail}
          </span>
        </div>
      ),
    },
    {
      key: "test",
      header: "Class & Test",
      render: (row: AdminResultRow) => (
        <div>
          <span className="font-medium text-slate-900 block text-sm">
            {row.testTitle}
          </span>
          <span className="text-xs text-slate-500">
            Class {row.classGrade} • {row.subjectName}
          </span>
        </div>
      ),
    },
    {
      key: "score",
      header: "Score / Total",
      render: (row: AdminResultRow) => (
        <span className="font-bold text-slate-900 text-sm">
          {row.score} <span className="text-slate-400 font-normal">/ {row.totalMarks}</span>
        </span>
      ),
    },
    {
      key: "percent",
      header: "Percent",
      render: (row: AdminResultRow) => (
        <Badge
          variant={row.percent >= passMarkPercent ? "success" : "secondary"}
          className="font-semibold text-xs"
        >
          {row.percent}%
        </Badge>
      ),
    },
    {
      key: "breakdown",
      header: "C / W / S",
      render: (row: AdminResultRow) => (
        <span className="text-xs text-slate-600 font-medium">
          <span className="text-green-700 font-bold">{row.correct}</span> /{" "}
          <span className="text-red-700 font-bold">{row.wrong}</span> /{" "}
          <span className="text-slate-500">{row.unanswered}</span>
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted At (IST)",
      render: (row: AdminResultRow) => (
        <span className="text-xs text-slate-500">
          {formatISTDateTime(row.submittedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* FILTERS & EXPORT BUTTONS BAR                                         */}
      {/* -------------------------------------------------------------------- */}
      <Card className="border border-slate-200 bg-white">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Top row: Dropdown filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Class Filter */}
            <Select
              label="Filter Class"
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

            {/* Subject Filter */}
            <Select
              label="Filter Subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              options={[
                { value: "all", label: "All Subjects" },
                ...availableSubjects.map((s) => ({
                  value: s.id,
                  label: `${s.name} (Class ${s.classGrade})`,
                })),
              ]}
            />

            {/* Test Filter */}
            <Select
              label="Filter Test"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              options={[
                { value: "all", label: "All Tests" },
                ...availableTests.map((t) => ({
                  value: t.id,
                  label: t.title,
                })),
              ]}
            />

            {/* Student Search */}
            <Input
              label="Search Student"
              placeholder="Name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Bottom row: Matching count & Export action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-600">
              Matching:{" "}
              <span className="text-[#1E3A8A] font-bold">
                {filteredResults.length}
              </span>{" "}
              {filteredResults.length === 1 ? "attempt" : "attempts"} across selected filters
            </div>

            {/* Two export buttons next to the filters */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => handleOpenExportModal("xlsx")}
                disabled={filteredResults.length === 0}
                className="text-xs font-semibold min-h-[44px]"
                title="Export results formatted in multi-sheet Excel spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-700" />
                Export Excel (.xlsx)
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => handleOpenExportModal("csv")}
                disabled={filteredResults.length === 0}
                className="text-xs font-semibold min-h-[44px]"
                title="Export UTF-8 with BOM CSV for Excel compatibility"
              >
                <FileText className="w-4 h-4 mr-1.5 text-blue-700" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------------- */}
      {/* RESULTS DATA TABLE                                                   */}
      {/* -------------------------------------------------------------------- */}
      {filteredResults.length > 0 ? (
        <ResponsiveTable
          columns={columns}
          data={filteredResults}
          keyExtractor={(row) => row.id}
        />
      ) : (
        <EmptyState
          icon={<Award className="w-8 h-8 text-slate-400" />}
          title="No results found"
          description="No student attempts match the chosen filters. Try selecting a different class or subject."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedGrade("all");
                setSelectedSubjectId("all");
                setSelectedTestId("all");
                setSearchQuery("");
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset Filters
            </Button>
          }
        />
      )}

      {/* -------------------------------------------------------------------- */}
      {/* EXPORT CONFIGURATION MODAL                                           */}
      {/* -------------------------------------------------------------------- */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => {
          if (!isExporting) setIsExportModalOpen(false);
        }}
        title={`Export ${exportFormat.toUpperCase()} Spreadsheet`}
        description="Configure export options and threshold metrics before downloading."
        maxWidth="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsExportModalOpen(false)}
              disabled={isExporting}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleExecuteExport}
              isLoading={isExporting}
              className="w-full sm:w-auto min-h-[44px] bg-green-700 hover:bg-green-800"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download {exportFormat.toUpperCase()} ({filteredResults.length} Rows)
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          {/* Target File details */}
          <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">File Name:</span>
              <span className="font-mono font-bold text-slate-900 truncate max-w-[260px]">
                {previewFileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Records to Export:</span>
              <span className="font-bold text-[#1E3A8A]">
                {filteredResults.length} student attempts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Scope:</span>
              <span className="font-semibold text-slate-700">
                {selectedGrade === "all" ? "All Classes" : `Class ${selectedGrade}`} •{" "}
                {selectedSubjectName || "All Subjects"} •{" "}
                {selectedTestName || "All Tests"}
              </span>
            </div>
          </div>

          {/* Excel Sheet structure description */}
          {exportFormat === "xlsx" ? (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[6px] text-xs text-slate-700 space-y-1.5">
              <span className="font-bold text-[#1E3A8A] block">
                The Excel file includes 3 dedicated sheets:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>
                  <strong>Results:</strong> Student ranking, scores, percent, breakdown, and IST timestamps.
                </li>
                <li>
                  <strong>Summary:</strong> Attempts count, class average, highest score, lowest score, and pass count.
                </li>
                <li>
                  <strong>Question analysis:</strong> {selectedTestId !== "all" ? "Included for the selected test." : "Only generated when a single test is selected in filters."}
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[6px] text-xs text-slate-700">
              <span className="font-bold text-[#1E3A8A] block">
                UTF-8 with BOM format:
              </span>
              <p className="mt-0.5 text-slate-600">
                Includes the Unicode Byte Order Mark (<code className="font-mono text-[11px]">\uFEFF</code>) to guarantee proper rendering of Hindi and Punjabi question text in Microsoft Excel.
              </p>
            </div>
          )}

          {/* Pass mark threshold input */}
          <div className="pt-1">
            <Input
              label="Pass Mark Threshold (%)"
              type="number"
              min={1}
              max={100}
              value={passMarkPercent}
              onChange={(e) => setPassMarkPercent(parseInt(e.target.value, 10) || 33)}
              helperText="Used to calculate passing students and pass rate in the Summary sheet (default: 33%)."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
