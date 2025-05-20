// frontend/src/App.jsx
import React, { useState, useMemo } from "react";
import Logo from "./assets/logo.png"; // adjust path if needed
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as BTooltip,
  Legend as BLegend,
  ResponsiveContainer as BResponsive,
} from "recharts";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);       // will hold objects with a uid
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [engines, setEngines] = useState({
    google: true,
    bing: true,
    duckduckgo: true,
  });
  // factChecks now keyed by UID
  const [factChecks, setFactChecks] = useState({});

  const scoreMap = {
    "mainstream-news": 100,
    academic: 75,
    blog: 50,
    "alternative-news": 0,
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }
    setLoading(true);
    setError(null);
    setSummary("");
    setFactChecks({}); // clear old fact-checks

    const enabledEngines = Object.entries(engines)
      .filter(([, on]) => on)
      .map(([name]) => name)
      .join(",");

    try {
      const res = await fetch(
        `http://127.0.0.1:5000/search?q=${encodeURIComponent(
          query
        )}&engines=${enabledEngines}`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // inject a unique ID into each result
      const withUids = (json.results || []).map((r, i) => ({
        ...r,
        uid: `${r.link}|${r.sourceEngine}|${i}`,
      }));
      setResults(withUids);
    } catch (e) {
      console.error(e);
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!results.length) return;
    setSummarizing(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSummary(json.summary);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSummarizing(false);
    }
  };

  // runFactCheck now takes the UID plus the result data
  const runFactCheck = async (uid, title, snippet, link) => {
    setFactChecks((f) => ({ ...f, [uid]: "loading" }));
    try {
      const res = await fetch("http://127.0.0.1:5000/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, snippet, link }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFactChecks((f) => ({ ...f, [uid]: json }));
    } catch (e) {
      console.error(e);
      setFactChecks((f) => ({
        ...f,
        [uid]: { verdict: "Error", reasoning: e.message, sources: [] },
      }));
    }
  };

  const filtered = useMemo(
    () =>
      results.filter((r) => (scoreMap[r.source_type] ?? 50) >= sliderValue),
    [results, sliderValue]
  );

  const pieData = useMemo(() => {
    const counts = {};
    filtered.forEach((r) => {
      counts[r.source_type] = (counts[r.source_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const barData = useMemo(() => {
    const counts = {};
    filtered.forEach((r) => {
      counts[r.sentiment] = (counts[r.sentiment] || 0) + 1;
    });
    return Object.entries(counts).map(([sentiment, count]) => ({
      sentiment,
      count,
    }));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* LOGO */}
        <div className="flex justify-center py-6">
          <img src={Logo} alt="Perspective Engine" className="h-32 w-auto" />
        </div>

        {/* ENGINE TOGGLES */}
        <div className="flex justify-center gap-6 mb-6">
          {["google", "bing", "duckduckgo"].map((eng) => (
            <label key={eng} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={engines[eng]}
                onChange={() =>
                  setEngines((e) => ({ ...e, [eng]: !e[eng] }))
                }
                className="accent-purple-600"
              />
              <span className="capitalize">{eng}</span>
            </label>
          ))}
        </div>

        {/* SEARCH & SLIDER */}
        <div className="bg-gray-100 rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
              type="text"
              placeholder="Enter search query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              {loading ? "Searching…" : "Search"}
            </button>
            <button
              onClick={handleSummarize}
              disabled={!results.length || summarizing}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              {summarizing ? "Summarizing…" : "Summarize"}
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Fringe 0%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="flex-1 accent-purple-600"
            />
            <span className="text-sm text-gray-600">
              Mainstream {sliderValue}%
            </span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="text-red-700 bg-red-100 p-4 rounded">{error}</div>
        )}

        {/* SUMMARY */}
        {summary && (
          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded shadow">
            <h2 className="font-semibold text-purple-800">Summary</h2>
            <p className="mt-2 text-gray-800">{summary}</p>
          </div>
        )}

        {/* CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-100 rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-2">
              Source Distribution
            </h3>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={["#9333EA", "#A855F7", "#C4B5FD", "#EDE9FE"][i % 4]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-2">
              Sentiment Breakdown
            </h3>
            <div className="h-56">
              <BResponsive>
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sentiment" />
                  <YAxis allowDecimals={false} />
                  <BTooltip />
                  <BLegend />
                  <Bar dataKey="count" fill="#A855F7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </BResponsive>
            </div>
          </div>
        </div>

        {/* RESULTS */}
        <div className="space-y-4 mt-6">
          {filtered.length === 0 ? (
            <p className="italic text-gray-500">
              No results match your filters.
            </p>
          ) : (
            filtered.map((r) => (
              <div
                key={r.uid}                           // <- unique uid key
                className="bg-white border border-gray-200 p-4 rounded-lg shadow hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-purple-600 hover:underline"
                  >
                    {r.title}
                  </a>
                  <span className="text-xs text-gray-500 px-2 py-1 border rounded">
                    {r.sourceEngine}
                  </span>
                </div>
                <p className="mt-2 text-gray-700">{r.snippet}</p>

                {/* Credibility */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Credibility</span>
                    <span>{r.credibility_score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-green-500"
                      style={{ width: `${r.credibility_score}%` }}
                    />
                  </div>
                </div>

                {/* Fact Check */}
                <div className="mt-3">
                  {factChecks[r.uid] === "loading" ? (
                    <div className="text-sm text-gray-600">Checking…</div>
                  ) : factChecks[r.uid] ? (
                    <div className="p-3 bg-yellow-50 rounded">
                      <strong>Verdict:</strong> {factChecks[r.uid].verdict}
                      <br />
                      <em className="block mt-1">
                        {factChecks[r.uid].reasoning}
                      </em>
                      {factChecks[r.uid].sources?.length > 0 && (
                        <div className="text-xs mt-2">
                          Sources:{" "}
                          {factChecks[r.uid].sources.map((u, j) => (
                            <a
                              key={j}
                              href={u}
                              className="underline pr-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {u}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        runFactCheck(r.uid, r.title, r.snippet, r.link)
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Fact Check
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
