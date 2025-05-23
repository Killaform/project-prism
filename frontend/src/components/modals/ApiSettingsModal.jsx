import React from 'react';
import { X, Key, Save } from 'lucide-react';

const ApiSettingsModal = ({
  visible,
  onClose,
  tempSelectedAiProvider,
  setTempSelectedAiProvider,
  tempOpenaiApiKey,
  setTempOpenaiApiKey,
  tempGeminiApiKey,
  setTempGeminiApiKey,
  tempSerpApiKeyUser,
  setTempSerpApiKeyUser,
  handleSaveSettings
}) => {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center uppercase tracking-wide">
            <Key size={20} className="mr-2" />
            API Configuration
          </h2>
          <button onClick={onClose} className="text-gray-900 hover:text-purple-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
              AI Provider
            </label>
            <select
              value={tempSelectedAiProvider}
              onChange={(e) => setTempSelectedAiProvider(e.target.value)}
              className="block w-full bg-white border-2 border-purple-300 text-gray-900 py-2 px-3 focus:border-purple-500 focus:ring-0 text-sm font-mono"
            >
              <option value="openai">OpenAI (GPT)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          
          {tempSelectedAiProvider === 'openai' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={tempOpenaiApiKey}
                onChange={(e) => setTempOpenaiApiKey(e.target.value)}
                className="block w-full bg-white border-2 border-purple-300 text-gray-900 py-2 px-3 focus:border-purple-500 focus:ring-0 text-sm font-mono"
                placeholder="sk-..."
              />
            </div>
          )}
          
          {tempSelectedAiProvider === 'gemini' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
                Gemini API Key
              </label>
              <input
                type="password"
                value={tempGeminiApiKey}
                onChange={(e) => setTempGeminiApiKey(e.target.value)}
                className="block w-full bg-white border-2 border-purple-300 text-gray-900 py-2 px-3 focus:border-purple-500 focus:ring-0 text-sm font-mono"
                placeholder="AI..."
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
              SERPAPI Key
            </label>
            <div className="text-gray-500 text-xs mb-1 font-mono">// OPTIONAL</div>
            <input
              type="password"
              value={tempSerpApiKeyUser}
              onChange={(e) => setTempSerpApiKeyUser(e.target.value)}
              className="block w-full bg-white border-2 border-purple-300 text-gray-900 py-2 px-3 focus:border-purple-500 focus:ring-0 text-sm font-mono"
              placeholder="serpapi_..."
            />
          </div>
          
          <button
            onClick={handleSaveSettings}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            <Save size={18} className="mr-2" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiSettingsModal;
