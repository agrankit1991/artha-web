/**
 * The light and dark theme, and how a choice about it survives a reload.
 *
 * Three states rather than two: light, dark, and following the system. The
 * third is the default because an application that ignores the machine's own
 * setting is the one people complain about, and it is not the same as
 * either of the other two -- it changes when the machine does.
 */

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

/** What the reader chose, which is not the same as what is showing. */
export type ThemeChoice = "light" | "dark" | "system";

/** What is actually showing. */
export type Appearance = "light" | "dark";

const STORAGE_KEY = "artha-theme";

interface ThemeContextValue {
  choice: ThemeChoice;
  appearance: Appearance;
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Read the choice a previous visit stored.
 *
 * @returns The stored choice, or following the system when there is none or
 *   storage is unavailable -- a private window, say, where reading it
 *   throws rather than returning nothing.
 */
function storedChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage blocked. The default is as good an answer as any.
  }
  return "system";
}

/** Whether the machine currently asks for a dark interface. */
function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Provide the theme, and keep the document in step with it.
 *
 * @param props - The application to render inside the provider.
 * @returns The provider.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [choice, setStoredChoice] = useState<ThemeChoice>(storedChoice);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => {
    // Following the system means following it as it changes, not as it was
    // when the page loaded.
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listen = (event: MediaQueryListEvent): void => {
      setSystemDark(event.matches);
    };
    query.addEventListener("change", listen);
    return () => {
      query.removeEventListener("change", listen);
    };
  }, []);

  const appearance: Appearance = choice === "system" ? (systemDark ? "dark" : "light") : choice;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", appearance === "dark");
  }, [appearance]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setStoredChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked. The choice still holds for this visit.
    }
  }, []);

  const value = useMemo(() => ({ choice, appearance, setChoice }), [choice, appearance, setChoice]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/**
 * Read the current theme.
 *
 * @returns The choice, what is showing, and how to change it.
 * @throws {Error} If used outside the provider, which is a wiring mistake
 *   rather than a state worth rendering around.
 */
export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (value === null) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return value;
}
