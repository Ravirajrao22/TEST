"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  BookOpen,
  FileCheck2,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

interface ClassTabSummary {
  grade: number;
  subjectsCount: number;
  testsCount: number;
  attemptsCount: number;
}

interface DashboardClassTabsProps {
  initialClasses: ClassTabSummary[];
}

export function DashboardClassTabs({ initialClasses }: DashboardClassTabsProps) {
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = React.useState<number>(10);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  const currentClass =
    initialClasses.find((c) => c.grade === selectedGrade) || {
      grade: selectedGrade,
      subjectsCount: 0,
      testsCount: 0,
      attemptsCount: 0,
    };

  const handleExportClassSummary = async (format: "xlsx" | "csv" = "xlsx") => {
    setIsExporting(true);

    try {
      const response = await fetch("/api/export/class-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedGrade,
          format,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to export class summary.");
      }

      // Download file blob
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const now = new Date()
        .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        .substring(0, 10);
      const fileName = `Class${selectedGrade}_Summary_${now}.${format}`;

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Exported ${fileName} successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Class Performance</h2>
        <span className="text-xs text-slate-500">
          Classes 8 to 12 Coaching Overview
        </span>
      </div>

      {/* Class Tab Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {initialClasses.map((cls) => {
          const isSelected = selectedGrade === cls.grade;
          return (
            <button
              key={cls.grade}
              type="button"
              onClick={() => setSelectedGrade(cls.grade)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-2 rounded-[8px] border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] cursor-pointer ${
                isSelected
                  ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className="text-[10px] opacity-80">Class</span>
              <span className="text-base font-bold leading-tight">
                {cls.grade}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Class Panel Card */}
      <Card className="border border-slate-200 bg-white">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="primary" className="text-xs">
                  Class {selectedGrade}
                </Badge>
                <h3 className="font-bold text-slate-900 text-base">
                  Class {selectedGrade} Curriculum & Progress
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentClass.subjectsCount} Subjects • {currentClass.testsCount} Tests •{" "}
                {currentClass.attemptsCount} Student Attempts
              </p>
            </div>

            {/* Export Class Summary Action Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleExportClassSummary("xlsx")}
                isLoading={isExporting}
                className="text-xs font-semibold min-h-[40px]"
                title="Export one row per subject and test with attempts and average percent"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-green-700" />
                Export Class Summary (.xlsx)
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleExportClassSummary("csv")}
                disabled={isExporting}
                className="text-xs font-semibold min-h-[40px] text-slate-600"
                title="Export Class Summary as CSV"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                CSV
              </Button>
            </div>
          </div>

          {/* Quick Metrics & Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase block">
                Enrolled Subjects
              </span>
              <span className="text-lg font-bold text-slate-900">
                {currentClass.subjectsCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase block">
                Total Tests
              </span>
              <span className="text-lg font-bold text-[#1E3A8A]">
                {currentClass.testsCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase block">
                Student Attempts
              </span>
              <span className="text-lg font-bold text-green-700">
                {currentClass.attemptsCount}
              </span>
            </div>
          </div>

          {/* Navigation to Class details */}
          <div className="flex items-center justify-between pt-1">
            <Link
              href={`/admin/classes/${selectedGrade}`}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline inline-flex items-center gap-1 min-h-[44px]"
            >
              <span>Manage Class {selectedGrade} Subjects & Tests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/admin/results"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 min-h-[44px]"
            >
              <span>View All Submissions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
