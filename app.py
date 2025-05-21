import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from serpapi import SerpApiClient
from openai import OpenAI
import requests # For fetching URL content
from bs4 import BeautifulSoup # For parsing HTML content

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f".env file loaded successfully from {dotenv_path}")
else:
    print(f"Warning: .env file not found at {dotenv_path}. API keys might not be loaded.")

app = Flask(__name__)
CORS(app)

SERPAPI_KEY = os.getenv("SERPAPI_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
    print("OpenAI API Key loaded and client initialized.")
else:
    client = None
    print("Warning: OPENAI_API_KEY not found.")

if not SERPAPI_KEY:
    print("CRITICAL: SERPAPI_KEY not found in environment.")
else:
    print("SERPAPI_KEY loaded.")

# --- Helper Functions ---

def fetch_text_from_url(url):
    """
    Fetches and extracts text content from a URL.
    Returns a string with the extracted text, or None if failed.
    """
    try:
        headers = { # Act like a browser
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10) # 10-second timeout
        response.raise_for_status() # Raise HTTPError for bad responses (4XX or 5XX)
        
        # Check content type, proceed only if it's likely HTML
        content_type = response.headers.get('content-type', '').lower()
        if 'html' not in content_type:
            print(f"Skipping URL {url}, content type is not HTML: {content_type}")
            return None

        soup = BeautifulSoup(response.content, 'lxml') # 'lxml' is a fast parser

        # Remove script and style elements
        for script_or_style in soup(["script", "style", "header", "footer", "nav", "aside"]):
            script_or_style.decompose()

        # Get text, trying to focus on main content tags
        # This is a basic approach and can be significantly improved
        body = soup.find('body')
        if body:
            # Attempt to find common main content containers
            main_content = body.find('main') or \
                           body.find('article') or \
                           body.find('div', attrs={'role': 'main'}) or \
                           body.find('div', id='content') or \
                           body.find('div', class_='content') or \
                           body # Fallback to whole body if specific containers not found
            
            if main_content:
                text = main_content.get_text(separator='\n', strip=True)
            else:
                text = body.get_text(separator='\n', strip=True)

            # Clean up multiple newlines and leading/trailing whitespace
            text = '\n'.join([line.strip() for line in text.splitlines() if line.strip()])
            print(f"Extracted ~{len(text)} chars from {url}")
            return text if len(text) > 100 else None # Return text if it's somewhat substantial
        return None

    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return None
    except Exception as e:
        print(f"Error parsing URL {url} with BeautifulSoup: {e}")
        return None

def classify_source_type(result_url, source_engine_name):
    engine_name_lower = source_engine_name.lower() if source_engine_name else "unknown"
    if not result_url: return "unknown"
    if ".gov" in result_url: return "government"
    if ".edu" in result_url: return "academic"
    if "wikipedia.org" in result_url: return "encyclopedia"
    if engine_name_lower in ["google", "bing"]: return "mainstream"
    if engine_name_lower == "duckduckgo": return "alternative"
    return "unknown"

def get_sentiment_and_bias(text_content):
    if not text_content or not client:
        return {"score": 0.0, "label": "neutral_unavailable"}, {"score": 0.0, "label": "neutral_unavailable"}
    try:
        text_to_analyze = str(text_content)[:1500] # Analyze first 1500 chars of snippet/title for initial results
        prompt = (
            f"Analyze the sentiment and any apparent political bias of the text snippet provided. "
            f"For sentiment, classify as 'positive', 'negative', or 'neutral'. Provide a sentiment score from -1.0 to 1.0. "
            f"For bias, briefly describe if it leans left, right, center, or appears neutral/objective. "
            f"Return your entire response as a single, valid JSON object with keys: "
            f"'sentiment_label' (string), 'sentiment_score' (float), 'bias_label' (string)."
            f"\n\nText Snippet: \"{text_to_analyze}\""
        )
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant that analyzes text snippets for sentiment and political bias. Respond ONLY with a single, valid JSON object."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1, max_tokens=150
        )
        analysis_result_str = response.choices[0].message.content.strip()
        analysis_data = json.loads(analysis_result_str)
        return {
            "score": float(analysis_data.get("sentiment_score", 0.0)), 
            "label": analysis_data.get("sentiment_label", "neutral").lower()
        }, {
            "score": 0.0, # Bias score placeholder
            "label": analysis_data.get("bias_label", "neutral").lower()
        }
    except Exception as e:
        print(f"Error in get_sentiment_and_bias: {e}")
        return {"score": 0.0, "label": "neutral_error"}, {"score": 0.0, "label": "neutral_error"}

