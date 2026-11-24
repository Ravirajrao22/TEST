"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const next = searchParams.get("next");

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    urlError ? decodeURIComponent(urlError) : null
  );

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const supabase = createClient();
      const origin = window.location.origin;
      const callbackUrl = next
        ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Failed to initialize Google Sign In.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "An unexpected error occurred. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <Card glassVariant="glass-strong" className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 space-y-6 text-center border-white/80 animate-enter">
      {/* Brand Logo & Heading */}
      <div className="space-y-3">
        <img
          src="/logo.jpg"
          alt="Ayushman Shikshan Sansthan Logo"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain bg-white mx-auto p-1.5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
        />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Ayushman Shikshan Sansthan
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-emerald-800 tracking-wide">
            &apos;तमसो मा ज्योतिर्गमय&apos; • Pioneer: Chandan Guru Jee
          </p>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-normal max-w-xs mx-auto">
          Sign in with your Google account to access your coaching tests and dashboard.
        </p>
      </div>

      {/* Error message alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 rounded-[12px] border border-red-200 bg-[#FEE2E2]/70 text-[#B91C1C] text-xs sm:text-sm text-left leading-snug animate-enter"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Continue with Google button */}
      <div className="space-y-3 pt-1">
        <Button
          variant="secondary"
          size="lg"
          className="w-full min-h-[48px] flex items-center justify-center gap-3 py-3 text-sm font-semibold border-white/90 bg-white/80 hover:bg-white shadow-xs"
          onClick={handleGoogleSignIn}
          isLoading={isLoading}
          type="button"
        >
          {!isLoading && (
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </Button>

        <div className="text-[11px] text-slate-400">
          Owner Gmail automatically receives the Admin role
        </div>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm sm:max-w-md p-8 glass-strong rounded-[16px] text-center space-y-4">
            <div className="w-12 h-12 rounded-[12px] bg-slate-200/80 animate-pulse mx-auto" />
            <div className="h-6 w-32 bg-slate-200/80 animate-pulse mx-auto rounded" />
            <div className="h-4 w-48 bg-slate-200/80 animate-pulse mx-auto rounded" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
