from serpapi import SerpApiClient
import os

def search(query, engines, user_id=None):
    """
    Perform search across multiple engines and classify results
    
    Args:
        query: Search query string
        engines: List of search engines to use (e.g., ['google', 'bing'])
        user_id: Optional user ID for retrieving API keys
        
    Returns:
        List of search results with classification
    """
    # Use hardcoded API key
    serpapi_key = os.getenv("SERPAPI_KEY", "YOUR_SERPAPI_KEY_HERE")
    
    print(f"Search service: Using hardcoded API key")
    
    all_results = []
    
    # Collect results from each selected engine
    for engine in engines:
        try:
            engine_results = fetch_results_via_serpapi(query, engine, serpapi_key)
            all_results.extend(engine_results)
            print(f"Got {len(engine_results)} results from {engine}")
        except Exception as e:
            print(f"Error fetching results from {engine}: {e}")
    
    # If no results from API, use mock results
    if not all_results:
        print("No results from SerpAPI, using mock results")
        all_results = get_mock_results(query)
def fetch_results_via_serpapi(query, engine_name, api_key, num_results=10):
    """Fetch search results from SerpAPI"""
    if not api_key:
        print(f"No API key for {engine_name}")
        return []
        
    params = {
        "q": query,
        "engine": engine_name.lower(),
        "api_key": api_key,
        "num": num_results,
        "hl": "en",
        "gl": "us"
    }
    
    print(f"SerpApi: Querying {engine_name} for '{query}' (num:{num_results})")
    
    try:
        s_client = SerpApiClient(params)
        r_data = s_client.get_dict()
        o_results = r_data.get("organic_results", [])
        
        if not o_results:
            print(f"SerpApi: No organic_results for '{query}' on {engine_name}. Response: {r_data.get('error', 'Unknown')}")
            return []
            
        p_results = [{
            "title": i.get("title", "No title"),
            "link": i.get("link"),
            "snippet": i.get("snippet", "No snippet."),
            "source_engine": engine_name.capitalize()
        } for i in o_results if i.get("link")]
        
        print(f"SerpApi: Found {len(p_results)} results for {engine_name}")
        return p_results
        
    except Exception as e:
        print(f"SerpApi: Error {engine_name}: {type(e).__name__} - {e}")
        return []

def get_mock_results(query):
    """Return mock results for testing"""
    print(f"Generating mock results for query: {query}")
    
    return [
        {
            "title": f"COVID-19: What You Need to Know About {query}",
            "link": "https://www.cdc.gov/coronavirus/2019-ncov/index.html",
            "snippet": "Learn about COVID-19, including symptoms, complications, how it spreads, prevention, treatment, and more from the Centers for Disease Control.",
            "source_engine": "Google"
        },
        {
            "title": f"Latest Research on {query} and Vaccines",
            "link": "https://www.nih.gov/coronavirus",
            "snippet": "The National Institutes of Health provides the latest research and clinical trials related to COVID-19 vaccines and treatments.",
            "source_engine": "Google"
        },
        {
            "title": f"The Truth About {query} That Mainstream Media Won't Tell You",
            "link": "https://alternative-health-news.com/covid-truth",
            "snippet": "Discover the hidden facts about COVID-19 that government agencies and mainstream media are keeping from the public.",
            "source_engine": "Bing"
        },
        {
            "title": f"{query} - Wikipedia",
            "link": "https://en.wikipedia.org/wiki/COVID-19",
            "snippet": "Coronavirus disease 2019 (COVID-19) is a contagious disease caused by the virus SARS-CoV-2. The first known case was identified in Wuhan, China, in December 2019.",
            "source_engine": "Google"
        },
        {
            "title": f"World Health Organization: {query} Pandemic",
            "link": "https://www.who.int/emergencies/diseases/novel-coronavirus-2019",
            "snippet": "WHO is working with global experts, governments and partners to track the pandemic, advise on critical interventions and distribute vital medical supplies.",
            "source_engine": "Bing"
        }
    ]

# Import these functions here to avoid circular imports
from perspective_engine.services.classification import classify_source_type, infer_perspective_from_url_and_title