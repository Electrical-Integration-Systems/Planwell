"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sun, Moon, Settings, History, LogOut, FileText, ListTodo, FolderKanban } from "lucide-react";

export function Header({
  onSettingsOpen,
  isSettingsOpen = false,
}: {
  onSettingsOpen: () => void;
  isSettingsOpen?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const navItems = [
    {
      href: "/",
      label: "Tasks",
      icon: ListTodo,
      isActive: pathname === "/",
    },
    {
      href: "/files",
      label: "Files",
      icon: FileText,
      isActive: pathname.startsWith("/files"),
    },
    {
      href: "/projects",
      label: "Projects",
      icon: FolderKanban,
      isActive: pathname.startsWith("/projects"),
    },
    {
      href: "/audit-history",
      label: "Audit History",
      icon: History,
      isActive: pathname.startsWith("/audit-history"),
    },
  ];

  if (!isAuthenticated) return null;

  return (
    <header className="shrink-0 z-40 bg-background border-b border-border animate-fade-in">
      <div className="h-1 bg-gradient-to-r from-primary via-[#d4922a] via-[#b84a30] to-primary/30" />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-14">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
          >
            <PlanwellLogoMark size="xs" className="shrink-0" />
            <span className="font-serif text-xl tracking-tight text-foreground">
              Planwell
            </span>
          </Link>

          <nav className="flex-1 min-w-0 flex justify-center">
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {navItems.map(({ href, label, icon: Icon, isActive }) => (
                <Button
                  key={href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs whitespace-nowrap",
                    isActive
                      ? "text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  asChild
                >
                  <Link href={href} aria-current={isActive ? "page" : undefined}>
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </Link>
                </Button>
              ))}

              <Button
                variant={isSettingsOpen ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg px-3 text-xs whitespace-nowrap",
                  isSettingsOpen
                    ? "text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={onSettingsOpen}
                aria-pressed={isSettingsOpen}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </Button>
            </div>
          </nav>

          <div className="flex items-center gap-0.5 shrink-0">
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
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
