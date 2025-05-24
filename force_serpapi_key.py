import os
import sys

# Get the new API key from command line
if len(sys.argv) < 2:
    print("Usage: python force_serpapi_key.py YOUR_API_KEY")
    sys.exit(1)

new_key = sys.argv[1]
print(f"Using API key: {new_key[:5]}...")

# Update the search service file
search_service_path = 'perspective_engine/services/search_service.py'

with open(search_service_path, 'r') as f:
    content = f.read()

# Replace the function to always use the hardcoded key
new_content = """from serpapi import SerpApiClient
import os

def search(query, engines, user_id=None):
    \"\"\"
    Perform search across multiple engines and classify results
    
    Args:
        query: Search query string
        engines: List of search engines to use (e.g., ['google', 'bing'])
        user_id: Optional user ID for retrieving API keys
        
    Returns:
        List of search results with classification
    \"\"\"
    # Use hardcoded API key
    serpapi_key = "%s"
    
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
""" % new_key

# Add the rest of the original file
start_idx = content.find("def fetch_results_via_serpapi")
if start_idx > 0:
    new_content += content[start_idx:]

with open(search_service_path, 'w') as f:
    f.write(new_content)

print(f"Updated {search_service_path} with hardcoded API key")

# Also update the .env file
env_path = '.env'
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        env_content = f.readlines()
    
    new_env_content = []
    key_updated = False
    
    for line in env_content:
        if line.strip().startswith('SERPAPI_KEY='):
            new_env_content.append(f'SERPAPI_KEY={new_key}\n')
            key_updated = True
        else:
            new_env_content.append(line)
    
    if not key_updated:
        new_env_content.append(f'SERPAPI_KEY={new_key}\n')
    
    with open(env_path, 'w') as f:
        f.writelines(new_env_content)
    
    print(f"Updated {env_path} with new API key")

print("Restart your server for the changes to take effect")