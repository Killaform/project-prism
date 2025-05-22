import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
    Search, Settings, BarChart2, FileText, CheckCircle, AlertCircle, Clock, ExternalLink, 
    Users, Shield, Globe, TrendingUp, TrendingDown, HelpCircle, Newspaper, GraduationCap,
    Landmark, BookOpen, FlaskConical, MessageSquare, Youtube, UserCheck, Edit3, Mic, Briefcase,
    Rss, Globe2, AlertTriangle, AlertOctagon, Building2, X, Save, KeyRound, Brain // New icons
} from 'lucide-react';
import { ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './App.css';
import logoSrc from './assets/logo.png';

// Debounce function (remains the same)
function debounce(func, delay) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, delay); }; }

// Source Type Mapping (remains the same)
const sourceTypeDisplayMap = { /* ... (same as last version) ... */ 
    government: { label: "Government / Official", icon: <Landmark size={14} className="mr-1.5 text-gray-500" /> },
    academic_institution: { label: "Academic Institution", icon: <GraduationCap size={14} className="mr-1.5 text-gray-500" /> },
    encyclopedia: { label: "Encyclopedia", icon: <BookOpen size={14} className="mr-1.5 text-gray-500" /> },
    research_publication: { label: "Research Publication", icon: <FlaskConical size={14} className="mr-1.5 text-gray-500" /> },
    news_media_mainstream: { label: "Mainstream News", icon: <Newspaper size={14} className="mr-1.5 text-gray-500" /> },
    news_opinion_blog_live: { label: "News Opinion/Blog", icon: <MessageSquare size={14} className="mr-1.5 text-gray-500" /> },
    social_media_platform: { label: "Social Media", icon: <Users size={14} className="mr-1.5 text-gray-500" /> },
    social_media_platform_video: { label: "Video Platform", icon: <Youtube size={14} className="mr-1.5 text-gray-500" /> },
    social_media_channel_creator: { label: "Social Media Creator", icon: <UserCheck size={14} className="mr-1.5 text-gray-500" /> },
    social_blogging_platform_user_pub: { label: "Blog Platform (User/Pub)", icon: <Edit3 size={14} className="mr-1.5 text-gray-500" /> },
    social_blogging_platform: { label: "Blogging Platform", icon: <Mic size={14} className="mr-1.5 text-gray-500" /> },
    ngo_nonprofit_publication: { label: "NGO/Non-Profit News", icon: <FileText size={14} className="mr-1.5 text-gray-500" /> },
    ngo_nonprofit_organization: { label: "NGO/Non-Profit Org", icon: <Building2 size={14} className="mr-1.5 text-gray-500" /> },
    ngo_nonprofit_general: { label: "NGO/Non-Profit", icon: <Globe size={14} className="mr-1.5 text-gray-500" /> },
    corporate_blog_pr_info: { label: "Corporate/PR", icon: <Briefcase size={14} className="mr-1.5 text-gray-500" /> },
    news_media_other_or_blog: { label: "Independent News/Blog", icon: <Rss size={14} className="mr-1.5 text-gray-500" /> },
    website_general: { label: "General Website", icon: <Globe2 size={14} className="mr-1.5 text-gray-500" /> },
    unknown_url: { label: "Unknown (URL Issue)", icon: <AlertTriangle size={14} className="mr-1.5 text-red-500" /> },
    unknown_other: { label: "Unknown Source", icon: <HelpCircle size={14} className="mr-1.5 text-gray-500" /> },
    unknown_error_parsing: { label: "Unknown (Parsing Error)", icon: <AlertOctagon size={14} className="mr-1.5 text-red-500" /> },
    mainstream: { label: "Mainstream", icon: <Shield size={14} className="mr-1.5 text-gray-500" /> },
    alternative: { label: "Alternative", icon: <Users size={14} className="mr-1.5 text-gray-500" /> },
    unknown: { label: "Unknown", icon: <HelpCircle size={14} className="mr-1.5 text-gray-500" /> },
    default: { label: "Source", icon: <Globe2 size={14} className="mr-1.5 text-gray-500" /> }
};
const getSourceDisplay = (sourceTypeLabel) => sourceTypeDisplayMap[sourceTypeLabel] || { label: sourceTypeLabel || "Unknown", icon: sourceTypeDisplayMap.default.icon };

