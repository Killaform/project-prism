import React from 'react';
import { FileText, Award, CheckCircle, AlertTriangle } from 'lucide-react'; // Added missing icon imports

const SearchResultItem = ({ 
    result, 
    onFactCheck, 
    onSummarize, 
    selectedAiProvider, 
    aiApiKey,
    isSummarizing = false,
    isFactChecking = false
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
        // This function uses FileText and Award icons, which are now imported.
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
    
    const getVerdictStyle = (verdict) => {
        const rawVerdict = verdict?.toLowerCase();
        const verdictMap = {
            'verified': 'Verified',
            'false': 'False',
            'partially_true': 'Partially True',
            'disputed': 'Disputed',
            'disputed_false': 'Disputed (False)',
            'lacks_consensus': 'Lacks Consensus',
            'unverifiable': 'Unverifiable'
        };
        const displayVerdict = verdictMap[rawVerdict] || verdict;
        
        // This function uses CheckCircle and AlertTriangle icons, which are now imported.
        switch(rawVerdict) {
            case 'verified':
                return { color: 'text-green-600', icon: <CheckCircle size={16} className="mr-1 text-green-600" />, displayText: displayVerdict };
            case 'false':
                return { color: 'text-red-600', icon: <AlertTriangle size={16} className="mr-1 text-red-600" />, displayText: displayVerdict };
            case 'disputed':
            case 'disputed_false':
                return { color: 'text-orange-600', icon: <AlertTriangle size={16} className="mr-1 text-orange-600" />, displayText: displayVerdict };
            case 'lacks_consensus':
                return { color: 'text-yellow-600', icon: <AlertTriangle size={16} className="mr-1 text-yellow-600" />, displayText: displayVerdict };
            case 'partially_true':
                return { color: 'text-blue-600', icon: <AlertTriangle size={16} className="mr-1 text-blue-600" />, displayText: displayVerdict };
            default:
                return { color: 'text-gray-600', icon: <AlertTriangle size={16} className="mr-1 text-gray-600" />, displayText: displayVerdict };
        }
    };
    
    const hasFactCheck = result.fact_check_data?.verdict;
    const hasSummary = result.summary_data?.summary;
    const verdictStyle = hasFactCheck ? getVerdictStyle(result.fact_check_data.verdict) : null;
    
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
                    
                        {result.source_credibility && (
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium credibility-badge
                                    ${result.source_credibility === 'high' ? 'bg-green-100 text-green-800' : 
                                      result.source_credibility === 'medium' ? 'bg-blue-100 text-blue-800' :
                                      result.source_credibility === 'low' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'}`}
                                >
                                    {result.source_credibility === 'high' ? 'High Credibility' : 
                                     result.source_credibility === 'medium' ? 'Medium Credibility' :
                                     result.source_credibility === 'low' ? 'Low Credibility' : 
                                     'Unknown Credibility'}
                                </span>
                                {result.intrinsic_credibility_score && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        Score: {result.intrinsic_credibility_score}/100
                                    </span>
                                )}
                            </div>
                        )}</div>
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
                
                {/* Fact Check Results (if available) */}
                {hasFactCheck && (
                    <div className={`mt-3 p-3 border rounded-md bg-gray-50 ${verdictStyle.color}`}>
                        <div className="flex items-center font-medium mb-1">
                            {verdictStyle.icon}
                            <span>Fact Check: {verdictStyle.displayText}</span>
                        </div>
                        <p className="text-sm text-gray-700">
                            {result.fact_check_data.explanation}
                        </p>
                    </div>
                )}
                
                {/* Summary Results (if available) */}
                {hasSummary && (
                    <div className="mt-3 p-3 border rounded-md bg-gray-50">
                        <div className="flex items-center font-medium mb-1 text-purple-600">
                            <FileText size={16} className="mr-1" /> {/* Icon is now imported */}
                            <span>Summary</span>
                        </div>
                        <p className="text-sm text-gray-700">
                            {result.summary_data.summary}
                        </p>
                    </div>
                )}
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                    <button 
                        onClick={() => onFactCheck(result)}
                        className={`px-3 py-1.5 bg-white border border-gray-300 text-gray-900 text-xs hover:bg-gray-50 hover:border-purple-600 flex items-center uppercase tracking-wide rounded-md ${isFactChecking ? 'opacity-50' : ''}`}
                        disabled={isFactChecking}
                    >
                        {isFactChecking ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>CHECKING...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle size={14} className="mr-1.5" /> {/* Icon is now imported */}
                                Fact-Check
                            </>
                        )}
                    </button>
                                                            
                    <button 
                        onClick={() => onSummarize(result)}
                        className={`px-3 py-1.5 bg-white border border-gray-300 text-gray-900 text-xs hover:bg-gray-50 hover:border-purple-600 flex items-center uppercase tracking-wide rounded-md ${isSummarizing ? 'opacity-50' : ''}`}
                        disabled={isSummarizing}
                    >
                        {isSummarizing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>SUMMARIZING...</span>
                            </>
                        ) : (
                            <>
                                <FileText size={12} className="mr-1" /> {/* Icon is now imported */}
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

