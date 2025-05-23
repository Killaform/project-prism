import React from 'react';
import { Scale, Newspaper, AlertTriangle } from 'lucide-react';

const PerspectiveFilter = ({ activeDisplayPerspective, handlePerspectiveButtonClick }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-center">
      <div className="inline-flex" role="group">
        <button
          type="button"
          onClick={() => handlePerspectiveButtonClick('balanced')}
          className={`px-4 py-2 text-sm font-medium border border-gray-300 flex items-center justify-center rounded-l-md ${
            activeDisplayPerspective === 'balanced'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Scale size={16} className="mr-2" />
          ALL RESULTS
        </button>
        <button
          type="button"
          onClick={() => handlePerspectiveButtonClick('mainstream')}
          className={`px-4 py-2 text-sm font-medium border-t border-b border-gray-300 flex items-center justify-center ${
            activeDisplayPerspective === 'mainstream'
              ? 'bg-purple-600 text-white border-t-purple-600 border-b-purple-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Newspaper size={16} className="mr-2" />
          MAINSTREAM
        </button>
        <button
          type="button"
          onClick={() => handlePerspectiveButtonClick('fringe')}
          className={`px-4 py-2 text-sm font-medium border border-gray-300 flex items-center justify-center rounded-r-md ${
            activeDisplayPerspective === 'fringe'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle size={16} className="mr-2" />
          ALTERNATIVE
        </button>
      </div>
      <div className="mt-3 sm:mt-0 sm:ml-4 text-xs text-gray-500 text-center sm:text-left font-mono">
        // FILTER RESULTS BY PERSPECTIVE TYPE
      </div>
    </div>
  );
};

export default PerspectiveFilter;

