import os
from serpapi import SerpApiClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv("SERPAPI_KEY")
print(f"API key found: {'Yes' if api_key else 'No'}")

# Test search
if api_key:
    try:
        params = {
            "q": "test query",
            "engine": "google",
            "api_key": api_key,
            "num": 3,
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
else:
    print("No API key found in environment variables")