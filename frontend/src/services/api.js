const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const searchAPI = async (query, engines, perspective, serpApiKey, token) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      query: query,
      engines: engines,
      perspective: perspective,
      serpapi_key: serpApiKey
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Search API error:", response.status, errorText);
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }
  
  return await response.json();
};

export const factCheckAPI = async (url, claim, aiProvider, apiKey, token) => {
  const headers = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/fact-check`, { 
      method: 'POST', 
      headers: headers, 
      body: JSON.stringify({
        url: url,
        claim: claim,
        ai_provider: aiProvider,
        user_api_key: apiKey
      }) 
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Fact-check API error:", response.status, data);
      throw new Error(data.error || `Fact-check failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error("Fact-check request failed:", error);
    throw error;
  }
};

export const summarizeAPI = async (url, text, aiProvider, apiKey, token) => {
  const headers = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/summarize`, { 
    method: 'POST', 
    headers: headers, 
    body: JSON.stringify({
      url: url,
      text: text,
      ai_provider: aiProvider,
      user_api_key: apiKey
    }) 
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Summarize API error");
  }
  
  return await response.json();
};

export const scoreAPI = async (sourceType, baseTrust, recencyBoost, factcheckVerdict, token) => {
  const headers = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/score`, { 
    method: 'POST', 
    headers: headers, 
    body: JSON.stringify({
      source_type: sourceType,
      base_trust: baseTrust,
      recency_boost: recencyBoost,
      factcheckVerdict: factcheckVerdict
    }) 
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `HTTP error ${response.status}`);
  }
  
  return await response.json();
};