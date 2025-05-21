import os
import json
import ast 
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from serpapi import SerpApiClient
from openai import OpenAI 
import requests 
from bs4 import BeautifulSoup
from urllib.parse import urlparse

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

openAIClient = None 
if OPENAI_API_KEY:
    try:
        openAIClient = OpenAI(api_key=OPENAI_API_KEY)
        print("OpenAI API Key loaded and client initialized.")
    except Exception as e:
        print(f"Error initializing OpenAI client: {e}")
        openAIClient = None 
else:
    print("Warning: OPENAI_API_KEY not found. AI functions will be limited or unavailable.")

if not SERPAPI_KEY:
    print("CRITICAL: SERPAPI_KEY not found in environment. Search will NOT work.")
else:
    print("SERPAPI_KEY loaded.")

# --- Domain Lists for Classification ---
KNOWN_SOCIAL_MEDIA_PLATFORMS = [
    "x.com", "twitter.com", "instagram.com", "tiktok.com", "youtube.com",
    "facebook.com", "reddit.com", "linkedin.com", "pinterest.com", "tumblr.com",
    "medium.com", "quora.com", "threads.net"
]
KNOWN_MAINSTREAM_NEWS_DOMAINS = [
    "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "apnews.com", 
    "washingtonpost.com", "wsj.com", "theguardian.com", "npr.org", 
    "abcnews.go.com", "cbsnews.com", "nbcnews.com", "foxnews.com",
    "usatoday.com", "bloomberg.com", "forbes.com", "news.google.com",
    "cnbc.com", "politico.com", "axios.com", "theatlantic.com", "newyorker.com",
    "time.com", "latimes.com", "chicagotribune.com", "chron.com" 
]
KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES = [
    "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "nature.com", "sciencemag.org",
    "jamanetwork.com", "thelancet.com", "ieee.org", "acm.org", "springer.com",
    "elsevier.com", "wiley.com", "sagepub.com", "jstor.org", "plos.org",
    "frontiersin.org", "bmj.com", "cell.com"
]

# --- Helper Functions ---

def fetch_text_from_url(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9', 'DNT': '1', 'Connection': 'keep-alive', 'Upgrade-Insecure-Requests': '1'
        }
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
        content_type = response.headers.get('content-type', '').lower()
        if not ('html' in content_type or 'xml' in content_type or 'text/plain' in content_type):
            print(f"Skipping URL {url}, content type not suitable: {content_type}")
            return None
        response.encoding = response.apparent_encoding if response.apparent_encoding else 'utf-8'
        soup = BeautifulSoup(response.text, 'lxml')
        for el_name in ["script", "style", "header", "footer", "nav", "aside", "form", "button", "iframe", "noscript", "figure", "figcaption", "img", "svg", "link", "meta"]:
            for el in soup.find_all(el_name): el.decompose()
        main_selectors = ['article', 'main', '[role="main"]', '.main-content', '.article-body', '#content', '#main', '.post-content', '.entry-content', '.story-body', '.articletext']
        content_element = None
        for selector in main_selectors:
            content_element = soup.select_one(selector)
            if content_element: break
        if not content_element: content_element = soup.body
        if content_element:
            text_chunks = []
            # Using main_content_element (which should be content_element)
            for element in content_element.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'pre', 'blockquote'], recursive=True):
                is_direct_child_of_main = False; parent = element.parent
                while parent and parent != soup:
                    if parent == content_element: is_direct_child_of_main = True; break
                    if parent.name in ['body', 'html'] and parent != content_element: break 
                    parent = parent.parent
                if is_direct_child_of_main or (content_element.name in ['p', 'li'] and element.parent == content_element):
                     chunk = element.get_text(separator=' ', strip=True)
                     if chunk and len(chunk.split()) > 3: text_chunks.append(chunk)
            if not text_chunks and content_element: text = content_element.get_text(separator='\n', strip=True)
            else: text = "\n".join(text_chunks)
            text = '\n'.join([line.strip() for line in text.splitlines() if line.strip() and len(line.strip().split()) > 2]) 
            print(f"Extracted ~{len(text)} chars from {url}")
            return text if len(text) > 150 else None 
        return None
    except requests.exceptions.Timeout: print(f"Timeout fetching URL {url}"); return None
    except requests.exceptions.RequestException as e: print(f"Request error fetching URL {url}: {e}"); return None
    except Exception as e: print(f"General error parsing URL {url}: {type(e).__name__} - {e}"); return None

