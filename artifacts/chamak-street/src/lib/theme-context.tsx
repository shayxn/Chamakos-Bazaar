import { createContext, useContext, useEffect, useState } from "react";

type Theme = "default" | "liquid-glass";
type ColorMode = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  setTheme: () => {},
  colorMode: "dark",
  toggleColorMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("chamak_theme") as Theme) || "default";
    } catch {
      return "default";
    }
  });

  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    try {
      return (localStorage.getItem("chamak_color_mode") as ColorMode) || "dark";
    } catch {
      return "dark";
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

  useEffect(() => {
    const root = document.documentElement;
    if (colorMode === "light") {
      root.classList.add("light-mode");
    } else {
      root.classList.remove("light-mode");
    }
    try { localStorage.setItem("chamak_color_mode", colorMode); } catch {}
  }, [colorMode]);

  const toggleColorMode = () => setColorMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, colorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
