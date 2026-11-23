import * as React from "react";
import Link from "next/link";
import { BookOpen, FileCheck2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClassesOverview } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage() {
  const { data: classes } = await getClassesOverview();

  const classDescriptions: Record<number, string> = {
    8: "Middle School Foundation",
    9: "Secondary Preparation",
    10: "Secondary Board Year",
    11: "Higher Secondary Core",
    12: "Senior Board & Entrance",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Subjects"
        description="Select a class to manage its subjects, curriculum, tests, and question banks."
      />

      {/* Grid of 5 Class Cards
          Desktop: grid (sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5)
          Mobile: single column
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {classes.map((cls) => {
          const desc = classDescriptions[cls.grade] || "Curriculum Level";

          return (
            <Link
              key={cls.grade}
              href={`/admin/classes/${cls.grade}`}
              className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded-[8px]"
            >
              <Card className="h-full flex flex-col justify-between transition-all duration-200 hover:border-slate-300 hover:shadow-xs group-hover:border-slate-300">
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="primary" className="text-xs px-2 py-0.5 font-bold">
                      Grade {cls.grade}
                    </Badge>
                    <span className="text-xs text-slate-500 font-medium">
                      Class {cls.grade}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900 pt-2">
                    Class {cls.grade}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {desc}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0 space-y-2">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-[#1E3A8A]" />
                      Subjects
                    </span>
                    <span className="font-semibold text-slate-900">
                      {cls.subjectCount} {cls.subjectCount === 1 ? "Subject" : "Subjects"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                      Tests
                    </span>
                    <span className="font-semibold text-slate-900">
                      {cls.testCount} {cls.testCount === 1 ? "Test" : "Tests"}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 sm:p-5 pt-3 border-t border-slate-100 mt-auto bg-slate-50/50 flex items-center justify-between text-xs font-semibold text-[#1E3A8A]">
                  <span>Manage Subjects</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </CardFooter>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
