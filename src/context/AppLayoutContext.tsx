import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppLayoutContextValue = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
};

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function AppLayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebarCollapsed = useCallback(
    () => setSidebarCollapsed((prev) => !prev),
    []
  );

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
    }),
    [sidebarCollapsed, toggleSidebarCollapsed]
  );

  return (
    <AppLayoutContext.Provider value={value}>{children}</AppLayoutContext.Provider>
  );
}

export function useAppLayout(): AppLayoutContextValue {
  const ctx = useContext(AppLayoutContext);
  if (!ctx) {
    throw new Error("useAppLayout must be used within AppLayoutProvider");
  }
  return ctx;
}

/** Safe fallback when layout context is unavailable (e.g. tests). */
export function useOptionalAppLayout(): AppLayoutContextValue {
  const ctx = useContext(AppLayoutContext);
  return (
    ctx ?? {
      sidebarCollapsed: false,
      setSidebarCollapsed: () => {},
      toggleSidebarCollapsed: () => {},
    }
  );
}
