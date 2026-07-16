/* @refresh reset */
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "default" | "liquid-glass";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("chamak_theme") as Theme) || "default";
    } catch {
      return "default";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "liquid-glass") {
      root.setAttribute("data-theme", "liquid-glass");
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("chamak_theme", theme);
    } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
