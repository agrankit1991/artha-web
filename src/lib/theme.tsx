/**
 * The theme, on two axes, and how a choice about it survives a reload.
 *
 * Light or dark decides the surfaces; the accent decides what the
 * application points at things with. They are separate because they answer
 * separate questions -- somebody who wants a dark interface has not
 * thereby said anything about which colour they want a selected menu item
 * to be -- and storing them apart means changing one never resets the other.
 *
 * Light and dark have three states rather than two: light, dark, and
 * following the system. The third is the default, because an application
 * that ignores the machine's own setting is the one people complain about,
 * and it is not the same as either of the others -- it changes when the
 * machine does.
 */

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

/** What the reader chose, which is not the same as what is showing. */
export type ThemeChoice = "light" | "dark" | "system";

/** What is actually showing. */
export type Appearance = "light" | "dark";

/** The colour the application points at things with. */
export type Accent = "slate" | "blue" | "green" | "orange";

/** Every accent, in the order they are offered. */
export const ACCENTS: readonly Accent[] = ["slate", "blue", "green", "orange"];

/** What each accent is called. */
export const ACCENT_NAMES: Record<Accent, string> = {
  slate: "Neutral",
  blue: "Blue",
  green: "Green",
  orange: "Orange",
};

/**
 * The colour each accent is recognised by.
 *
 * These are the palettes' own `--primary` values, written out rather than
 * read from the stylesheet: a swatch that is merely close to the theme it
 * stands for is a swatch that lies about what pressing it will do, and
 * CSS variables cannot be read before the theme they belong to is applied.
 */
export const ACCENT_SWATCHES: Record<Accent, string> = {
  slate: "oklch(0.25 0.05 240)",
  blue: "hsl(221.2 83.2% 53.3%)",
  green: "hsl(142.1 76.2% 36.3%)",
  orange: "hsl(24.6 95% 53.1%)",
};

const STORAGE_KEY = "artha-theme";
const ACCENT_KEY = "artha-accent";

interface ThemeContextValue {
  choice: ThemeChoice;
  appearance: Appearance;
  accent: Accent;
  setChoice: (choice: ThemeChoice) => void;
  setAccent: (accent: Accent) => void;
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

/**
 * Read the accent a previous visit stored.
 *
 * @returns The stored accent, or the neutral one when there is none or
 *   storage is unavailable.
 */
function storedAccent(): Accent {
  try {
    const stored = window.localStorage.getItem(ACCENT_KEY);
    if (ACCENTS.includes(stored as Accent)) {
      return stored as Accent;
    }
  } catch {
    // Storage blocked. The default is as good an answer as any.
  }
  return "slate";
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
  const [accent, setStoredAccent] = useState<Accent>(storedAccent);
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

  useEffect(() => {
    // The neutral accent is the stylesheet's own defaults, so it is marked
    // by the absence of an attribute rather than by one more rule saying
    // what is already true.
    const root = document.documentElement;
    if (accent === "slate") {
      root.removeAttribute("data-accent");
    } else {
      root.setAttribute("data-accent", accent);
    }
  }, [accent]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setStoredChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked. The choice still holds for this visit.
    }
  }, []);

  const setAccent = useCallback((next: Accent) => {
    setStoredAccent(next);
    try {
      window.localStorage.setItem(ACCENT_KEY, next);
    } catch {
      // Storage blocked. The choice still holds for this visit.
    }
  }, []);

  const value = useMemo(
    () => ({ choice, appearance, accent, setChoice, setAccent }),
    [choice, appearance, accent, setChoice, setAccent],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/**
 * Read the current theme.
 *
 * @returns Both choices, what is showing, and how to change either.
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
