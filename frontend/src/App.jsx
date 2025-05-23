import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
    Search, Settings, BarChart2, FileText, CheckCircle, AlertCircle, Clock, ExternalLink,
    Users, Shield, Globe, TrendingUp, TrendingDown, HelpCircle, Newspaper, GraduationCap, Landmark,
    BookOpen, FlaskConical, MessageSquare, Youtube, UserCheck, Edit3, Mic, Briefcase, Rss, Globe2,
    AlertTriangle, AlertOctagon, Building2, X, Save, KeyRound,
    LogIn, UserPlus, LogOut
} from 'lucide-react';
// Removed unused: ResponsiveContainer, Tooltip, Legend from 'recharts';
// Removed unused icons: Brain, User
import './App.css';
import logoSrc from './assets/logo.png';
import GoogleIcon from './assets/google-icon.svg';
import GoogleLoginButton from './components/GoogleLoginButton';

// Debounce function
function debounce(func, delay) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, delay); }; }

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001';

// Source Type Mapping
const sourceTypeDisplayMap = {
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

// Source Type Constants for Filtering
const MAINSTREAM_SOURCE_TYPES = ['government', 'academic_institution', 'research_publication', 'news_media_mainstream', 'encyclopedia', 'news_opinion_blog_live', 'ngo_nonprofit_publication', 'corporate_blog_pr_info', 'ngo_nonprofit_organization', 'ngo_nonprofit_general'];
const FRINGE_SOURCE_TYPES = ['social_media_platform', 'social_media_channel_creator', 'social_blogging_platform_user_pub', 'social_blogging_platform', 'news_media_other_or_blog', 'personal_blog', 'forum_social_personal'];


const SearchResultItem = ({ result, index, onSummarize, onFactCheck }) => {
    const getFavicon = (url) => { try { const domain = new URL(url).hostname; return `https://www.google.com/s2/favicons?sz=24&domain_url=${domain}`; } catch (e) { console.warn("Favicon error:", url, e); return '/default_favicon.png'; } };
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
                <span className="flex items-center truncate"> {result.sentiment?.label === 'positive' ? <TrendingUp size={14} className="mr-1.5 text-green-500" /> : result.sentiment?.label === 'negative' ? <TrendingDown size={14} className="mr-1.5 text-red-500" /> : <HelpCircle size={14} className="mr-1.5 text-gray-500" />} Sentiment: <span className={`font-semibold ml-1 ${result.sentiment?.label === 'positive' ? 'text-green-600' : result.sentiment?.label === 'negative' ? 'text-red-600' : 'text-gray-900'}`}>{result.sentiment?.label ? result.sentiment.label.charAt(0).toUpperCase() + result.sentiment.label.slice(1) : 'N/A'} ({result.sentiment?.score?.toFixed(2) || '0.00'})</span></span>
            </div>
            <div className="ml-9 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-800" title="Intrinsic Credibility Score"> Intrinsic Score: <span className="text-xl text-purple-700 font-bold"> {result.intrinsic_credibility_score !== null && result.intrinsic_credibility_score !== undefined ? result.intrinsic_credibility_score : (result.is_scoring_intrinsic ? '...' : 'N/A')}</span> {result.intrinsic_credibility_factors && (<span className="block text-xs text-gray-500 mt-0.5"> (B: {result.intrinsic_credibility_factors.base_trust_contribution}, R: {result.intrinsic_credibility_factors.recency_contribution}, F: {result.intrinsic_credibility_factors.fact_check_contribution}, T: {result.intrinsic_credibility_factors.type_quality_adjustment})</span>)}</div>
                    <div className="flex gap-2 flex-wrap">
                        {/* Pass the actual result object instead of the index */}
                        <button onClick={() => onSummarize(result)} className="px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md flex items-center">
                            <FileText size={14} className="mr-1.5" /> Summarize
                        </button>
                        <button onClick={() => onFactCheck(result)} className="px-3 py-2 text-xs font-semibold text-pink-700 bg-pink-100 rounded-md hover:bg-pink-200 transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md flex items-center">
                            <CheckCircle size={14} className="mr-1.5" /> Fact-Check
                        </button>
                    </div>
                </div>
                {result.summary && (<div className="mt-3 p-3 bg-purple-50 rounded-md text-sm text-gray-800 shadow-inner"> <h4 className="font-semibold text-purple-700 mb-1">Summary <span className="text-xs font-normal text-gray-500">({result.summarized_from})</span>:</h4> <p className="whitespace-pre-wrap leading-relaxed">{result.summary}</p> </div>)}
                {result.factCheck && (<div className="mt-3 p-3 bg-pink-50 rounded-md text-sm text-gray-800 shadow-inner"> <h4 className="font-semibold text-pink-700 mb-1">Fact-Check Analysis <span className="text-xs font-normal text-gray-500">({result.factCheck.source})</span>:</h4> {result.factCheck.claim && <p className="mb-0.5"><span className="font-medium">Claim:</span> {result.factCheck.claim}</p>} <p><span className="font-medium">Verdict:</span> <span className={`ml-1 font-bold ${result.factCheck.verdict === 'verified' ? 'text-green-700' : result.factCheck.verdict === 'disputed_false' || result.factCheck.verdict === 'false' ? 'text-red-700' : result.factCheck.verdict === 'lacks_consensus' ? 'text-orange-600' : 'text-yellow-700'}`}>{result.factCheck.verdict?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Status Unknown"}</span></p> <p className="text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{result.factCheck.explanation}</p> </div>)}
            </div>
        </div>
    );
};

const CredibilityOverviewCard = ({ displayedResults, activePerspectiveMode, allSearchResultsCount }) => {
    if (!displayedResults) { return (<div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500"> <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" /> <p>Loading overview data...</p> </div>); }
    if (displayedResults.length === 0 && allSearchResultsCount === 0) { return null; }
    if (displayedResults.length === 0 && allSearchResultsCount > 0) { return (<div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500"> <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" /> <p>No results match the current perspective filter.</p> </div>); }
    const topSourceTypesCounts = displayedResults.reduce((acc, curr) => { const type = curr.source_type_label || 'Unknown'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
    const sortedSourceTypes = Object.entries(topSourceTypesCounts).sort(([, a], [, b]) => b - a).slice(0, 4);
    const sentimentCounts = displayedResults.reduce((acc, curr) => { const label = curr.sentiment?.label || 'neutral'; acc[label] = (acc[label] || 0) + 1; return acc; }, { positive: 0, negative: 0, neutral: 0 });
    let predominantSentiment = 'Mixed';
    if (Object.values(sentimentCounts).every(c => c === 0)) predominantSentiment = "N/A";
    else if (sentimentCounts.positive >= sentimentCounts.negative && sentimentCounts.positive >= sentimentCounts.neutral && sentimentCounts.positive > 0) predominantSentiment = 'Positive';
    else if (sentimentCounts.negative >= sentimentCounts.positive && sentimentCounts.negative >= sentimentCounts.neutral && sentimentCounts.negative > 0) predominantSentiment = 'Negative';
    else if (sentimentCounts.neutral > sentimentCounts.positive && sentimentCounts.neutral > sentimentCounts.negative && sentimentCounts.neutral > 0) predominantSentiment = 'Neutral';
    const validScores = displayedResults.map(r => r.intrinsic_credibility_score).filter(s => s !== null && s !== undefined && s >= 0);
    const averageIntrinsicScore = validScores.length > 0 ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1) : 'N/A';
    const factCheckedItems = displayedResults.filter(r => r.factCheck && r.factCheck.verdict && !['pending', 'checking...', 'service_unavailable', 'error', 'error_parsing'].includes(r.factCheck.verdict));
    const verifiedCount = factCheckedItems.filter(r => r.factCheck.verdict === 'verified').length;
    const disputedCount = factCheckedItems.filter(r => ['disputed_false', 'false', 'disputed'].includes(r.factCheck.verdict)).length;
    const otherVerdictsCount = factCheckedItems.length - verifiedCount - disputedCount;
    const perspectiveLabels = { mainstream: "Mainstream / Authoritative", balanced: "Balanced / All", fringe: "Fringe / Alternative" };
    return (<div className="bg-white p-6 rounded-2xl shadow-xl"> <h3 className="text-2xl font-semibold mb-6 text-purple-800">Current Perspective Overview</h3> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm"> <div className="bg-purple-50 p-5 rounded-lg"> <h4 className="font-bold text-purple-700 mb-2 text-base flex items-center"><Globe size={18} className="mr-2" />Viewing Perspective</h4> <p className="text-gray-800 font-medium text-lg">{perspectiveLabels[activePerspectiveMode] || activeDisplayPerspective.replace(/^\w/, c => c.toUpperCase())}</p> <p className="text-gray-600 text-xs mt-1">Displaying {displayedResults.length} of {allSearchResultsCount} total.</p> </div> <div className="bg-indigo-50 p-5 rounded-lg"> <h4 className="font-bold text-indigo-700 mb-2 text-base flex items-center"><BarChart2 size={18} className="mr-2" />Dominant Source Types</h4> {sortedSourceTypes.length > 0 ? (<ul className="list-none pl-0 text-gray-800 space-y-1">{sortedSourceTypes.map(([type, count]) => { const display = getSourceDisplay(type); return (<li key={type} className="flex items-center justify-between py-0.5"><span className="flex items-center">{display.icon} {display.label}:</span> <span className="font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{count}</span></li>); })}</ul>) : <p className="text-gray-500">N/A</p>} </div> <div className="bg-pink-50 p-5 rounded-lg"> <h4 className="font-bold text-pink-700 mb-2 text-base flex items-center"> {predominantSentiment === 'Positive' ? <TrendingUp size={18} className="mr-2" /> : predominantSentiment === 'Negative' ? <TrendingDown size={18} className="mr-2" /> : <HelpCircle size={18} className="mr-2" />} Sentiment Snapshot </h4> <p className="text-gray-800">Overall Lean: <span className="font-semibold text-lg">{predominantSentiment}</span></p> <p className="text-gray-600 text-xs mt-1">(Pos: {sentimentCounts.positive}, Neg: {sentimentCounts.negative}, Neu: {sentimentCounts.neutral})</p> </div> <div className="md:col-span-2 lg:col-span-3 bg-green-50 p-5 rounded-lg mt-2"> <h4 className="font-bold text-green-800 mb-3 text-base flex items-center"><CheckCircle size={18} className="mr-2" />Credibility & Fact-Checks <span className="text-xs font-normal text-gray-600 ml-2">(Current View)</span></h4> <div className="flex flex-wrap gap-x-8 gap-y-3 items-center"> <p>Avg. Intrinsic Score: <span className="font-bold text-2xl text-green-700">{averageIntrinsicScore}</span></p> <div className="border-l border-green-300 pl-6"> <p>Fact-Checked by You: <span className="font-bold">{factCheckedItems.length}</span></p> {factCheckedItems.length > 0 && (<div className="text-xs mt-1"> <span className="font-semibold text-green-600 mr-2">Verified: {verifiedCount}</span> <span className="font-semibold text-red-600 mr-2">Disputed: {disputedCount}</span> {otherVerdictsCount > 0 && <span className="font-semibold text-yellow-600">Other: {otherVerdictsCount}</span>} </div>)}</div></div></div></div></div>);
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

    const [apiSettingsVisible, setApiSettingsVisible] = useState(false);
    const [selectedAiProvider, setSelectedAiProvider] = useState('openai');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [serpApiKeyUser, setSerpApiKeyUser] = useState('');

    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('perspectiveEngineToken')); // Initialize from localStorage
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);

    // MODIFIED: Ensure handleLogout is defined if used in initial useEffect for safety
    const handleLogout = useCallback(() => {
        setToken(null);
        setCurrentUser(null);
        // localStorage removal is handled by the useEffect for token and currentUser
        console.log("User logged out");
    }, []); // Added useCallback for stability

    useEffect(() => {
        const savedSettings = localStorage.getItem('perspectiveEngineSettings');
        if (savedSettings) {
            try {
                const { provider, openaiKey, geminiKey, serpKey } = JSON.parse(savedSettings);
                setSelectedAiProvider(provider || 'openai');
                setOpenaiApiKey(openaiKey || '');
                setGeminiApiKey(geminiKey || '');
                setSerpApiKeyUser(serpKey || '');
            } catch (e) {
                console.error("Error parsing saved settings:", e);
                localStorage.removeItem('perspectiveEngineSettings');
            }
        }

        const currentToken = localStorage.getItem('perspectiveEngineToken');
        if (currentToken) {
            // Sync token state if localStorage has a different token than current state
            // This is important if the token was set by another tab or on initial load
            if (token !== currentToken) {
                setToken(currentToken);
            }
            const storedUser = localStorage.getItem('perspectiveEngineUser');
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setCurrentUser(parsedUser);
                } catch (e) {
                    console.error("Error parsing stored user:", e);
                    localStorage.removeItem('perspectiveEngineUser');
                    localStorage.removeItem('perspectiveEngineToken'); // Clear token if user data is corrupt
                    setToken(null); // Update state
                    setCurrentUser(null); // Update state
                }
            } else if (currentToken && !currentUser) { 
                // Token in localStorage, but no user info (or user info was corrupt and cleared)
                // This implies a need to re-verify token or logout.
                // A /me endpoint would be better here. For now, ensure logout for consistency.
                console.warn("Token found in localStorage but no user data, logging out for safety.");
                handleLogout(); // Ensure consistent state
            }
        } else {
            // No token in localStorage, ensure logged out state
            if (currentUser || token) { // If state thinks user is logged in, but no token in storage
                console.warn("No token in localStorage, but state indicates login. Logging out.");
                handleLogout();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on initial mount

    useEffect(() => {
        if (token) {
            localStorage.setItem('perspectiveEngineToken', token);
        } else {
            localStorage.removeItem('perspectiveEngineToken');
        }
        if (currentUser) {
            localStorage.setItem('perspectiveEngineUser', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('perspectiveEngineUser');
        }
    }, [token, currentUser]);
    
    useEffect(() => {
        const settingsToSave = {
            provider: selectedAiProvider,
            openaiKey: openaiApiKey,
            geminiKey: geminiApiKey,
            serpKey: serpApiKeyUser,
        };
        localStorage.setItem('perspectiveEngineSettings', JSON.stringify(settingsToSave));
    }, [selectedAiProvider, openaiApiKey, geminiApiKey, serpApiKeyUser]);


    // Update the score calculation function
const calculateIntrinsicScoreForItem = useCallback(async (item, itemIndexInAllResults) => {
    if (!item) { 
        console.warn(`[FRONTEND] CalcScore: item undefined for index ${itemIndexInAllResults}`); 
        return null; 
    }
    
    // Create a unique identifier for this item
    const itemId = `${item.link}-${item.perspective_query_type}`;
    
    // Find the current index of the item (which may have changed due to sorting)
    const masterIndex = allSearchResults.findIndex(r => 
        `${r.link}-${r.perspective_query_type}` === itemId);
    const targetIndex = masterIndex !== -1 ? masterIndex : itemIndexInAllResults;
    
    if (targetIndex === -1) { 
        console.warn(`[FRONTEND] CalcScore: targetIndex -1 for item ${item.link}`); 
        return item; 
    }
    
    // Update the item to show it's being scored
    setAllSearchResults(prev => prev.map((r, idx) => {
        const rId = `${r.link}-${r.perspective_query_type}`;
        return rId === itemId ? { ...r, is_scoring_intrinsic: true, needsRescore: false } : r;
    }));
    
    const payload = { 
        source_type: item.source_type_label || 'unknown', 
        base_trust: item.base_trust || 50, 
        recency_boost: item.recency_boost || 0, 
        factcheckVerdict: item.factcheckVerdict || 'pending' 
    };
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/score`, { 
            method: 'POST', headers: headers, body: JSON.stringify(payload) 
        });
        const scoreData = await response.json();
        if (!response.ok) throw new Error(scoreData.error || `HTTP error ${response.status}`);
        
        // Update the item with the score results
        setAllSearchResults(prev => prev.map(r => {
            const rId = `${r.link}-${r.perspective_query_type}`;
            return rId === itemId ? { 
                ...r, 
                intrinsic_credibility_score: scoreData.intrinsic_credibility_score, 
                intrinsic_credibility_factors: scoreData.factors, 
                is_scoring_intrinsic: false 
            } : r;
        }));
        
        return {
            ...item,
            intrinsic_credibility_score: scoreData.intrinsic_credibility_score,
            intrinsic_credibility_factors: scoreData.factors,
            is_scoring_intrinsic: false
        };
    } catch (e) {
        console.error(`[FRONTEND] Error /score for '${item.title}':`, e.message);
        
        // Update the item with error state
        setAllSearchResults(prev => prev.map(r => {
            const rId = `${r.link}-${r.perspective_query_type}`;
            return rId === itemId ? { ...r, intrinsic_credibility_score: -1, is_scoring_intrinsic: false } : r;
        }));
        
        return { ...item, intrinsic_credibility_score: -1, is_scoring_intrinsic: false };
    }
}, [allSearchResults, token]);

    const calculateAllIntrinsicScores = useCallback(async (resultsToScore) => {
        if (!resultsToScore || resultsToScore.length === 0) return [];
        setIsProcessing(true);
        const scorePromises = resultsToScore.map(async (item) => {
            const payload = { source_type: item.source_type_label || 'unknown', base_trust: item.base_trust || 50, recency_boost: item.recency_boost || 0, factcheckVerdict: item.factcheckVerdict || 'pending' };
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const response = await fetch(`${API_BASE_URL}/score`, { 
                    method: 'POST', headers: headers, body: JSON.stringify(payload) 
                });
                const scoreData = await response.json();
                if (!response.ok) throw new Error(scoreData.error || "Score API error batch");
                return { ...item, intrinsic_credibility_score: scoreData.intrinsic_credibility_score, intrinsic_credibility_factors: scoreData.factors, is_scoring_intrinsic: false };
            } catch (e) { console.error(`Error scoring item '${item.title}' batch: ${e.message}`); return { ...item, intrinsic_credibility_score: -1, is_scoring_intrinsic: false }; }
        });
        const itemsWithScores = await Promise.all(scorePromises);
        setAllSearchResults(currentMasterList => currentMasterList.map(masterItem => { const updatedVersion = itemsWithScores.find(scoredItem => scoredItem.link === masterItem.link && scoredItem.perspective_query_type === masterItem.perspective_query_type); return updatedVersion || masterItem; }));
        setIsProcessing(false); return itemsWithScores;
    }, [token]);

    useEffect(() => {
        if (allSearchResults.length === 0) { if (displayedResults.length > 0) setDisplayedResults([]); return; }
        setIsProcessing(true);
        let filtered = [];
        // Using module-level constants MAINSTREAM_SOURCE_TYPES and FRINGE_SOURCE_TYPES
        if (activeDisplayPerspective === 'mainstream') {
            filtered = allSearchResults.filter(item => item.perspective_query_type === 'mainstream_fetch' || MAINSTREAM_SOURCE_TYPES.includes(item.source_type_label));
        } else if (activeDisplayPerspective === 'fringe') {
            filtered = allSearchResults.filter(item => item.perspective_query_type === 'fringe_fetch' || FRINGE_SOURCE_TYPES.includes(item.source_type_label));
        } else { filtered = [...allSearchResults]; }
        const sorted = [...filtered].sort((a, b) => { const scoreA = a.intrinsic_credibility_score !== null && a.intrinsic_credibility_score !== undefined ? a.intrinsic_credibility_score : -Infinity; const scoreB = b.intrinsic_credibility_score !== null && b.intrinsic_credibility_score !== undefined ? b.intrinsic_credibility_score : -Infinity; return scoreB - scoreA; });
        setDisplayedResults(sorted); setIsProcessing(false);
    }, [allSearchResults, activeDisplayPerspective]); // Removed displayedResults.length from dependencies


    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        // Reset states
        setError(null);
        setIsLoading(true);
        setAllSearchResults([]);
        setDisplayedResults([]);
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log("Sending search request:", {
                query: searchQuery,
                engines: Object.keys(selectedEngines).filter(engine => selectedEngines[engine]),
                perspective: activeDisplayPerspective,
                serpapi_key: serpApiKeyUser
            });
            
            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    query: searchQuery,
                    engines: Object.keys(selectedEngines).filter(engine => selectedEngines[engine]),
                    perspective: activeDisplayPerspective,
                    serpapi_key: serpApiKeyUser
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Search API error:", response.status, errorText);
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log("Search results:", data);
            
            if (!data.results || data.results.length === 0) {
                console.log("Search returned no results");
            } else {
                setAllSearchResults(data.results);
                // Filter results according to perspective will happen in the useEffect
                console.log(`Search returned ${data.results.length} results`);
            }
        } catch (err) {
            setError(`Error performing search: ${err.message}`);
            console.error("Search error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePerspectiveButtonClick = (mode) => { setActiveDisplayPerspective(mode); };

    // Update handleFactCheck to work with the result object directly
const handleFactCheck = async (currentItem) => {
    if (!currentItem) { 
        console.error("FactCheck: Item not provided"); 
        return; 
    }
    
    // Create a unique identifier for this item
    const itemId = `${currentItem.link}-${currentItem.perspective_query_type}`;
    
    // Debug logging to track which item is being fact-checked
    console.log(`Fact-checking item: ${currentItem.title} (${itemId})`);
    
    setAllSearchResults(prev => prev.map(r => {
        const rId = `${r.link}-${r.perspective_query_type}`;
        return rId === itemId 
            ? { ...r, factCheck: { claim: currentItem.snippet || currentItem.title, verdict: "checking..." } } 
            : r;
    }));
    
    try {
        const payload = {
            url: currentItem.link,
            claim: currentItem.snippet || currentItem.title,
            ai_provider: selectedAiProvider,
            user_api_key: selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey
        };
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/fact-check`, { 
            method: 'POST', headers: headers, body: JSON.stringify(payload) 
        });
        const factCheckData = await response.json();
        if (!response.ok) throw new Error(factCheckData.error || "Fact-check API error");
        
        // Update the item with the fact check results
        setAllSearchResults(prev => prev.map(r => {
            const rId = `${r.link}-${r.perspective_query_type}`;
            if (rId === itemId) {
                const updatedItem = { 
                    ...r, 
                    factCheck: factCheckData, 
                    factcheckVerdict: factCheckData.verdict, 
                    needsRescore: true 
                };
                // Schedule a score update for this specific item
                calculateIntrinsicScoreForItem(updatedItem, prev.findIndex(item => 
                    `${item.link}-${item.perspective_query_type}` === itemId));
                return updatedItem;
            }
            return r;
        }));
    } catch (e) {
        console.error("[FRONTEND] Fact-check error:", e.message);
        setAllSearchResults(prev => prev.map(r => {
            const rId = `${r.link}-${r.perspective_query_type}`;
            return rId === itemId 
                ? { ...r, factCheck: { claim: currentItem.snippet || currentItem.title, verdict: "error", explanation: e.message } } 
                : r;
        }));
    }
};

    // Update handleSummarize to work with the result object directly
const handleSummarize = async (resultToSummarize) => {
    if (!resultToSummarize) return;
    
    // Create a unique identifier for this item
    const itemId = `${resultToSummarize.link}-${resultToSummarize.perspective_query_type}`;
    
    // Debug logging
    console.log(`Summarizing item: ${resultToSummarize.title} (${itemId})`);
    
    setAllSearchResults(prev => prev.map(r => {
        const rId = `${r.link}-${r.perspective_query_type}`;
        return rId === itemId ? { ...r, summary: "Loading..." } : r;
    }));
    
    try {
        const payload = {
            url: resultToSummarize.link,
            text: resultToSummarize.snippet || resultToSummarize.title,
            ai_provider: selectedAiProvider,
            user_api_key: selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey
        };
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/summarize`, { 
            method: 'POST', headers: headers, body: JSON.stringify(payload) 
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Summarize API error");
        
        setAllSearchResults(prev => prev.map(r => {
            const rId = `${r.link}-${r.perspective_query_type}`;
            return rId === itemId 
                ? { ...r, summary: data.summary, summarized_from: data.summarized_from } 
                : r;
        }));
    } catch (e) {
        console.error("Summarization error:", e.message);
        setAllSearchResults(prev => prev.map(r => {
            const rId = `${r.link}-${r.perspective_query_type}`;
            return rId === itemId ? { ...r, summary: `Error: ${e.message}` } : r;
        }));
    }
};

    const handleKeyDown = (event) => { if (event.key === 'Enter') handleSearch(); };
    const handleEngineChange = (engine) => { setSelectedEngines(prev => ({ ...prev, [engine]: !prev[engine] })); };
    const getButtonClass = (mode) => `px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${activeDisplayPerspective === mode ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'}`;

    const [tempOpenaiApiKey, setTempOpenaiApiKey] = useState(openaiApiKey);
    const [tempGeminiApiKey, setTempGeminiApiKey] = useState(geminiApiKey);
    const [tempSerpApiKeyUser, setTempSerpApiKeyUser] = useState(serpApiKeyUser);
    const [tempSelectedAiProvider, setTempSelectedAiProvider] = useState(selectedAiProvider);

    useEffect(() => {
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
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, password: authPassword }),
            });
            const data = await response.json(); 
            if (!response.ok) {
                throw new Error(data.error || `Registration failed with status: ${response.status}`);
            }
            setAuthMode('login'); 
            setAuthError('Registration successful! Please log in.'); 
            setAuthPassword(''); 
        } catch (err) {
            setAuthError(err.message || 'Registration failed. Please try again.');
            console.error("Registration error:", err);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, password: authPassword }),
            });
            const data = await response.json(); 
            if (!response.ok) {
                throw new Error(data.error || `Login failed with status: ${response.status}`);
            }
            setToken(data.access_token);
            setCurrentUser({ email: data.email, id: data.user_id }); 
            setAuthModalVisible(false); 
            setAuthEmail(''); 
            setAuthPassword(''); 
        } catch (err) {
            setAuthError(err.message || 'Login failed. Please check your credentials.');
            console.error("Login error:", err);
        } finally {
            setAuthLoading(false);
        }
    };

    // Add this function to your App component
    const handleGoogleLoginSuccess = ({ token, userId, email }) => {
        console.log("Google login successful:", { userId, email });
        
        // Update app state
        setToken(token);
        setCurrentUser({ id: userId, email });
        
        // Store in localStorage
        localStorage.setItem('perspectiveEngineToken', token);
        localStorage.setItem('perspectiveEngineUser', JSON.stringify({ id: userId, email }));
        
        // Close the modal
        setAuthModalVisible(false);
    };

    const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm";
    const labelStyles = "block text-sm font-medium text-gray-700";

    useEffect(() => {
        // Check for tokens in localStorage first (your existing code)
        const currentToken = localStorage.getItem('perspectiveEngineToken');
        if (currentToken) {
            setToken(currentToken);
            const storedUser = localStorage.getItem('perspectiveEngineUser');
            if (storedUser) {
                setCurrentUser(JSON.parse(storedUser));
            }
        }

        // Also check URL for auth parameters from direct redirects
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const userIdFromUrl = urlParams.get('user_id');
        const emailFromUrl = urlParams.get('email');
        
        if (tokenFromUrl && userIdFromUrl && emailFromUrl) {
            console.log("Found auth data in URL params");
            
            // Update state
            setToken(tokenFromUrl);
            setCurrentUser({ id: userIdFromUrl, email: emailFromUrl });
            
            // Save to localStorage
            localStorage.setItem('perspectiveEngineToken', tokenFromUrl);
            localStorage.setItem('perspectiveEngineUser', JSON.stringify({ id: userIdFromUrl, email: emailFromUrl }));
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []); // Empty dependency array to run only on mount

    // Add this near the top of your App component
    useEffect(() => {
        console.log("Authentication state:", { 
            token: token ? "exists" : "null", 
            currentUser: currentUser ? JSON.stringify(currentUser) : "null",
            localStorageToken: localStorage.getItem('perspectiveEngineToken') ? "exists" : "null",
            localStorageUser: localStorage.getItem('perspectiveEngineUser')
        });
    }, [token, currentUser]);

    // Add this function to your App component
    const verifyToken = async () => {
        if (!token) {
            console.log("No token to verify");
            return;
        }
        
        try {
            console.log("Verifying token with backend...");
            const response = await fetch(`${API_BASE_URL}/verify-token`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                console.log("Token is valid!");
            } else {
                console.error("Token verification failed:", response.status);
                // Token is invalid, clear it
                setToken(null);
                setCurrentUser(null);
                localStorage.removeItem('perspectiveEngineToken');
                localStorage.removeItem('perspectiveEngineUser');
            }
        } catch (error) {
            console.error("Error verifying token:", error);
        }
    };

    // Then add this effect to check the token when it changes
    useEffect(() => {
        if (token) {
            verifyToken();
        }
    }, [token]); // Only run when token changes

    // Add this useEffect inside the App component
    useEffect(() => {
        // Add event listener for direct authentication messages (not through popup)
        const handleDirectAuth = (event) => {
            if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                console.log("Received direct auth message:", event.data);
                const { token, userId, email } = event.data.payload;
                
                // Update state
                setToken(token);
                setCurrentUser({ id: userId, email });
                
                // Store in localStorage
                localStorage.setItem('perspectiveEngineToken', token);
                localStorage.setItem('perspectiveEngineUser', JSON.stringify({ id: userId, email }));
            }
        };
        
        window.addEventListener('message', handleDirectAuth);
        return () => window.removeEventListener('message', handleDirectAuth);
    }, []);

    // Add this helper function near the top of the file
const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

// Then add this debug effect to check token validity
useEffect(() => {
  if (token) {
    const parsedToken = parseJwt(token);
    console.log("Token parsed:", parsedToken);
    
    // Check if token is expired
    if (parsedToken && parsedToken.exp) {
      const expiryDate = new Date(parsedToken.exp * 1000);
      const now = new Date();
      console.log("Token expires:", expiryDate);
      console.log("Token expired:", expiryDate < now);
    }
  }
}, [token]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 text-gray-800">
            <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
                <div className="container mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center"> <img src={logoSrc} alt="Perspective Engine Logo" className="h-[75px] w-auto" /> </div>
                    <div className="flex items-center space-x-3">
                        {currentUser ? (
                            <>
                                <span className="text-sm text-gray-700 hidden sm:inline">Welcome, <span className="font-semibold text-purple-700">{currentUser.email}</span></span>
                                <button
                                    onClick={handleLogout}
                                    className="text-gray-600 hover:text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors flex items-center text-sm"
                                    title="Logout"
                                >
                                    <LogOut size={20} className="mr-1 sm:mr-0" /> <span className="sm:hidden ml-1">Logout</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => { setAuthMode('login'); setAuthModalVisible(true); setAuthError(null); setAuthEmail(''); setAuthPassword(''); }}
                                className="text-gray-600 hover:text-purple-700 p-2 rounded-full hover:bg-purple-100 transition-colors flex items-center text-sm"
                                title="Login or Register"
                            >
                                <LogIn size={20} className="mr-1" /> Login / Register
                            </button>
                        )}
                        <button onClick={() => setApiSettingsVisible(true)} className="text-gray-600 hover:text-purple-700 p-2 rounded-full hover:bg-purple-100 transition-colors" title="API Settings">
                            <Settings size={24} />
                        </button>
                    </div>
                </div>
            </header>

            {authModalVisible && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-purple-700 flex items-center">
                                {authMode === 'login' ? <LogIn size={28} className="mr-3" /> : <UserPlus size={28} className="mr-3" />}
                                {authMode === 'login' ? 'Login to Your Account' : 'Create New Account'}
                            </h2>
                            <button onClick={() => setAuthModalVisible(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        {authError && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm" role="alert" aria-live="assertive">
                                <p>{authError}</p>
                            </div>
                        )}
                        
                        {/* Add Google login button here */}
                        <div className="mb-4">
                            <GoogleLoginButton onSuccess={handleGoogleLoginSuccess} />
                        </div>
                        
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                            </div>
                        </div>

                        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-6">
                            <div>
                                <label htmlFor="authEmail" className={labelStyles}>Email address</label>
                                <input
                                    type="email"
                                    id="authEmail"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    required
                                    className={inputStyles}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </div>
                            <div>
                                <label htmlFor="authPassword" className={labelStyles}>Password</label>
                                <input
                                    type="password"
                                    id="authPassword"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    required
                                    minLength={authMode === 'register' ? 8 : undefined}
                                    className={inputStyles}
                                    placeholder="••••••••"
                                    autoComplete={authMode === 'login' ? "current-password" : "new-password"}
                                />
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                                >
                                    {authLoading ? (
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                    ) : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                                </button>
                            </div>
                        </form>
                        <p className="mt-6 text-center text-sm text-gray-600">
                            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(null); setAuthEmail(''); setAuthPassword(''); }}
                                className="font-medium text-purple-600 hover:text-purple-500 hover:underline"
                            >
                                {authMode === 'login' ? 'Sign up here' : 'Log in here'}
                            </button>
                        </p>
                    </div>
                </div>
            )}

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
                <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl mb-10">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-grow w-full">
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Explore perspectives on any topic..." className="w-full p-4 pl-12 text-lg border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow hover:shadow-lg focus:shadow-xl" />
                            <Search size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" />
                        </div>
                        <button onClick={handleSearch} disabled={isLoading || isProcessing} className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:scale-100 flex items-center justify-center">
                            {(isLoading || isProcessing) ? (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>) : (<Search size={20} className="mr-2" />)}
                            {isLoading ? 'Searching...' : isProcessing ? 'Processing...' : 'Search'}
                        </button>
                    </div>
                    <div className="mt-8">
                        <p className="text-md font-semibold text-gray-700 mb-3">Select Perspective View:</p>
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => handlePerspectiveButtonClick('fringe')} className={getButtonClass('fringe')}> <Users size={18} className="mr-2" /> Fringe / Alt </button>
                            <button onClick={() => handlePerspectiveButtonClick('balanced')} className={getButtonClass('balanced')}> <Globe size={18} className="mr-2" /> Balanced / All </button>
                            <button onClick={() => handlePerspectiveButtonClick('mainstream')} className={getButtonClass('mainstream')}> <Shield size={18} className="mr-2" /> Mainstream </button>
                        </div>
                    </div>
                    <div className="mt-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">Search Engines:</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                            {['google', 'bing', 'duckduckgo'].map((engine) => (<label key={engine} className="inline-flex items-center cursor-pointer group"> <input type="checkbox" checked={selectedEngines[engine]} onChange={() => handleEngineChange(engine)} className="form-checkbox h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-offset-2 accent-purple-600 transition duration-150 ease-in-out" /> <span className="ml-2 text-gray-700 group-hover:text-purple-600 transition-colors">{engine.charAt(0).toUpperCase() + engine.slice(1)}</span> </label>))}
                        </div>
                    </div>
                </div>

                {error && (<div className="bg-red-100 border-l-4 border-red-600 text-red-800 p-5 mb-8 rounded-lg shadow-md" role="alert" aria-live="assertive"> <div className="flex"> <AlertCircle className="mr-3 mt-1 flex-shrink-0 text-red-600" /> <div><p className="font-bold text-lg">Error</p><p className="break-words text-md">{error}</p></div> </div> </div>)}
                {(isLoading && !isProcessing) && (<div className="flex flex-col items-center justify-center text-purple-600 h-64"> <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-xl font-semibold">Searching perspectives...</p> </div>)}
                {isProcessing && !isLoading && (<div className="flex flex-col items-center justify-center text-purple-600 h-64"> <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-xl font-semibold">Applying perspective / processing...</p> </div>)}
                {!isLoading && !isProcessing && !error && displayedResults.length === 0 && searchQuery && (<div className="text-center text-gray-500 py-16"> <Clock size={56} className="mx-auto mb-6 text-purple-300" /> <p className="text-2xl font-semibold">No results for "{searchQuery}"</p><p className="text-md mt-1">Try a different perspective or broaden your search terms.</p> </div>)}

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
                        {displayedResults.map((result, index) => (
                            <SearchResultItem 
                                key={`${result.link}-${result.perspective_query_type}-${index}`} 
                                result={result}
                                index={index}  // Pass the index explicitly
                                onFactCheck={handleFactCheck}
                                onSummarize={handleSummarize}
                                selectedAiProvider={selectedAiProvider}
                                aiApiKey={selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey}
                            />
                        ))}
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
