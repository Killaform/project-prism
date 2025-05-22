# C:\project-prism\project_prism_app\search\routes.py
from flask import Blueprint, request, jsonify, current_app # Added current_app
import os # For os.getenv as an alternative to Config if needed directly

# Corrected import for Config:
# Assumes app.py (the FLASK_APP entry point) is in the root with config.py
from config import Config 

# Import helper functions from utils.py within the same 'search' package
from .utils import (
    fetch_results_via_serpapi, 
    classify_source_type, 
    get_sentiment_and_bias,
    fetch_text_from_url,
    perform_fact_check,  # Assuming this will be fully moved to utils
    perform_summarization, # Assuming this will be fully moved to utils
    calculate_intrinsic_score # Assuming this will be fully moved to utils
)

search_bp = Blueprint('search_bp', __name__)

# --- Re-homed API Endpoints ---
@search_bp.route('/search', methods=['POST'])
def search_endpoint_route():
    data = request.json
    original_query = data.get('query')
    selected_engines = data.get('engines', ['google', 'bing', 'duckduckgo'])
    user_serpapi_key_from_req = data.get('user_serpapi_key')
    
    # Access SERVER_SERPAPI_KEY from Flask app config (loaded from config.py)
    active_serpapi_key = user_serpapi_key_from_req or current_app.config.get('SERVER_SERPAPI_KEY')
    if not active_serpapi_key:
        return jsonify({"error": "Search API key not configured or provided."}), 500

    if not original_query: return jsonify({"error": "Query is required"}), 400
    if not selected_engines: return jsonify({"error": "No search engines selected."}), 400

    print(f"Search BP: '{original_query}' on {selected_engines}. User SERP key: {'Provided' if user_serpapi_key_from_req else 'Not Provided (server key used)'}")
    
    queries_to_run = {
        "mainstream_fetch": f"{original_query}", 
        "fringe_fetch": f"{original_query} (forum OR discussion OR \"alternative opinion\" OR blog) -site:wikipedia.org -site:*.gov -site:*.mil -site:who.int -site:nih.gov"
    }
    all_fetched_results = []
    ai_provider = data.get('ai_provider', 'openai')
    user_ai_key = data.get('user_api_key', None)
    # Access SERVER_OPENAI_API_KEY from app config for get_sentiment_and_bias fallback
    server_openai_key_for_sentiment = current_app.config.get('SERVER_OPENAI_API_KEY')


    for p_type, specific_query in queries_to_run.items():
        for engine_name in selected_engines:
            engine_results = fetch_results_via_serpapi(specific_query, engine_name, active_serpapi_key, num_results=10) 
            for res_item in engine_results:
                res_item['perspective_query_type'] = p_type
                all_fetched_results.append(res_item)
    
    temp_results_map = {}
    for item in all_fetched_results:
        if item['link'] not in temp_results_map or \
           (temp_results_map[item['link']]['perspective_query_type'] == 'fringe_fetch' and item['perspective_query_type'] == 'mainstream_fetch'):
            temp_results_map[item['link']] = item 
    
    unique_results_list = list(temp_results_map.values())
    print(f"Search BP: Fetched: {len(all_fetched_results)}, Unique: {len(unique_results_list)}")

    processed_output_results = []
    for res in unique_results_list:
        res['source_type_label'] = classify_source_type(res['link'], res.get('source_engine'))
        text_to_analyze = f"{res.get('title', '')} {res.get('snippet', '')}"
        # Pass server_openai_key to get_sentiment_and_bias
        sentiment, bias = get_sentiment_and_bias(text_to_analyze, ai_provider, user_ai_key, server_openai_key_for_sentiment)
        res['sentiment'] = sentiment; res['bias'] = bias
        res['base_trust'] = 50; res['recency_boost'] = 0; res['factcheckVerdict'] = 'pending'
        res['intrinsic_credibility_score'] = None; res['intrinsic_credibility_factors'] = None
        processed_output_results.append(res)
            
    print(f"Search BP: Returning {len(processed_output_results)} processed results.")
    return jsonify(processed_output_results)

@search_bp.route('/summarize', methods=['POST'])
def summarize_endpoint_route():
    data = request.json
    # Pass all necessary keys and provider info to the util function
    return perform_summarization(
        data, 
        user_openai_key=data.get('user_api_key'), # Assuming this is how frontend sends it
        server_openai_key=current_app.config.get('SERVER_OPENAI_API_KEY'),
        user_gemini_key=data.get('user_api_key') # Assuming same key field for now, might need separate
    )

@search_bp.route('/fact-check', methods=['POST'])
def fact_check_endpoint_route():
    data = request.json
    return perform_fact_check(
        data,
        user_openai_key=data.get('user_api_key'),
        server_openai_key=current_app.config.get('SERVER_OPENAI_API_KEY'),
        user_gemini_key=data.get('user_api_key')
    )

@search_bp.route('/score', methods=['POST'])
def score_endpoint_route():
    data = request.get_json()
    if not data: return jsonify({"error": "Invalid JSON payload"}), 400
    return calculate_intrinsic_score(data)

@search_bp.route('/hello-search')
def hello_search():
    return "Hello from the Search API Blueprint!"