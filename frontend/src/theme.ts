import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// The initial theme is set in index.html before paint; this hook just keeps
// React in sync and persists the user's choice.
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(current);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("rundown-theme", theme);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
