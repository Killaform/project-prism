import React from 'react';
import { KeyRound, X, Save } from 'lucide-react';

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
    handleSaveSettings,
    labelStyles,
    inputStyles
}) => {
    if (!visible) return null;
    
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-purple-700 flex items-center">
                        <KeyRound size={28} className="mr-3"/>API Settings
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="aiProvider" className={labelStyles}>AI Provider for Analysis:</label>
                        <select 
                            id="aiProvider" 
                            value={tempSelectedAiProvider} 
                            onChange={(e) => setTempSelectedAiProvider(e.target.value)} 
                            className={inputStyles}
                        >
                            <option value="openai">OpenAI (GPT)</option>
                            <option value="gemini">Google Gemini</option>
                        </select>
                    </div>
                    
                    {tempSelectedAiProvider === 'openai' && (
                        <div>
                            <label htmlFor="openaiKey" className={labelStyles}>OpenAI API Key:</label>
                            <input 
                                type="password" 
                                id="openaiKey" 
                                value={tempOpenaiApiKey} 
                                onChange={(e) => setTempOpenaiApiKey(e.target.value)} 
                                className={inputStyles} 
                                placeholder="sk-..."
                            />
                        </div>
                    )}
                    
                    {tempSelectedAiProvider === 'gemini' && (
                        <div>
                            <label htmlFor="geminiKey" className={labelStyles}>Google Gemini API Key:</label>
                            <input 
                                type="password" 
                                id="geminiKey" 
                                value={tempGeminiApiKey} 
                                onChange={(e) => setTempGeminiApiKey(e.target.value)} 
                                className={inputStyles} 
                                placeholder="AIzaSy..."
                            />
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="serpApiKey" className={labelStyles}>SERP API Key (for Search):</label>
                        <input 
                            type="password" 
                            id="serpApiKey" 
                            value={tempSerpApiKeyUser} 
                            onChange={(e) => setTempSerpApiKeyUser(e.target.value)} 
                            className={inputStyles} 
                            placeholder="Your SERP API key..."
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveSettings} 
                            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm flex items-center"
                        >
                            <Save size={16} className="mr-2"/>Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiSettingsModal;