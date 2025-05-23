import React from 'react';
import { ExternalLink, FileText, CheckCircle, Clock, Award } from 'lucide-react';

const SearchResultItem = ({ 
    result, 
    onFactCheck, 
    onSummarize, 
    selectedAiProvider, 
    aiApiKey,
    isSummarizing = false  // Added with default
}) => {
    const getFavicon = (url) => { 
        try { 
            const domain = new URL(url).hostname; 
            return `https://www.google.com/s2/favicons?sz=24&domain_url=${domain}`; 
        } catch (e) { 
            console.warn("Favicon error:", url, e); 
            return '/default_favicon.png'; 
        } 
    };
    
    const getSourceDisplay = (sourceType) => {
        switch(sourceType) {
            case 'news': return { label: 'News Media', icon: <FileText size={14} className="mr-1" /> };
            case 'mainstream_news': return { label: 'Mainstream News', icon: <Award size={14} className="mr-1" /> };
            case 'academic': return { label: 'Academic Source', icon: <Award size={14} className="mr-1 text-blue-600" /> };
            case 'blog': return { label: 'Blog', icon: <FileText size={14} className="mr-1 text-green-600" /> };
            case 'fringe': return { label: 'Alternative Media', icon: <FileText size={14} className="mr-1 text-orange-600" /> };
            case 'social_media': return { label: 'Social Media', icon: <FileText size={14} className="mr-1 text-purple-600" /> };
            case 'forum': return { label: 'Forum Discussion', icon: <FileText size={14} className="mr-1 text-yellow-600" /> };
            case 'government': return { label: 'Government', icon: <Award size={14} className="mr-1 text-blue-800" /> };
            case 'ngo': return { label: 'Non-profit/NGO', icon: <Award size={14} className="mr-1 text-green-700" /> };
            default: return { label: sourceType || 'Unknown Source', icon: <FileText size={14} className="mr-1" /> };
        }
    };
    
    const sourceDisplay = getSourceDisplay(result.source_type_label);
    
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4">
                {/* URL and Title sections */}
                <div className="flex items-start">
                    {result.link && (
                        <div className="mr-3 mt-1">
                            <img 
                                src={getFavicon(result.link)} 
                                className="w-6 h-6 rounded-sm shadow-sm" 
                                alt="Site favicon" 
                                onError={(e) => {e.target.onerror = null; e.target.src='/default_favicon.png'}}
                            />
                        </div>
                    )}
                    <div className="flex-grow">
                        <h3 className="text-gray-900 text-lg font-semibold mb-1">
                            {result.title}
                        </h3>
                    </div>
                </div>
                
                {/* Link styling */}
                <div className="mb-2">
                    <a 
                        href={result.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-purple-600 text-sm hover:text-purple-800 hover:underline"
                    >
                        {result.link}
                    </a>
                </div>
                
                {/* Snippet styling */}
                <p className="text-gray-600 mb-3 text-sm">
                    {result.snippet}
                </p>
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                    <button 
                        onClick={() => onFactCheck(result)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-900 text-xs hover:bg-gray-50 hover:border-purple-600 flex items-center uppercase tracking-wide rounded-md"
                    >
                        <CheckCircle size={14} className="mr-1.5" /> Fact-Check
                    </button>
                                                            
                    <button 
                      onClick={() => onSummarize(result)}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-900 text-xs hover:bg-gray-50 hover:border-purple-600 flex items-center uppercase tracking-wide rounded-md"
                      disabled={isSummarizing}
                    >
                      {isSummarizing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>PROCESSING...</span>
                        </>
                      ) : (
                        <>
                          <FileText size={12} className="mr-1" />
                          <span>SUMMARIZE</span>
                        </>
                      )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchResultItem;

