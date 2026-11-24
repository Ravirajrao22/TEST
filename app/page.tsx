import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles, BookOpen, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 text-center animate-enter">
        {/* Brand Logo & Heading */}
        <div className="space-y-3">
          <img
            src="/logo.jpg"
            alt="Ayushman Shikshan Sansthan Logo"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain bg-white mx-auto p-1.5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
          />
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
              Ayushman Shikshan Sansthan
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-emerald-800 tracking-wide">
              &apos;तमसो मा ज्योतिर्गमय&apos; • Pioneer: Chandan Guru Jee
            </p>
            <p className="text-xs sm:text-base text-slate-500 max-w-xs mx-auto">
              Online Examination & Assessment Portal (Classes 8 to 12)
            </p>
          </div>
        </div>

        {/* Glass Card */}
        <Card glassVariant="glass-strong" className="p-6 sm:p-8 space-y-5 text-center border-white/80">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Welcome to Ayushman Shikshan Sansthan
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
