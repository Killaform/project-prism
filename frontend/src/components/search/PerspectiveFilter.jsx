import React from 'react';
import { Users, Globe, Shield } from 'lucide-react';

const PerspectiveFilter = ({ activeDisplayPerspective, handlePerspectiveButtonClick }) => {
  const getButtonClass = (mode) =>
    `px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
      activeDisplayPerspective === mode
        ? 'bg-purple-600 text-white shadow-lg scale-105'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
    }`;

  return (
    <div>
      <p className="text-md font-semibold text-gray-700 mb-3">Select Perspective View:</p>
      <div className="flex flex-wrap gap-4">
        <button onClick={() => handlePerspectiveButtonClick('fringe')} className={getButtonClass('fringe')}>
          <Users size={18} className="mr-2" /> Fringe / Alt
        </button>
        <button onClick={() => handlePerspectiveButtonClick('balanced')} className={getButtonClass('balanced')}>
          <Globe size={18} className="mr-2" /> Balanced / All
        </button>
        <button onClick={() => handlePerspectiveButtonClick('mainstream')} className={getButtonClass('mainstream')}>
          <Shield size={18} className="mr-2" /> Mainstream
        </button>
      </div>
    </div>
  );
};

export default PerspectiveFilter;