def fetch_results_via_serpapi(query, engine_name, api_key, num_results=7):
    # ... (this function remains largely the same)
    if not api_key:
        print(f"SerpApi: No API key provided for query to {engine_name}.")
        return []
    params = {
        "q": query, "engine": engine_name.lower(),
        "api_key": api_key, "num": num_results,
    }
    print(f"SerpApi: Querying {engine_name} for '{query}' with num_results={num_results}")
    try:
        serp_client = SerpApiClient(params)
        results_data = serp_client.get_dict()
        organic_results = results_data.get("organic_results", [])
        processed_results = []
        for item in organic_results:
            if "link" not in item or not item["link"]: continue
            processed_results.append({
                "title": item.get("title", "No title"),
                "link": item.get("link"),
                "snippet": item.get("snippet", "No snippet available."),
                "source": engine_name.capitalize()
            })
        print(f"SerpApi: Found {len(processed_results)} results for {engine_name}")
        return processed_results
    except Exception as e:
        print(f"SerpApi: Error fetching results from {engine_name}: {e}")
        return []

# --- API Endpoints ---
@app.route('/search', methods=['POST'])
def search_endpoint():
    # ... (search logic remains the same, calls get_sentiment_and_bias on snippet)
    if not SERPAPI_KEY:
        print("Error in /search: SERPAPI_KEY is not available globally in the app.")
        return jsonify({"error": "Search API is not configured correctly on the server (key missing)."}), 500

    data = request.json
    query = data.get('query')
    selected_engines = data.get('engines', ['google'])

    if not query: return jsonify({"error": "Query is required"}), 400
    if not selected_engines: return jsonify({"error": "No search engines selected."}), 400

    print(f"Received search request for: '{query}' on engines: {selected_engines}")
    all_results = []
    for engine_name in selected_engines:
        engine_results = fetch_results_via_serpapi(query, engine_name, SERPAPI_KEY)
        all_results.extend(engine_results)
    
    processed_output_results = []
    for res in all_results:
        if 'link' not in res or not res['link']: continue
        res['source_type_label'] = classify_source_type(res['link'], res['source'])
        # Initial sentiment from snippet
        text_to_analyze_for_initial_sentiment = f"{res.get('title', '')} {res.get('snippet', '')}"
        sentiment, bias = get_sentiment_and_bias(text_to_analyze_for_initial_sentiment)
        res['sentiment'] = sentiment
        res['bias'] = bias # Bias analysis is basic for now

        res['base_trust'] = 50 
        res['recency_boost'] = 0 # Placeholder, frontend might calculate this
        res['factcheckVerdict'] = 'pending' # Default
        res['credibility_score'] = None # Placeholder, will be updated by /score
        processed_output_results.append(res)

    print(f"Returning {len(processed_output_results)} total processed results to frontend.")
    return jsonify(processed_output_results)


