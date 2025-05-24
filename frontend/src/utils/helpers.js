// Get favicon for a URL
export const getFavicon = (url) => { 
  try { 
    const domain = new URL(url).hostname; 
    return `https://www.google.com/s2/favicons?sz=24&domain_url=${domain}`; 
  } catch (e) { 
    console.warn("Favicon error:", url, e); 
    return '/default_favicon.png'; 
  } 
};

// Get display info for a source type
export const getSourceDisplay = (sourceType) => {
  switch(sourceType) {
    case 'news': return { label: 'News Media', icon: 'FileText' };
    case 'mainstream_news': return { label: 'Mainstream News', icon: 'Award' };
    case 'academic': return { label: 'Academic Source', icon: 'Award', color: 'text-blue-600' };
    case 'blog': return { label: 'Blog', icon: 'FileText', color: 'text-green-600' };
    case 'fringe': return { label: 'Alternative Media', icon: 'FileText', color: 'text-orange-600' };
    case 'social_media': return { label: 'Social Media', icon: 'FileText', color: 'text-purple-600' };
    case 'forum': return { label: 'Forum Discussion', icon: 'FileText', color: 'text-yellow-600' };
    case 'government': return { label: 'Government', icon: 'Award', color: 'text-blue-800' };
    case 'ngo': return { label: 'Non-profit/NGO', icon: 'Award', color: 'text-green-700' };
    default: return { label: sourceType || 'Unknown Source', icon: 'FileText' };
  }
};

// Create a TRULY unique identifier for a search result
export const createResultId = (result) => {
  const baseId = `${result.link || 'no-link'}-${result.perspective_query_type || 'unknown'}`;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${baseId}-${timestamp}-${random}`;
};

// Format date string
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
};

// Style constants
export const styles = {
  label: "block text-sm font-medium text-gray-700 mb-1",
  input: "block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
};