import React from 'react';
import { useState, useEffect } from 'react'; // Removed useCallback for now
import { Search, Settings, BarChart2, FileText, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';
import logoSrc from './assets/logo.png';

const SearchResultItem = ({ result, index, onSummarize, onFactCheck, onUpdateScore }) => { // Added index and onUpdateScore
  const getFavicon = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=24&domain_url=${domain}`;
    } catch (e) {
      console.warn("Failed to get favicon for URL:", url, e);
      return '/default_favicon.png'; 
    }
  };

  const handleScoreButtonClick = () => {
    // This function is a placeholder if we want an explicit button to trigger score later
    // For now, score updates after fact-check
    if (onUpdateScore) {
        console.log("Manually requesting score update for item index:", index)
        onUpdateScore(index);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 ease-in-out mb-4">
      <div className="flex items-start mb-2">
        <img src={getFavicon(result.link)} alt="favicon" className="w-6 h-6 mr-3 mt-1 flex-shrink-0" />
        <div className="flex-grow">
          <a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-purple-700 hover:text-purple-900 hover:underline break-words visited:text-purple-800"
          >
            {result.title || "Untitled"} <ExternalLink size={14} className="inline ml-1 text-gray-400" />
          </a>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-1 break-all ml-9">{result.link}</p>
      <p className="text-gray-700 mb-3 text-sm break-words ml-9">{result.snippet || "No snippet available."}</p>
      
      <div className="ml-9 mb-3 flex flex-wrap items-center text-xs text-gray-600 gap-x-4 gap-y-1">
        <span>Source: <span className="font-medium text-gray-800">{result.source}</span></span>
        <span>Type: <span className="font-medium text-gray-800">{result.source_type_label || 'N/A'}</span></span>
        <span className="truncate">Sentiment: 
          <span className={`font-medium ${
            result.sentiment?.label === 'positive' ? 'text-green-600' :
            result.sentiment?.label === 'negative' ? 'text-red-600' :
            'text-gray-800'
          }`}>
            {result.sentiment?.label || 'N/A'} ({result.sentiment?.score?.toFixed(2) || '0.00'})
          </span>
        </span>
      </div>

      <div className="ml-9 pt-3 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div 
            className="text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors cursor-pointer"
            title="Credibility score (updates after fact-check)"
            onClick={handleScoreButtonClick} // Optional: allow manual refresh of score
            >
            Credibility: <span className="text-purple-700 font-bold">{result.credibility_score !== null && result.credibility_score !== undefined ? result.credibility_score : 'N/A'}</span>
            {result.credibility_factors && (
                 <span className="text-xs text-gray-500 ml-1">(BS: {result.credibility_factors.base_trust_score}, RS: {result.credibility_factors.recency_score}, FS: {result.credibility_factors.fact_check_score}, US: {result.credibility_factors.user_slider_score})</span>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onSummarize(index)} // Pass index
              className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-md transition-colors flex items-center shadow-sm hover:shadow-md"
              title="Summarize content from URL"
            >
              <FileText size={14} className="inline mr-1.5" /> Summarize
            </button>
            <button
              onClick={() => onFactCheck(index)} // Pass index
              className="text-xs bg-pink-100 text-pink-700 hover:bg-pink-200 px-3 py-1.5 rounded-md transition-colors flex items-center shadow-sm hover:shadow-md"
              title="Fact-Check claim from URL"
            >
              <CheckCircle size={14} className="inline mr-1.5" /> Fact-Check
            </button>
          </div>
        </div>

        {result.summary && (
          <div className="mt-3 p-3 bg-purple-50 rounded-md text-sm text-gray-800 shadow-inner">
            <h4 className="font-semibold text-purple-700 mb-1">Summary <span className="text-xs font-normal text-gray-500">({result.summarized_from || 'source N/A'})</span>:</h4>
            <p className="whitespace-pre-wrap">{result.summary}</p>
          </div>
        )}
        {result.factCheck && (
          <div className="mt-3 p-3 bg-pink-50 rounded-md text-sm shadow-inner">
            <h4 className="font-semibold text-pink-700 mb-1">Fact-Check Analysis <span className="text-xs font-normal text-gray-500">({result.factCheck.source || 'source N/A'})</span>:</h4>
            <p className="mb-0.5">
              <span className="font-medium">Claim:</span> {result.factCheck.claim}
            </p>
            <p>
              <span className="font-medium">Verdict:</span>
              <span className={`ml-1 font-bold ${
                result.factCheck.verdict === 'verified' ? 'text-green-700' :
                result.factCheck.verdict === 'disputed_false' || result.factCheck.verdict === 'false' ? 'text-red-700' :
                result.factCheck.verdict === 'lacks_consensus' ? 'text-orange-600' :
                result.factCheck.verdict === 'service_unavailable' ? 'text-gray-500' :
                'text-yellow-700'
              }`}>
                {result.factCheck.verdict?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Status Unknown"}
              </span>
            </p>
            <p className="text-gray-700 mt-1">{result.factCheck.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [perspective, setPerspective] = useState(50); // User's perspective slider value
  const [selectedEngines, setSelectedEngines] = useState({
    google: true,
    bing: true,
    duckduckgo: true,
  });

  const [sourceTypeData, setSourceTypeData] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const PIE_COLORS = ['#9333EA', '#F472B6', '#A78BFA', '#EDE9FE', '#6B21A8', '#DB2777', '#7E22CE'];

  // Function to update credibility score for a specific result
  const updateCredibilityForResult = async (resultIndex) => {
    const resultToScore = searchResults[resultIndex];
    if (!resultToScore) return;

    console.log(`[FRONTEND] Updating score for item ${resultIndex}:`, resultToScore.title);
    // Assuming these values are available or have sensible defaults.
    // Frontend needs to determine/store base_trust and recency_boost per result if they vary.
    // For now, using defaults if not present on the result object.
    const payload = {
      source_type: resultToScore.source_type_label || 'unknown',
      base_trust: resultToScore.base_trust || 50, // Default if not set
      sliderValue: perspective, // Current global slider value
      recency_boost: resultToScore.recency_boost || 0, // Default if not set
      factcheckVerdict: resultToScore.factCheck?.verdict || resultToScore.factcheckVerdict || 'pending',
    };

    console.log("[FRONTEND] Calling /score with payload:", payload);

    try {
      const response = await fetch(`http://127.0.0.1:5001/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const scoreData = await response.json();
      if (!response.ok) {
        console.error("[FRONTEND] /score HTTP error:", response.status, scoreData);
        throw new Error(scoreData.error || `HTTP error ${response.status}`);
      }
      
      console.log("[FRONTEND] Received score data:", scoreData);
      setSearchResults(prevResults => prevResults.map((item, idx) => 
        idx === resultIndex ? { 
            ...item, 
            credibility_score: scoreData.credibility_score,
            credibility_factors: scoreData.factors // Store the breakdown
        } : item
      ));

    } catch (e) {
      console.error("[FRONTEND] Error calling /score endpoint:", e.message);
      // Optionally set an error message for this specific result or a general one
    }
  };


  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query.");
      setSearchResults([]); updateChartData([]); return;
    }
    setIsLoading(true); setError(null);
    setSearchResults([]); updateChartData([]);

    const enginesToUse = Object.entries(selectedEngines)
      .filter(([,isSelected]) => isSelected).map(([engineKey]) => engineKey);

    if (enginesToUse.length === 0) {
      setError("Please select at least one search engine."); setIsLoading(false); return;
    }
    console.log(`[FRONTEND] Initiating search for: "${searchQuery}" on engines: ${enginesToUse.join(', ')}`);
    try {
      const response = await fetch(`http://127.0.0.1:5001/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, engines: enginesToUse }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        console.error("[FRONTEND] HTTP error! Status:", response.status, "Response Text:", responseText);
        let errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        try { errorData = JSON.parse(responseText); } 
        catch (e) { errorData.detail = responseText.substring(0, 200) || "Could not retrieve error details."; }
        throw new Error(errorData.error || errorData.message || `Failed to fetch: ${response.status}`);
      }
      const data = JSON.parse(responseText);
      if (Array.isArray(data)) {
        // Initialize credibility_score and credibility_factors for new results
        const augmentedData = data.map(item => ({
            ...item,
            credibility_score: item.credibility_score !== undefined ? item.credibility_score : null, // Keep if backend sends it
            credibility_factors: item.credibility_factors || null,
            base_trust: item.base_trust || 50, // Ensure defaults if not from backend
            recency_boost: item.recency_boost || 0,
            factcheckVerdict: item.factcheckVerdict || 'pending'
        }));
        setSearchResults(augmentedData);
        updateChartData(augmentedData);
      } else {
        setError("Received unexpected data format from server.");
        setSearchResults([]); updateChartData([]);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch search results.");
      setSearchResults([]); updateChartData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => { if (event.key === 'Enter') handleSearch(); };
  const handleEngineChange = (engine) => { setSelectedEngines(prev => ({ ...prev, [engine]: !prev[engine] })); };

  const handleSummarize = async (itemIndex) => {
    const resultToSummarize = searchResults[itemIndex];
    if (!resultToSummarize) return;

    console.log("[FRONTEND] Summarizing:", resultToSummarize.title, "URL:", resultToSummarize.link);
    setSearchResults(prevResults => prevResults.map((r, idx) =>
      idx === itemIndex ? { ...r, summary: "Loading summary..." } : r
    ));
    try {
      const response = await fetch(`http://127.0.0.1:5001/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send URL and fallback text (snippet/title)
        body: JSON.stringify({ 
            url: resultToSummarize.link, 
            text: resultToSummarize.snippet || resultToSummarize.title 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP error ${response.status}`);
      setSearchResults(prevResults => prevResults.map((r, idx) =>
        idx === itemIndex ? { ...r, summary: data.summary, summarized_from: data.summarized_from } : r
      ));
    } catch (e) {
      console.error("[FRONTEND] Summarization error:", e.message);
      setSearchResults(prevResults => prevResults.map((r, idx) =>
        idx === itemIndex ? { ...r, summary: `Could not load summary: ${e.message}` } : r
      ));
    }
  };

  const handleFactCheck = async (itemIndex) => {
    const resultToFactCheck = searchResults[itemIndex];
    if (!resultToFactCheck) return;

    console.log("[FRONTEND] Fact-checking:", resultToFactCheck.title, "URL:", resultToFactCheck.link);
    setSearchResults(prevResults => prevResults.map((r, idx) =>
      idx === itemIndex ? { ...r, factCheck: { claim: r.snippet || r.title, verdict: "checking...", explanation: "" } } : r
    ));
    try {
      const response = await fetch(`http://127.0.0.1:5001/fact-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send URL and fallback claim (snippet/title)
        body: JSON.stringify({ 
            url: resultToFactCheck.link, 
            claim: resultToFactCheck.snippet || resultToFactCheck.title 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP error ${response.status}`);
      setSearchResults(prevResults => prevResults.map((r, idx) =>
        idx === itemIndex ? { ...r, factCheck: data, factcheckVerdict: data.verdict } : r // Update factcheckVerdict on the result
      ));
      // After successful fact-check, update the credibility score for this item
      updateCredibilityForResult(itemIndex);

    } catch (e) {
      console.error("[FRONTEND] Fact-check error:", e.message);
      setSearchResults(prevResults => prevResults.map((r, idx) =>
        idx === itemIndex ? { ...r, factCheck: { claim: r.snippet || r.title, verdict: "error", explanation: `Could not perform fact-check: ${e.message}` } } : r
      ));
    }
  };

  const updateChartData = (data) => {
    // ... (chart data logic remains the same)
    if (!Array.isArray(data)) {
        console.warn("[FRONTEND] updateChartData received non-array data:", data);
        setSourceTypeData([]); setSentimentData([]); return;
    }
    const sourceCounts = data.reduce((acc, curr) => {
      const type = curr.source_type_label || 'Unknown';
      acc[type] = (acc[type] || 0) + 1; return acc;
    }, {});
    setSourceTypeData(Object.entries(sourceCounts).map(([name, value]) => ({ name, value })));
    const sentimentCounts = data.reduce((acc, curr) => {
      const sentimentLabel = curr.sentiment?.label || 'Neutral';
      acc[sentimentLabel] = (acc[sentimentLabel] || 0) + 1; return acc;
    }, {});
    setSentimentData(Object.entries(sentimentCounts).map(([name, value]) => ({ name, value })));
  };

  useEffect(() => {
    // Future: Debounce this or call it on a specific user action (e.g., "Apply Perspective")
    // For now, it's not actively re-filtering results based on slider.
    // If results exist, and slider changes, we *could* re-score all visible items.
    // This is a placeholder for where perspective slider logic would go.
    console.log("Perspective slider changed to:", perspective);
    if (searchResults.length > 0) {
        // Example: if slider changes, re-calculate scores for all results
        // This could be too many API calls if not careful.
        // For now, we are only updating scores after fact-checks.
    }
  }, [perspective, searchResults]); // Removed searchResults from dependency to avoid too many calls on initial load


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-gray-100 text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            {/* Updated logo size to h-[75px] */}
            <img src={logoSrc} alt="Perspective Engine Logo" className="h-[75px] w-auto" />
          </div>
          <div>
            <button className="text-gray-600 hover:text-purple-700">
              <Settings size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 lg:p-8">
        <div className="bg-white p-6 rounded-xl shadow-xl mb-8">
          {/* Search Input and Controls Section */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
              <input
                type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your query..."
                className="w-full p-4 pl-12 text-lg border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow hover:shadow-md"
              />
              <Search size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" />
            </div>
            <button
              onClick={handleSearch} disabled={isLoading}
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <Search size={20} className="mr-2" /> )}
              Search
            </button>
          </div>
          <div className="mt-6">
            <label htmlFor="perspective-slider" className="block text-sm font-medium text-gray-700 mb-1">
              Adjust Perspective (Score updates on fact-check for now)
            </label>
            <input
              id="perspective-slider" type="range" min="0" max="100" value={perspective}
              onChange={(e) => setPerspective(parseInt(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 rounded-lg appearance-none cursor-pointer range-lg accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Fringe</span><span>Neutral</span><span>Mainstream</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Search Engines:</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {['google', 'bing', 'duckduckgo'].map((engine) => (
                <label key={engine} className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox" checked={selectedEngines[engine]}
                    onChange={() => handleEngineChange(engine)}
                    className="form-checkbox h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 accent-purple-600"
                  />
                  <span className="ml-2 text-gray-700 capitalize">{engine}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Error, Loading, No Results states */}
        {error && ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert"> <div className="flex"> <AlertCircle className="mr-3 mt-1 flex-shrink-0"/> <div><p className="font-bold">Error</p><p className="break-words">{error}</p></div> </div> </div> )}
        {isLoading && ( <div className="flex flex-col items-center justify-center text-purple-600 h-64"> <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-xl font-semibold">Searching perspectives...</p> <p className="text-sm text-gray-500">Please wait while we gather and analyze results.</p> </div> )}
        {!isLoading && !error && searchResults.length === 0 && searchQuery && ( <div className="text-center text-gray-500 py-10"> <Clock size={48} className="mx-auto mb-4 text-purple-300" /> <p className="text-xl">No results found for "{searchQuery}".</p> <p className="text-sm">Try different terms or check API status if issues persist.</p> </div> )}

        {/* Results and Charts */}
        {!isLoading && !error && searchResults.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Source Types Chart */}
              <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-lg"> <h3 className="text-lg font-semibold mb-3 text-purple-700">Source Types</h3> {sourceTypeData.length > 0 ? ( <ResponsiveContainer width="100%" height={200}> <PieChart> <Pie data={sourceTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label> {sourceTypeData.map((entry, index) => ( <Cell key={`cell-source-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} /> ))} </Pie><Tooltip /><Legend /> </PieChart> </ResponsiveContainer> ) : <p className="text-sm text-gray-400">No source data.</p>} </div>
              {/* Sentiment Analysis Chart */}
              <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-lg"> <h3 className="text-lg font-semibold mb-3 text-purple-700">Sentiment Analysis</h3> {sentimentData.length > 0 ? ( <ResponsiveContainer width="100%" height={200}> <PieChart> <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label> {sentimentData.map((entry, index) => ( <Cell key={`cell-sentiment-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} /> ))} </Pie><Tooltip /><Legend /> </PieChart> </ResponsiveContainer> ) : <p className="text-sm text-gray-400">No sentiment data.</p>} </div>
              {/* Credibility Overview Chart (Placeholder) */}
              <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-lg"> <h3 className="text-lg font-semibold mb-3 text-purple-700">Credibility Overview</h3> <div className="flex items-center justify-center h-[200px] text-gray-400"> <BarChart2 size={48} /><p className="ml-2 text-sm">Credibility chart coming soon.</p> </div> </div>
            </div>
            {/* Search Results List */}
            <div className="search-results-list">
              {searchResults.map((result, index) => ( // Changed filteredResults to searchResults
                <SearchResultItem
                  key={result.link + '-' + index} result={result} index={index}
                  onSummarize={handleSummarize} onFactCheck={handleFactCheck}
                  onUpdateScore={updateCredibilityForResult} // Pass the new handler
                />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="bg-gray-800 text-white text-center p-6 mt-12">
        <p>&copy; {new Date().getFullYear()} Perspective Engine. All rights reserved.</p>
        <p className="text-xs text-gray-400">Breaking filter bubbles, one search at a time.</p>
      </footer>
    </div>
  );
}

export default App;