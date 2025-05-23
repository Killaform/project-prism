import React from 'react';

const EngineSelector = ({ selectedEngines, handleEngineChange }) => {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Search Engines:</p>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {['google', 'bing', 'duckduckgo'].map((engine) => (
          <label key={engine} className="inline-flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={selectedEngines[engine]}
              onChange={() => handleEngineChange(engine)}
              className="form-checkbox h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-offset-2 accent-purple-600 transition duration-150 ease-in-out"
            />
            <span className="ml-2 text-gray-700 group-hover:text-purple-600 transition-colors">
              {engine.charAt(0).toUpperCase() + engine.slice(1)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default EngineSelector;