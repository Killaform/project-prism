import React from 'react';
import { ExternalLink, FileText, CheckCircle, Clock, Award } from 'lucide-react';

const SearchResultItem = ({ result, onFactCheck, onSummarize, selectedAiProvider, aiApiKey }) => {
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
        <div className={`bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out mb-6 border-l-4 ${
            result.perspective_query_type === 'fringe_fetch' ? 'border-pink-500' : 
            result.perspective_query_type === 'mainstream_fetch' ? 'border-purple-500' : 
            'border-gray-300'}`}>
            <div className="flex">
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
                    <h2 className="text-xl font-bold text-purple-900 hover:text-purple-600 transition-colors">
                        <a href={result.link} target="_blank" rel="noopener noreferrer" className="flex items-start">
                            <span className="inline-block mr-2">{result.title}</span>
                            <ExternalLink size={16} className="flex-shrink-0 mt-1.5" />
                        </a>
                    </h2>
                    <div className="flex items-center text-sm text-gray-600 mt-1 mb-2 flex-wrap gap-2">
                        <span className="flex items-center">{sourceDisplay.icon} {sourceDisplay.label}</span>
                        {result.domain && (
                            <span className="flex items-center">
                                <span className="mx-1.5 text-gray-400">•</span>
                                {result.domain}
                            </span>
                        )}
                        {result.published_date && (
                            <span className="flex items-center">
                                <span className="mx-1.5 text-gray-400">•</span>
                                <Clock size={14} className="mr-1" />
                                {result.published_date}
                            </span>
                        )}
                    </div>
                    <p className="text-gray-700">{result.snippet}</p>
                    
                    {result.factCheck && (
                        <div className={`mt-4 p-4 rounded-lg ${
                            result.factCheck.verdict === 'verified' ? 'bg-green-50 border-l-4 border-green-500' : 
                            result.factCheck.verdict === 'false' || result.factCheck.verdict === 'disputed' || result.factCheck.verdict === 'disputed_false' ? 'bg-red-50 border-l-4 border-red-500' : 
                            result.factCheck.verdict === 'partially_true' ? 'bg-yellow-50 border-l-4 border-yellow-500' : 
                            'bg-gray-50 border-l-4 border-gray-300'
                        }`}>
                            <div className="flex items-start">
                                <div className="flex-grow">
                                    <h4 className="font-semibold flex items-center">
                                        Fact Check: 
                                        <span className={`ml-2 ${
                                            result.factCheck.verdict === 'verified' ? 'text-green-600' : 
                                            result.factCheck.verdict === 'false' || result.factCheck.verdict === 'disputed' || result.factCheck.verdict === 'disputed_false' ? 'text-red-600' : 
                                            result.factCheck.verdict === 'partially_true' ? 'text-yellow-600' : 
                                            'text-gray-600'
                                        }`}>
                                            {result.factCheck.verdict === 'verified' ? 'Verified' : 
                                            result.factCheck.verdict === 'false' ? 'False' : 
                                            result.factCheck.verdict === 'disputed' || result.factCheck.verdict === 'disputed_false' ? 'Disputed/False' : 
                                            result.factCheck.verdict === 'partially_true' ? 'Partially True' : 
                                            result.factCheck.verdict === 'checking...' ? 'Checking...' : 
                                            result.factCheck.verdict === 'error' ? 'Error' : 
                                            'Unverified'}
                                        </span>
                                    </h4>
                                    {result.factCheck.explanation && (
                                        <p className="text-sm mt-1">
                                            {result.factCheck.explanation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {result.summary && (
                        <div className="mt-4 p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-300">
                            <h4 className="font-semibold text-indigo-900 mb-2">Summary</h4>
                            <p className="text-sm text-gray-700">{result.summary}</p>
                            {result.summarized_from && (
                                <p className="text-xs text-gray-500 mt-2">
                                    {result.summarized_from === 'snippet' 
                                        ? 'Summarized from the search snippet' 
                                        : result.summarized_from === 'full_text' 
                                            ? 'Summarized from the full article' 
                                            : `Source: ${result.summarized_from}`}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="ml-9 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-800" title="Intrinsic Credibility Score">
                        Intrinsic Score: 
                        <span className="text-xl text-purple-700 font-bold">
                            {result.intrinsic_credibility_score !== null && result.intrinsic_credibility_score !== undefined 
                                ? result.intrinsic_credibility_score 
                                : (result.is_scoring_intrinsic ? '...' : 'N/A')}
                        </span>
                        {result.intrinsic_credibility_factors && (
                            <span className="block text-xs text-gray-500 mt-0.5">
                                (B: {result.intrinsic_credibility_factors.base_trust_contribution}, 
                                R: {result.intrinsic_credibility_factors.recency_contribution}, 
                                F: {result.intrinsic_credibility_factors.fact_check_contribution}, 
                                T: {result.intrinsic_credibility_factors.type_quality_adjustment})
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button 
                            onClick={() => onSummarize(result)} 
                            className="px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md flex items-center"
                        >
                            <FileText size={14} className="mr-1.5" /> Summarize
                        </button>
                        <button 
                            onClick={() => onFactCheck(result)} 
                            className="px-3 py-2 text-xs font-semibold text-pink-700 bg-pink-100 rounded-md hover:bg-pink-200 transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md flex items-center"
                        >
                            <CheckCircle size={14} className="mr-1.5" /> Fact-Check
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResultItem;