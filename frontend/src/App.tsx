import { Routes, Route, Link } from "react-router-dom";
import Studio from "./pages/Studio";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center gap-6 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-baseline gap-2">
          <span className="font-bold">Rundown</span>
          <span className="text-xs text-gray-500">Your day, in five minutes.</span>
        </div>
        <div className="flex gap-4">
          <Link to="/" className="font-medium hover:underline">
            Studio
          </Link>
          <Link to="/dashboard" className="font-medium hover:underline">
            Dashboard
          </Link>
        </div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Studio />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
