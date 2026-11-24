"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  Sparkles,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { CurrentUser } from "@/lib/supabase/server";
import { AIGeneratorProvider, useAIGenerator } from "./ai-generator-context";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Classes and Subjects", href: "/admin/classes", icon: BookOpen },
  { name: "Tests", href: "/admin/tests", icon: FileCheck2 },
  { name: "AI Generator", href: "/admin/ai-generator", icon: Sparkles },
  { name: "Results", href: "/admin/results", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const mobileBottomNavItems: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tests", href: "/admin/tests", icon: FileCheck2 },
  { name: "Results", href: "/admin/results", icon: BarChart3 },
  { name: "AI", href: "/admin/ai-generator", icon: Sparkles },
];

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: CurrentUser | null;
}) {
  return (
    <AIGeneratorProvider>
      <AdminShellInner user={user}>{children}</AdminShellInner>
    </AIGeneratorProvider>
  );
}

function AdminShellInner({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: CurrentUser | null;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const pathname = usePathname();
  const { isGenerating, generatedQuestions } = useAIGenerator();

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

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

  const email = user?.email || "admin@coaching.com";
  const initials = (user?.fullName || email || "A")
    .substring(0, 2)
    .toUpperCase();

  // Determine current active section title
  const currentNav = navItems.find((item) =>
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href)
  );
  const pageTitle = currentNav?.name || "Admin Portal";

  return (
    <div className="min-h-screen text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* ==================================================================== */}
      {/* DESKTOP FLOATING GLASS SIDEBAR (>= 1024px)                          */}
      {/* Inset 16px from screen edges, 248px wide, glass surface              */}
      {/* ==================================================================== */}
      <aside className="hidden lg:flex fixed top-4 left-4 bottom-4 w-[248px] z-30 flex-col glass p-4 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2 mb-4 border-b border-white/60">
          <img
            src="/logo.jpg"
            alt="Ayushman Shikshan Sansthan Logo"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
          />
          <div className="leading-tight min-w-0">
            <span className="font-bold text-slate-900 text-sm font-heading tracking-tight block truncate" title="Ayushman Shikshan Sansthan">
              Ayushman
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            const isAIGen = item.href === "/admin/ai-generator";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 min-h-[44px]",
                  isActive
                    ? "bg-[#EEF2FF] text-[#4338CA] font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50 active:bg-white/70"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0 stroke-[1.5]",
                    isActive ? "text-[#4338CA]" : "text-slate-400"
                  )}
                />
                <span className="truncate">{item.name}</span>

                {isAIGen && isGenerating && (
                  <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4338CA]/10 text-[#4338CA] animate-pulse">
                    <Sparkles className="w-2.5 h-2.5 animate-spin" />
                    <span>Working</span>
                  </span>
                )}

                {isAIGen && !isGenerating && generatedQuestions.length > 0 && (
                  <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {generatedQuestions.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer: User Capsule & Sign Out */}
        <div className="pt-3 border-t border-white/60 mt-auto space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] bg-white/40">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full border border-white object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#4338CA] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.fullName || email}
              </p>
              <div className="flex items-center gap-1.5">
                <Badge variant="primary" className="text-[10px] py-0 px-1.5 font-semibold">
                  Admin
                </Badge>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            className="w-full justify-start text-xs text-slate-600 hover:text-[#B91C1C] hover:bg-red-50/60 min-h-[44px]"
          >
            <LogOut className="w-4 h-4 mr-2 stroke-[1.5]" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* MOBILE TOP BAR (< 1024px)                                           */}
      {/* ==================================================================== */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 glass border-b border-white/70 select-none">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] text-slate-700 hover:bg-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]"
          >
            <Menu className="w-5 h-5 stroke-[1.5]" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
            <span className="font-bold text-slate-900 text-sm font-heading truncate max-w-[170px]">
              Ayushman Sansthan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <Badge variant="primary" className="text-[10px] py-0 px-1.5 font-semibold">
            Admin
          </Badge>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MOBILE SLIDE-OUT DRAWER (glass-strong)                              */}
      {/* ==================================================================== */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-enter">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-72 max-w-[80vw] h-full glass-strong p-4 flex flex-col z-10 border-r border-white/80 shadow-[0_12px_40px_rgba(31,41,90,0.15)]">
            <div className="flex items-center justify-between pb-3 border-b border-white/60 mb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
                <span className="font-bold text-slate-900 font-heading text-sm">Ayushman Sansthan</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5 stroke-[1.5]" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                const isAIGen = item.href === "/admin/ai-generator";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 min-h-[44px]",
                      isActive
                        ? "bg-[#EEF2FF] text-[#4338CA] font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                  >
                    <Icon className="w-5 h-5 stroke-[1.5]" />
                    <span>{item.name}</span>

                    {isAIGen && isGenerating && (
                      <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4338CA]/10 text-[#4338CA] animate-pulse">
                        <Sparkles className="w-2.5 h-2.5 animate-spin" />
                        <span>Working</span>
                      </span>
                    )}

                    {isAIGen && !isGenerating && generatedQuestions.length > 0 && (
                      <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {generatedQuestions.length}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-white/60 mt-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-xs text-slate-600 hover:text-[#B91C1C] min-h-[44px]"
              >
                <LogOut className="w-4 h-4 mr-2 stroke-[1.5]" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DESKTOP GLASS TOP BAR                                                */}
      {/* ==================================================================== */}
      <div className="hidden lg:flex fixed top-4 left-[280px] right-4 h-16 z-20 glass px-6 items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-heading tracking-tight">
            {pageTitle}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isGenerating && (
            <Link
              href="/admin/ai-generator"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#4338CA]/10 text-[#4338CA] border border-[#4338CA]/20 hover:bg-[#4338CA]/15 transition-all shadow-2xs animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>AI Generating questions...</span>
            </Link>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white/50 border border-white/70">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full border border-white object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#4338CA] text-white flex items-center justify-center text-[10px] font-bold">
                {initials}
              </div>
            )}
            <span className="text-xs font-medium text-slate-700 max-w-[160px] truncate">
              {user?.fullName || email}
            </span>
            <Badge variant="primary" className="text-[10px] py-0 px-1.5">
              Admin
            </Badge>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MAIN CONTENT AREA                                                    */}
      {/* Desktop: lg:pl-[280px], lg:pt-24. Mobile: pb-20 (bottom nav space)    */}
      {/* ==================================================================== */}
      <main className="flex-1 lg:pl-[280px] lg:pt-24 pb-20 lg:pb-8 w-full">
        <div className="max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 animate-enter">
          {children}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< 1024px)                             */}
      {/* Dashboard, Tests, Results, AI                                        */}
      {/* ==================================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/70 h-16 px-2 flex items-center justify-around select-none shadow-[0_-4px_20px_rgba(31,41,90,0.06)]"
      >
        {mobileBottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-[10px] min-h-[44px] min-w-[56px] transition-colors relative",
                isActive
                  ? "text-[#4338CA] font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 stroke-[1.5]", isActive && "stroke-[2]")} />
                {item.href === "/admin/ai-generator" && isGenerating && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#4338CA] animate-ping" />
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
