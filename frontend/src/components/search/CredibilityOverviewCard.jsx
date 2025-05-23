import React from 'react';
import { HelpCircle, Info, AlertCircle, CheckCircle, XCircle, Globe } from 'lucide-react';

const CredibilityOverviewCard = ({ searchResults, isAnalysisLoading }) => {
  // Prepare data
  const highCredSources = searchResults.filter(result => result.source_credibility === 'high');
  const medCredSources = searchResults.filter(result => result.source_credibility === 'medium');
  const lowCredSources = searchResults.filter(result => result.source_credibility === 'low');
  const unknownCredSources = searchResults.filter(result => !result.source_credibility || result.source_credibility === 'unknown');
  
  // Calculate percentage for progress bars
  const getCredibilityPercentage = (level) => {
    if (searchResults.length === 0) return 0;
    
    switch(level) {
      case 'high': return (highCredSources.length / searchResults.length) * 100;
      case 'medium': return (medCredSources.length / searchResults.length) * 100;
      case 'low': return (lowCredSources.length / searchResults.length) * 100;
      case 'unknown': return (unknownCredSources.length / searchResults.length) * 100;
      default: return 0;
    }
  };

  // Group results by perspective for distribution
  const perspectiveDistribution = [];
  if (searchResults.length > 0) {
    // Calculate perspective distribution
    const perspectives = {
      mainstream: { 
        name: "Mainstream", 
        count: 0, 
        color: "bg-blue-500", 
        icon: <Globe size={14} className="mr-1 text-blue-500" /> 
      },
      balanced: { 
        name: "Balanced", 
        count: 0, 
        color: "bg-green-500", 
        icon: <CheckCircle size={14} className="mr-1 text-green-500" /> 
      },
      fringe: { 
        name: "Alternative", 
        count: 0, 
        color: "bg-orange-500", 
        icon: <AlertCircle size={14} className="mr-1 text-orange-500" /> 
      },
      unknown: { 
        name: "Uncategorized", 
        count: 0, 
        color: "bg-gray-400", 
        icon: <HelpCircle size={14} className="mr-1 text-gray-500" /> 
      }
    };
    
    // Count results by perspective
    searchResults.forEach(result => {
      if (result.perspective && perspectives[result.perspective]) {
        perspectives[result.perspective].count += 1;
      } else {
        perspectives.unknown.count += 1;
      }
    });
    
    // Convert to array and sort by count (descending)
    Object.values(perspectives).forEach(p => {
      if (p.count > 0) {
        perspectiveDistribution.push(p);
      }
    });
    
    perspectiveDistribution.sort((a, b) => b.count - a.count);
  }

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
