import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

// Import our components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import SearchBar from './components/search/SearchBar';
import PerspectiveFilter from './components/search/PerspectiveFilter';
import EngineSelector from './components/search/EngineSelector';
import SearchResultItem from './components/search/SearchResultItem';
import CredibilityOverviewCard from './components/search/CredibilityOverviewCard';
import AuthModal from './components/auth/AuthModal';
import ApiSettingsModal from './components/modals/ApiSettingsModal';

// Import services and utils
import { searchAPI, factCheckAPI, summarizeAPI, scoreAPI } from './services/api';
import { loginUser, registerUser, googleLogin } from './services/auth';
import { styles, createResultId } from './utils/helpers';
import { AuthContext } from './contexts/AuthContext';

// Import any other necessary assets
import logoSrc from './assets/logo.png';

function App() {
    // Authentication from context
    const { token, currentUser, login, logout, isAuthenticated } = useContext(AuthContext);
    
    // UI State
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [apiSettingsVisible, setApiSettingsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    
    // Auth State
    const [authMode, setAuthMode] = useState('login');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [allSearchResults, setAllSearchResults] = useState([]);
    const [displayedResults, setDisplayedResults] = useState([]);
    const [activeDisplayPerspective, setActiveDisplayPerspective] = useState('balanced');
    const [selectedEngines, setSelectedEngines] = useState({
        google: true,
        bing: true,
        duckduckgo: true
    });
    
    // API Settings State
    const [selectedAiProvider, setSelectedAiProvider] = useState('gemini');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [serpApiKeyUser, setSerpApiKeyUser] = useState('');
    
    // Temp settings for modal
    const [tempSelectedAiProvider, setTempSelectedAiProvider] = useState(selectedAiProvider);
    const [tempOpenaiApiKey, setTempOpenaiApiKey] = useState(openaiApiKey);
    const [tempGeminiApiKey, setTempGeminiApiKey] = useState(geminiApiKey);
    const [tempSerpApiKeyUser, setTempSerpApiKeyUser] = useState(serpApiKeyUser);
    
    // Load settings from localStorage
    useEffect(() => {
        try {
            const savedSettingsJson = localStorage.getItem('perspectiveEngineSettings');
            if (savedSettingsJson) {
                const savedSettings = JSON.parse(savedSettingsJson);
                setSelectedAiProvider(savedSettings.provider || 'gemini');
                setOpenaiApiKey(savedSettings.openaiKey || '');
                setGeminiApiKey(savedSettings.geminiKey || '');
                setSerpApiKeyUser(savedSettings.serpKey || '');
                
                setTempSelectedAiProvider(savedSettings.provider || 'gemini');
                setTempOpenaiApiKey(savedSettings.openaiKey || '');
                setTempGeminiApiKey(savedSettings.geminiKey || '');
                setTempSerpApiKeyUser(savedSettings.serpKey || '');
            }
        } catch (e) {
            console.error("Error loading settings", e);
        }
    }, []);
    
    // Save settings to localStorage when they change
    useEffect(() => {
        const settingsToSave = {
            provider: selectedAiProvider,
            openaiKey: openaiApiKey,
            geminiKey: geminiApiKey,
            serpKey: serpApiKeyUser,
        };
        localStorage.setItem('perspectiveEngineSettings', JSON.stringify(settingsToSave));
    }, [selectedAiProvider, openaiApiKey, geminiApiKey, serpApiKeyUser]);
    
    // Process results when they change
    useEffect(() => {
        setIsProcessing(true);
        
        // Filter results based on active perspective
        let filteredResults = [...allSearchResults];
        
        if (activeDisplayPerspective === 'fringe') {
            filteredResults = filteredResults.filter(r => r.perspective_query_type === 'fringe_fetch');
        } else if (activeDisplayPerspective === 'mainstream') {
            filteredResults = filteredResults.filter(r => r.perspective_query_type === 'mainstream_fetch');
        }
        
        // Sort by intrinsic credibility score (higher first)
        filteredResults.sort((a, b) => {
            const scoreA = a.intrinsic_credibility_score !== undefined ? a.intrinsic_credibility_score : -1;
            const scoreB = b.intrinsic_credibility_score !== undefined ? b.intrinsic_credibility_score : -1;
            return scoreB - scoreA;
        });
        
        setDisplayedResults(filteredResults);
        setIsProcessing(false);
    }, [allSearchResults, activeDisplayPerspective]);
    
    // Calculate score for a search result
    const calculateIntrinsicScoreForItem = useCallback(async (item) => {
        if (!item) { 
            console.warn(`[FRONTEND] CalcScore: item undefined`); 
            return null; 
        }
        
        // Create a unique identifier for this item
        const itemId = createResultId(item);
        
        // Update the item to show it's being scored
        setAllSearchResults(prev => prev.map(r => {
            const rId = createResultId(r);
            return rId === itemId ? { ...r, is_scoring_intrinsic: true, needsRescore: false } : r;
        }));
        
        const payload = { 
            source_type: item.source_type_label || 'unknown', 
            base_trust: item.base_trust || 50, 
            recency_boost: item.recency_boost || 0, 
            factcheckVerdict: item.factcheckVerdict || 'pending' 
        };
        
        try {
            const scoreData = await scoreAPI(
                payload.source_type,
                payload.base_trust,
                payload.recency_boost,
                payload.factcheckVerdict, 
                token
            );
            
            // Update the item with the score results
            setAllSearchResults(prev => prev.map(r => {
                const rId = createResultId(r);
                return rId === itemId ? { 
                    ...r, 
                    intrinsic_credibility_score: scoreData.intrinsic_credibility_score, 
                    intrinsic_credibility_factors: scoreData.factors, 
                    is_scoring_intrinsic: false 
                } : r;
            }));
        } catch (e) {
            console.error("[FRONTEND] Score calculation error:", e.message);
            setAllSearchResults(prev => prev.map(r => {
                const rId = createResultId(r);
                return rId === itemId ? { ...r, is_scoring_intrinsic: false } : r;
            }));
        }
    }, [token]);
    
    // Handle search submission
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        // Reset states
        setError(null);
        setIsLoading(true);
        setAllSearchResults([]);
        setDisplayedResults([]);
        
        try {
            const data = await searchAPI(
                searchQuery,
                Object.keys(selectedEngines).filter(engine => selectedEngines[engine]),
                activeDisplayPerspective,
                serpApiKeyUser,
                token
            );
            
            console.log("Search results:", data);
            
            if (!data.results || data.results.length === 0) {
                console.log("Search returned no results");
            } else {
                console.log(`Search returned ${data.results.length} results`);
                
                // Set initial scores
                const enhancedResults = data.results.map(r => ({
                    ...r, 
                    needsRescore: true,
                    recency_boost: r.published_date ? 10 : 0,
                    base_trust: r.source_type_label === 'academic' ? 80 : 
                               r.source_type_label === 'government' ? 75 :
                               r.source_type_label === 'mainstream_news' ? 70 : 
                               r.source_type_label === 'news' ? 65 :
                               r.source_type_label === 'ngo' ? 60 :
                               r.source_type_label === 'blog' ? 50 : 
                               r.source_type_label === 'social_media' ? 40 : 
                               r.source_type_label === 'forum' ? 35 :
                               r.source_type_label === 'fringe' ? 30 : 50
                }));
                
                setAllSearchResults(enhancedResults);
                
                // Calculate initial scores for all results
                for (const result of enhancedResults) {
                    await calculateIntrinsicScoreForItem(result);
                }
            }
        } catch (err) {
            console.error("Search error:", err);
            setError(`Search failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle fact checking
    const handleFactCheck = async (resultToCheck) => {
        if (!resultToCheck) return;
        
        // Create a unique identifier for this item
        const itemId = createResultId(resultToCheck);
        
        // Debug logging
        console.log(`Fact-checking item: ${resultToCheck.title} (${itemId})`);
        
        setAllSearchResults(prev => prev.map(r => {
            const rId = createResultId(r);
            return rId === itemId 
                ? { ...r, factCheck: { claim: resultToCheck.snippet || resultToCheck.title, verdict: "checking..." } } 
                : r;
        }));
        
        try {
            const factCheckData = await factCheckAPI(
                resultToCheck.link,
                resultToCheck.snippet || resultToCheck.title,
                selectedAiProvider,
                selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey,
                token
            );
            
            // Update the item with the fact check results
            setAllSearchResults(prev => prev.map(r => {
                const rId = createResultId(r);
                if (rId === itemId) {
                    const updatedItem = { 
                        ...r, 
                        factCheck: factCheckData, 
                        factcheckVerdict: factCheckData.verdict, 
                        needsRescore: true 
                    };
                    // Schedule a score update for this specific item
                    calculateIntrinsicScoreForItem(updatedItem);
                    return updatedItem;
                }
                return r;
            }));
        } catch (e) {
            console.error("[FRONTEND] Fact-check error:", e.message);
            setAllSearchResults(prev => prev.map(r => {
                const rId = createResultId(r);
                return rId === itemId 
                    ? { ...r, factCheck: { claim: resultToCheck.snippet || resultToCheck.title, verdict: "error", explanation: e.message } } 
                    : r;
            }));
        }
    };
    
    // Handle summarization
    const handleSummarize = async (resultToSummarize) => {
        if (!resultToSummarize) return;
        
        // Create a unique identifier for this item
        const itemId = createResultId(resultToSummarize);
        
        // Debug logging
        console.log(`Summarizing item: ${resultToSummarize.title} (${itemId})`);
        
        setAllSearchResults(prev => prev.map(r => {
            const rId = createResultId(r);
            return rId === itemId ? { ...r, summary: "Loading..." } : r;
        }));
        
        try {
            const data = await summarizeAPI(
                resultToSummarize.link,
                resultToSummarize.snippet || resultToSummarize.title,
                selectedAiProvider,
                selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey,
                token
            );
            
            setAllSearchResults(prev => prev.map(r => {
                const rId = createResultId(r);
                return rId === itemId 
                    ? { ...r, summary: data.summary, summarized_from: data.summarized_from } 
                    : r;
            }));
        } catch (e) {
            console.error("Summarization error:", e.message);
            setAllSearchResults(prev => prev.map(r => {
                const rId = createResultId(r);
                return rId === itemId ? { ...r, summary: `Error: ${e.message}` } : r;
            }));
        }
    };
    
    // Handle perspective filter button clicks
    const handlePerspectiveButtonClick = (perspective) => {
        setActiveDisplayPerspective(perspective);
    };
    
    // Handle search engine selection changes
    const handleEngineChange = (engine) => {
        setSelectedEngines(prev => ({
            ...prev,
            [engine]: !prev[engine]
        }));
    };
    
    // Handle key press in search input
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };
    
    // Handle API settings save
    const handleSaveSettings = () => {
        setSelectedAiProvider(tempSelectedAiProvider);
        setOpenaiApiKey(tempOpenaiApiKey);
        setGeminiApiKey(tempGeminiApiKey);
        setSerpApiKeyUser(tempSerpApiKeyUser);
        setApiSettingsVisible(false);
    };
    
    // Authentication handlers
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError(null);
        setAuthLoading(true);
        
        try {
            const response = await loginUser(authEmail, authPassword);
            console.log("Login successful:", response);
            
            login(response.token, response.user);
            
            // Clear form and close modal
            setAuthEmail('');
            setAuthPassword('');
            setAuthModalVisible(false);
        } catch (error) {
            console.error("Login error:", error);
            setAuthError(error.message);
        } finally {
            setAuthLoading(false);
        }
    };
    
    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthError(null);
        setAuthLoading(true);
        
        try {
            const response = await registerUser(authEmail, authPassword);
            console.log("Registration successful:", response);
            
            login(response.token, response.user);
            
            // Clear form and close modal
            setAuthEmail('');
            setAuthPassword('');
            setAuthModalVisible(false);
        } catch (error) {
            console.error("Registration error:", error);
            setAuthError(error.message);
        } finally {
            setAuthLoading(false);
        }
    };
    
    const handleGoogleLoginSuccess = async (credentialResponse) => {
        setAuthError(null);
        setAuthLoading(true);
        
        try {
            const response = await googleLogin(credentialResponse.credential);
            console.log("Google login successful:", response);
            
            login(response.token, response.user);
            
            // Close modal
            setAuthModalVisible(false);
        } catch (error) {
            console.error("Google login error:", error);
            setAuthError(error.message);
        } finally {
            setAuthLoading(false);
        }
    };
    
    const handleLogout = () => {
        logout();
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 text-gray-800">
            <Header 
                currentUser={currentUser} 
                onLogout={handleLogout} 
                onLoginClick={() => setAuthModalVisible(true)} 
                onSettingsClick={() => setApiSettingsVisible(true)} 
            />

            <AuthModal
                visible={authModalVisible}
                onClose={() => setAuthModalVisible(false)}
                authMode={authMode}
                setAuthMode={setAuthMode}
                authError={authError}
                authEmail={authEmail}
                setAuthEmail={setAuthEmail}
                authPassword={authPassword}
                setAuthPassword={setAuthPassword}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
                authLoading={authLoading}
                handleGoogleLoginSuccess={handleGoogleLoginSuccess}
                labelStyles={styles.label}
                inputStyles={styles.input}
            />

            <ApiSettingsModal
                visible={apiSettingsVisible}
                onClose={() => setApiSettingsVisible(false)}
                tempSelectedAiProvider={tempSelectedAiProvider}
                setTempSelectedAiProvider={setTempSelectedAiProvider}
                tempOpenaiApiKey={tempOpenaiApiKey}
                setTempOpenaiApiKey={setTempOpenaiApiKey}
                tempGeminiApiKey={tempGeminiApiKey}
                setTempGeminiApiKey={setTempGeminiApiKey}
                tempSerpApiKeyUser={tempSerpApiKeyUser}
                setTempSerpApiKeyUser={setTempSerpApiKeyUser}
                handleSaveSettings={handleSaveSettings}
                labelStyles={styles.label}
                inputStyles={styles.input}
            />

            <main className="container mx-auto p-6 lg:p-10">
                <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl mb-10">
                    <SearchBar 
                        searchQuery={searchQuery} 
                        setSearchQuery={setSearchQuery} 
                        handleKeyDown={handleKeyDown} 
                        handleSearch={handleSearch} 
                        isLoading={isLoading} 
                        isProcessing={isProcessing} 
                    />
                    
                    <div className="mt-8">
                        <PerspectiveFilter 
                            activeDisplayPerspective={activeDisplayPerspective} 
                            handlePerspectiveButtonClick={handlePerspectiveButtonClick} 
                        />
                    </div>
                    
                    <div className="mt-6">
                        <EngineSelector 
                            selectedEngines={selectedEngines} 
                            handleEngineChange={handleEngineChange}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-600 text-red-800 p-5 mb-8 rounded-lg shadow-md" role="alert" aria-live="assertive">
                        <div className="flex">
                            <AlertCircle className="mr-3 mt-1 flex-shrink-0 text-red-600" />
                            <div>
                                <p className="font-bold text-lg">Error</p>
                                <p className="break-words text-md">{error}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {(isLoading && !isProcessing) && (
                    <div className="flex flex-col items-center justify-center text-purple-600 h-64">
                        <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-xl font-semibold">Searching perspectives...</p>
                    </div>
                )}
                
                {isProcessing && !isLoading && (
                    <div className="flex flex-col items-center justify-center text-purple-600 h-64">
                        <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-xl font-semibold">Applying perspective / processing...</p>
                    </div>
                )}
                
                {!isLoading && !isProcessing && !error && displayedResults.length === 0 && searchQuery && (
                    <div className="text-center text-gray-500 py-16">
                        <Clock size={56} className="mx-auto mb-6 text-purple-300" />
                        <p className="text-2xl font-semibold">No results for "{searchQuery}"</p>
                        <p className="text-md mt-1">Try a different perspective or broaden your search terms.</p>
                    </div>
                )}

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
                                onFactCheck={handleFactCheck}
                                onSummarize={handleSummarize}
                                selectedAiProvider={selectedAiProvider}
                                aiApiKey={selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey}
                            />
                        ))}
                    </div>
                )}
            </main>
            
            <Footer />
        </div>
    );
}

export default App;
