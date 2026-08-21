"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import MoltenMetal from "@/components/MoltenMetal";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import SpecularButton from "@/components/SpecularButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sun, Moon } from "lucide-react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const accessDenied = searchParams.get("error") === "unauthorized";
  const missingAllowlist = searchParams.get("error") === "missing_allowlist";
  const displayedError =
    error ??
    (missingAllowlist
      ? "Server configuration error: ALLOWED_EMAILS is missing in Next.js environment."
      : accessDenied
      ? "This Google account is not allowed for this workspace."
      : null);
  const isDark = resolvedTheme !== "light";
  const moltenColors = isDark
    ? {
        color1: "#2563eb",
        color2: "#60a5fa",
        color3: "#ffffff",
      }
    : {
        color1: "#1d4ed8",
        color2: "#93c5fd",
        color3: "#ffffff",
      };

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"
      }`}
    >
      <div className="absolute inset-0">
        <MoltenMetal
          color1={moltenColors.color1}
          color2={moltenColors.color2}
          color3={moltenColors.color3}
          speed={0.35}
          scale={4}
          detail={3}
          glow={1.6}
          coreSize={0.1}
          swirl={1}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1.3}
          colorMode="molten"
          grain
          grainIntensity={0.05}
          mouseInteraction
          mouseStrength={0.3}
          opacity={1}
        />
      </div>
      <div
        className={`absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.42))]"
            : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.52),transparent_34%),linear-gradient(180deg,rgba(239,246,255,0.10),rgba(226,232,240,0.28))]"
        }`}
      />

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={`fixed top-4 right-4 z-50 h-8 w-8 rounded-lg backdrop-blur-md transition-colors ${
          isDark
            ? "border border-white/15 bg-white/8 text-white/75 hover:bg-white/14 hover:text-white"
            : "border border-slate-900/10 bg-white/40 text-slate-700 hover:bg-white/70 hover:text-slate-950"
        }`}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      <div className="relative z-20 w-full max-w-sm -translate-y-8 animate-fade-in-up sm:-translate-y-10">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="text-center pb-2 pt-6">
            <PlanwellLogoMark className="mb-5" />
            <CardTitle
              className={`font-serif text-lg ${isDark ? "text-white" : "text-slate-950"}`}
            >
              Welcome back
            </CardTitle>
            <CardDescription
              className={`text-xs ${isDark ? "text-white/70" : "text-slate-700"}`}
            >
              Sign in to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-6">
            <SpecularButton
              size="md"
              radius={16}
              tint="#ffffff"
              tintOpacity={0.08}
              blur={8}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#93c5fd"
              intensity={1.15}
              shineSize={14}
              shineFade={34}
              thickness={1.2}
              speed={0.55}
              autoAnimate
              className={`h-11 w-full rounded-xl text-sm font-medium ${
                isDark
                  ? "bg-white/8"
                  : "bg-white/45"
              }`}
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setError(null);
                void signIn("google").catch((error) => {
                  setError(error.message);
                  setLoading(false);
                });
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="inline-flex shrink-0 items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </span>
                <span>{loading ? "Redirecting..." : "Continue with Google"}</span>
              </span>
            </SpecularButton>
            {displayedError && (
              <p className={`text-center text-sm ${isDark ? "text-red-200" : "text-red-700"}`}>
                {displayedError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