def classify_source_type(result_url, source_engine_name=None):
    if not result_url: return "unknown_url"
    try:
        parsed_url = urlparse(result_url); netloc = parsed_url.netloc.lower(); path = parsed_url.path.lower()
        if netloc.startswith("www."): netloc = netloc[4:]

        # UPDATED Government Check
        if netloc.endswith(".gov") or ".gov." in netloc or netloc.endswith(".mil") or ".mil." in netloc: # e.g. .gov.au, .gov.uk
            return "government"
        if netloc.endswith(".edu"): return "academic_institution"
        if "wikipedia.org" in netloc: return "encyclopedia"
        
        for domain in KNOWN_SOCIAL_MEDIA_PLATFORMS:
            if domain == netloc or netloc.endswith("." + domain) or domain in netloc:
                if (domain == "youtube.com" or "youtube.com" in netloc or "youtu.be" in netloc) and \
                   ("/channel/" in path or "/c/" in path or "/user/" in path or path.startswith("/@")): return "social_media_channel_creator"
                if ("youtube.com" in netloc or "youtu.be" in netloc): return "social_media_platform_video"
                if "medium.com" in netloc:
                    path_parts = [part for part in path.split('/') if part]
                    if path_parts and (path_parts[0].startswith('@') or ('.' not in path_parts[0] and path_parts[0] not in ['search', 'tag', 'topic', 'collections', 'about', 'jobs', 'policy', 'help', 'settings', 'explore', 'topics', 'me', 'new-story', ' σειρά'])): return "social_blogging_platform_user_pub" 
                    return "social_blogging_platform"
                return "social_media_platform"
        for domain in KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES:
            if domain in netloc: return "research_publication"
        for domain in KNOWN_MAINSTREAM_NEWS_DOMAINS:
            if domain == netloc or netloc.endswith("." + domain):
                if "/blog" in path or "/opinion" in path or "/contributor" in path or "/live/" in path: return "news_opinion_blog_live"
                return "news_media_mainstream"
        if netloc.endswith(".org"):
            if any(p in path for p in ["/blog", "/news", "/press", "/report", "/briefing", "/article", "/story"]): return "ngo_nonprofit_publication"
            if any(p in netloc for p in ["foundation", "institute", "society", "association", "charity", "trust", "fund", "council", "union"]): return "ngo_nonprofit_organization"
            return "ngo_nonprofit_general"
        if any(p in path for p in ["/blog", "/press-release", "/newsroom", "/insights", "/pr/", "/investors", "/company/about", "/about-us", "/corporate"]):
            if not any(news_domain in netloc for news_domain in KNOWN_MAINSTREAM_NEWS_DOMAINS): return "corporate_blog_pr_info"
        if any(p in path for p in ["/news/", "/article/", "/story/", "/post/", "/views/"]) and any(tld in netloc for tld in [".com", ".net", ".info", ".co", ".online", ".io", ".news", ".press", ".report", ".blog"]):
             return "news_media_other_or_blog"
        if any(tld in netloc for tld in [".com", ".net", ".biz", ".info", ".org", ".co", ".io", ".app", ".site", ".online", ".me", ".tv", ".news", ".blog", ".press", ".report"]):
            return "website_general"
        return "unknown_other"
    except Exception as e: print(f"Error parsing URL '{result_url}' for classification: {type(e).__name__} - {e}"); return "unknown_error_parsing"

def get_sentiment_and_bias(text_content):
    if not text_content or not openAIClient: return {"score": 0.0, "label": "neutral_unavailable"}, {"score": 0.0, "label": "neutral_unavailable"}
    try:
        text_to_analyze = str(text_content)[:1500] 
        prompt = (
            f"Analyze sentiment and political bias of this text. For sentiment, classify 'positive', 'negative', or 'neutral', and score -1.0 to 1.0. "
            f"For bias, describe if it leans left, right, center, or neutral/objective. "
            f"Return ONLY valid JSON: {{\"sentiment_label\":\"string\", \"sentiment_score\":float, \"bias_label\":\"string\"}}."
            f"\n\nText: \"{text_to_analyze}\""
        )
        response = openAIClient.chat.completions.create(
            model="gpt-3.5-turbo", 
            messages=[{"role": "system", "content": "Analyze text for sentiment/bias. Respond ONLY with valid JSON as specified."}, {"role": "user", "content": prompt}], 
            temperature=0.1, max_tokens=150
        )
        analysis_data = json.loads(response.choices[0].message.content.strip())
        return {"score": float(analysis_data.get("sentiment_score",0.0)), "label": analysis_data.get("sentiment_label","neutral").lower()}, \
               {"score": 0.0, "label": analysis_data.get("bias_label","neutral").lower()}
    except Exception as e: 
        print(f"Error in get_sentiment_and_bias: {type(e).__name__} - {e}")
        return {"score": 0.0, "label": "neutral_error"}, {"score": 0.0, "label": "neutral_error"}

