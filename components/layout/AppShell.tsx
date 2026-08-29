"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SettingsDialog,
  type SettingsFilters,
  type SettingsSortKey,
} from "@/components/SettingsDialog";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

type SettingsContext = {
  currentFilters?: SettingsFilters;
  currentSortKeys?: SettingsSortKey[];
};

const SettingsContextRef = createContext<React.RefObject<SettingsContext> | null>(null);

export function useSettingsContext(
  currentFilters: SettingsFilters,
  currentSortKeys: SettingsSortKey[],
) {
  const contextRef = useContext(SettingsContextRef);

  useEffect(() => {
    if (!contextRef) return;
    contextRef.current = { currentFilters, currentSortKeys };

    return () => {
      contextRef.current = {};
    };
  }, [contextRef, currentFilters, currentSortKeys]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsContext, setActiveSettingsContext] = useState<SettingsContext>({});
  const settingsContextRef = useRef<SettingsContext>({});

  if (pathname === "/signin") return children;

  function handleSettingsOpen() {
    setActiveSettingsContext(settingsContextRef.current);
    setSettingsOpen(true);
  }

  return (
    <SettingsContextRef.Provider value={settingsContextRef}>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar
          onSettingsOpen={handleSettingsOpen}
          isSettingsOpen={settingsOpen}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          currentFilters={activeSettingsContext.currentFilters}
          currentSortKeys={activeSettingsContext.currentSortKeys}
        />
      </div>
    </SettingsContextRef.Provider>
  );
}