const SearchResultItem = ({ result, index, onSummarize, onFactCheck }) => {
  // ... (SearchResultItem remains the same as the last fully approved version)
  const getFavicon = (url) => { try { const domain = new URL(url).hostname; return `https://www.google.com/s2/favicons?sz=24&domain_url=${domain}`; } catch (e) { console.warn("Favicon error:", url, e); return '/default_favicon.png'; }};
  const sourceDisplay = getSourceDisplay(result.source_type_label);
  return (
    <div className={`bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out mb-6 border-l-4 ${result.perspective_query_type === 'fringe_fetch' ? 'border-pink-500' : result.perspective_query_type === 'mainstream_fetch' ? 'border-purple-500' : 'border-gray-300'}`}>
      <div className="flex items-start mb-2">
        <img src={getFavicon(result.link)} alt="favicon" className="w-6 h-6 mr-3 mt-1 flex-shrink-0 rounded" />
        <div className="flex-grow">
          <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-xl font-semibold text-purple-700 hover:text-purple-900 visited:text-purple-800 hover:underline"> {result.title || "Untitled"} <ExternalLink size={15} className="inline ml-1 text-gray-400 hover:text-purple-600" /> </a>
          <p className="text-xs text-purple-400 mt-0.5">Fetched via: <span className="font-medium">{result.perspective_query_type?.replace('_fetch', '') || 'N/A'}</span></p>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1 break-all ml-9">{result.link}</p>
      <p className="text-gray-700 mb-4 text-sm leading-relaxed ml-9">{result.snippet || "No snippet."}</p>
      <div className="ml-9 mb-4 flex flex-wrap items-center text-xs text-gray-700 gap-x-5 gap-y-2">
        <span className="flex items-center">Engine: <span className="font-semibold text-gray-900 ml-1">{result.source_engine}</span></span>
        <span className="flex items-center">{sourceDisplay.icon}{sourceDisplay.label}</span>
        <span className="flex items-center truncate"> {result.sentiment?.label === 'positive' ? <TrendingUp size={14} className="mr-1.5 text-green-500" /> : result.sentiment?.label === 'negative' ? <TrendingDown size={14} className="mr-1.5 text-red-500" /> : <HelpCircle size={14} className="mr-1.5 text-gray-500" />} Sentiment: <span className={`font-semibold ml-1 ${ result.sentiment?.label === 'positive' ? 'text-green-600' : result.sentiment?.label === 'negative' ? 'text-red-600' : 'text-gray-900' }`}> {result.sentiment?.label ? result.sentiment.label.charAt(0).toUpperCase() + result.sentiment.label.slice(1) : 'N/A'} ({result.sentiment?.score?.toFixed(2) || '0.00'})</span></span>
      </div>
      <div className="ml-9 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-800" title="Intrinsic Credibility Score"> Intrinsic Score: <span className="text-xl text-purple-700 font-bold"> {result.intrinsic_credibility_score !== null && result.intrinsic_credibility_score !== undefined ? result.intrinsic_credibility_score : (result.is_scoring_intrinsic ? '...' : 'N/A')}</span> {result.intrinsic_credibility_factors && ( <span className="block text-xs text-gray-500 mt-0.5"> (B: {result.intrinsic_credibility_factors.base_trust_contribution}, R: {result.intrinsic_credibility_factors.recency_contribution}, F: {result.intrinsic_credibility_factors.fact_check_contribution}, T: {result.intrinsic_credibility_factors.type_quality_adjustment})</span> )}</div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onSummarize(index)} className="px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md flex items-center"> <FileText size={14} className="mr-1.5" /> Summarize </button>
            <button onClick={() => onFactCheck(index)} className="px-3 py-2 text-xs font-semibold text-pink-700 bg-pink-100 rounded-md hover:bg-pink-200 transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md flex items-center"> <CheckCircle size={14} className="mr-1.5" /> Fact-Check </button>
          </div>
        </div>
        {result.summary && ( <div className="mt-3 p-3 bg-purple-50 rounded-md text-sm text-gray-800 shadow-inner"> <h4 className="font-semibold text-purple-700 mb-1">Summary <span className="text-xs font-normal text-gray-500">({result.summarized_from})</span>:</h4> <p className="whitespace-pre-wrap leading-relaxed">{result.summary}</p> </div> )}
        {result.factCheck && ( <div className="mt-3 p-3 bg-pink-50 rounded-md text-sm text-gray-800 shadow-inner"> <h4 className="font-semibold text-pink-700 mb-1">Fact-Check Analysis <span className="text-xs font-normal text-gray-500">({result.factCheck.source})</span>:</h4> {result.factCheck.claim && <p className="mb-0.5"><span className="font-medium">Claim:</span> {result.factCheck.claim}</p>} <p><span className="font-medium">Verdict:</span> <span className={`ml-1 font-bold ${result.factCheck.verdict === 'verified'?'text-green-700':result.factCheck.verdict === 'disputed_false' || result.factCheck.verdict === 'false' ? 'text-red-700': result.factCheck.verdict === 'lacks_consensus' ? 'text-orange-600' : 'text-yellow-700'}`}>{result.factCheck.verdict?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())||"Status Unknown"}</span></p> <p className="text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{result.factCheck.explanation}</p> </div> )}
      </div>
    </div>
  );
};

