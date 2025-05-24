import React, { useState, useEffect, useContext } from 'react';
import { X } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';

const ApiSettingsModal = ({
  visible,
  onClose,
  handleSaveSettings
}) => {
  const { currentUser, token } = useContext(AuthContext);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [serpApiKey, setSerpApiKey] = useState('');
  const [selectedAiProvider, setSelectedAiProvider] = useState('openai');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [existingKeys, setExistingKeys] = useState({});

  useEffect(() => {
    if (visible && currentUser) {
      fetchExistingKeys();
    }
  }, [visible, currentUser]);

  const fetchExistingKeys = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/user/api-keys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const keyMap = {};
        data.api_keys.forEach(key => {
          keyMap[key.type] = true;
        });
        setExistingKeys(keyMap);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const saveApiKey = async (keyType, apiKey) => {
    if (!token || !apiKey.trim()) return;
    
    setIsSaving(true);
    setMessage('');
    setError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/user/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key_type: keyType,
          api_key: apiKey
        })
      });
      
      if (response.ok) {
        setMessage(`${keyType.toUpperCase()} API key saved successfully`);
        setExistingKeys(prev => ({...prev, [keyType]: true}));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save API key');
      }
    } catch (error) {
      setError('Network error while saving API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save AI provider preference
    localStorage.setItem('selectedAiProvider', selectedAiProvider);
    
    // Save API keys to backend if user is logged in
    if (currentUser && token) {
      if (openaiApiKey) saveApiKey('openai', openaiApiKey);
      if (geminiApiKey) saveApiKey('gemini', geminiApiKey);
      if (serpApiKey) saveApiKey('serpapi', serpApiKey);
    } else {
      // Fallback to localStorage for non-logged in users
      if (openaiApiKey) localStorage.setItem('openaiApiKey', openaiApiKey);
      if (geminiApiKey) localStorage.setItem('geminiApiKey', geminiApiKey);
      if (serpApiKey) localStorage.setItem('serpApiKeyUser', serpApiKey);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 sm:p-8 shadow-xl rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center uppercase tracking-wide">
            <span className="mr-2 text-gray-900">&gt;</span>
            API Settings
          </h2>
          <button onClick={onClose} className="text-gray-900 hover:text-purple-700">
            <X size={24} />
          </button>
        </div>
        
        {message && (
          <div className="bg-green-100 border-l-2 border-green-600 text-gray-900 p-3 mb-4 text-sm">
            <p>{message}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border-l-2 border-red-600 text-gray-900 p-3 mb-4 text-sm">
            <p>{error}</p>
          </div>
        )}
        
        {currentUser ? (
          <div className="mb-4 bg-purple-100 p-3 rounded">
            <p className="text-sm text-gray-700">
              Your API keys will be securely stored in your account. They are encrypted and never exposed to the frontend.
            </p>
          </div>
        ) : (
          <div className="mb-4 bg-yellow-100 p-3 rounded">
            <p className="text-sm text-gray-700">
              You are not logged in. API keys will be stored in your browser's local storage.
              <br />
              <strong>For better security, please log in to store your API keys securely.</strong>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
              Preferred AI Provider
            </label>
            <select
              value={selectedAiProvider}
              onChange={(e) => setSelectedAiProvider(e.target.value)}
              className="block w-full bg-white border border-gray-300 rounded-md text-gray-900 shadow-sm focus:border-purple-500 focus:ring-0 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
              OpenAI API Key {existingKeys.openai && <span className="text-green-600 text-xs">(Saved)</span>}
            </label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder={existingKeys.openai ? "••••••••" : "sk-..."}
              className="block w-full bg-white border border-gray-300 rounded-md text-gray-900 shadow-sm focus:border-purple-500 focus:ring-0 text-sm font-mono"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
              Google Gemini API Key {existingKeys.gemini && <span className="text-green-600 text-xs">(Saved)</span>}
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder={existingKeys.gemini ? "••••••••" : "AI..."}
              className="block w-full bg-white border border-gray-300 rounded-md text-gray-900 shadow-sm focus:border-purple-500 focus:ring-0 text-sm font-mono"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
              SerpAPI Key {existingKeys.serpapi && <span className="text-green-600 text-xs">(Saved)</span>}
            </label>
            <input
              type="password"
              value={serpApiKey}
              onChange={(e) => setSerpApiKey(e.target.value)}
              placeholder={existingKeys.serpapi ? "••••••••" : "Your SerpAPI key"}
              className="block w-full bg-white border border-gray-300 rounded-md text-gray-900 shadow-sm focus:border-purple-500 focus:ring-0 text-sm font-mono"
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:bg-gray-400 uppercase tracking-wide"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiSettingsModal;