"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, History, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentUser } from "@/lib/supabase/server";

export function StudentShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: CurrentUser | null;
}) {
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error", e);
    } finally {
      window.location.href = "/login";
    }
  };

  const email = user?.email || "student@gmail.com";
  const initials = (user?.fullName || email || "S")
    .substring(0, 2)
    .toUpperCase();
  const role = user?.role || "student";

  return (
    <div className="min-h-screen text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Student Glass Top Bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/70 h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="flex items-center gap-2.5 font-bold text-slate-900 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] rounded-[8px]"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[#4338CA] text-white flex items-center justify-center text-xs font-bold shadow-[0_2px_8px_rgba(67,56,202,0.30)]">
              TH
            </div>
            <span className="font-heading tracking-tight">TestHub</span>
          </Link>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/60 border border-white/80 text-slate-600 font-medium hidden sm:inline-block">
            Student Portal
          </span>
        </div>

        {/* Right side: History, Avatar, Email, Role Badge & Sign out */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/student/history"
            className="text-xs font-medium text-slate-600 hover:text-[#4338CA] flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] hover:bg-white/50 transition-colors min-h-[40px]"
            title="View your test attempt history"
          >
            <History className="w-4 h-4 text-slate-400 stroke-[1.5]" />
            <span className="hidden sm:inline">My History</span>
          </Link>

          {/* User profile capsule */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-[10px] bg-white/40 border border-white/60">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-7 h-7 rounded-full border border-white object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#4338CA] text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            )}
            <span className="text-xs text-slate-700 font-medium max-w-[120px] sm:max-w-[160px] truncate hidden sm:inline-block">
              {user?.fullName || email}
            </span>
            <Badge
              variant={role === "admin" ? "primary" : "secondary"}
              className="text-[10px] px-1.5 py-0 font-medium uppercase"
            >
              {role}
            </Badge>
          </div>

          {/* Sign Out Button (>=44px touch target) */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-medium text-slate-600 hover:text-[#B91C1C] hover:bg-red-50/60 min-h-[44px] px-2.5"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            title="Sign out of TestHub"
          >
            <LogOut className="w-4 h-4 mr-1 sm:mr-1.5 stroke-[1.5]" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Centered Column (max-w-[720px]) */}
      <main className="flex-1 w-full max-w-[720px] mx-auto p-4 sm:p-6 pb-12 animate-enter">
        {children}
      </main>
    </div>
  );
}
