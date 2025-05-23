import React from 'react';
import { Search, Loader2 } from 'lucide-react';

const SearchBar = ({ searchQuery, setSearchQuery, handleKeyDown, handleSearch, isLoading, isProcessing }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600">
          {'>'} 
        </div>
        <input
          type="text"
          placeholder="Search for multiple perspectives..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-4 pl-10 pr-16 rounded-md bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          spellCheck="false"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || isProcessing}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 p-2 text-white rounded-md transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {isProcessing && (
        <div className="flex justify-center">
          <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-sm text-gray-900 border border-gray-300 font-mono">
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            <span>[PROCESSING DATA...]</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
