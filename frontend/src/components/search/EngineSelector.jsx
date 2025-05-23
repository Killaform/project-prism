import React from 'react';

const EngineSelector = ({ selectedEngines, handleEngineChange }) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <div className="text-sm text-purple-600 mb-2 w-full text-center font-mono"># SELECT SEARCH ENGINES:</div>
      
      <label className={`inline-flex items-center px-3 py-1.5 cursor-pointer border rounded-md ${
        selectedEngines.google ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}>
        <input
          type="checkbox"
          checked={selectedEngines.google}
          onChange={() => handleEngineChange('google')}
          className="sr-only"
        />
        <span className="text-sm font-bold tracking-wide">GOOGLE</span>
      </label>
      
      <label className={`inline-flex items-center px-3 py-1.5 cursor-pointer border rounded-md ${
        selectedEngines.bing ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}>
        <input
          type="checkbox"
          checked={selectedEngines.bing}
          onChange={() => handleEngineChange('bing')}
          className="sr-only"
        />
        <span className="text-sm font-bold tracking-wide">BING</span>
      </label>
      
      <label className={`inline-flex items-center px-3 py-1.5 cursor-pointer border rounded-md ${
        selectedEngines.duckduckgo ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}>
        <input
          type="checkbox"
          checked={selectedEngines.duckduckgo}
          onChange={() => handleEngineChange('duckduckgo')}
          className="sr-only"
        />
        <span className="text-sm font-bold tracking-wide">DUCKDUCKGO</span>
      </label>
    </div>
  );
};

export default EngineSelector;

