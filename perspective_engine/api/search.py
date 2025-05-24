import os
from flask_restful import Resource
from flask import request, jsonify
from serpapi import SerpApiClient

class SearchResource(Resource):
    def post(self):
        """Handle search requests"""
        data = request.get_json()
        if not data:
            return {"error": "Invalid JSON"}, 400
        
        query = data.get('query')
        if not query:
            return {"error": "Search query is required"}, 400
            
        engines = data.get('engines', ['google'])
        perspective = data.get('perspective', 'balanced')
        
        # Use hardcoded API key - replace with your actual key
        api_key = os.getenv("SERPAPI_KEY")
        
        try:
            # Perform real search
            print(f"Search API: Using real search for query '{query}'")
            results = []
            
            for engine in engines:
                engine_results = fetch_results_via_serpapi(query, engine, api_key)
                if engine_results:
                    results.extend(engine_results)
            
            # If no results, fall back to mock results
            if not results:
                print("No results from SerpAPI, using mock results")
                results = get_mock_results(query)
            
            # Process results
            for result in results:
                # Add default values if not present
                if 'perspective' not in result:
                    result['perspective'] = 'neutral'
                if 'source_type_label' not in result:
                    result['source_type_label'] = 'website_general'
                if 'base_trust' not in result:
                    result['base_trust'] = 50
                if 'recency_boost' not in result:
                    result['recency_boost'] = 5
                if 'intrinsic_credibility_score' not in result:
                    result['intrinsic_credibility_score'] = 50
            
            return {
                "query": query,
                "engines": engines,
                "perspective": perspective,
                "results": results
            }
        except Exception as e:
            print(f"Search error: {e}")
            # Fall back to mock results
            mock_results = get_mock_results(query)
            return {
                "query": query,
                "engines": engines,
                "perspective": perspective,
                "results": mock_results,
                "error_info": str(e)
            }

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
            "source_engine": "Google",
            "source_type_label": "government",
            "perspective": "mainstream",
            "base_trust": 85,
            "recency_boost": 5,
            "intrinsic_credibility_score": 85
        },
        {
            "title": f"Latest Research on {query} and Vaccines",
            "link": "https://www.nih.gov/coronavirus",
            "snippet": "The National Institutes of Health provides the latest research and clinical trials related to COVID-19 vaccines and treatments.",
            "source_engine": "Google",
            "source_type_label": "government",
            "perspective": "mainstream",
            "base_trust": 85,
            "recency_boost": 5,
            "intrinsic_credibility_score": 85
        },
        {
            "title": f"The Truth About {query} That Mainstream Media Won't Tell You",
            "link": "https://alternative-health-news.com/covid-truth",
            "snippet": "Discover the hidden facts about COVID-19 that government agencies and mainstream media are keeping from the public.",
            "source_engine": "Bing",
            "source_type_label": "news_media_other_or_blog",
            "perspective": "alternative",
            "base_trust": 50,
            "recency_boost": 5,
            "intrinsic_credibility_score": 40
        },
        {
            "title": f"{query} - Wikipedia",
            "link": "https://en.wikipedia.org/wiki/COVID-19",
            "snippet": "Coronavirus disease 2019 (COVID-19) is a contagious disease caused by the virus SARS-CoV-2. The first known case was identified in Wuhan, China, in December 2019.",
            "source_engine": "Google",
            "source_type_label": "encyclopedia",
            "perspective": "neutral",
            "base_trust": 80,
            "recency_boost": 5,
            "intrinsic_credibility_score": 75
        },
        {
            "title": f"World Health Organization: {query} Pandemic",
            "link": "https://www.who.int/emergencies/diseases/novel-coronavirus-2019",
            "snippet": "WHO is working with global experts, governments and partners to track the pandemic, advise on critical interventions and distribute vital medical supplies.",
            "source_engine": "Bing",
            "source_type_label": "government",
            "perspective": "mainstream",
            "base_trust": 85,
            "recency_boost": 5,
            "intrinsic_credibility_score": 85
        }
    ]