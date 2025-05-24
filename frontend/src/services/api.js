const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const searchAPI = async (query, engines, perspective, serpApiKey, authToken, selectedAiProvider = 'openai') => {
  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({
        query,
        engines,
        perspective,
        serpapi_key: serpApiKey,
        ai_provider: selectedAiProvider,
        use_ai_classification: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Search failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Search request failed:', error);
    throw error;
  }
};

export const factCheckAPI = async (url, claim, aiProvider = 'openai', apiKey, authToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/fact-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({
        url,
        claim,
        ai_provider: aiProvider
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Fact-check failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Fact-check request failed:', error);
    throw error;
  }
};

export const summarizeAPI = async (url, text, aiProvider = 'openai', apiKey, authToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({
        url,
        text,
        ai_provider: aiProvider
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Summarization failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Summarize request failed:', error);
    throw error;
  }
};