@app.route('/summarize', methods=['POST'])
def summarize_endpoint():
    if not client:
        return jsonify({"error": "Summarization service not available."}), 503
    
    data = request.json
    text_to_summarize_fallback = data.get('text') # This is the snippet/title from frontend
    url_to_fetch = data.get('url') # Frontend should send the URL of the result

    if not url_to_fetch and not text_to_summarize_fallback:
        return jsonify({"error": "URL or text for summarization is required"}), 400

    content_to_process = ""
    source_of_content = "snippet/title"

    if url_to_fetch:
        print(f"Summarize: Attempting to fetch content from URL: {url_to_fetch}")
        extracted_text = fetch_text_from_url(url_to_fetch)
        if extracted_text:
            content_to_process = extracted_text
            source_of_content = "fetched URL content"
        else:
            print(f"Summarize: Failed to fetch from URL, falling back to snippet/title.")
            content_to_process = text_to_summarize_fallback
    else:
        content_to_process = text_to_summarize_fallback

    if not content_to_process:
        return jsonify({"error": "No content available to summarize."}), 400
    
    print(f"Summarize: Processing content from {source_of_content} (length: {len(content_to_process)})")

    try:
        # Truncate if too long for the model, even after extraction
        max_len_for_summarize = 8000 # Roughly 2k tokens, adjust based on model & typical content
        if len(content_to_process) > max_len_for_summarize:
            print(f"Summarize: Content too long ({len(content_to_process)}), truncating to {max_len_for_summarize} chars.")
            content_to_process = content_to_process[:max_len_for_summarize]

        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Or gpt-3.5-turbo-16k if routinely handling longer texts
            messages=[
                {"role": "system", "content": "You are an expert summarizer. Provide a concise, neutral summary (3-5 sentences) of the following text."},
                {"role": "user", "content": f"Please summarize the following text:\n\n{content_to_process}"}
            ],
            max_tokens=200, # Allow for a decent summary length
            temperature=0.3
        )
        summary = response.choices[0].message.content.strip()
        return jsonify({"summary": summary, "summarized_from": source_of_content})
    except Exception as e:
        print(f"Error during OpenAI summarization: {e}")
        return jsonify({"error": f"Failed to generate summary: {str(e)}"}), 500

@app.route('/fact-check', methods=['POST'])
def fact_check_endpoint():
    if not client:
        return jsonify({"claim": data.get('claim', 'N/A'), "verdict": "service_unavailable", "explanation": "Fact-checking service not available.", "source": "Perspective Engine System"}), 503

    data = request.json
    claim_to_analyze_fallback = data.get('claim') # This is the snippet/title
    url_to_fetch = data.get('url') # Frontend should send URL

    if not url_to_fetch and not claim_to_analyze_fallback:
        return jsonify({"error": "URL or claim for fact-checking is required"}), 400
    
    text_for_context = ""
    source_of_context = "snippet/title"
    primary_claim = claim_to_analyze_fallback # Assume the snippet is the primary claim if no full text

    if url_to_fetch:
        print(f"Fact-check: Attempting to fetch content from URL: {url_to_fetch}")
        extracted_text = fetch_text_from_url(url_to_fetch)
        if extracted_text:
            text_for_context = extracted_text
            source_of_context = "fetched URL content"
            # If we have full text, the "claim" might be the whole article's theme or a key point.
            # For simplicity now, we'll still analyze the snippet as the claim, using the fetched text as context.
            # A more advanced approach would be to ask OpenAI to identify key claims in `extracted_text`.
        else:
            print(f"Fact-check: Failed to fetch from URL, using snippet/title as context.")
            text_for_context = claim_to_analyze_fallback # Fallback to snippet as context
    else:
        text_for_context = claim_to_analyze_fallback


    if not primary_claim and not text_for_context: # Should have at least one
         return jsonify({"error": "No claim or context available for fact-checking."}), 400
    
    # If primary_claim is empty but we have context, use the start of context as the claim
    if not primary_claim and text_for_context:
        primary_claim = text_for_context[:300] # Take first 300 chars of context as claim

    print(f"Fact-check: Analyzing claim '{primary_claim[:100]}...' using context from {source_of_context} (context length: {len(text_for_context)})")
    
    # Truncate context if too long
    max_len_for_context = 8000
    if len(text_for_context) > max_len_for_context:
        print(f"Fact-check: Context too long ({len(text_for_context)}), truncating to {max_len_for_context} chars.")
        text_for_context = text_for_context[:max_len_for_context]

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Consider GPT-4 for better fact-checking
            messages=[
                {"role": "system", "content": (
                    "You are an AI fact-checking assistant. Analyze the provided claim based on the provided context (if any) and your general knowledge. "
                    "Determine if the claim is generally 'verified', 'disputed/false', 'lacks consensus', or 'needs more context/unverifiable'. "
                    "Provide a brief, neutral explanation for your determination, citing from the context if relevant. "
                    "Respond ONLY with a single, valid JSON object with keys: 'verdict' (string) and 'explanation' (string)."
                )},
                {"role": "user", "content": f"Claim: \"{primary_claim}\"\n\nContext from source (if available, use this heavily): \"{text_for_context}\""}
            ],
            max_tokens=300, # Allow more space for explanation
            temperature=0.2
        )
        fact_check_str = response.choices[0].message.content.strip()
        fact_check_data = json.loads(fact_check_str)
        return jsonify({
            "claim": primary_claim, 
            "verdict": fact_check_data.get("verdict", "needs_context").lower().replace(" ", "_"),
            "explanation": fact_check_data.get("explanation", "No detailed explanation provided by AI."),
            "source": f"Perspective Engine AI Analysis (Source: {source_of_context})"
        })
    except json.JSONDecodeError as e:
        print(f"Fact-check: Could not parse JSON from OpenAI. Raw: {fact_check_str if 'fact_check_str' in locals() else 'N/A'}. Error: {e}")
        return jsonify({"claim": primary_claim, "verdict": "error_parsing", "explanation": "AI response was not valid JSON.", "source": "Perspective Engine System"}), 500
    except Exception as e:
        print(f"Error during OpenAI fact-checking: {e}")
        return jsonify({"error": f"Failed to perform fact-check: {str(e)}"}), 500