def fetch_results_via_serpapi(query, engine_name, api_key, num_results=10):
    if not api_key: print(f"SerpApi: No API key for {engine_name}."); return []
    params = {"q": query, "engine": engine_name.lower(), "api_key": api_key, "num": num_results, "hl": "en", "gl": "us"}
    print(f"SerpApi: Querying {engine_name} for '{query}' (num: {num_results})")
    try:
        serp_client = SerpApiClient(params); results_data = serp_client.get_dict()
        organic_results = results_data.get("organic_results", [])
        if not organic_results:
            print(f"SerpApi: No organic_results for '{query}' on {engine_name}. Response: {results_data.get('error', 'Unknown SerpApi issue')}")
            return []
        processed_results = []
        for item in organic_results:
            if "link" not in item or not item["link"]: continue
            processed_results.append({"title": item.get("title","No title"), "link": item.get("link"), "snippet": item.get("snippet","No snippet."), "source_engine": engine_name.capitalize()})
        print(f"SerpApi: Found {len(processed_results)} for {engine_name}"); return processed_results
    except Exception as e: print(f"SerpApi: Error for {engine_name}: {type(e).__name__} - {e}"); return []

# --- API Endpoints ---
@app.route('/search', methods=['POST'])
def search_endpoint():
    if not SERPAPI_KEY: return jsonify({"error": "Search API key not configured on server."}), 500
    data = request.json; original_query = data.get('query')
    selected_engines = data.get('engines', ['google', 'bing', 'duckduckgo'])
    if not original_query: return jsonify({"error": "Query is required"}), 400
    if not selected_engines: return jsonify({"error": "No search engines selected."}), 400
    print(f"Received search for: '{original_query}' on {selected_engines}")
    queries_to_run = {
        "mainstream_fetch": f"{original_query}", 
        "fringe_fetch": f"{original_query} (forum OR discussion OR \"alternative opinion\" OR blog) -site:wikipedia.org -site:cdc.gov -site:who.int -site:nih.gov -site:*.gov -site:*.mil" # Exclude .mil too
    }
    all_fetched_results = []
    for p_type, specific_query in queries_to_run.items():
        print(f"Initiating fetch for perspective: {p_type}, query: '{specific_query}'")
        for engine_name in selected_engines:
            engine_results = fetch_results_via_serpapi(specific_query, engine_name, SERPAPI_KEY, num_results=10) 
            for res_item in engine_results:
                res_item['perspective_query_type'] = p_type; all_fetched_results.append(res_item)
    temp_results_map = {}
    for item in all_fetched_results:
        if item['link'] not in temp_results_map: temp_results_map[item['link']] = item
        elif temp_results_map[item['link']]['perspective_query_type'] == 'fringe_fetch' and item['perspective_query_type'] == 'mainstream_fetch':
            temp_results_map[item['link']] = item 
    unique_results_list = list(temp_results_map.values())
    print(f"Total fetched: {len(all_fetched_results)}, Unique results: {len(unique_results_list)}")
    processed_output_results = []
    for res in unique_results_list:
        res['source_type_label'] = classify_source_type(res['link'], res.get('source_engine'))
        text_to_analyze = f"{res.get('title', '')} {res.get('snippet', '')}"
        sentiment, bias = get_sentiment_and_bias(text_to_analyze)
        res['sentiment'] = sentiment; res['bias'] = bias
        res['base_trust'] = 50; res['recency_boost'] = 0; res['factcheckVerdict'] = 'pending'
        res['intrinsic_credibility_score'] = None; res['intrinsic_credibility_factors'] = None
        processed_output_results.append(res)
    print(f"Returning {len(processed_output_results)} processed unique results.")
    return jsonify(processed_output_results)

