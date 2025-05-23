import React, { useState, useEffect, useCallback, useContext } from 'react';
import { searchAPI, factCheckAPI, summarizeAPI } from './services/api';
import { AuthContext } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import SearchBar from './components/search/SearchBar';
import PerspectiveFilter from './components/search/PerspectiveFilter';
import EngineSelector from './components/search/EngineSelector';
import SearchResultItem from './components/search/SearchResultItem';
import CredibilityOverviewCard from './components/search/CredibilityOverviewCard';
import AuthModal from './components/auth/AuthModal';
import ApiSettingsModal from './components/modals/ApiSettingsModal';
import { AlertCircle, Clock } from 'lucide-react';
import Loader from './components/ui/Loader';

function App() {
  // Authentication context
  const { currentUser, logout } = useContext(AuthContext);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]); // MISSING STATE ADDED HERE
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState('');
  
  // Filter state
  const [activeDisplayPerspective, setActiveDisplayPerspective] = useState('balanced');
  const [showCredibilityOverview, setShowCredibilityOverview] = useState(true);
  
  // Engine selection
  const [selectedEngines, setSelectedEngines] = useState({
    google: true,
    bing: false,
    duckduckgo: false
  });
  
  // Auth modal
  const [authModalVisible, setAuthModalVisible] = useState(false);
  
  // API Settings
  const [apiSettingsVisible, setApiSettingsVisible] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState(() => {
    return localStorage.getItem('selectedAiProvider') || 'openai';
  });
  const [openaiApiKey, setOpenaiApiKey] = useState(() => {
    return localStorage.getItem('openaiApiKey') || '';
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('geminiApiKey') || '';
  });
  const [serpApiKeyUser, setSerpApiKeyUser] = useState(() => {
    return localStorage.getItem('serpApiKeyUser') || '';
  });
  
  // Temp API settings (for modal)
  const [tempSelectedAiProvider, setTempSelectedAiProvider] = useState(selectedAiProvider);
  const [tempOpenaiApiKey, setTempOpenaiApiKey] = useState(openaiApiKey);
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState(geminiApiKey);
  const [tempSerpApiKeyUser, setTempSerpApiKeyUser] = useState(serpApiKeyUser);
  
  // Result actions state
  const [summarizingIds, setSummarizingIds] = useState([]);
  const [factCheckingIds, setFactCheckingIds] = useState([]);

  // Handle engine selection
  const handleEngineChange = (engine) => {
    setSelectedEngines(prev => {
      const updated = { ...prev, [engine]: !prev[engine] };
      
      // Ensure at least one engine is selected
      if (Object.values(updated).every(val => val === false)) {
        return prev;
      }
      
      return updated;
    });
  };

  // Handle perspective filter
  const handlePerspectiveButtonClick = (perspective) => {
    setActiveDisplayPerspective(perspective);
  };

  // Handle API settings save
  const handleSaveSettings = useCallback(() => {
    setSelectedAiProvider(tempSelectedAiProvider);
    setOpenaiApiKey(tempOpenaiApiKey);
    setGeminiApiKey(tempGeminiApiKey);
    setSerpApiKeyUser(tempSerpApiKeyUser);
    
    localStorage.setItem('selectedAiProvider', tempSelectedAiProvider);
    localStorage.setItem('openaiApiKey', tempOpenaiApiKey);
    localStorage.setItem('geminiApiKey', tempGeminiApiKey);
    localStorage.setItem('serpApiKeyUser', tempSerpApiKeyUser);
    
    setApiSettingsVisible(false);
  }, [tempSelectedAiProvider, tempOpenaiApiKey, tempGeminiApiKey, tempSerpApiKeyUser]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    if (Object.values(selectedEngines).every(val => val === false)) {
      alert('Please select at least one search engine');
      return;
    }

    setIsLoading(true);
    setHasSearchError(false);
    setSearchErrorMessage('');
    
    try {
      const activeEngines = Object.entries(selectedEngines)
        .filter(([_, isSelected]) => isSelected)
        .map(([engine]) => engine);
      
      const response = await searchAPI(
        searchQuery, 
        activeEngines, 
        activeDisplayPerspective, 
        serpApiKeyUser
      );
      
      setSearchResults(response.results || []);
      setIsProcessing(false);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setHasSearchError(true);
      setSearchErrorMessage(error.message || 'Failed to perform search');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedEngines, activeDisplayPerspective, serpApiKeyUser]);

  // Handle key down for search
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Handle fact check
  const handleFactCheck = useCallback(async (result) => {
    // Implement fact check functionality
  }, [selectedAiProvider, openaiApiKey, geminiApiKey]);

  // Handle summarize
  const handleSummarize = useCallback(async (result) => {
    // Implement summarize functionality
  }, [selectedAiProvider, openaiApiKey, geminiApiKey]);

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Filter results based on active perspective
  const filteredResults = searchResults.filter(result => {
    if (activeDisplayPerspective === 'balanced') return true;
    return result.perspective === activeDisplayPerspective;
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        onLoginClick={() => setAuthModalVisible(true)} 
        onSettingsClick={() => setApiSettingsVisible(true)} 
      />

      {authModalVisible && (
        <AuthModal 
          onClose={() => setAuthModalVisible(false)} 
        />
      )}

      {apiSettingsVisible && (
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
        />
      )}

      <main className="container mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <SearchBar 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            handleKeyDown={handleKeyDown} 
            handleSearch={handleSearch} 
            isLoading={isLoading} 
            isProcessing={isProcessing} 
          />
          
          <div className="mt-6">
            <PerspectiveFilter 
              activeDisplayPerspective={activeDisplayPerspective} 
              handlePerspectiveButtonClick={handlePerspectiveButtonClick} 
            />
          </div>
          
          <div className="mt-4">
            <EngineSelector 
              selectedEngines={selectedEngines} 
              handleEngineChange={handleEngineChange}
            />
          </div>
        </div>

        {searchResults.length > 0 || isLoading || isProcessing || hasSearched ? (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center my-12">
                <Loader size="lg" />
                <p className="mt-4 text-gray-600">Searching for results...</p>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center my-12">
                <Loader size="lg" />
                <p className="mt-4 text-gray-600">Processing perspectives...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                {showCredibilityOverview && (
                  <CredibilityOverviewCard 
                    searchResults={filteredResults} 
                    isAnalysisLoading={false}
                  />
                )}
                
                <div className="grid grid-cols-1 gap-6">
                  {filteredResults.map(result => (
                    <SearchResultItem
                      key={result.id} 
                      result={result}
                      onFactCheck={handleFactCheck}
                      onSummarize={handleSummarize}
                      selectedAiProvider={selectedAiProvider}
                      aiApiKey={selectedAiProvider === 'openai' ? openaiApiKey : geminiApiKey}
                      isSummarizing={summarizingIds.includes(result.id)}
                    />
                  ))}
                </div>
              </>
            ) : hasSearched ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <AlertCircle size={56} className="mx-auto mb-6 text-purple-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500 text-center">
                  Try adjusting your search query or selected search engines.
                </p>
              </div>
            ) : null}
          </div>
        ) : hasSearchError ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <AlertCircle size={56} className="mx-auto mb-6 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search error</h3>
            <p className="text-gray-500 text-center">
              {searchErrorMessage || "There was an error processing your search. Please try again."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <Clock size={56} className="mx-auto mb-6 text-purple-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h3>
            <p className="text-gray-500 text-center">
              Enter a search query above to find multiple perspectives on any topic.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