@app.route('/score', methods=['POST'])
def score_endpoint():
    # ... (score logic remains the same)
    data = request.get_json()
    if not data: return jsonify({"error": "Invalid JSON payload"}), 400
    source_type_input = data.get('source_type', 'unknown').lower()
    base_trust_input = float(data.get('base_trust', 0)) 
    sliderValue = int(data.get('sliderValue', 50))      
    recency_boost_input = float(data.get('recency_boost', 0)) 
    factcheckVerdict = data.get('factcheckVerdict', 'pending').lower()
    base_trust_score = min(max(base_trust_input / 100.0 * 50.0, 0.0), 50.0)
    recency_score = min(max(recency_boost_input / 100.0 * 15.0, 0.0), 15.0)
    fact_check_score_map = {
        "verified": 15, "neutral": 0, "disputed": -15, "disputed_false": -15, 
        "pending": 0, "lacks_consensus": -5, "needs_context":0, "service_unavailable":0, "unverifiable": -2,
        "error_parsing": -2, "neutral_unavailable": 0, "neutral_parsing_error": 0, "neutral_error": 0,
        "error": -2
    }
    fact_check_score = fact_check_score_map.get(factcheckVerdict, 0)
    source_orientation_map = {
        "mainstream": 1, "government": 0.8, "academic": 0.5, "encyclopedia": 0.6, 
        "alternative": -1, "mainstream_news": 1, "unknown": 0
    }
    source_orientation = source_orientation_map.get(source_type_input, 0)
    slider_orientation = (sliderValue - 50.0) / 50.0
    alignment_factor = source_orientation * slider_orientation
    user_slider_score = alignment_factor * 20.0
    total_credibility_score = base_trust_score + recency_score + fact_check_score + user_slider_score
    final_score = int(round(min(max(total_credibility_score, 0.0), 100.0)))
    return jsonify({
        "credibility_score": final_score,
        "factors": {
            "base_trust_score": round(base_trust_score, 2),
            "recency_score": round(recency_score, 2),
            "fact_check_score": fact_check_score,
            "user_slider_score": round(user_slider_score, 2)
        }
    })

if __name__ == '__main__':
    port = int(os.getenv("FLASK_PORT", 5001))
    print(f"Flask app attempting to start on port {port}...")
    app.run(debug=True, port=port)