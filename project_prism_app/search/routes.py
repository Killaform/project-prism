# C:\Perspective-Engine\perspective_engine_app\search\routes.py
from flask import Blueprint, request, jsonify, current_app
from serpapi import SerpApiClient 
import os
import json
from flask_jwt_extended import jwt_required
from .utils import (
    infer_perspective_from_url_and_title,
    perform_fact_check,
    perform_summarization,
    calculate_intrinsic_score
)

search_bp = Blueprint('search_bp', __name__)

def classify_with_openai(results, api_key):
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    
    prompt = """
    You are a media bias analyst specializing in identifying the perspective of information sources.
    
    Classify each search result into ONE of these perspective categories:
    
    1. "mainstream": 
       - Major news networks (e.g., CNN, BBC, NYT, Washington Post, Reuters, AP)
       - Government official websites (.gov, .mil domains)
       - Established international health organizations (e.g., WHO, CDC)
       - University websites and reputable academic publications (.edu domains)
       - Content that presents widely accepted scientific consensus or official positions
    
    2. "alternative": 
       - Sources presenting contrarian views to established scientific consensus
       - Sites promoting unconventional theories
       - Commentary sites with clear agenda against mainstream institutions
       - Sources that challenge or allege conspiracy by mainstream media/governments
       - Content featuring theories often labeled as "conspiracy" or "fringe"
       - Sites using emotive language to dispute widely accepted facts
    
    3. "neutral": 
       - Educational content from unbiased providers
       - Reference materials (Wikipedia, encyclopedias)
       - Strictly data-driven resources with minimal interpretation
       - Technical documentation
       - Balanced news reports presenting multiple sides
    
    Return ONLY valid JSON with the original results including the perspective field.
    """
    
    try:
        formatted_results = []
        for i, result in enumerate(results[:20]):  # Limit to prevent token overflow
            formatted_results.append({
                "index": i,
                "title": result.get("title", ""),
                "url": result.get("link", ""),
                "snippet": result.get("snippet", "")
            })
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Please classify these search results:\n\n{formatted_results}"}
            ],
            temperature=0.1
        )
        
        ai_results = json.loads(response.choices[0].message.content)
        
        # Map AI results back to original results
        classified_results = []
        for result in results:
            # Find corresponding AI classification
            ai_result = next((ar for ar in ai_results if ar.get("url") == result.get("link")), None)
            perspective = ai_result.get("perspective", "neutral") if ai_result else "neutral"
            
            classified_results.append({
                **result,
                "perspective": perspective
            })
        
        return classified_results
        
    except Exception as e:
        print(f"OpenAI classification error: {e}")
        # Fallback to rule-based classification
        return [
            {**result, "perspective": infer_perspective_from_url_and_title(result.get("link"), result.get("title"))}
            for result in results
        ]

def classify_with_gemini(results, api_key):
    # Placeholder for Gemini implementation
    return [
        {**result, "perspective": infer_perspective_from_url_and_title(result.get("link"), result.get("title"))}
        for result in results
    ]

def infer_perspective_from_url_and_title(url, title):
    """Simple rule-based fallback classifier"""
    url = url.lower() if url else ''
    title = title.lower() if title else ''
    
    # Government, educational, or major health organizations
    if any(domain in url for domain in ['.gov', '.edu', 'who.int', 'cdc.gov', 'nih.gov', '.un.org']):
        return 'mainstream'
    
    # Major news outlets
    mainstream_news_domains = [
        'bbc.', 'cnn.', 'nytimes.', 'washingtonpost.', 'reuters.', 'apnews.', 
        'nbcnews.', 'abcnews.', 'cbsnews.', 'theguardian.', 'wsj.', 'economist.',
        'npr.org', 'pbs.org', 'usatoday.', 'bloomberg.', 'forbes.', 'politico.', 'axios.'
    ]
    if any(outlet in url for outlet in mainstream_news_domains):
        return 'mainstream'
    
    # Wikipedia and similar reference sites
    if 'wikipedia.org' in url or 'britannica.com' in url:
        return 'neutral'
    
    # Keywords suggesting alternative perspectives
    alternative_keywords = [
        'conspiracy', 'truth', 'alternative', 'freedom', 'patriot', 'liberty',
        'exposed', 'reveal', 'scandal', 'coverup', 'natural news', 'infowars',
        'shocking', 'they don\'t want you to know', 'banned', 'censored',
        'holistic approach', 'natural immunity', 'medical freedom', 'health freedom',
        'suppressed science', 'the real story', 'unreported', 'controversial study',
        'uncensored', 'deep state', 'globalist', 'great reset', 'agenda 21', 'agenda 2030',
        'plandemic', 'scamdemic', 'big pharma', 'big tech', 'hidden', 'secret'
    ]
    if any(term in url or term in title for term in alternative_keywords):
        return 'alternative'
    
    # Default to neutral if no clear signals
    return 'neutral'

