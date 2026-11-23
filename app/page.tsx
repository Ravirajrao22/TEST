import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles, BookOpen, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 text-center animate-enter">
        {/* Brand Logo & Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[12px] bg-[#4338CA] text-white font-bold text-xl shadow-[0_4px_16px_rgba(67,56,202,0.30)]">
            TH
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
            TestHub
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-xs mx-auto">
            Online MCQ Test Platform for Coaching Centre (Classes 8 to 12)
          </p>
        </div>

        {/* Glass Card */}
        <Card glassVariant="glass-strong" className="p-6 sm:p-8 space-y-5 text-center border-white/80">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Welcome to TestHub
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Sign in with your Google account to access your coaching tests and results.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <Link href="/login" className="block w-full">
              <Button
                variant="primary"
                size="lg"
                className="w-full min-h-[48px] flex items-center justify-center gap-2 text-sm font-semibold"
                type="button"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/design-preview" className="block w-full">
              <Button
                variant="secondary"
                size="md"
                className="w-full text-xs font-semibold"
                type="button"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#4338CA]" />
                <span>Explore Design System Preview</span>
              </Button>
            </Link>
          </div>

          <div className="pt-3 border-t border-white/60 flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Google OAuth</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#4338CA]" />
              <span>Classes 8–12</span>
            </div>
          </div>
        </Card>

        {/* Supported Classes Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500">
          <span className="text-[11px]">Enrolled Grades:</span>
          {[8, 9, 10, 11, 12].map((cls) => (
            <span
              key={cls}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/60 border border-white/80 text-slate-700 font-medium text-[11px]"
            >
              Class {cls}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
