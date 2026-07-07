import { Routes, Route, Link } from "react-router-dom";

function Studio() {
  return <div className="p-6">Studio placeholder.</div>;
}

function Dashboard() {
  return <div className="p-6">Dashboard placeholder.</div>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <Link to="/" className="font-medium hover:underline">
          Studio
        </Link>
        <Link to="/dashboard" className="font-medium hover:underline">
          Dashboard
        </Link>
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