@app.route('/summarize', methods=['POST'])
def summarize_endpoint():
    if not openAIClient: return jsonify({"error": "Summarization service unavailable."}), 503
    data = request.json; text_fb = data.get('text'); url = data.get('url')
    if not url and not text_fb: return jsonify({"error": "URL or text required"}), 400
    content = text_fb or ""; src = "snippet/title"
    if url:
        print(f"Summarize: Fetching from URL: {url}"); extracted = fetch_text_from_url(url)
        if extracted: content = extracted; src = "fetched URL content"
        elif not text_fb: print(f"Summarize: Failed URL fetch, no fallback for {url}.")
        elif text_fb: print(f"Summarize: Failed URL fetch for {url}, using fallback."); 
    if not content.strip(): return jsonify({"error": "No content to summarize."}), 400
    print(f"Summarize: Processing content from {src} (len: {len(content)})")
    try:
        content_to_send = content[:8000]
        response = openAIClient.chat.completions.create( model="gpt-3.5-turbo", messages=[{"role": "system", "content": "Summarize concisely (3-5 sentences)."},{"role": "user", "content": f"Summarize:\n\n{content_to_send}"}], max_tokens=250, temperature=0.3)
        summary = response.choices[0].message.content.strip()
        return jsonify({"summary": summary, "summarized_from": src})
    except Exception as e: 
        print(f"Error OpenAI summarization: {type(e).__name__} - {e}")
        return jsonify({"error": f"Summarization failed: {type(e).__name__}"}), 500

@app.route('/fact-check', methods=['POST'])
def fact_check_endpoint():
    data = request.json 
    if not openAIClient: return jsonify({"claim":data.get('claim','N/A'),"verdict":"service_unavailable","explanation":"Fact-check unavailable.","source":"System"}), 503
    claim_fb = data.get('claim'); url_to_fetch = data.get('url')
    if not url_to_fetch and not claim_fb: return jsonify({"error": "URL or claim required"}), 400
    text_for_context = claim_fb or ""; source_of_context = "snippet/title"; primary_claim = claim_fb or ""
    if url_to_fetch:
        print(f"Fact-check: Fetching from URL: {url_to_fetch}"); extracted_text = fetch_text_from_url(url_to_fetch)
        if extracted_text: text_for_context = extracted_text; source_of_context = "fetched URL content"
        elif not claim_fb: print(f"Fact-check: Failed URL fetch, no fallback claim for URL {url_to_fetch}.")
        elif claim_fb: print(f"Fact-check: Failed URL fetch for {url_to_fetch}, using fallback as context.");
    if not primary_claim.strip() and text_for_context.strip(): primary_claim = text_for_context[:300] 
    if not primary_claim.strip() and not text_for_context.strip(): return jsonify({"error":"No claim/context."}),400
    if not primary_claim.strip(): primary_claim = "Evaluate general credibility of provided context."
    print(f"Fact-check: Claim '{primary_claim[:100]}...' context from {source_of_context} (len: {len(text_for_context)})")
    try:
        context_to_send = text_for_context[:8000]; primary_claim_to_send = primary_claim[:1000]
        system_prompt = ("You are an AI fact-checking assistant... Respond ONLY with valid JSON: {\"verdict\":\"string\", \"explanation\":\"string\"}.") # Shortened for brevity
        user_prompt = f"Claim: \"{primary_claim_to_send}\"\n\nContext: \"{context_to_send}\""
        response = openAIClient.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role":"system","content":system_prompt},{"role":"user","content":user_prompt}], max_tokens=350,temperature=0.2)
        fact_check_str = response.choices[0].message.content.strip()
        try:
            fact_check_data = json.loads(fact_check_str)
            verdict = fact_check_data.get("verdict","needs_context").lower().replace(" ","_")
            explanation = fact_check_data.get("explanation","AI provided no detailed explanation.")
        except json.JSONDecodeError:
            print(f"Fact-check: OpenAI response not direct JSON. Trying ast.literal_eval. Raw: '{fact_check_str}'")
            try:
                pseudo_json_data = ast.literal_eval(fact_check_str) 
                if isinstance(pseudo_json_data, dict):
                    verdict = pseudo_json_data.get("verdict","needs_context_ast_eval").lower().replace(" ","_")
                    explanation = pseudo_json_data.get("explanation", f"AI explanation (processed from dict-like string): {fact_check_str}")
                    print(f"Fact-check: Successfully parsed with ast.literal_eval. Verdict: {verdict}")
                else: raise ValueError("ast.literal_eval did not produce a dictionary.")
            except Exception as e: 
                print(f"Fact-check: ast.literal_eval also failed. Error: {e}. Using keyword fallback.")
                explanation = f"AI response format error. Raw output: {fact_check_str}"
                if "verified" in fact_check_str.lower(): verdict = "verified"
                elif "disputed" in fact_check_str.lower() or "false" in fact_check_str.lower(): verdict = "disputed_false"
                elif "lacks consensus" in fact_check_str.lower(): verdict = "lacks_consensus"
                else: verdict = "needs_context_fallback"
        return jsonify({"claim":primary_claim_to_send, "verdict":verdict, "explanation":explanation, "source":f"AI Analysis (Context: {source_of_context})"})
    except Exception as e: 
        print(f"Error during OpenAI fact-checking main try block: {type(e).__name__} - {e}")
        return jsonify({"error": f"Fact-check failed: {type(e).__name__}", "claim": primary_claim}), 500

