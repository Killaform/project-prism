import React from 'react';
import { HelpCircle, Globe, BarChart2, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

const CredibilityOverviewCard = ({ displayedResults, activePerspectiveMode, allSearchResultsCount }) => {
    const getSourceDisplay = (sourceType) => {
        // Simplified version for the overview
        switch(sourceType) {
            case 'news': return { label: 'News Media', icon: <Globe size={14} className="mr-1" /> };
            case 'mainstream_news': return { label: 'Mainstream News', icon: <Globe size={14} className="mr-1" /> };
            case 'academic': return { label: 'Academic', icon: <Globe size={14} className="mr-1" /> };
            case 'blog': return { label: 'Blog', icon: <Globe size={14} className="mr-1" /> };
            case 'fringe': return { label: 'Alt Media', icon: <Globe size={14} className="mr-1" /> };
            case 'social_media': return { label: 'Social Media', icon: <Globe size={14} className="mr-1" /> };
            case 'forum': return { label: 'Forum', icon: <Globe size={14} className="mr-1" /> };
            default: return { label: sourceType || 'Other', icon: <Globe size={14} className="mr-1" /> };
        }
    };

    if (!displayedResults) { 
        return (
            <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500"> 
                <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" /> 
                <p>Loading overview data...</p> 
            </div>
        ); 
    }
    
    if (displayedResults.length === 0 && allSearchResultsCount === 0) { 
        return null; 
    }
    
    if (displayedResults.length === 0 && allSearchResultsCount > 0) { 
        return (
            <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500"> 
                <HelpCircle size={32} className="mx-auto mb-2 text-purple-300" /> 
                <p>No results match the current perspective filter.</p> 
            </div>
        ); 
    }
    
    const topSourceTypesCounts = displayedResults.reduce((acc, curr) => { 
        const type = curr.source_type_label || 'Unknown'; 
        acc[type] = (acc[type] || 0) + 1; 
        return acc; 
    }, {});
    
    const sortedSourceTypes = Object.entries(topSourceTypesCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4);
    
    const sentimentCounts = displayedResults.reduce((acc, curr) => { 
        const label = curr.sentiment?.label || 'neutral'; 
        acc[label] = (acc[label] || 0) + 1; 
        return acc; 
    }, { positive: 0, negative: 0, neutral: 0 });
    
    let predominantSentiment = 'Mixed';
    if (Object.values(sentimentCounts).every(c => c === 0)) {
        predominantSentiment = "N/A";
    } else if (sentimentCounts.positive >= sentimentCounts.negative && 
               sentimentCounts.positive >= sentimentCounts.neutral && 
               sentimentCounts.positive > 0) {
        predominantSentiment = 'Positive';
    } else if (sentimentCounts.negative >= sentimentCounts.positive && 
               sentimentCounts.negative >= sentimentCounts.neutral && 
               sentimentCounts.negative > 0) {
        predominantSentiment = 'Negative';
    } else if (sentimentCounts.neutral > sentimentCounts.positive && 
               sentimentCounts.neutral > sentimentCounts.negative && 
               sentimentCounts.neutral > 0) {
        predominantSentiment = 'Neutral';
    }
    
    const validScores = displayedResults.map(r => r.intrinsic_credibility_score)
        .filter(s => s !== null && s !== undefined && s >= 0);
    
    const averageIntrinsicScore = validScores.length > 0 
        ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1) 
        : 'N/A';
    
    const factCheckedItems = displayedResults.filter(r => 
        r.factCheck && r.factCheck.verdict && 
        !['pending', 'checking...', 'service_unavailable', 'error', 'error_parsing'].includes(r.factCheck.verdict)
    );
    
    const verifiedCount = factCheckedItems.filter(r => r.factCheck.verdict === 'verified').length;
    const disputedCount = factCheckedItems.filter(r => 
        ['disputed_false', 'false', 'disputed'].includes(r.factCheck.verdict)
    ).length;
    const otherVerdictsCount = factCheckedItems.length - verifiedCount - disputedCount;
    
    const perspectiveLabels = {
        mainstream: "Mainstream / Authoritative", 
        balanced: "Balanced / All", 
        fringe: "Fringe / Alternative"
    };
    
    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl">
            <h3 className="text-2xl font-semibold mb-6 text-purple-800">Current Perspective Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="bg-purple-50 p-5 rounded-lg">
                    <h4 className="font-bold text-purple-700 mb-2 text-base flex items-center">
                        <Globe size={18} className="mr-2" />Viewing Perspective
                    </h4>
                    <p className="text-gray-800 font-medium text-lg">
                        {perspectiveLabels[activePerspectiveMode] || activePerspectiveMode.replace(/^\w/, c => c.toUpperCase())}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                        Displaying {displayedResults.length} of {allSearchResultsCount} total.
                    </p>
                </div>
                
                <div className="bg-indigo-50 p-5 rounded-lg">
                    <h4 className="font-bold text-indigo-700 mb-2 text-base flex items-center">
                        <BarChart2 size={18} className="mr-2" />Dominant Source Types
                    </h4>
                    {sortedSourceTypes.length > 0 ? (
                        <ul className="list-none pl-0 text-gray-800 space-y-1">
                            {sortedSourceTypes.map(([type, count]) => {
                                const display = getSourceDisplay(type);
                                return (
                                    <li key={type} className="flex items-center justify-between py-0.5">
                                        <span className="flex items-center">{display.icon} {display.label}:</span>
                                        <span className="font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                                            {count}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-500">N/A</p>
                    )}
                </div>
                
                <div className="bg-pink-50 p-5 rounded-lg">
                    <h4 className="font-bold text-pink-700 mb-2 text-base flex items-center">
                        {predominantSentiment === 'Positive' ? 
                            <TrendingUp size={18} className="mr-2" /> : 
                            predominantSentiment === 'Negative' ? 
                                <TrendingDown size={18} className="mr-2" /> : 
                                <HelpCircle size={18} className="mr-2" />} 
                        Sentiment Snapshot
                    </h4>
                    <p className="text-gray-800">
                        Overall Lean: <span className="font-semibold text-lg">{predominantSentiment}</span>
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                        (Pos: {sentimentCounts.positive}, Neg: {sentimentCounts.negative}, Neu: {sentimentCounts.neutral})
                    </p>
                </div>
                
                <div className="md:col-span-2 lg:col-span-3 bg-green-50 p-5 rounded-lg mt-2">
                    <h4 className="font-bold text-green-800 mb-3 text-base flex items-center">
                        <CheckCircle size={18} className="mr-2" />Credibility & Fact-Checks 
                        <span className="text-xs font-normal text-gray-600 ml-2">(Current View)</span>
                    </h4>
                    <div className="flex flex-wrap gap-x-8 gap-y-3 items-center">
                        <p>
                            Avg. Intrinsic Score: 
                            <span className="font-bold text-2xl text-green-700">{averageIntrinsicScore}</span>
                        </p>
                        <div className="border-l border-green-300 pl-6">
                            <p>Fact-Checked by You: <span className="font-bold">{factCheckedItems.length}</span></p>
                            {factCheckedItems.length > 0 && (
                                <div className="text-xs mt-1">
                                    <span className="font-semibold text-green-600 mr-2">
                                        Verified: {verifiedCount}
                                    </span>
                                    <span className="font-semibold text-red-600 mr-2">
                                        Disputed: {disputedCount}
                                    </span>
                                    {otherVerdictsCount > 0 && 
                                        <span className="font-semibold text-yellow-600">
                                            Other: {otherVerdictsCount}
                                        </span>
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CredibilityOverviewCard;