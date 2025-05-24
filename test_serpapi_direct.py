"""
Test SERP API with a direct key
"""
from serpapi import SerpApiClient

# Enter your API key directly here
API_KEY = "YOUR_NEW_API_KEY_HERE"

print(f"Testing SERP API with direct key")

try:
    params = {
        "q": "test query",
        "engine": "google",
        "api_key": API_KEY,
        "num": 1,
        "hl": "en",
        "gl": "us"
    }
    
    print("Sending request to SerpAPI...")
    client = SerpApiClient(params)
    results = client.get_dict()
    
    if "error" in results:
        print(f"Error from SerpAPI: {results['error']}")
    elif "organic_results" in results:
        print(f"Success! Found {len(results['organic_results'])} results")
        print(f"First result: {results['organic_results'][0]['title']}")
    else:
        print(f"Unexpected response: {results.keys()}")
except Exception as e:
    print(f"Exception: {type(e).__name__} - {e}")