import { useCallback, useState } from "react";

const isDark = () => document.documentElement.classList.contains("dark");

export function useTheme() {
  const [theme, setTheme] = useState(() => (isDark() ? "dark" : "light"));

  const toggle = useCallback(() => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: theme just won't persist */
    }
    setTheme(next);
  }, []);

  return { theme, toggle };
}
