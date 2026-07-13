import { NavLink, Route, Routes } from "react-router-dom";
import Studio from "./pages/Studio";
import Dashboard from "./pages/Dashboard";
import { useTheme } from "./theme";

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
    isActive ? "bg-bg3 text-ink" : "text-muted hover:text-ink",
  ].join(" ");
}

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 flex items-center gap-5 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex items-baseline gap-3">
          <span className="wordmark text-2xl font-normal">RUNDOWN</span>
          <span className="live-dot">ON AIR</span>
        </div>

        <nav className="ml-1 flex gap-1">
          <NavLink to="/" end className={navClass}>
            Studio
          </NavLink>
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to daytime studio" : "Switch to dim booth"}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-line bg-bg2 px-3.5 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-amber hover:text-ink"
        >
          <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
          <span className="hidden sm:inline">{theme === "dark" ? "Dim booth" : "Daytime studio"}</span>
        </button>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Studio />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-xs text-faint">
        Cover art is generated for each episode.
      </footer>
    </div>
  );
}