const CredibilityOverviewCard = ({ displayedResults, activePerspectiveMode, allSearchResultsCount }) => {
  // ... (CredibilityOverviewCard remains the same as the last fully approved version)
  if (!displayedResults) { return ( <div className="bg-white p-6 Rrs TxtC Tgray500"> <HelpCircle size={32} className="mx-auto mb-2 Tpurple300" /> <p>Loading overview data...</p> </div> ); }
  if (displayedResults.length === 0 && allSearchResultsCount === 0) { return null; }
  if (displayedResults.length === 0 && allSearchResultsCount > 0) { return ( <div className="bg-white p-6 Rrs TxtC Tgray500"> <HelpCircle size={32} className="mx-auto mb-2 Tpurple300" /> <p>No results match the current perspective filter.</p> </div>); }
  const topSourceTypesCounts = displayedResults.reduce((acc, curr) => { const type = curr.source_type_label || 'Unknown'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
  const sortedSourceTypes = Object.entries(topSourceTypesCounts).sort(([, a], [, b]) => b - a).slice(0, 4); 
  const sentimentCounts = displayedResults.reduce((acc, curr) => { const label = curr.sentiment?.label || 'neutral'; acc[label] = (acc[label] || 0) + 1; return acc; }, { positive: 0, negative: 0, neutral: 0 });
  let predominantSentiment = 'Mixed';
  if(Object.values(sentimentCounts).every(c => c === 0)) predominantSentiment = "N/A";
  else if (sentimentCounts.positive >= sentimentCounts.negative && sentimentCounts.positive >= sentimentCounts.neutral && sentimentCounts.positive > 0) predominantSentiment = 'Positive';
  else if (sentimentCounts.negative >= sentimentCounts.positive && sentimentCounts.negative >= sentimentCounts.neutral && sentimentCounts.negative > 0) predominantSentiment = 'Negative';
  else if (sentimentCounts.neutral > sentimentCounts.positive && sentimentCounts.neutral > sentimentCounts.negative && sentimentCounts.neutral > 0) predominantSentiment = 'Neutral';
  const validScores = displayedResults.map(r => r.intrinsic_credibility_score).filter(s => s !== null && s !== undefined && s >= 0);
  const averageIntrinsicScore = validScores.length > 0 ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1) : 'N/A';
  const factCheckedItems = displayedResults.filter(r => r.factCheck && r.factCheck.verdict && !['pending', 'checking...', 'service_unavailable', 'error', 'error_parsing'].includes(r.factCheck.verdict) );
  const verifiedCount = factCheckedItems.filter(r => r.factCheck.verdict === 'verified').length;
  const disputedCount = factCheckedItems.filter(r => ['disputed_false', 'false', 'disputed'].includes(r.factCheck.verdict)).length;
  const otherVerdictsCount = factCheckedItems.length - verifiedCount - disputedCount;
  const perspectiveLabels = { mainstream: "Mainstream / Authoritative", balanced: "Balanced / All", fringe: "Fringe / Alternative" };
  return ( <div className="bg-white p-6 rounded-2xl shadow-xl"> <h3 className="text-2xl font-semibold mb-6 text-purple-800">Current Perspective Overview</h3> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm"> <div className="bg-purple-50 p-5 Rrs"> <h4 className="font-bold text-purple-700 mb-2 text-base flex items-center"><Globe size={18} className="mr-2"/>Viewing Perspective</h4> <p className="Tgray800 font-medium text-lg">{perspectiveLabels[activePerspectiveMode] || activeDisplayPerspective.replace(/^\w/, c => c.toUpperCase())}</p> <p className="Tgray600 text-xs mt-1">Displaying {displayedResults.length} of {allSearchResultsCount} total.</p> </div> <div className="bg-indigo-50 p-5 Rrs"> <h4 className="font-bold text-indigo-700 mb-2 text-base flex items-center"><BarChart2 size={18} className="mr-2"/>Dominant Source Types</h4> {sortedSourceTypes.length > 0 ? (<ul className="list-none pl-0 Tgray800 space-y-1">{sortedSourceTypes.map(([type, count]) => { const display = getSourceDisplay(type); return ( <li key={type} className="flex items-center justify-between py-0.5"><span className="flex items-center">{display.icon} {display.label}:</span> <span className="font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 Rrfull Txs">{count}</span></li> ); })}</ul>) : <p className="Tgray500">N/A</p>} </div> <div className="bg-pink-50 p-5 Rrs"> <h4 className="font-bold text-pink-700 mb-2 text-base flex items-center"> {predominantSentiment === 'Positive' ? <TrendingUp size={18} className="mr-2"/> : predominantSentiment === 'Negative' ? <TrendingDown size={18} className="mr-2"/> : <HelpCircle size={18} className="mr-2"/>} Sentiment Snapshot </h4> <p className="Tgray800">Overall Lean: <span className="font-semibold text-lg">{predominantSentiment}</span></p> <p className="Tgray600 text-xs mt-1">(Pos: {sentimentCounts.positive}, Neg: {sentimentCounts.negative}, Neu: {sentimentCounts.neutral})</p> </div> <div className="md:col-span-2 lg:col-span-3 bg-green-50 p-5 Rrs mt-2"> <h4 className="font-bold text-green-800 mb-3 text-base flex items-center"><CheckCircle size={18} className="mr-2"/>Credibility & Fact-Checks <span className="text-xs font-normal Tgray600 ml-2">(Current View)</span></h4> <div className="flex flex-wrap gap-x-8 gap-y-3 items-center"> <p>Avg. Intrinsic Score: <span className="font-bold text-2xl text-green-700">{averageIntrinsicScore}</span></p> <div className="border-l border-green-300 pl-6"> <p>Fact-Checked by You: <span className="font-bold">{factCheckedItems.length}</span></p> {factCheckedItems.length > 0 && (<div className="text-xs mt-1"> <span className="font-semibold text-green-600 mr-2">Verified: {verifiedCount}</span> <span className="font-semibold text-red-600 mr-2">Disputed: {disputedCount}</span> {otherVerdictsCount > 0 && <span className="font-semibold text-yellow-600">Other: {otherVerdictsCount}</span>} </div>)}</div></div></div></div></div>);
};


// --- App Component ---
function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allSearchResults, setAllSearchResults] = useState([]); 
  const [displayedResults, setDisplayedResults] = useState([]); 
  const [isLoading, setIsLoading] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [error, setError] = useState(null);
  const [activeDisplayPerspective, setActiveDisplayPerspective] = useState('balanced'); 
  const [selectedEngines, setSelectedEngines] = useState({ google: true, bing: true, duckduckgo: true });

  // --- NEW Settings State ---
  const [apiSettingsVisible, setApiSettingsVisible] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState('openai'); // 'openai' or 'gemini'
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [serpApiKeyUser, setSerpApiKeyUser] = useState(''); // User-entered SERP API key

  // --- Load settings from localStorage on initial mount ---
  useEffect(() => {
    const savedSettings = localStorage.getItem('perspectiveEngineSettings');
    if (savedSettings) {
      const { provider, openaiKey, geminiKey, serpKey } = JSON.parse(savedSettings);
      setSelectedAiProvider(provider || 'openai');
      setOpenaiApiKey(openaiKey || '');
      setGeminiApiKey(geminiKey || '');
      setSerpApiKeyUser(serpKey || '');
      console.log("[SETTINGS] Loaded from localStorage:", JSON.parse(savedSettings));
    }
  }, []);

  // --- Save settings to localStorage when they change ---
  useEffect(() => {
    const settingsToSave = {
      provider: selectedAiProvider,
      openaiKey: openaiApiKey,
      geminiKey: geminiApiKey,
      serpKey: serpApiKeyUser,
    };
    localStorage.setItem('perspectiveEngineSettings', JSON.stringify(settingsToSave));
    console.log("[SETTINGS] Saved to localStorage:", settingsToSave);
  }, [selectedAiProvider, openaiApiKey, geminiApiKey, serpApiKeyUser]);


  const calculateIntrinsicScoreForItem = useCallback(async (item, itemIndexInAllResults) => {
    // ... (same as last version)
    if (!item) { console.warn(`[FRONTEND] CalcScore: item undefined for index ${itemIndexInAllResults}`); setAllSearchResults(prev => prev.map((r, idx) => idx === itemIndexInAllResults ? {...r, is_scoring_intrinsic: false, intrinsic_credibility_score: -1 } : r)); return null; }
    const masterIndex = allSearchResults.findIndex(r => r.link === item.link && r.perspective_query_type === item.perspective_query_type);
    const targetIndex = masterIndex !== -1 ? masterIndex : itemIndexInAllResults;
    if (targetIndex === -1) { console.warn(`[FRONTEND] CalcScore: targetIndex -1 for item ${item.link}`); return item; } 
    setAllSearchResults(prev => prev.map((r, idx) => idx === targetIndex ? {...r, is_scoring_intrinsic: true, needsRescore: false} : r));
    const payload = { source_type: item.source_type_label || 'unknown', base_trust: item.base_trust || 50, recency_boost: item.recency_boost || 0, factcheckVerdict: item.factcheckVerdict || 'pending' };
    try {
      const response = await fetch(`http://127.0.0.1:5001/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const scoreData = await response.json();
      if (!response.ok) throw new Error(scoreData.error || `HTTP error ${response.status}`);
      const updatedItem = { ...item, intrinsic_credibility_score: scoreData.intrinsic_credibility_score, intrinsic_credibility_factors: scoreData.factors, is_scoring_intrinsic: false };
      setAllSearchResults(prev => prev.map((r, idx) => idx === targetIndex ? updatedItem : r ));
      return updatedItem;
    } catch (e) {
      console.error(`[FRONTEND] Error /score for '${item.title}':`, e.message);
      const errorItem = { ...item, intrinsic_credibility_score: -1, is_scoring_intrinsic: false };
      setAllSearchResults(prev => prev.map((r, idx) => idx === targetIndex ? errorItem : r ));
      return errorItem;
    }
  }, [allSearchResults]);

  const calculateAllIntrinsicScores = useCallback(async (resultsToScore) => {
    // ... (same as last version)
    if (!resultsToScore || resultsToScore.length === 0) return [];
    setIsProcessing(true); console.log(`[FRONTEND] Batch scoring ${resultsToScore.length} results.`);
    const scorePromises = resultsToScore.map(async (item) => {
        const payload = { source_type: item.source_type_label || 'unknown', base_trust: item.base_trust || 50, recency_boost: item.recency_boost || 0, factcheckVerdict: item.factcheckVerdict || 'pending' };
        try {
            const response = await fetch(`http://127.0.0.1:5001/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const scoreData = await response.json();
            if (!response.ok) throw new Error(scoreData.error || "Score API error batch");
            return { ...item, intrinsic_credibility_score: scoreData.intrinsic_credibility_score, intrinsic_credibility_factors: scoreData.factors, is_scoring_intrinsic: false };
        } catch (e) { console.error(`Error scoring item '${item.title}' batch: ${e.message}`); return { ...item, intrinsic_credibility_score: -1, is_scoring_intrinsic: false }; }
    });
    const itemsWithScores = await Promise.all(scorePromises);
    setAllSearchResults(currentMasterList => currentMasterList.map(masterItem => { const updatedVersion = itemsWithScores.find(scoredItem => scoredItem.link === masterItem.link && scoredItem.perspective_query_type === masterItem.perspective_query_type); return updatedVersion || masterItem; }));
    setIsProcessing(false); return itemsWithScores; 
  }, []); 

  useEffect(() => {
    // ... (useEffect for filtering/sorting displayedResults remains the same)
    if (allSearchResults.length === 0) { if(displayedResults.length > 0) setDisplayedResults([]); return; }
    if (allSearchResults.length === 0 && displayedResults.length === 0) { return; }
    setIsProcessing(true);
    console.log(`[FRONTEND] useEffect (Filtering): Perspective: ${activeDisplayPerspective}, Total items: ${allSearchResults.length}`);
    let filtered = [];
    const mainstreamSourceTypes = ['government', 'academic_institution', 'research_publication', 'news_media_mainstream', 'encyclopedia', 'news_opinion_blog_live', 'ngo_nonprofit_publication', 'corporate_blog_pr_info', 'ngo_nonprofit_organization', 'ngo_nonprofit_general'];
    const fringeSourceTypes = ['social_media_platform', 'social_media_channel_creator', 'social_blogging_platform_user_pub', 'social_blogging_platform', 'news_media_other_or_blog', 'personal_blog', 'forum_social_personal' ];
    if (activeDisplayPerspective === 'mainstream') {
      filtered = allSearchResults.filter(item => item.perspective_query_type === 'mainstream_fetch' || mainstreamSourceTypes.includes(item.source_type_label));
    } else if (activeDisplayPerspective === 'fringe') {
      filtered = allSearchResults.filter(item => item.perspective_query_type === 'fringe_fetch' || fringeSourceTypes.includes(item.source_type_label));
    } else { filtered = [...allSearchResults]; }
    const sorted = [...filtered].sort((a, b) => { const scoreA = a.intrinsic_credibility_score !== null && a.intrinsic_credibility_score !== undefined ? a.intrinsic_credibility_score : -Infinity; const scoreB = b.intrinsic_credibility_score !== null && b.intrinsic_credibility_score !== undefined ? b.intrinsic_credibility_score : -Infinity; return scoreB - scoreA; });
    setDisplayedResults(sorted); setIsProcessing(false);
  }, [allSearchResults, activeDisplayPerspective]);


  const handleSearch = async () => {
    // ... (handleSearch needs to pass user-set API keys if available)
    if (!searchQuery.trim()) { setError("Please enter a query."); return; }
    setIsLoading(true); setError(null); setAllSearchResults([]); 
    const enginesToUse = Object.entries(selectedEngines).filter(([,sel]) => sel).map(([key]) => key);
    if (enginesToUse.length === 0) { setError("Select an engine."); setIsLoading(false); return; }
    
    const payload = { 
        query: searchQuery, 
        engines: enginesToUse,
        // Pass user-set SERP API key if it exists, otherwise backend uses its .env
        user_serpapi_key: serpApiKeyUser || null 
    };
    console.log(`[FRONTEND] Search: "${payload.query}" on ${payload.engines.join(', ')} with user SERP key: ${serpApiKeyUser ? 'Yes' : 'No'}`);
    
    try {
      const response = await fetch(`http://127.0.0.1:5001/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const responseText = await response.text();
      if (!response.ok) { let eD={}; try{eD=JSON.parse(responseText)}catch(e){eD.error=responseText.slice(0,100)} throw new Error(eD.error||"Search API error");}
      const rawBackendResults = JSON.parse(responseText);
      if (Array.isArray(rawBackendResults)) {
        const initialItems = rawBackendResults.map(item => ({
            ...item, intrinsic_credibility_score: null, intrinsic_credibility_factors: null,
            base_trust: item.base_trust || 50, recency_boost: item.recency_boost || 0,
            factcheckVerdict: item.factcheckVerdict || 'pending', is_scoring_intrinsic: false
        }));
        const itemsWithScores = await calculateAllIntrinsicScores(initialItems); 
        setAllSearchResults(itemsWithScores); 
      } else { setError("Unexpected data from server."); setAllSearchResults([]);}
    } catch (err) { setError(err.message || "Search failed."); setAllSearchResults([]);} 
    finally { setIsLoading(false); }
  };
  
  const handlePerspectiveButtonClick = (mode) => { setActiveDisplayPerspective(mode); };

  const handleFactCheck = async (itemOriginalIndex) => {
    // ... (handleFactCheck needs to pass user-set AI provider and key)
    const currentItem = allSearchResults[itemOriginalIndex];
    if (!currentItem) { console.error("FactCheck: Item not found at index", itemOriginalIndex); return; }
    console.log("[FRONTEND] Fact-checking:", currentItem.title);
    setAllSearchResults(prev => prev.map((r, idx) => idx === itemOriginalIndex ? { ...r, factCheck: { claim: currentItem.snippet || currentItem.title, verdict: "checking..." } } : r ));
    try {
      const payload = { 
        url: currentItem.link, 
        claim: currentItem.snippet || currentItem.title,
        ai_provider: selectedAiProvider,
        user_api_key: selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey
      };
      const response = await fetch(`http://127.0.0.1:5001/fact-check`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
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
    // ... (handleSummarize needs to pass user-set AI provider and key)
    const resultToSummarize = allSearchResults[itemOriginalIndex];
    if (!resultToSummarize) return;
    console.log("[FRONTEND] Summarizing:", resultToSummarize.title);
    setAllSearchResults(prev => prev.map((r, idx) => idx === itemOriginalIndex ? { ...r, summary: "Loading..." } : r ));
    try {
      const payload = {
        url: resultToSummarize.link, 
        text: resultToSummarize.snippet || resultToSummarize.title,
        ai_provider: selectedAiProvider,
        user_api_key: selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey
      };
      const response = await fetch(`http://127.0.0.1:5001/summarize`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Summarize API error");
      setAllSearchResults(prev => prev.map((r, idx) => idx === itemOriginalIndex ? { ...r, summary: data.summary, summarized_from: data.summarized_from } : r ));
    } catch (e) { console.error("Summarization error:", e.message); setAllSearchResults(prev => prev.map((r,idx) => idx === itemOriginalIndex ? {...r, summary: `Error: ${e.message}`} : r));}
  };
  
  const handleKeyDown = (event) => { if (event.key === 'Enter') handleSearch(); };
  const handleEngineChange = (engine) => { setSelectedEngines(prev => ({ ...prev, [engine]: !prev[engine] })); };
  const getButtonClass = (mode) => `px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${activeDisplayPerspective === mode ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'}`;

  // --- Settings Modal Logic ---
  const [tempOpenaiApiKey, setTempOpenaiApiKey] = useState(openaiApiKey);
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState(geminiApiKey);
  const [tempSerpApiKeyUser, setTempSerpApiKeyUser] = useState(serpApiKeyUser);
  const [tempSelectedAiProvider, setTempSelectedAiProvider] = useState(selectedAiProvider);

  useEffect(() => { // Sync temp keys when modal opens or main keys change
    setTempOpenaiApiKey(openaiApiKey);
    setTempGeminiApiKey(geminiApiKey);
    setTempSerpApiKeyUser(serpApiKeyUser);
    setTempSelectedAiProvider(selectedAiProvider);
  }, [apiSettingsVisible, openaiApiKey, geminiApiKey, serpApiKeyUser, selectedAiProvider]);

  const handleSaveSettings = () => {
    setSelectedAiProvider(tempSelectedAiProvider);
    setOpenaiApiKey(tempOpenaiApiKey);
    setGeminiApiKey(tempGeminiApiKey);
    setSerpApiKeyUser(tempSerpApiKeyUser);
    setApiSettingsVisible(false);
    // localStorage saving is handled by the other useEffect
  };
  
  const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm";
  const labelStyles = "block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 text-gray-800">
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center"> <img src={logoSrc} alt="Perspective Engine Logo" className="h-[75px] w-auto" /> </div> {/* Logo size as requested */}
          <div> 
            <button onClick={() => setApiSettingsVisible(true)} className="text-gray-600 hover:text-purple-700 p-2 rounded-full hover:bg-purple-100 transition-colors"> 
              <Settings size={24} /> 
            </button> 
          </div>
        </div>
      </header>

      {/* API Settings Modal */}
      {apiSettingsVisible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-purple-700 flex items-center"><KeyRound size={28} className="mr-3"/>API Settings</h2>
              <button onClick={() => setApiSettingsVisible(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="aiProvider" className={labelStyles}>AI Provider for Analysis:</label>
                <select id="aiProvider" value={tempSelectedAiProvider} onChange={(e) => setTempSelectedAiProvider(e.target.value)} className={inputStyles}>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              {tempSelectedAiProvider === 'openai' && (
                <div>
                  <label htmlFor="openaiKey" className={labelStyles}>OpenAI API Key:</label>
                  <input type="password" id="openaiKey" value={tempOpenaiApiKey} onChange={(e) => setTempOpenaiApiKey(e.target.value)} className={inputStyles} placeholder="sk-..."/>
                </div>
              )}

              {tempSelectedAiProvider === 'gemini' && (
                <div>
                  <label htmlFor="geminiKey" className={labelStyles}>Google Gemini API Key:</label>
                  <input type="password" id="geminiKey" value={tempGeminiApiKey} onChange={(e) => setTempGeminiApiKey(e.target.value)} className={inputStyles} placeholder="AIzaSy..."/>
                </div>
              )}
              
              <div>
                <label htmlFor="serpApiKey" className={labelStyles}>SERP API Key (for Search):</label>
                <input type="password" id="serpApiKey" value={tempSerpApiKeyUser} onChange={(e) => setTempSerpApiKeyUser(e.target.value)} className={inputStyles} placeholder="Your SERP API key..."/>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setApiSettingsVisible(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm">Cancel</button>
                <button onClick={handleSaveSettings} className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm flex items-center">
                  <Save size={16} className="mr-2"/>Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto p-6 lg:p-10">
        {/* ... (Rest of the main content: search card, overview card, results list - remains the same as your last approved version) ... */}
        <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl mb-10">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Explore perspectives on any topic..." className="w-full p-4 pl-12 text-lg border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow hover:shadow-lg focus:shadow-xl"/>
              <Search size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" />
            </div>
            <button onClick={handleSearch} disabled={isLoading || isProcessing} className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:scale-100 flex items-center justify-center">
              {(isLoading || isProcessing) ? ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <Search size={20} className="mr-2" /> )}
              {isLoading ? 'Searching...' : isProcessing ? 'Processing...' : 'Search'}
            </button>
          </div>
          <div className="mt-8">
            <p className="text-md font-semibold text-gray-700 mb-3">Select Perspective View:</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => handlePerspectiveButtonClick('fringe')} className={getButtonClass('fringe')}> <Users size={18} className="mr-2"/> Fringe / Alt </button>
              <button onClick={() => handlePerspectiveButtonClick('balanced')} className={getButtonClass('balanced')}> <Globe size={18} className="mr-2"/> Balanced / All </button>
              <button onClick={() => handlePerspectiveButtonClick('mainstream')} className={getButtonClass('mainstream')}> <Shield size={18} className="mr-2"/> Mainstream </button>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Search Engines:</p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {['google', 'bing', 'duckduckgo'].map((engine) => ( <label key={engine} className="inline-flex items-center cursor-pointer group"> <input type="checkbox" checked={selectedEngines[engine]} onChange={() => handleEngineChange(engine)} className="form-checkbox h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-offset-2 accent-purple-600 transition duration-150 ease-in-out"/> <span className="ml-2 text-gray-700 group-hover:text-purple-600 transition-colors">{engine.charAt(0).toUpperCase() + engine.slice(1)}</span> </label> ))}
            </div>
          </div>
        </div>

        {error && ( <div className="bg-red-100 border-l-4 border-red-600 text-red-800 p-5 mb-8 rounded-lg shadow-md" role="alert"> <div className="flex"> <AlertCircle className="mr-3 mt-1 flex-shrink-0 text-red-600"/> <div><p className="font-bold text-lg">Error</p><p className="break-words text-md">{error}</p></div> </div> </div> )}
        {(isLoading && !isProcessing) && ( <div className="flex flex-col items-center justify-center text-purple-600 h-64"> <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-xl font-semibold">Searching perspectives...</p> </div> )}
        {isProcessing && !isLoading && ( <div className="flex flex-col items-center justify-center text-purple-600 h-64"> <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-xl font-semibold">Applying perspective / processing...</p> </div>)}
        {!isLoading && !isProcessing && !error && displayedResults.length === 0 && searchQuery && ( <div className="text-center text-gray-500 py-16"> <Clock size={56} className="mx-auto mb-6 text-purple-300" /> <p className="text-2xl font-semibold">No results for "{searchQuery}"</p><p className="text-md mt-1">Try a different perspective or broaden your search terms.</p> </div> )}
        
        {!isLoading && !isProcessing && !error && allSearchResults.length > 0 && (
             <div className="mb-10"> 
                <CredibilityOverviewCard 
                    displayedResults={displayedResults} 
                    activePerspectiveMode={activeDisplayPerspective}
                    allSearchResultsCount={allSearchResults.length}
                />
            </div>
        )}
        
        {!isLoading && !isProcessing && !error && displayedResults.length > 0 && (
          <div className="search-results-list space-y-6">
            {displayedResults.map((result) => {
                const originalIndex = allSearchResults.findIndex(item => item.link === result.link && item.perspective_query_type === result.perspective_query_type );
                return (
                  <SearchResultItem
                    key={result.link + '-' + (result.perspective_query_type || 'na') + '-' + (result.intrinsic_credibility_score || 'na_ics')} 
                    result={result} 
                    index={originalIndex !== -1 ? originalIndex : displayedResults.indexOf(result)} // Pass original index
                    onSummarize={handleSummarize} 
                    onFactCheck={handleFactCheck}
                    // onCalculateIntrinsicScore is not directly wired to a button on SearchResultItem now
                  />
                );
              })}
          </div>
        )}
      </main>
      <footer className="bg-gray-800 text-white text-center p-8 mt-16">
        <p className="text-lg">© {new Date().getFullYear()} Perspective Engine</p>
        <p className="text-sm text-gray-400 mt-1">Breaking filter bubbles, one search at a time.</p>
      </footer>
    </div>
  );
}

export default App;