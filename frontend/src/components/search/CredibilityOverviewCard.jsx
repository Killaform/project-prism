import React from 'react';
import { HelpCircle, Info, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const CredibilityOverviewCard = ({ searchResults, isAnalysisLoading }) => {
  const highCredSources = searchResults.filter(s => s.credibility === 'high');
  const medCredSources = searchResults.filter(s => s.credibility === 'medium');
  const lowCredSources = searchResults.filter(s => s.credibility === 'low');
  const unknownCredSources = searchResults.filter(s => s.credibility === 'unknown');

  const getCredibilityPercentage = (level) => {
    const total = searchResults.length;
    if (total === 0) return 0;
    const count = searchResults.filter(s => s.credibility === level).length;
    return ((count / total) * 100).toFixed(0);
  };

  const perspectiveDistribution = [
    { name: 'Mainstream', icon: <Globe size={14} className="mr-1" />, color: 'bg-blue-500', count: 0 },
    { name: 'Alternative', icon: <Globe size={14} className="mr-1" />, color: 'bg-red-500', count: 0 },
    { name: 'Fringe', icon: <Globe size={14} className="mr-1" />, color: 'bg-yellow-500', count: 0 },
    { name: 'Unknown', icon: <Globe size={14} className="mr-1" />, color: 'bg-gray-400', count: 0 },
  ];

  searchResults.forEach(result => {
    const index = perspectiveDistribution.findIndex(p => p.name === result.perspective);
    if (index !== -1) {
      perspectiveDistribution[index].count++;
    }
  });

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <span className="inline-block w-3 h-3 bg-purple-500 mr-2"></span>
        Credibility Analysis
      </h3>
      
      {isAnalysisLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-md border border-gray-200">
            <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" /> 
            <p className="text-gray-400 text-sm text-center">Analyzing source credibility...</p>
          </div>
          <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-md border border-gray-200">
            <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" />
            <p className="text-gray-400 text-sm text-center">Analyzing perspective distribution...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source distribution */}
          <div>
            <p className="text-gray-700 text-sm mb-3 font-medium">Source distribution</p>
            
            {/* Credibility levels */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600 flex items-center">
                    <CheckCircle size={14} className="mr-1 text-green-500" /> 
                    High credibility
                  </span>
                  <span className="text-xs text-gray-600">
                    {highCredSources.length} sources
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${getCredibilityPercentage('high')}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600 flex items-center">
                    <Info size={14} className="mr-1 text-blue-500" /> 
                    Medium credibility
                  </span>
                  <span className="text-xs text-gray-600">
                    {medCredSources.length} sources
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${getCredibilityPercentage('medium')}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600 flex items-center">
                    <AlertCircle size={14} className="mr-1 text-orange-500" /> 
                    Low credibility
                  </span>
                  <span className="text-xs text-gray-600">
                    {lowCredSources.length} sources
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${getCredibilityPercentage('low')}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600 flex items-center">
                    <XCircle size={14} className="mr-1 text-red-500" /> 
                    Unknown credibility
                  </span>
                  <span className="text-xs text-gray-600">
                    {unknownCredSources.length} sources
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-400 h-2 rounded-full" 
                    style={{ width: `${getCredibilityPercentage('unknown')}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Perspective representation */}
          <div>
            <p className="text-gray-700 text-sm mb-3 font-medium">Perspective distribution</p>
            
            {/* Empty states */}
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-md border border-gray-200">
                <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" />
                <p className="text-gray-400 text-sm text-center">No data available yet</p>
              </div>
            ) : perspectiveDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-md border border-gray-200">
                <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" />
                <p className="text-gray-400 text-sm text-center">Could not analyze perspectives</p>
              </div>
            ) : (
              <div className="space-y-3">
                {perspectiveDistribution.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-600 flex items-center">
                        {item.icon}
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-600">
                        {item.count} sources
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${item.color} h-2 rounded-full`}
                        style={{ width: `${(item.count / searchResults.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CredibilityOverviewCard;
