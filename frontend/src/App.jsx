import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Search, Settings, BarChart2, FileText, CheckCircle, AlertCircle, Clock, ExternalLink, Users, Shield, Globe, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { ResponsiveContainer, Tooltip, Legend, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import './App.css';
import logoSrc from './assets/logo.png';

// Debounce function
function debounce(func, delay) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

const SearchResultItem = ({ result, index, onSummarize, onFactCheck, onCalculateIntrinsicScore }) => {
  const getFavicon = (url) => {
    try { const domain = new URL(url).hostname; return `https://www.google.com/s2/favicons?sz=24&domain_url=${domain}`; } 
    catch (e) { console.warn("Favicon error:", url, e); return '/default_favicon.png'; }
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition-all duration-200 ease-in-out mb-4 border-l-4 ${
        result.perspective_query_type === 'fringe_fetch' ? 'border-pink-500' : 
        result.perspective_query_type === 'mainstream_fetch' ? 'border-purple-500' : 'border-gray-300'
    }`}>
      <div className="flex items-start mb-2">
        <img src={getFavicon(result.link)} alt="favicon" className="w-6 h-6 mr-3 mt-1 flex-shrink-0" />
        <div className="flex-grow">
          <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-purple-700 hover:text-purple-900 visited:text-purple-800">
            {result.title || "Untitled"} <ExternalLink size={14} className="inline ml-1 text-gray-400" />
          </a>
          <p className="text-xs text-gray-500">Fetched via: <span className="font-medium">{result.perspective_query_type?.replace('_fetch', '') || 'N/A'}</span></p>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-1 break-all ml-9">{result.link}</p>
      <p className="text-gray-700 mb-3 text-sm break-words ml-9">{result.snippet || "No snippet."}</p>
      <div className="ml-9 mb-3 flex flex-wrap items-center text-xs text-gray-600 gap-x-4 gap-y-1">
        <span>Engine: <span className="font-medium text-gray-800">{result.source_engine}</span></span>
        <span>Type: <span className="font-medium text-gray-800">{result.source_type_label || 'N/A'}</span></span>
        <span className="truncate">Sentiment: 
          <span className={`font-medium ${result.sentiment?.label === 'positive' ? 'text-green-600' : result.sentiment?.label === 'negative' ? 'text-red-600' : 'text-gray-800'}`}>
            {result.sentiment?.label || 'N/A'} ({result.sentiment?.score?.toFixed(2) || '0.00'})
          </span>
        </span>
      </div>
      <div className="ml-9 pt-3 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-700" title="Intrinsic Credibility Score">
            Intrinsic Score: <span className="text-purple-700 font-bold">
              {result.intrinsic_credibility_score !== null && result.intrinsic_credibility_score !== undefined ? result.intrinsic_credibility_score : (result.is_scoring_intrinsic ? '...' : 'N/A')}
            </span>
            {result.intrinsic_credibility_factors && (
                 <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">(B: {result.intrinsic_credibility_factors.base_trust_contribution}, R: {result.intrinsic_credibility_factors.recency_contribution}, F: {result.intrinsic_credibility_factors.fact_check_contribution}, T: {result.intrinsic_credibility_factors.type_quality_adjustment})</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onSummarize(index)} className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium px-3 py-1.5 rounded-md flex items-center shadow-sm hover:shadow-md transition-all"> <FileText size={14} className="mr-1.5" /> Summarize </button>
            <button onClick={() => onFactCheck(index)} className="text-xs bg-pink-100 hover:bg-pink-200 text-pink-700 font-medium px-3 py-1.5 rounded-md flex items-center shadow-sm hover:shadow-md transition-all"> <CheckCircle size={14} className="mr-1.5" /> Fact-Check </button>
          </div>
        </div>
        {result.summary && ( <div className="mt-3 p-3 bg-purple-50 rounded-md text-sm text-gray-800 shadow-inner"> <h4 className="font-semibold text-purple-700 mb-1">Summary <span className="text-xs font-normal text-gray-500">({result.summarized_from})</span>:</h4> <p className="whitespace-pre-wrap">{result.summary}</p> </div> )}
        {result.factCheck && ( <div className="mt-3 p-3 bg-pink-50 rounded-md text-sm text-gray-800 shadow-inner"> <h4 className="font-semibold text-pink-700 mb-1">Fact-Check Analysis <span className="text-xs font-normal text-gray-500">({result.factCheck.source})</span>:</h4> {result.factCheck.claim && <p className="mb-0.5"><span className="font-medium">Claim:</span> {result.factCheck.claim}</p>} <p><span className="font-medium">Verdict:</span> <span className={`ml-1 font-bold ${result.factCheck.verdict === 'verified'?'text-green-700':result.factCheck.verdict === 'disputed_false' || result.factCheck.verdict === 'false' ? 'text-red-700': result.factCheck.verdict === 'lacks_consensus' ? 'text-orange-600' : 'text-yellow-700'}`}>{result.factCheck.verdict?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())||"Status Unknown"}</span></p> <p className="text-gray-700 mt-1 whitespace-pre-wrap">{result.factCheck.explanation}</p> </div> )}
      </div>
    </div>
  );
};

const CredibilityOverviewCard = ({ displayedResults, activePerspectiveMode, allSearchResultsCount }) => {
  if (!displayedResults) { // Check if displayedResults is null or undefined
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg text-center text-gray-500">
        <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" />
        <p>Loading overview data...</p>
      </div>
    );
  }
  if (displayedResults.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg text-center text-gray-500">
        <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" />
        <p>No results to analyze for the current perspective.</p>
      </div>
    );
  }

  const topSourceTypes = displayedResults.reduce((acc, curr) => { const type = curr.source_type_label || 'Unknown'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
  const sortedSourceTypes = Object.entries(topSourceTypes).sort(([, a], [, b]) => b - a).slice(0, 4); // Show top 4
  const sentimentCounts = displayedResults.reduce((acc, curr) => { const label = curr.sentiment?.label || 'neutral'; acc[label] = (acc[label] || 0) + 1; return acc; }, { positive: 0, negative: 0, neutral: 0 });
  let predominantSentiment = 'Mixed';
  if (sentimentCounts.positive > sentimentCounts.negative && sentimentCounts.positive > sentimentCounts.neutral) predominantSentiment = 'Positive';
  else if (sentimentCounts.negative > sentimentCounts.positive && sentimentCounts.negative > sentimentCounts.neutral) predominantSentiment = 'Negative';
  else if (sentimentCounts.neutral >= sentimentCounts.positive && sentimentCounts.neutral >= sentimentCounts.negative && (sentimentCounts.positive > 0 || sentimentCounts.negative > 0 || sentimentCounts.neutral > 0) ) predominantSentiment = 'Neutral';
  else if (sentimentCounts.positive === 0 && sentimentCounts.negative === 0 && sentimentCounts.neutral === 0) predominantSentiment = 'N/A';
  const validScores = displayedResults.map(r => r.intrinsic_credibility_score).filter(s => s !== null && s !== undefined && s >= 0);
  const averageIntrinsicScore = validScores.length > 0 ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1) : 'N/A';
  const factCheckedItems = displayedResults.filter(r => r.factCheck && r.factCheck.verdict && !['pending', 'checking...', 'service_unavailable', 'error', 'error_parsing'].includes(r.factCheck.verdict) );
  const verifiedCount = factCheckedItems.filter(r => r.factCheck.verdict === 'verified').length;
  const disputedCount = factCheckedItems.filter(r => ['disputed_false', 'false', 'disputed'].includes(r.factCheck.verdict)).length;
  const otherVerdictsCount = factCheckedItems.length - verifiedCount - disputedCount;
  const perspectiveLabels = { mainstream: "Mainstream / Authoritative", balanced: "Balanced / All", fringe: "Fringe / Alternative" };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-purple-700">Current Perspective Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
          <h4 className="font-semibold text-purple-600 mb-1">Viewing Perspective</h4>
          <p className="text-gray-700">{perspectiveLabels[activePerspectiveMode] || activeDisplayPerspective.replace(/^\w/, c => c.toUpperCase())}</p>
          <p className="text-gray-600 text-xs">Displaying {displayedResults.length} of {allSearchResultsCount} total fetched results.</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg shadow-sm">
          <h4 className="font-semibold text-indigo-600 mb-1">Dominant Source Types</h4>
          {sortedSourceTypes.length > 0 ? (<ul className="list-none pl-0 text-gray-700 space-y-0.5">{sortedSourceTypes.map(([type, count]) => (<li key={type} className="flex justify-between"><span>{type}:</span> <span className="font-medium">{count}</span></li>))}</ul>) : <p className="text-gray-500">N/A</p>}
        </div>
        <div className="bg-pink-50 p-4 rounded-lg shadow-sm">
          <h4 className="font-semibold text-pink-600 mb-1">Sentiment Snapshot</h4>
          <p className="text-gray-700">Overall Lean: <span className="font-medium">{predominantSentiment}</span></p>
          <p className="text-gray-600 text-xs">(Pos: {sentimentCounts.positive}, Neg: {sentimentCounts.negative}, Neu: {sentimentCounts.neutral})</p>
        </div>
        <div className="md:col-span-1 lg:col-span-3 bg-green-50 p-4 rounded-lg mt-2 shadow-sm">
            <h4 className="font-semibold text-green-700 mb-2">Credibility & Fact-Checks (Current View)</h4>
            <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                <p>Avg. Intrinsic Score: <span className="font-bold text-lg">{averageIntrinsicScore}</span></p>
                <p>Fact-Checked by You: <span className="font-bold">{factCheckedItems.length}</span></p>
                {factCheckedItems.length > 0 && (<>
                    <p>Verified: <span className="font-bold text-green-600">{verifiedCount}</span></p>
                    <p>Disputed: <span className="font-bold text-red-600">{disputedCount}</span></p>
                    {otherVerdictsCount > 0 && <p>Other: <span className="font-bold text-yellow-600">{otherVerdictsCount}</span></p>}
                </>)}
            </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allSearchResults, setAllSearchResults] = useState([]); 
  const [displayedResults, setDisplayedResults] = useState([]); 
  const [isLoading, setIsLoading] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [error, setError] = useState(null);
  const [activeDisplayPerspective, setActiveDisplayPerspective] = useState('balanced'); 
  const [selectedEngines, setSelectedEngines] = useState({ google: true, bing: true, duckduckgo: true });

  const calculateIntrinsicScoreForItem = useCallback(async (item, itemIndexInAllResults) => {
    if (!item) {
        console.warn(`[FRONTEND] calculateIntrinsicScoreForItem: item is undefined for index ${itemIndexInAllResults}`);
        setAllSearchResults(prev => prev.map((r, idx) => idx === itemIndexInAllResults ? {...r, is_scoring_intrinsic: false, intrinsic_credibility_score: -1 } : r));
        return null; 
    }
    
    const masterIndex = allSearchResults.findIndex(r => r.link === item.link && r.perspective_query_type === item.perspective_query_type);
    if (masterIndex === -1 && itemIndexInAllResults === undefined) { // If itemIndexInAllResults was not provided
        console.warn(`[FRONTEND] calculateIntrinsicScoreForItem: item with link ${item.link} not found in allSearchResults for update.`);
        return item; // Return original item if cannot find its definite place
    }
    const targetIndex = masterIndex !== -1 ? masterIndex : itemIndexInAllResults;


    setAllSearchResults(prev => prev.map((r, idx) => idx === targetIndex ? {...r, is_scoring_intrinsic: true, needsRescore: false} : r));
    const payload = {
      source_type: item.source_type_label || 'unknown', base_trust: item.base_trust || 50,
      recency_boost: item.recency_boost || 0, factcheckVerdict: item.factcheckVerdict || 'pending',
    };
    try {
      const response = await fetch(`http://127.0.0.1:5001/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const scoreData = await response.json();
      if (!response.ok) throw new Error(scoreData.error || `HTTP error ${response.status}`);
      const updatedItem = { ...item, intrinsic_credibility_score: scoreData.intrinsic_credibility_score, intrinsic_credibility_factors: scoreData.factors, is_scoring_intrinsic: false };
      setAllSearchResults(prev => prev.map((r, idx) => idx === targetIndex ? updatedItem : r ));
      return updatedItem;
    } catch (e) {
      console.error(`[FRONTEND] Error calling /score for '${item.title}':`, e.message);
      const errorItem = { ...item, intrinsic_credibility_score: -1, is_scoring_intrinsic: false };
      setAllSearchResults(prev => prev.map((r, idx) => idx === targetIndex ? errorItem : r ));
      return errorItem;
    }
  }, [allSearchResults]); // Include allSearchResults as it's used to find masterIndex

  const calculateAllIntrinsicScores = useCallback(async (resultsToScore) => {
    if (!resultsToScore || resultsToScore.length === 0) return [];
    setIsProcessing(true);
    console.log(`[FRONTEND] Batch calculating intrinsic scores for ${resultsToScore.length} results.`);
    
    const scorePromises = resultsToScore.map(async (item) => {
        // This item is directly from resultsToScore, its index within that array is not critical here
        // as we are returning new objects.
        const payload = {
            source_type: item.source_type_label || 'unknown', base_trust: item.base_trust || 50,
            recency_boost: item.recency_boost || 0, factcheckVerdict: item.factcheckVerdict || 'pending',
        };
        try {
            const response = await fetch(`http://127.0.0.1:5001/score`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
            });
            const scoreData = await response.json();
            if (!response.ok) throw new Error(scoreData.error || "Score API error for batch item");
            return { ...item, intrinsic_credibility_score: scoreData.intrinsic_credibility_score, intrinsic_credibility_factors: scoreData.factors, is_scoring_intrinsic: false };
        } catch (e) {
            console.error(`Error scoring item '${item.title}' in batch: ${e.message}`);
            return { ...item, intrinsic_credibility_score: -1, is_scoring_intrinsic: false };
        }
    });

    const itemsWithScores = await Promise.all(scorePromises);
    // Update the main allSearchResults state with the newly scored items from the original list
    setAllSearchResults(currentMasterList => {
        return currentMasterList.map(masterItem => {
            // Find the corresponding scored item from the batch
            const updatedVersion = itemsWithScores.find(scoredItem => 
                scoredItem.link === masterItem.link && 
                scoredItem.perspective_query_type === masterItem.perspective_query_type
            );
            // If an updated version exists (i.e., it was part of resultsToScore and got scored), use it.
            // Otherwise, keep the masterItem as is (it might have been scored previously or not part of this batch).
            return updatedVersion || masterItem; 
        });
    });
    setIsProcessing(false);
    return itemsWithScores; // Return for handleSearch to know scoring is done for initial set
  }, []); // Removed calculateIntrinsicScoreForItem from deps, direct fetch logic now here


  useEffect(() => {
    if (allSearchResults.length === 0 && displayedResults.length > 0) {
        setDisplayedResults([]);
        return;
    }
    // If allSearchResults is empty and displayedResults is also empty, do nothing further.
    if (allSearchResults.length === 0 && displayedResults.length === 0) {
        return;
    }

    setIsProcessing(true);
    console.log(`[FRONTEND] useEffect (Filtering): Perspective: ${activeDisplayPerspective}, Total items: ${allSearchResults.length}`);
    
    let filtered = [];
    const mainstreamSourceTypes = ['government', 'academic_institution', 'research_publication', 'news_media_mainstream', 'encyclopedia', 'news_opinion_blog_live', 'ngo_nonprofit_publication', 'corporate_blog_pr_info', 'ngo_nonprofit_organization', 'ngo_nonprofit_general'];
    const fringeSourceTypes = ['social_media_platform', 'social_media_channel_creator', 'social_blogging_platform_user_pub', 'social_blogging_platform', 'news_media_other_or_blog', 'personal_blog', 'forum_social_personal']; // Added forum_social_personal
    // 'website_general', 'unknown_other', 'unknown_url', 'unknown_error_parsing' can appear in any or be their own category

    if (activeDisplayPerspective === 'mainstream') {
      filtered = allSearchResults.filter(item => 
        item.perspective_query_type === 'mainstream_fetch' || // Primarily from mainstream query
        (mainstreamSourceTypes.includes(item.source_type_label)) // Or classified as mainstream type
      );
    } else if (activeDisplayPerspective === 'fringe') {
      filtered = allSearchResults.filter(item => 
        item.perspective_query_type === 'fringe_fetch' || // Primarily from fringe query
        (fringeSourceTypes.includes(item.source_type_label)) // Or classified as fringe type
      );
    } else { // 'balanced' 
        filtered = [...allSearchResults]; // Show all results
    }
    
    const sorted = [...filtered].sort((a, b) => {
        const scoreA = a.intrinsic_credibility_score !== null && a.intrinsic_credibility_score !== undefined ? a.intrinsic_credibility_score : -Infinity;
        const scoreB = b.intrinsic_credibility_score !== null && b.intrinsic_credibility_score !== undefined ? b.intrinsic_credibility_score : -Infinity;
        return scoreB - scoreA;
    });
    
    setDisplayedResults(sorted);
    // Charts are now part of CredibilityOverviewCard which takes displayedResults
    setIsProcessing(false);

  }, [allSearchResults, activeDisplayPerspective]);


  const handleSearch = async () => {
    if (!searchQuery.trim()) { setError("Please enter a query."); return; }
    setIsLoading(true); setError(null); setAllSearchResults([]); 
    const enginesToUse = Object.entries(selectedEngines).filter(([,sel]) => sel).map(([key]) => key);
    if (enginesToUse.length === 0) { setError("Select an engine."); setIsLoading(false); return; }
    console.log(`[FRONTEND] Search: "${searchQuery}" on ${enginesToUse.join(', ')}`);
    try {
      const response = await fetch(`http://127.0.0.1:5001/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchQuery, engines: enginesToUse }), });
      const responseText = await response.text();
      if (!response.ok) { let eD={}; try{eD=JSON.parse(responseText)}catch(e){eD.error=responseText.slice(0,100)} throw new Error(eD.error||"Search API error");}
      const rawBackendResults = JSON.parse(responseText);
      if (Array.isArray(rawBackendResults)) {
        const initialItems = rawBackendResults.map(item => ({
            ...item, intrinsic_credibility_score: null, intrinsic_credibility_factors: null,
            base_trust: item.base_trust || 50, recency_boost: item.recency_boost || 0,
            factcheckVerdict: item.factcheckVerdict || 'pending', is_scoring_intrinsic: false
        }));
        // IMPORTANT: Set allSearchResults first to make them available for calculateAllIntrinsicScores
        setAllSearchResults(initialItems); 
        // Then, calculate scores. This will trigger a re-render and the useEffect will sort/filter.
        if(initialItems.length > 0) {
            await calculateAllIntrinsicScores(initialItems); 
        }
      } else { setError("Unexpected data from server."); setAllSearchResults([]);}
    } catch (err) { setError(err.message || "Search failed."); setAllSearchResults([]);} 
    finally { setIsLoading(false); }
  };
  
  const handlePerspectiveButtonClick = (mode) => { setActiveDisplayPerspective(mode); };

  const handleFactCheck = async (itemOriginalIndex) => {
    const currentItem = allSearchResults[itemOriginalIndex];
    if (!currentItem) { console.error("FactCheck: Item not found at original index", itemOriginalIndex); return; }
    console.log("[FRONTEND] Fact-checking:", currentItem.title);
    setAllSearchResults(prev => prev.map((r, idx) => idx === itemOriginalIndex ? { ...r, factCheck: { claim: currentItem.snippet || currentItem.title, verdict: "checking..." } } : r ));
    try {
      const response = await fetch(`http://127.0.0.1:5001/fact-check`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ url: currentItem.link, claim: currentItem.snippet || currentItem.title }) });
      const factCheckData = await response.json();
      if (!response.ok) throw new Error(factCheckData.error || "Fact-check API error");
      const itemWithNewFactCheck = { ...currentItem, factCheck: factCheckData, factcheckVerdict: factCheckData.verdict, needsRescore: true }; 
      await calculateIntrinsicScoreForItem(itemWithNewFactCheck, itemOriginalIndex); 
    } catch (e) {
      console.error("[FRONTEND] Fact-check error:", e.message);
      setAllSearchResults(prev => prev.map((r, idx) => idx === itemOriginalIndex ? { ...currentItem, factCheck: { claim: currentItem.snippet||currentItem.title, verdict: "error", explanation: e.message } } : r ));
    }
  };

  const handleSummarize = async (itemOriginalIndex) => {
    const resultToSummarize = allSearchResults[itemOriginalIndex];
    if (!resultToSummarize) return;
    console.log("[FRONTEND] Summarizing:", resultToSummarize.title);
    setAllSearchResults(prev => prev.map((r, idx) => idx === itemOriginalIndex ? { ...r, summary: "Loading..." } : r ));
    try {
      const response = await fetch(`http://127.0.0.1:5001/summarize`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ url: resultToSummarize.link, text: resultToSummarize.snippet || resultToSummarize.title }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Summarize API error");
      setAllSearchResults(prev => prev.map((r, idx) => idx === itemOriginalIndex ? { ...r, summary: data.summary, summarized_from: data.summarized_from } : r ));
    } catch (e) { console.error("Summarization error:", e.message); setAllSearchResults(prev => prev.map((r,idx) => idx === itemOriginalIndex ? {...r, summary: `Error: ${e.message}`} : r));}
  };
  
  const handleKeyDown = (event) => { if (event.key === 'Enter') handleSearch(); };
  const handleEngineChange = (engine) => { setSelectedEngines(prev => ({ ...prev, [engine]: !prev[engine] })); };
  const getButtonClass = (mode) => `px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 ${activeDisplayPerspective === mode ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-gray-100 text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center"> <img src={logoSrc} alt="Perspective Engine Logo" className="h-[75px] w-auto" /> </div>
          <div> <button className="text-gray-600 hover:text-purple-700"> <Settings size={24} /> </button> </div>
        </div>
      </header>

      <main className="container mx-auto p-4 lg:p-8">
        <div className="bg-white p-6 rounded-xl shadow-xl mb-8">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Enter your query..." className="w-full p-4 pl-12 text-lg border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow hover:shadow-md"/>
              <Search size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" />
            </div>
            <button onClick={handleSearch} disabled={isLoading || isProcessing} className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center">
              {(isLoading || isProcessing) ? ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <Search size={20} className="mr-2" /> )}
              {isLoading ? 'Searching...' : isProcessing ? 'Processing...' : 'Search'}
            </button>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Select Perspective View:</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => handlePerspectiveButtonClick('fringe')} className={getButtonClass('fringe')}> <Users size={16} className="mr-2"/> Fringe / Alt </button>
              <button onClick={() => handlePerspectiveButtonClick('balanced')} className={getButtonClass('balanced')}> <Globe size={16} className="mr-2"/> Balanced / All </button>
              <button onClick={() => handlePerspectiveButtonClick('mainstream')} className={getButtonClass('mainstream')}> <Shield size={16} className="mr-2"/> Mainstream </button>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Search Engines:</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {['google', 'bing', 'duckduckgo'].map((engine) => ( <label key={engine} className="inline-flex items-center cursor-pointer"> <input type="checkbox" checked={selectedEngines[engine]} onChange={() => handleEngineChange(engine)} className="form-checkbox h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 accent-purple-600"/> <span className="ml-2 text-gray-700 capitalize">{engine}</span> </label> ))}
            </div>
          </div>
        </div>

        {error && ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert"> <div className="flex"> <AlertCircle className="mr-3 mt-1 flex-shrink-0"/> <div><p className="font-bold">Error</p><p className="break-words">{error}</p></div> </div> </div> )}
        {(isLoading && !isProcessing) && ( <div className="flex flex-col items-center justify-center text-purple-600 h-64"> <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-xl font-semibold">Searching perspectives...</p> </div> )}
        {isProcessing && !isLoading && ( <div className="flex flex-col items-center justify-center text-purple-600 h-64"> <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-xl font-semibold">Applying perspective / processing...</p> </div>)}
        {!isLoading && !isProcessing && !error && displayedResults.length === 0 && searchQuery && ( <div className="text-center text-gray-500 py-10"> <Clock size={48} className="mx-auto mb-4 text-purple-300" /> <p className="text-xl">No results for "{searchQuery}" with current perspective.</p> </div> )}
        
        {!isLoading && !isProcessing && !error && allSearchResults.length > 0 && (
             <div className="mb-8">
                <CredibilityOverviewCard 
                    displayedResults={displayedResults} 
                    activePerspectiveMode={activeDisplayPerspective}
                    allSearchResultsCount={allSearchResults.length}
                />
            </div>
        )}
        
        {!isLoading && !isProcessing && !error && displayedResults.length > 0 && (
          <div className="search-results-list">
            {displayedResults.map((result) => {
                const originalIndex = allSearchResults.findIndex(item => item.link === result.link && item.perspective_query_type === result.perspective_query_type );
                return (
                  <SearchResultItem
                    key={result.link + '-' + (result.perspective_query_type || 'na') + '-' + (result.intrinsic_credibility_score || 'na_ics')} 
                    result={result} 
                    index={originalIndex !== -1 ? originalIndex : displayedResults.indexOf(result)}
                    onSummarize={handleSummarize} 
                    onFactCheck={handleFactCheck}
                    onCalculateIntrinsicScore={(idxToScore) => {
                        const itemToScore = allSearchResults[idxToScore];
                        if (itemToScore) calculateIntrinsicScoreForItem(itemToScore, idxToScore);
                    }}
                  />
                );
              })}
          </div>
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