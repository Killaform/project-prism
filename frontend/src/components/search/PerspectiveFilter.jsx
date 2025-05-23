import React from 'react';
import { Scale, Newspaper, AlertTriangle, Search } from 'lucide-react';

const PerspectiveFilter = ({ 
  activeDisplayPerspective, 
  handlePerspectiveButtonClick,
  perspectiveCounts = { mainstream: 0, alternative: 0, neutral: 0, all: 0 } 
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-center">
      <div className="inline-flex" role="group">
        <button
          type="button"
          onClick={() => handlePerspectiveButtonClick('all')}
          className={`px-4 py-2 text-sm font-medium border border-gray-300 flex items-center justify-center rounded-l-md ${
            activeDisplayPerspective === 'all'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Search size={16} className="mr-2" />
          ALL
          <span className="ml-1 bg-gray-200 text-gray-700 px-1.5 rounded-full text-xs">
            {perspectiveCounts.all || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handlePerspectiveButtonClick('mainstream')}
          className={`px-4 py-2 text-sm font-medium border border-gray-300 flex items-center justify-center ${
            activeDisplayPerspective === 'mainstream'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Newspaper size={16} className="mr-2" />
          MAINSTREAM
          <span className="ml-1 bg-gray-200 text-gray-700 px-1.5 rounded-full text-xs">
            {perspectiveCounts.mainstream || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handlePerspectiveButtonClick('neutral')}
          className={`px-4 py-2 text-sm font-medium border-t border-b border-gray-300 flex items-center justify-center ${
            activeDisplayPerspective === 'neutral'
              ? 'bg-purple-600 text-white border-t-purple-600 border-b-purple-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Scale size={16} className="mr-2" />
          NEUTRAL
          <span className="ml-1 bg-gray-200 text-gray-700 px-1.5 rounded-full text-xs">
            {perspectiveCounts.neutral || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handlePerspectiveButtonClick('alternative')}
          className={`px-4 py-2 text-sm font-medium border border-gray-300 flex items-center justify-center rounded-r-md ${
            activeDisplayPerspective === 'alternative'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle size={16} className="mr-2" />
          ALTERNATIVE
          <span className="ml-1 bg-gray-200 text-gray-700 px-1.5 rounded-full text-xs">
            {perspectiveCounts.alternative || 0}
          </span>
        </button>
      </div>
      <div className="mt-3 sm:mt-0 sm:ml-4 text-xs text-gray-500 text-center sm:text-left font-mono">
        // FILTER RESULTS BY PERSPECTIVE TYPE
      </div>
    </div>
  );
};

export default PerspectiveFilter;

