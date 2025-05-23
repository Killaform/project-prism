import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ searchQuery, setSearchQuery, handleKeyDown, handleSearch, isLoading, isProcessing }) => {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      <div className="relative flex-grow w-full">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Explore perspectives on any topic..."
          className="w-full p-4 pl-12 text-lg border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow hover:shadow-lg focus:shadow-xl"
        />
        <Search size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" />
      </div>
      <button
        onClick={handleSearch}
        disabled={isLoading || isProcessing}
        className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:scale-100 flex items-center justify-center"
      >
        {isLoading || isProcessing ? (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <Search size={20} className="mr-2" />
        )}
        {isLoading ? 'Searching...' : isProcessing ? 'Processing...' : 'Search'}
      </button>
    </div>
  );
};

export default SearchBar;