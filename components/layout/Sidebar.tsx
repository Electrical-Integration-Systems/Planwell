"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import {
  FileText,
  FolderKanban,
  History,
  ListTodo,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { PlanwellLogoMark } from "@/components/PlanwellLogoMark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/files", label: "Files", icon: FileText },
  { href: "/audit-history", label: "Audit History", icon: History },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/projects");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  onSettingsOpen,
  isSettingsOpen = false,
}: {
  onSettingsOpen: () => void;
  isSettingsOpen?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  if (!isAuthenticated) return null;

  function handleSignOut() {
    void signOut().then(() => router.push("/signin"));
  }

  const itemClassName =
    "h-10 w-full justify-center rounded-lg px-0 text-muted-foreground md:justify-start md:px-3";

  return (
    <aside className="relative z-40 flex h-dvh w-14 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:w-56">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-[#d4922a] to-primary/30" />

      <div className="flex h-16 shrink-0 items-center justify-center border-b border-sidebar-border px-2 md:justify-start md:px-5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
          aria-label="Planwell projects"
        >
          <PlanwellLogoMark size="xs" className="shrink-0" />
          <span className="hidden truncate font-serif text-xl tracking-tight md:block">
            Planwell
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 pt-4" aria-label="Main navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const isActive = isNavigationItemActive(pathname, href);

          return (
            <Button
              key={href}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                itemClassName,
                isActive
                  ? "text-sidebar-accent-foreground shadow-sm"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              title={label}
              asChild
            >
              <Link href={href} aria-current={isActive ? "page" : undefined}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden truncate text-sm md:block">{label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="space-y-1 p-2 pb-3">
        <Separator className="mb-3 bg-sidebar-border" />
        <Button
          variant={isSettingsOpen ? "secondary" : "ghost"}
          className={cn(
            itemClassName,
            isSettingsOpen
              ? "text-sidebar-accent-foreground shadow-sm"
              : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
          onClick={onSettingsOpen}
          aria-label="Settings"
          aria-pressed={isSettingsOpen}
          title="Settings"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="hidden text-sm md:block">Settings</span>
        </Button>
        <Button
          variant="ghost"
          className={cn(itemClassName, "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          <span className="hidden text-sm md:block">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </Button>
        <Button
          variant="ghost"
          className={cn(itemClassName, "hover:bg-destructive/10 hover:text-destructive")}
          onClick={handleSignOut}
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden text-sm md:block">Sign out</span>
        </Button>
      </div>
    </aside>
  );
}