@app.route('/score', methods=['POST'])
def score_endpoint(): 
    data = request.get_json()
    if not data: return jsonify({"error": "Invalid JSON payload"}), 400
    source_type_input = data.get('source_type', 'unknown').lower()
    base_trust_input = float(data.get('base_trust', 50)) 
    recency_boost_input = float(data.get('recency_boost', 0)) 
    factcheckVerdict = data.get('factcheckVerdict', 'pending').lower()
    BASE_TRUST_MAX_SCORE = 60; RECENCY_MAX_SCORE = 15; FACT_CHECK_MAX_SCORE = 20; INTRINSIC_TYPE_ADJUSTMENT_MAX = 10
    base_trust_score = min(max(base_trust_input / 100.0 * BASE_TRUST_MAX_SCORE, 0.0), BASE_TRUST_MAX_SCORE)
    recency_score = min(max(recency_boost_input / 100.0 * RECENCY_MAX_SCORE, 0.0), RECENCY_MAX_SCORE)
    fact_check_score_map = {
        "verified": FACT_CHECK_MAX_SCORE, "neutral": 0, "disputed": -FACT_CHECK_MAX_SCORE, 
        "disputed_false": -FACT_CHECK_MAX_SCORE, "pending": -2, 
        "lacks_consensus": -int(FACT_CHECK_MAX_SCORE*0.4), "needs_context": 0, 
        "needs_context_format_error": 0, "needs_context_ast_eval": 0, "needs_context_fallback": 0,
        "service_unavailable":0, "unverifiable": -int(FACT_CHECK_MAX_SCORE*0.6),
        "error_parsing": -5, "neutral_unavailable": 0, "neutral_parsing_error": 0, "neutral_error": 0, "error": -5
    }
    fact_check_score = fact_check_score_map.get(factcheckVerdict, 0)
    intrinsic_type_quality_rating = {
        "government": 0.8, "academic_institution": 0.9, "research_publication": 0.9,
        "encyclopedia": 0.7, "news_media_mainstream": 0.6, "news_opinion_blog_live": 0.3,
        "ngo_nonprofit_publication": 0.5, "ngo_nonprofit_organization": 0.4, "ngo_nonprofit_general": 0.2,
        "corporate_blog_pr_info": 0.1, "news_media_other_or_blog": -0.3, 
        "social_media_platform": -0.8, "social_media_platform_video": -0.7, 
        "social_media_channel_creator": -0.5, "social_blogging_platform_user_pub": -0.4,
        "social_blogging_platform": -0.6, "website_general": 0.0, 
        "unknown_url": -0.9, "unknown_other": -0.9, "unknown_error_parsing": -1.0,
        "mainstream": 0.6, "alternative": -0.4, "unknown": -0.7
    }
    type_quality_val = intrinsic_type_quality_rating.get(source_type_input, 0.0)
    intrinsic_type_adjustment = type_quality_val * INTRINSIC_TYPE_ADJUSTMENT_MAX
    total_intrinsic_score = base_trust_score + recency_score + fact_check_score + intrinsic_type_adjustment
    final_score = int(round(min(max(total_intrinsic_score, 0.0), 100.0)))
    return jsonify({
        "intrinsic_credibility_score": final_score,
        "factors": { 
            "base_trust_contribution": round(base_trust_score, 2), "recency_contribution": round(recency_score, 2),
            "fact_check_contribution": round(fact_check_score, 2), "type_quality_adjustment": round(intrinsic_type_adjustment, 2)
        }
    })

if __name__ == '__main__':
    port = int(os.getenv("FLASK_PORT", 5001))
    print(f"Flask app attempting to start on port {port}...")
    app.run(debug=True, port=port)