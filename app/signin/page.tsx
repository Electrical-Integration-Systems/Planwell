"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useTheme } from "next-themes";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative bg-background">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground z-50"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Subtle background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-primary/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="animate-fade-in-up w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-warm mb-4">
            <span className="text-primary-foreground font-serif text-xl">
              P
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight">Planwell</h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1.5">
            Task Workspace
          </p>
        </div>

        <Card className="shadow-warm-lg border-border/60">
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="font-serif text-lg">Welcome back</CardTitle>
            <CardDescription className="text-xs">
              Sign in to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-6">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-11 text-sm font-medium shadow-warm-sm hover:shadow-warm transition-shadow border-border/80"
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
              <svg
                viewBox="0 0 24 24"
                className="size-5 mr-2"
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
              {loading ? "Redirecting..." : "Continue with Google"}
            </Button>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          Secure authentication via Google OAuth
        </p>
      </div>
    </div>
  );
}
