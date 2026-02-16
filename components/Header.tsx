"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Settings, LogOut } from "lucide-react";

export function Header({ onSettingsOpen }: { onSettingsOpen: () => void }) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  if (!isAuthenticated) return null;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border animate-fade-in">
      <div className="h-1 bg-gradient-to-r from-primary via-[#d4922a] via-[#b84a30] to-primary/30" />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif text-base leading-none">
                P
              </span>
            </div>
            <span className="font-serif text-xl tracking-tight text-foreground">
              Planwell
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              onClick={onSettingsOpen}
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-1.5" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5 rounded-lg transition-colors"
              onClick={() => {
                void signOut().then(() => {
                  router.push("/signin");
                });
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
