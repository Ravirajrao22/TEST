import * as React from "react";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AIGeneratorForm } from "@/components/admin/ai-generator-form";

export const dynamic = "force-dynamic";

function AIGeneratorFallback() {
  return (
    <Card className="p-8 space-y-4 max-w-4xl mx-auto border border-slate-200 bg-white">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-[6px]" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="flex justify-end pt-2">
        <Skeleton className="h-11 w-44" />
      </div>
    </Card>
  );
}

export default function AIGeneratorPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Classes & Subjects", href: "/admin/classes" },
          { label: "AI Question Generator" },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        title="AI Question Generator"
        description="Generate curriculum-aligned multiple choice questions with answer keys and explanations using Google Gemini."
      />

      {/* Generator Form & Result Preview */}
      <Suspense fallback={<AIGeneratorFallback />}>
        <AIGeneratorForm />
      </Suspense>
    </div>
  );
}
