import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import { searchAPI, factCheckAPI, summarizeAPI } from './services/api';
import { loginUser, registerUser } from './services/auth';
import { createResultId } from './utils/helpers';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import SearchBar from './components/search/SearchBar';
import EngineSelector from './components/search/EngineSelector';
import PerspectiveFilter from './components/search/PerspectiveFilter';
import CredibilityOverviewCard from './components/search/CredibilityOverviewCard';
import SearchResultItem from './components/search/SearchResultItem';
import Loader from './components/ui/Loader';
import AuthModal from './components/auth/AuthModal';
import ApiSettingsModal from './components/modals/ApiSettingsModal';

function App() {
  const { currentUser, login: authLogin, logout, token: authToken } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState('');

  const [activeDisplayPerspective, setActiveDisplayPerspective] = useState('all');
  const [showCredibilityOverview, setShowCredibilityOverview] = useState(true);

  const [selectedEngines, setSelectedEngines] = useState({
    google: true,
    bing: false,
    duckduckgo: false
  });

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [apiSettingsVisible, setApiSettingsVisible] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState(() => localStorage.getItem('selectedAiProvider') || 'openai');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openaiApiKey') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [serpApiKeyUser, setSerpApiKeyUser] = useState(() => localStorage.getItem('serpApiKeyUser') || '');

  // Loading states for individual result actions
  const [loadingStates, setLoadingStates] = useState({});

  const getCurrentAiApiKey = () => {
    if (selectedAiProvider === 'openai') return openaiApiKey;
    if (selectedAiProvider === 'gemini') return geminiApiKey;
    return null;
  };

  const handleEngineSelectionChange = (engineKey) => {
    setSelectedEngines(prevEngines => ({
      ...prevEngines,
      [engineKey]: !prevEngines[engineKey]
    }));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setHasSearchError(false);
    setSearchErrorMessage('');
    setShowCredibilityOverview(true);
    setSearchResults([]);

    try {
      const effectiveSerpApiKey = serpApiKeyUser || undefined;
      const currentAuthToken = authToken || localStorage.getItem('perspectiveEngineToken');
      
      const backendResponse = await searchAPI(
        searchQuery,
        Object.keys(selectedEngines).filter(engine => selectedEngines[engine]),
        activeDisplayPerspective,
        effectiveSerpApiKey,
        currentAuthToken,
        selectedAiProvider
      );

      console.log("App.jsx: Results received from backend:", backendResponse);

      // Handle both possible response formats:
      // 1. Direct array: [result1, result2, ...]
      // 2. Object with results property: {results: [result1, result2, ...], ...}
      let resultsFromBackend;
      
      if (Array.isArray(backendResponse)) {
        resultsFromBackend = backendResponse;
      } else if (backendResponse && Array.isArray(backendResponse.results)) {
        resultsFromBackend = backendResponse.results;
      } else {
        console.error("Backend returned unexpected format:", backendResponse);
        setHasSearchError(true);
        setSearchErrorMessage('Invalid response format from server.');
        setSearchResults([]);
        return;
      }

      if (resultsFromBackend.length === 0) {
        setSearchResults([]);
        return;
      }

      const processedResults = resultsFromBackend.map(result => ({
        ...result,
        id: result.id || createResultId(result),
        perspective: result.perspective || 'neutral'
      }));

      console.log('App.jsx: Processed results with backend perspectives:', processedResults);
      setSearchResults(processedResults);

    } catch (error) {
      console.error('App.jsx: Search error:', error);
      setHasSearchError(true);
      setSearchErrorMessage(error.message || 'Failed to fetch or process search results.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const storedProvider = localStorage.getItem('selectedAiProvider') || 'openai';
    const storedOpenaiKey = localStorage.getItem('openaiApiKey') || '';
    const storedGeminiKey = localStorage.getItem('geminiApiKey') || '';
    const storedSerpKey = localStorage.getItem('serpApiKeyUser') || '';

    setSelectedAiProvider(storedProvider);
    setOpenaiApiKey(storedOpenaiKey);
    setGeminiApiKey(storedGeminiKey);
    setSerpApiKeyUser(storedSerpKey);
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('selectedAiProvider', selectedAiProvider);
    localStorage.setItem('openaiApiKey', openaiApiKey);
    localStorage.setItem('geminiApiKey', geminiApiKey);
    localStorage.setItem('serpApiKeyUser', serpApiKeyUser);
    setApiSettingsVisible(false);
  };
  
  const handleFactCheck = async (result) => {
    const resultId = result.id;
    
    setLoadingStates(prev => ({
      ...prev,
      [`factCheck_${resultId}`]: true
    }));

    try {
      const currentAuthToken = authToken || localStorage.getItem('perspectiveEngineToken');
      const apiKey = getCurrentAiApiKey();
      
      const factCheckResult = await factCheckAPI(
        result.link,
        result.title + ' ' + result.snippet,
        selectedAiProvider,
        apiKey,
        currentAuthToken
      );

      // Update the specific result with fact check data
      setSearchResults(prevResults => 
        prevResults.map(r => 
          r.id === resultId 
            ? { ...r, fact_check_data: factCheckResult }
            : r
        )
      );

    } catch (error) {
      console.error("Fact check error:", error);
      alert("Fact check failed: " + error.message);
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        [`factCheck_${resultId}`]: false
      }));
    }
  };

  const handleSummarize = async (result) => {
    const resultId = result.id;
    
    setLoadingStates(prev => ({
      ...prev,
      [`summarize_${resultId}`]: true
    }));

    try {
      const currentAuthToken = authToken || localStorage.getItem('perspectiveEngineToken');
      const apiKey = getCurrentAiApiKey();
      
      const summaryResult = await summarizeAPI(
        result.link,
        result.snippet,
        selectedAiProvider,
        apiKey,
        currentAuthToken
      );

      // Update the specific result with summary data
      setSearchResults(prevResults => 
        prevResults.map(r => 
          r.id === resultId 
            ? { ...r, summary_data: summaryResult }
            : r
        )
      );

    } catch (error) {
      console.error("Summarize error:", error);
      alert("Summarize failed: " + error.message);
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        [`summarize_${resultId}`]: false
      }));
    }
  };

  // Auth Handlers
  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const response = await loginUser(authEmail, authPassword);
      authLogin(response.user, response.token);
      setAuthModalVisible(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      setAuthError(error.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    try {
      await registerUser(authEmail, authPassword);
      // After successful registration, log them in
      const loginResponse = await loginUser(authEmail, authPassword);
      authLogin(loginResponse.user, loginResponse.token);
      setAuthModalVisible(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      setAuthError(error.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLoginSuccess = (googleAuthData) => {
    console.log('App.jsx: Google Login Success, data from button:', googleAuthData);
    authLogin({ 
      id: googleAuthData.userId, 
      email: googleAuthData.email, 
      name: googleAuthData.name,
      profile_pic_url: googleAuthData.profilePic
    }, googleAuthData.token);
    setAuthModalVisible(false);
  };
  
  const handleProfileClick = () => {
    console.log("Profile clicked. Current user:", currentUser);
    alert(`Welcome ${currentUser?.name || currentUser?.email}!\n\nProfile features coming soon:\n- View search history\n- Saved searches\n- Account settings`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-pe-black text-gray-900 dark:text-gray-100 pt-24">
      <Header
        onApiSettingsClick={() => setApiSettingsVisible(true)}
        onLoginClick={() => { setAuthMode('login'); setAuthModalVisible(true); setAuthError(''); }}
        onRegisterClick={() => { setAuthMode('register'); setAuthModalVisible(true); setAuthError(''); }}
        onProfileClick={handleProfileClick}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            handleSearch={handleSearch}
            isLoading={isLoading}
            isProcessing={isProcessing}
          />
          <EngineSelector 
            selectedEngines={selectedEngines} 
            handleEngineChange={handleEngineSelectionChange} 
          />
          
          {hasSearched && !isLoading && searchResults.length > 0 && (
            <PerspectiveFilter
              activeDisplayPerspective={activeDisplayPerspective}
              handlePerspectiveButtonClick={setActiveDisplayPerspective}
              perspectiveCounts={searchResults.reduce((acc, curr) => {
                acc[curr.perspective] = (acc[curr.perspective] || 0) + 1;
                acc.all = (acc.all || 0) + 1;
                return acc;
              }, { mainstream: 0, alternative: 0, neutral: 0, all: 0 })}
            />
          )}

          {hasSearched && !isLoading && !isProcessing && searchResults.length > 0 && showCredibilityOverview && (
            <CredibilityOverviewCard 
              searchResults={searchResults} 
              isAnalysisLoading={isProcessing}
            />
          )}
        </div>

        {isLoading && <div className="flex justify-center mt-8"><Loader size="lg" /></div>}

        {hasSearchError && <div className="text-center mt-4 text-red-500 dark:text-red-400">{searchErrorMessage}</div>}

        {!isLoading && !isProcessing && hasSearched && searchResults.length === 0 && !hasSearchError && (
          <div className="text-center mt-8 text-gray-500 dark:text-gray-400">No results found. Try different keywords or engines.</div>
        )}

        <div className="mt-6 max-w-5xl mx-auto grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!isLoading && !isProcessing && searchResults
            .filter(result => activeDisplayPerspective === 'all' || result.perspective === activeDisplayPerspective)
            .map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                onFactCheck={() => handleFactCheck(result)}
                onSummarize={() => handleSummarize(result)}
                selectedAiProvider={selectedAiProvider}
                aiApiKey={getCurrentAiApiKey()}
                isFactChecking={loadingStates[`factCheck_${result.id}`] || false}
                isSummarizing={loadingStates[`summarize_${result.id}`] || false}
              />
            ))}
        </div>
      </main>
      <Footer />

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authError={authError}
        setAuthError={setAuthError}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        authLoading={authLoading}
        handleGoogleLoginSuccess={handleGoogleLoginSuccess}
      />

      <ApiSettingsModal
        visible={apiSettingsVisible}
        onClose={() => setApiSettingsVisible(false)}
        tempSelectedAiProvider={selectedAiProvider} 
        setTempSelectedAiProvider={setSelectedAiProvider} 
        tempOpenaiApiKey={openaiApiKey}
        setTempOpenaiApiKey={setOpenaiApiKey}
        tempGeminiApiKey={geminiApiKey}
        setTempGeminiApiKey={setGeminiApiKey}
        tempSerpApiKeyUser={serpApiKeyUser}
        setTempSerpApiKeyUser={setSerpApiKeyUser}
        handleSaveSettings={handleSaveSettings} 
      />
    </div>
  );
}

export default App;