@search_bp.route('/search', methods=['POST'])
@jwt_required(optional=True)
def search():
    data = request.get_json()
    original_query = data.get('query')
    selected_engines = data.get('engines', ['google'])
    user_serpapi_key_from_req = data.get('serpapi_key')

    serpapi_api_key_to_use = user_serpapi_key_from_req or os.getenv('SERPAPI_KEY')

    if not original_query:
        return jsonify({"error": "Query is required"}), 400
    if not serpapi_api_key_to_use:
        print("Search BP Error: SERP API key is missing.")
        return jsonify({"error": "SERP API key is missing. Configure in settings or provide one."}), 500

    print(f"Search BP: '{original_query}' on {selected_engines}. User SERP key: {'Provided' if user_serpapi_key_from_req else 'Not Provided'}")

    queries_to_run = {
        "mainstream_fetch": f"{original_query}",
        "fringe_fetch": f"{original_query} (forum OR discussion OR \"alternative take\" OR \"uncensored views\" OR \"independent report\" OR blog OR \"citizen journalist\" OR \"controversial study\" OR \"what they don't want you to know\" OR \"hidden truth\" OR \"unconventional analysis\") -site:wikipedia.org -site:britannica.com -site:*.gov -site:*.mil -site:who.int -site:nih.gov -site:cdc.gov -site:*.edu -site:*.un.org -site:apnews.com -site:reuters.com -site:bbc.com -site:cnn.com -site:nytimes.com -site:washingtonpost.com -site:theguardian.com -site:wsj.com -site:npr.org"
    }
    all_fetched_results = []
    processed_links = set()
    
    results_per_engine_query = 15

    for perspective_type, q in queries_to_run.items():
        for engine in selected_engines:
            try:
                print(f"Querying {engine} for '{perspective_type}': {q} (num_results: {results_per_engine_query})")
                params = {
                    "q": q,
                    "api_key": serpapi_api_key_to_use,
                    "num": str(results_per_engine_query), 
                }
                if engine == 'google':
                    params["engine"] = "google"
                    params["gl"] = "us" 
                    params["hl"] = "en" 
                elif engine == 'bing':
                    params["engine"] = "bing"
                    params["cc"] = "US"
                    params["mkt"] = "en-US"
                elif engine == 'duckduckgo':
                    params["engine"] = "duckduckgo"
                    params["kl"] = "us-en"
                else:
                    print(f"Unsupported engine: {engine}")
                    continue

                client = SerpApiClient(params)
                results_data = client.get_dict()
                
                current_engine_results = []
                if "organic_results" in results_data:
                    current_engine_results.extend(results_data["organic_results"])
                elif "webPages" in results_data and "value" in results_data["webPages"]:
                    current_engine_results.extend(results_data["webPages"]["value"])

                print(f"Fetched {len(current_engine_results)} results from {engine} for '{perspective_type}'")

                for res_idx, res in enumerate(current_engine_results):
                    link = res.get("link") or res.get("url")
                    title = res.get("title") or res.get("name")
                    snippet = res.get("snippet")

                    if link and link not in processed_links:
                        all_fetched_results.append({
                            "id": f"{engine}-{perspective_type}-{res_idx}-{hash(link)}-{len(all_fetched_results)}",
                            "title": title,
                            "link": link,
                            "snippet": snippet,
                            "source_engine": engine,
                            "perspective_query_type": perspective_type,
                            "displayed_url": res.get("displayed_link") or res.get("displayUrl"),
                            "position": res.get("position", res_idx + 1)
                        })
                        processed_links.add(link)
            except Exception as e:
                print(f"Error querying {engine} for '{perspective_type}': {e}")

    if not all_fetched_results:
        print("Search BP: No results fetched.")
        return jsonify([])

    # AI Classification
    ai_provider = data.get('ai_provider_override', os.getenv('DEFAULT_AI_PROVIDER', 'openai')).lower()
    openai_api_key = os.getenv("OPENAI_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    classified_results = []
    ai_key_to_use = None

    if ai_provider == 'openai' and openai_api_key:
        ai_key_to_use = openai_api_key
        print(f"Search BP: Classifying {len(all_fetched_results)} results with OpenAI...")
        try:
            classified_results = classify_with_openai(all_fetched_results, ai_key_to_use)
        except Exception as e:
            print(f"Search BP: OpenAI classification error: {e}. Falling back.")
            ai_key_to_use = None
    elif ai_provider == 'gemini' and gemini_api_key:
        ai_key_to_use = gemini_api_key
        print(f"Search BP: Classifying {len(all_fetched_results)} results with Gemini...")
        try:
            classified_results = classify_with_gemini(all_fetched_results, ai_key_to_use)
        except Exception as e:
            print(f"Search BP: Gemini classification error: {e}. Falling back.")
            ai_key_to_use = None
    
    if not ai_key_to_use or not classified_results:
        if not ai_key_to_use:
            print("Search BP: AI provider key not available. Using rule-based classification.")
        else:
            print("Search BP: AI classification failed. Using rule-based classification.")
        classified_results = [
            {**res, "perspective": infer_perspective_from_url_and_title(res.get("link"), res.get("title"))}
            for res in all_fetched_results
        ]

    # Ensure all results have a perspective
    final_results = []
    for res in classified_results:
        if isinstance(res, dict):
            if 'perspective' not in res or not res['perspective']:
                res['perspective'] = infer_perspective_from_url_and_title(res.get("link"), res.get("title")) or 'neutral'
            final_results.append(res)

    print(f"Search BP: Returning {len(final_results)} classified results.")
    return jsonify(final_results)

@search_bp.route('/summarize', methods=['POST'])
def summarize_endpoint_route():
    data = request.json
    return perform_summarization(
        data, 
        user_openai_key=data.get('user_api_key'),
        server_openai_key=current_app.config.get('SERVER_OPENAI_API_KEY'),
        user_gemini_key=data.get('user_api_key')
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
    if not data: 
        return jsonify({"error": "Invalid JSON payload"}), 400
    return calculate_intrinsic_score(data)

@search_bp.route('/hello-search')
def hello_search():
    return "Hello from the Search API Blueprint!"
