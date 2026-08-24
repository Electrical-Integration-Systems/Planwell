"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  FileText,
  FolderKanban,
  History,
  ListTodo,
  LogOut,
  Menu as MenuIcon,
  Moon as MoonIcon,
  Settings as SettingsIcon,
  Sun as SunIcon,
} from "lucide-react";

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
      href: "/tasks",
      label: "Tasks",
      icon: ListTodo,
      isActive: pathname === "/tasks",
    },
    {
      href: "/files",
      label: "Files",
      icon: FileText,
      isActive: pathname.startsWith("/files"),
    },
    {
      href: "/",
      label: "Projects",
      icon: FolderKanban,
      isActive: pathname === "/" || pathname.startsWith("/projects"),
    },
    {
      href: "/audit-history",
      label: "Audit History",
      icon: History,
      isActive: pathname.startsWith("/audit-history"),
    },
  ];

  if (!isAuthenticated) return null;

  function handleSignOut() {
    void signOut().then(() => {
      router.push("/signin");
    });
  }

  function handleThemeToggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

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

          <nav className="hidden md:flex flex-1 min-w-0 justify-center">
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
            </div>
          </nav>

          <div className="hidden md:flex items-center gap-0.5 shrink-0">
            <Button
              variant={isSettingsOpen ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-colors",
                isSettingsOpen
                  ? "text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={onSettingsOpen}
              aria-label="Settings"
              aria-pressed={isSettingsOpen}
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </Button>
            <div className="w-px h-4 bg-border mx-1.5" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5 rounded-lg transition-colors"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>

          <div className="ml-auto md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Open menu"
                >
                  <MenuIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/60 p-2">
                {navItems.map(({ href, label, icon: Icon, isActive }) => (
                  <DropdownMenuItem
                    key={href}
                    className={cn(
                      "rounded-lg px-3 py-2",
                      isActive ? "bg-accent text-accent-foreground" : undefined,
                    )}
                    onSelect={() => {
                      router.push(href);
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg px-3 py-2"
                  onSelect={onSettingsOpen}
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg px-3 py-2"
                  onSelect={handleThemeToggle}
                >
                  {theme === "dark" ? (
                    <SunIcon className="h-4 w-4" />
                  ) : (
                    <MoonIcon className="h-4 w-4" />
                  )}
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="rounded-lg px-3 py-2"
                  onSelect={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
