// frontend/src/App.jsx
import React, { useState, useMemo, useEffect } from "react"; // Added useEffect
import Logo from "./assets/logo.png";
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
  const [results, setResults] = useState([]);
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
  const [factChecks, setFactChecks] = useState({});
  // To store the latest credibility score and breakdown from the backend
  // Keyed by result uid
  const [credibilityScores, setCredibilityScores] = useState({});


  // This function will call the /score endpoint
  const updateCredibilityScore = async (resultItem, factCheckVerdict = null) => {
    try {
      const payload = {
        source_type: resultItem.source_type,
        slider: sliderValue, // Current slider value from state
        recency_boost: resultItem.recency_boost || 0, // from initial search result
      };

      if (factCheckVerdict) { // Only include factcheck if a verdict is available
        payload.factcheck = { verdict: factCheckVerdict };
      }

      const scoreRes = await fetch("http://127.0.0.1:5000/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const scoreData = await scoreRes.json();
      if (scoreData.error) {
        console.error("Error scoring result:", scoreData.error);
        // Potentially set an error state for this specific item's score
        setCredibilityScores(prevScores => ({
          ...prevScores,
          [resultItem.uid]: { error: scoreData.error }
        }));
        return;
      }
      
      // Update the credibilityScores state with the new score and breakdown
      setCredibilityScores(prevScores => ({
        ...prevScores,
        [resultItem.uid]: {
          score: scoreData.credibility_score,
          breakdown: scoreData.breakdown,
        }
      }));

    } catch (e) {
      console.error("Failed to update credibility score for item:", resultItem.uid, e);
      setCredibilityScores(prevScores => ({
        ...prevScores,
        [resultItem.uid]: { error: "Failed to fetch score" }
      }));
    }
  };


  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }
    setLoading(true);
    setError(null);
    setSummary("");
    setFactChecks({});
    setResults([]); // Clear previous results
    setCredibilityScores({}); // Clear previous scores

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

      const withUids = (json.results || []).map((r, i) => ({
        ...r,
        uid: `${r.link}|${r.sourceEngine}|${i}`,
        // Initialize credibility_score from search result (contains base_trust + recency_boost)
        // We will update this with a call to /score if fact-checked or slider changes
        // For now, the backend /search gives base_trust and recency_boost separately.
        // Let's keep the initial score display simple until /score is called.
        // The backend /score endpoint is what we want to use as the source of truth.
      }));
      setResults(withUids);

      // Optionally, fetch initial scores for all results
      // This might be too many API calls if not careful.
      // For now, we'll only call /score after a fact-check or when slider changes (later).

    } catch (e) {
      console.error(e);
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    // Summarize filtered results or all results? Project brief implies a selection.
    // Current code summarizes top 5 of 'results' state which might not be 'filtered' state.
    // Let's use the 'filtered' results for summarization as it's what the user sees.
    const resultsToSummarize = filtered.slice(0, 5);
    if (!resultsToSummarize.length) {
        setError("No results to summarize based on current filters.");
        return;
    };
    setSummarizing(true);
    setError(null); // Clear previous errors
    try {
      const res = await fetch("http://127.0.0.1:5000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send only title and snippet as per backend summarize function
        body: JSON.stringify({ results: resultsToSummarize.map(r => ({title: r.title, snippet: r.snippet})) }),
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

  const runFactCheck = async (resultItem) => { // Pass the whole result item
    const { uid, title, snippet, link } = resultItem;
    setFactChecks((f) => ({ ...f, [uid]: { verdict: "loading", reasoning: "", sources: [] } }));
    try {
      const res = await fetch("http://127.0.0.1:5000/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, snippet, link }),
      });
      const factCheckData = await res.json();
      if (factCheckData.error) throw new Error(factCheckData.error);
      
      setFactChecks((f) => ({ ...f, [uid]: factCheckData }));
      
      // Now, update the credibility score for this item using the new factCheckData.verdict
      await updateCredibilityScore(resultItem, factCheckData.verdict);

    } catch (e) {
      console.error(e);
      const errorState = { verdict: "Error", reasoning: e.message, sources: [] };
      setFactChecks((f) => ({ ...f, [uid]: errorState }));
      // Even on fact-check error, try to score (verdict will be null or "Error")
      await updateCredibilityScore(resultItem, "Error");
    }
  };

  // Placeholder for slider-based score updates (will implement fully later)
  // This useEffect is an example of how you might re-score when the slider changes.
  // For now, it's commented out to avoid excessive API calls on every slider move
  // until we refine the UX for it (e.g., debounce, or score only visible items).
  /*
  useEffect(() => {
    if (results.length > 0) {
      // console.log("Slider changed, potential re-score needed for all items", sliderValue);
      // This would iterate over results and call updateCredibilityScore for each.
      // Consider performance implications.
      // results.forEach(result => {
      //   const currentFactCheck = factChecks[result.uid];
      //   const verdict = currentFactCheck && currentFactCheck.verdict !== "loading" && currentFactCheck.verdict !== "Error" 
      //                   ? currentFactCheck.verdict 
      //                   : null;
      //   updateCredibilityScore(result, verdict);
      // });
    }
  }, [sliderValue, results, factChecks]); // Be mindful of dependencies
  */


  // The `filtered` memo should now primarily be used for filtering based on source_type, sentiment, etc.
  // The credibility score used for display will come from the `credibilityScores` state.
  // The slider's direct filtering effect on the list might need re-evaluation.
  // The original `scoreMap` was a client-side approximation.
  // For now, let's keep the original filtering logic for the slider to see how it interacts.
  const scoreMap = useMemo(() => {
    // This map was a client-side approximation.
    // The actual perspective/bias filtering will eventually be driven by the backend score
    // or by how source_types are weighted by the slider for the /score call.
    // Let's make it reflect the base trust for now, higher values = more mainstream
    // This is a simplification. The slider's effect is now handled by the backend /score endpoint.
    // This filtering might become redundant or change based on how we want the slider to affect visibility
    // vs. just the score. For now, let's make it so higher slider value shows more "trusted" sources.
    // This part needs careful thought based on desired UX.
    // If slider directly sends value to backend for *each* item's score,
    // then client-side filtering by slider might be less direct.
    const baseTrustForFiltering = {};
    results.forEach(r => {
      baseTrustForFiltering[r.source_type] = r.base_trust;
    });
    return baseTrustForFiltering;
  }, [results]);


  const filtered = useMemo(
    () => {
      return results.filter(r => {
        // Original slider logic: (scoreMap[r.source_type] ?? 50) >= sliderValue
        // This was based on a client-side scoreMap.
        // Now that the slider value is sent to the backend to calculate the score,
        // direct filtering by the slider on the frontend might be redundant if all items are re-scored.
        // However, if not all items are re-scored on slider change (for performance),
        // some client-side filtering might still be desired.
        // Let's assume for now the user wants to see items whose *base trust* aligns with the slider somewhat,
        // before dynamic scores are fetched or fully updated for all.
        // This is a placeholder and needs to align with the full interaction design for the slider.
        const sourceBaseTrust = r.base_trust || 0; // from initial search results
        if (sliderValue <= 50) { // More fringe
            return sourceBaseTrust <= (50 + (50 - sliderValue)); // Allow sources up to a certain trust level
        } else { // More mainstream
            return sourceBaseTrust >= (sliderValue - 50);
        }
      });
    },
    [results, sliderValue]
  );

  const pieData = useMemo(() => {
    const counts = {};
    filtered.forEach((r) => { // Using filtered results for charts
      counts[r.source_type] = (counts[r.source_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const barData = useMemo(() => {
    const counts = {};
    filtered.forEach((r) => { // Using filtered results for charts
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

        <div className="flex justify-center py-6">
          <img src={Logo} alt="Perspective Engine" className="h-32 w-auto" />
        </div>

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

        <div className="bg-gray-100 rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
              type="text"
              placeholder="Enter search query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
              disabled={!filtered.length || summarizing} // Disabled if filtered list is empty
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              {summarizing ? "Summarizing…" : "Summarize"}
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Fringe</span> {/* Simpler labels */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="flex-1 accent-purple-600"
            />
            <span className="text-sm text-gray-600">Mainstream</span> {/* Simpler labels */}
          </div>
          <div className="text-center text-sm text-gray-500">
            Perspective: {sliderValue}%
          </div>
        </div>

        {error && (
          <div className="text-red-700 bg-red-100 p-4 rounded">{error}</div>
        )}

        {summary && (
          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded shadow">
            <h2 className="font-semibold text-purple-800">Summary</h2>
            <p className="mt-2 text-gray-800 whitespace-pre-wrap">{summary}</p>
          </div>
        )}

        {/* CHARTS */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-100 rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-2 text-center">
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
                          key={`cell-${i}`}
                          fill={["#9333EA", "#A855F7", "#C4B5FD", "#EDE9FE", "#D1D5DB"][i % 5]}
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
              <h3 className="font-semibold text-gray-700 mb-2 text-center">
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
        )}

        {/* RESULTS */}
        <div className="space-y-4 mt-6">
          {loading && <p className="text-center text-purple-600">Loading results...</p>}
          {!loading && results.length > 0 && filtered.length === 0 && (
            <p className="italic text-gray-500 text-center">
              No results match your current perspective filter. Try adjusting the slider.
            </p>
          )}
          {!loading && results.length === 0 && !error && query && (
             <p className="italic text-gray-500 text-center">
                No results found for your query.
             </p>
          )}

          {filtered.map((r) => {
            const currentScoreData = credibilityScores[r.uid];
            const displayScore = currentScoreData && currentScoreData.score !== undefined 
                                 ? currentScoreData.score 
                                 : r.base_trust; // Fallback to base_trust if not scored by backend yet
            // const breakdown = currentScoreData ? currentScoreData.breakdown : null; // We'll use this later

            return (
              <div
                key={r.uid}
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
                    {r.sourceEngine} ({r.source_type})
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{r.snippet}</p>

                {/* Credibility Meter - Uses dynamically fetched score if available */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Credibility</span>
                    <span>
                      {currentScoreData && currentScoreData.error 
                       ? <span className="text-red-500">Error scoring</span>
                       : `${displayScore}%`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 ${currentScoreData && currentScoreData.error ? 'bg-red-300' : 'bg-green-500'}`}
                      style={{ width: `${currentScoreData && currentScoreData.error ? 100 : displayScore}%` }}
                    />
                  </div>
                </div>
                
                {/* TODO: Display Breakdown Here using 'breakdown' variable */}
                {/* This is where we will add the UI for the score breakdown components */}
                {/* For example:
                {breakdown && (
                  <div className="mt-2 text-xs text-gray-500 p-2 bg-gray-50 rounded">
                    <p>Base Trust: {breakdown.base_trust}%</p>
                    <p>Fact-Check Adj.: {breakdown.fact_check_adjustment}%</p>
                    <p>Slider Influence: {breakdown.slider_influence}%</p>
                    <p>Recency Boost: {breakdown.recency_boost_value}%</p>
                  </div>
                )}
                */}


                {/* Fact Check */}
                <div className="mt-3">
                  {factChecks[r.uid] && factChecks[r.uid].verdict === "loading" ? (
                    <div className="text-sm text-gray-600">Fact-checking…</div>
                  ) : factChecks[r.uid] && factChecks[r.uid].verdict !== "Error" && factChecks[r.uid].verdict !== "loading" ? (
                    <div className={`p-3 rounded ${factChecks[r.uid].verdict === "True" ? "bg-green-50" : factChecks[r.uid].verdict === "False" ? "bg-red-50" : "bg-yellow-50"}`}>
                      <strong>Verdict: {factChecks[r.uid].verdict}</strong>
                      <br />
                      <em className="block mt-1 text-sm">
                        {factChecks[r.uid].reasoning}
                      </em>
                      {factChecks[r.uid].sources?.length > 0 && (
                        <div className="text-xs mt-2">
                          Sources:{" "}
                          {factChecks[r.uid].sources.map((u, j) => (
                            <a
                              key={`${r.uid}-source-${j}`}
                              href={u}
                              className="underline pr-1 hover:text-purple-600"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {u}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : factChecks[r.uid] && factChecks[r.uid].verdict === "Error" ? (
                     <div className="p-3 bg-red-100 rounded">
                        <strong>Fact-Check Error:</strong> {factChecks[r.uid].reasoning}
                     </div>
                  ): (
                    <button
                      onClick={() => runFactCheck(r)} // Pass the whole result item
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Fact Check this
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}