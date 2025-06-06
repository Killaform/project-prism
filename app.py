import os
import json
import ast
from datetime import datetime, timedelta, timezone # Added timezone for UTC
from flask import Flask, request, jsonify, redirect, url_for, session
from datetime import datetime, timezone
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy # Added
from flask_bcrypt import Bcrypt # Added
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager # Added
from dotenv import load_dotenv
from serpapi import SerpApiClient
from openai import OpenAI
import google.generativeai as genai # For future Gemini integration
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from authlib.integrations.flask_client import OAuth

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f".env file loaded successfully from {dotenv_path}")
else:
    print(f"Warning: .env file not found at {dotenv_path}. API keys might not be loaded.")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# --- BEGIN NEW CONFIGURATIONS FOR USER ACCOUNTS ---
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") # For Flask sessions and JWT
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY") # For JWT signing (can be same as Flask SECRET_KEY or different)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24) # Optional: set token expiry

db = SQLAlchemy(app) # Initialize SQLAlchemy
bcrypt = Bcrypt(app) # Initialize Bcrypt
jwt = JWTManager(app) # Initialize JWTManager
# --- END NEW CONFIGURATIONS FOR USER ACCOUNTS ---

# --- BEGIN GOOGLE OAUTH CONFIGURATION ---
oauth = OAuth(app)
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    access_token_url='https://oauth2.googleapis.com/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'consent'
    }
)
# --- END GOOGLE OAUTH CONFIGURATION ---

# --- BEGIN DATABASE MODELS ---
class User(db.Model):
    __tablename__ = 'users' # Explicitly naming the table

    id = db.Column(db.Integer, primary_key=True)
    # google_id will be used if implementing Google OAuth
    google_id = db.Column(db.String(120), unique=True, nullable=True) # Nullable if not all users use Google OAuth
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=True)
    given_name = db.Column(db.String(100), nullable=True)
    family_name = db.Column(db.String(100), nullable=True)
    profile_pic_url = db.Column(db.String(255), nullable=True)

    # For email/password login, if we still want it alongside Google OAuth
    password_hash = db.Column(db.String(128), nullable=True) # Nullable if not required for all users

    created_at = db.Column(db.DateTime, nullable=True, default=lambda: datetime.now(timezone.utc)) # Matches (nullable in SQL if default not set by app)
    last_login_at = db.Column(db.DateTime, nullable=True, onupdate=lambda: datetime.now(timezone.utc))

    # Relationship to SavedQuery (one user can have many saved queries)
    # backref='author' creates a virtual 'author' attribute on SavedQuery instances
    # lazy='dynamic' means queries aren't loaded until explicitly requested
    saved_queries = db.relationship('SavedQuery', backref='author', lazy='dynamic', cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"
class SavedQuery(db.Model):
    __tablename__ = 'saved_queries' # Explicitly naming the table

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # Foreign key to users table
    query_text = db.Column(db.String(500), nullable=False)
    selected_engines = db.Column(db.JSON, nullable=False) # Storing list of engines as JSON
    perspective = db.Column(db.String(50), nullable=False) # e.g., "balanced", "mainstream", "fringe"
    # Using timezone.utc for default
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SavedQuery '{self.query_text[:30]}...' by User ID {self.user_id}>"
# --- END DATABASE MODELS ---

SERVER_SERPAPI_KEY = os.getenv("SERPAPI_KEY")
SERVER_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openAIClientInstance = None
if SERVER_OPENAI_API_KEY:
    try:
        openAIClientInstance = OpenAI(api_key=SERVER_OPENAI_API_KEY)
        print("Server's OpenAI API Key loaded and client initialized.")
    except Exception as e:
        print(f"Error initializing server's OpenAI client: {e}")
        openAIClientInstance = None
else:
    print("Warning: Server's OPENAI_API_KEY not found. OpenAI features will rely on user-provided keys if available.")

if not SERVER_SERPAPI_KEY:
    print("Warning: Server's SERPAPI_KEY not found. Search will rely on user-provided keys if available.")
else:
    print("Server's SERPAPI_KEY loaded.")

KNOWN_SOCIAL_MEDIA_PLATFORMS = [ "x.com", "twitter.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "facebook.com", "reddit.com", "linkedin.com", "pinterest.com", "tumblr.com", "medium.com", "quora.com", "threads.net" ]
KNOWN_MAINSTREAM_NEWS_DOMAINS = [ "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "apnews.com", "washingtonpost.com", "wsj.com", "theguardian.com", "npr.org", "abcnews.go.com", "cbsnews.com", "nbcnews.com", "foxnews.com", "usatoday.com", "bloomberg.com", "forbes.com", "news.google.com", "cnbc.com", "politico.com", "axios.com", "theatlantic.com", "newyorker.com", "time.com", "latimes.com", "chicagotribune.com", "chron.com"  ]
KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES = [ "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "nature.com", "sciencemag.org", "jamanetwork.com", "thelancet.com", "ieee.org", "acm.org", "springer.com", "elsevier.com", "wiley.com", "sagepub.com", "jstor.org", "plos.org", "frontiersin.org", "bmj.com", "cell.com" ]

def fetch_text_from_url(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36','Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9','Accept-Language': 'en-US,en;q=0.9', 'DNT': '1', 'Connection': 'keep-alive', 'Upgrade-Insecure-Requests': '1'}
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True); response.raise_for_status()
        content_type = response.headers.get('content-type', '').lower()
        if not ('html' in content_type or 'xml' in content_type or 'text/plain' in content_type): print(f"Skipping URL {url}, content type: {content_type}"); return None
        response.encoding = response.apparent_encoding if response.apparent_encoding else 'utf-8'; soup = BeautifulSoup(response.text, 'lxml')
        for el_name in ["script","style","header","footer","nav","aside","form","button","iframe","noscript","figure","figcaption","img","svg","link","meta"]:
            for el in soup.find_all(el_name): el.decompose()
        main_selectors = ['article','main','[role="main"]','.main-content','.article-body','#content','#main','.post-content','.entry-content','.story-body','.articletext']
        content_element = None
        for selector in main_selectors:
            content_element = soup.select_one(selector)
            if content_element:
                break
        if not content_element: content_element = soup.body
        if content_element:
            text_chunks = []
            current_element_for_check = content_element
            for element in content_element.find_all(['p','h1','h2','h3','h4','h5','h6','li','td','pre','blockquote'], recursive=True):
                is_direct_child = False; parent = element.parent
                while parent and parent != soup:
                    if parent == current_element_for_check: is_direct_child = True; break
                    if parent.name in ['body','html'] and parent != current_element_for_check: break
                    parent = parent.parent
                if is_direct_child or (current_element_for_check and current_element_for_check.name in ['p','li'] and element.parent == current_element_for_check):
                    chunk = element.get_text(separator=' ', strip=True)
                    if chunk and len(chunk.split()) > 3: text_chunks.append(chunk)
            if not text_chunks and content_element: text = content_element.get_text(separator='\n', strip=True)
            else: text = "\n".join(text_chunks)
            text = '\n'.join([line.strip() for line in text.splitlines() if line.strip() and len(line.strip().split()) > 2])
            print(f"Extracted ~{len(text)} chars from {url}"); return text if len(text) > 150 else None
        return None
    except requests.exceptions.Timeout: print(f"Timeout URL {url}"); return None
    except requests.exceptions.RequestException as e: print(f"Request error URL {url}: {e}"); return None
    except Exception as e: print(f"Parsing error URL {url}: {type(e).__name__} - {e}"); return None

def classify_source_type(result_url, source_engine_name=None):
    if not result_url: return "unknown_url"
    try:
        parsed_url = urlparse(result_url); netloc = parsed_url.netloc.lower(); path = parsed_url.path.lower()
        if netloc.startswith("www."): netloc = netloc[4:]
        if netloc.endswith((".gov",".mil")) or ".gov." in netloc or ".mil." in netloc: return "government"
        if netloc.endswith(".edu"): return "academic_institution"
        if "wikipedia.org" in netloc: return "encyclopedia"
        for domain in KNOWN_SOCIAL_MEDIA_PLATFORMS:
            if domain == netloc or netloc.endswith("."+domain) or domain in netloc:
                if (domain == "youtube.com" or "youtube.com" in netloc or "youtu.be" in netloc) and ("/channel/" in path or "/c/" in path or "/user/" in path or path.startswith("/@")): return "social_media_channel_creator"
                if ("youtube.com" in netloc or "youtu.be" in netloc): return "social_media_platform_video"
                if "medium.com" in netloc: p_parts=[p for p in path.split('/') if p]; return p_parts and (p_parts[0].startswith('@')or(not'.'in p_parts[0]and p_parts[0]not in['search','tag','topic','collections','about','jobs','policy','help','settings','explore','me','new-story']))and"social_blogging_platform_user_pub"or"social_blogging_platform"
                return "social_media_platform"
        for domain in KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES:
            if domain in netloc: return "research_publication"
        for domain in KNOWN_MAINSTREAM_NEWS_DOMAINS:
            if domain == netloc or netloc.endswith("."+domain): return any(p in path for p in ["/blog","/opinion","/contributor","/live/"])and"news_opinion_blog_live"or"news_media_mainstream"
        if netloc.endswith(".org"):
            if any(p in path for p in ["/blog","/news","/press","/report","/briefing","/article","/story"]): return "ngo_nonprofit_publication"
            if any(p in netloc for p in ["foundation","institute","society","association","charity","trust","fund","council","union"]): return "ngo_nonprofit_organization"
            return "ngo_nonprofit_general"
        if any(p in path for p in ["/blog","/press-release","/newsroom","/insights","/pr/","/investors","/company/about","/about-us","/corporate"]):
            if not any(n_dom in netloc for n_dom in KNOWN_MAINSTREAM_NEWS_DOMAINS): return "corporate_blog_pr_info"
        if any(p in path for p in ["/news/","/article/","/story/","/post/","/views/"]) and any(tld in netloc for tld in [".com",".net",".info",".co",".online",".io",".news",".press",".report",".blog"]): return "news_media_other_or_blog"
        if any(tld in netloc for tld in [".com",".net",".biz",".info",".org",".co",".io",".app",".site",".online",".me",".tv",".news",".blog",".press",".report"]): return "website_general"
        return "unknown_other"
    except Exception as e: print(f"Error classifying URL '{result_url}': {type(e).__name__} - {e}"); return "unknown_error_parsing"

def get_sentiment_and_bias(text_content, ai_provider='openai', user_api_key=None):
    if not text_content: return {"score": 0.0, "label": "neutral_no_content"}, {"score": 0.0, "label": "neutral_no_content"}
    print(f"[AI SENTIMENT] Provider: {ai_provider}, User Key Provided: {'Yes' if user_api_key else 'No (will use server key if OpenAI)'}")
    if ai_provider == 'openai':
        determined_openai_key = user_api_key or SERVER_OPENAI_API_KEY
        if not determined_openai_key: print("[AI SENTIMENT] OpenAI key (user or server) unavailable."); return {"score":0.0,"label":"neutral_key_missing"},{"score":0.0,"label":"neutral_key_missing"}
        current_client = OpenAI(api_key=determined_openai_key)
        try:
            text_to_analyze = str(text_content)[:1500]; prompt = (f"Analyze sentiment and political bias...Return ONLY valid JSON...Text: \"{text_to_analyze}\"") # Shortened prompt for context
            response = current_client.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "system", "content": "Analyze text for sentiment/bias. Respond ONLY with valid JSON as specified."}, {"role": "user", "content": prompt}], temperature=0.1, max_tokens=150)
            analysis_data = json.loads(response.choices[0].message.content.strip())
            return {"score":float(analysis_data.get("sentiment_score",0.0)),"label":analysis_data.get("sentiment_label","neutral").lower()},{"score":0.0,"label":analysis_data.get("bias_label","neutral").lower()}
        except Exception as e: print(f"Error OpenAI sentiment: {type(e).__name__} - {e}"); return {"score":0.0,"label":"neutral_openai_error"},{"score":0.0,"label":"neutral_openai_error"}
    elif ai_provider == 'gemini':
        if not user_api_key: print("[AI SENTIMENT] Gemini key missing."); return {"score":0.0,"label":"neutral_key_missing"},{"score":0.0,"label":"neutral_key_missing"}
        try:
            genai.configure(api_key=user_api_key); model = genai.GenerativeModel('gemini-1.5-flash-latest')
            text_to_analyze = str(text_content)[:30000]
            prompt = (f"Analyze the sentiment and political bias...MUST be JSON... 'sentiment_label', 'sentiment_score', 'bias_label'.\n\nSnippet: \"{text_to_analyze}\"") # Shortened
            generation_config = genai.types.GenerationConfig(response_mime_type="application/json")
            response = model.generate_content(prompt, generation_config=generation_config)
            analysis_data = json.loads(response.text)
            return {"score": float(analysis_data.get("sentiment_score",0.0)), "label": analysis_data.get("sentiment_label","neutral").lower()},{"score":0.0,"label":analysis_data.get("bias_label","neutral").lower()}
        except Exception as e:
            print(f"Error Gemini sentiment (attempting text fallback): {type(e).__name__} - {e}")
            try:
                model = genai.GenerativeModel('gemini-1.5-flash-latest')
                text_prompt = (f"Analyze the sentiment and political bias... Your entire response MUST be a single, valid JSON object... 'sentiment_label', 'sentiment_score', 'bias_label'.\n\nText Snippet: \"{text_to_analyze}\"")
                response = model.generate_content(text_prompt); response_text = response.text.strip()
                if response_text.startswith("```json"): response_text = response_text[7:]
                if response_text.endswith("```"): response_text = response_text[:-3]
                analysis_data = json.loads(response_text.strip())
                return {"score": float(analysis_data.get("sentiment_score",0.0)), "label": analysis_data.get("sentiment_label","neutral").lower()},{"score":0.0,"label":analysis_data.get("bias_label","neutral").lower()}
            except Exception as e_fallback: print(f"Error in Gemini sentiment text fallback: {type(e_fallback).__name__} - {e_fallback}"); return {"score":0.0,"label":"neutral_gemini_error"},{"score":0.0,"label":"neutral_gemini_error"}
    else: print(f"[AI SENTIMENT] Unknown provider: {ai_provider}"); return {"score":0.0,"label":"neutral_provider_unknown"},{"score":0.0,"label":"neutral_provider_unknown"}

def fetch_results_via_serpapi(query, engine_name, api_key_to_use, num_results=10):
    if not api_key_to_use: print(f"SerpApi: No API key for {engine_name}."); return []
    params = {"q":query,"engine":engine_name.lower(),"api_key":api_key_to_use,"num":num_results,"hl":"en","gl":"us"}
    print(f"SerpApi: Querying {engine_name} for '{query}' (num:{num_results})")
    try:
        s_client = SerpApiClient(params); r_data = s_client.get_dict(); o_results = r_data.get("organic_results",[])
        if not o_results: print(f"SerpApi: No organic_results for '{query}' on {engine_name}. R: {r_data.get('error','Unknown')}"); return []
        p_results = [{"title":i.get("title","No title"),"link":i.get("link"),"snippet":i.get("snippet","No snippet."),"source_engine":engine_name.capitalize()} for i in o_results if i.get("link")]
        print(f"SerpApi: Found {len(p_results)} for {engine_name}"); return p_results
    except Exception as e: print(f"SerpApi: Error {engine_name}: {type(e).__name__} - {e}"); return []

@app.route('/search', methods=['POST'])
def search_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    # Extract search parameters
    query = data.get('query')
    if not query:
        return jsonify({"error": "Search query is required"}), 400
        
    engines = data.get('engines', ['google'])
    perspective = data.get('perspective', 'balanced')
    serpapi_key = data.get('serpapi_key', '')
    
    # Use server SERP API key as fallback if not provided
    api_key_to_use = serpapi_key or SERVER_SERPAPI_KEY
    
    if not api_key_to_use:
        return jsonify({"error": "SERP API key is required but not provided"}), 400
    
    try:
        all_results = []
        
        # Collect results from each selected engine
        for engine in engines:
            engine_results = fetch_results_via_serpapi(query, engine, api_key_to_use)
            all_results.extend(engine_results)
            
        # Process results based on perspective
        for result in all_results:
            # Classify source type
            source_type = classify_source_type(result.get('link'), result.get('source_engine', ''))
            result['source_type_label'] = source_type
            
            # Add perspective query type based on the request
            result['perspective_query_type'] = f"{perspective}_fetch"
            
            # Set trust scores based on source type
            base_trust_map = {
                "government": 85,
                "academic_institution": 90,
                "encyclopedia": 80,
                "research_publication": 85,
                "news_media_mainstream": 75,
                "news_opinion_blog_live": 65,
                "ngo_nonprofit_publication": 70,
                "ngo_nonprofit_organization": 65,
                "ngo_nonprofit_general": 60,
                "corporate_blog_pr_info": 55,
                "news_media_other_or_blog": 50,
                "social_media_platform": 30,
                "social_media_platform_video": 35,
                "social_media_channel_creator": 40,
                "social_blogging_platform_user_pub": 45,
                "social_blogging_platform": 40,
                "website_general": 50,
                "mainstream": 75,
                "alternative": 40,
                "unknown": 30,
                "unknown_url": 25,
                "unknown_other": 30,
                "unknown_error_parsing": 20
            }
            
            result['base_trust'] = base_trust_map.get(source_type, 50)
            result['recency_boost'] = 5  # Default recency boost
            
            # Calculate intrinsic score using the scoring endpoint logic
            score_data = {
                'source_type': source_type,
                'base_trust': result['base_trust'],
                'recency_boost': result['recency_boost'],
                'factcheckVerdict': 'pending'
            }
            
            # Calculate intrinsic credibility score
            BTS_MAX = 60
            RMS_MAX = 15
            FCS_MAX = 20
            ITA_MAX = 10
            
            bts = min(max(result['base_trust']/100 * BTS_MAX, 0), BTS_MAX)
            rs = min(max(result['recency_boost']/100 * RMS_MAX, 0), RMS_MAX)
            
            # Source type quality adjustment
            itq_map = {
                "government": .8, "academic_institution": .9, "research_publication": .9,
                "encyclopedia": .7, "news_media_mainstream": .6, "news_opinion_blog_live": .3,
                "ngo_nonprofit_publication": .5, "ngo_nonprofit_organization": .4,
                "ngo_nonprofit_general": .2, "corporate_blog_pr_info": .1,
                "news_media_other_or_blog": -.3, "social_media_platform": -.8,
                "social_media_platform_video": -.7, "social_media_channel_creator": -.5,
                "social_blogging_platform_user_pub": -.4, "social_blogging_platform": -.6,
                "website_general": 0, "unknown_url": -.9, "unknown_other": -.9,
                "unknown_error_parsing": -1, "mainstream": .6, "alternative": -.4, "unknown": -.7
            }
            
            tqv = itq_map.get(source_type, 0.)
            ita = tqv * ITA_MAX
            tis = bts + rs + ita  # No fact check yet
            fs = int(round(min(max(tis, 0), 100)))
            
            result['intrinsic_credibility_score'] = fs
        
        return jsonify({
            "query": query,
            "engines": engines,
            "perspective": perspective,
            "results": all_results
        })
        
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": f"Search failed: {str(e)}"}), 500

@app.route('/summarize', methods=['POST'])
def summarize_endpoint():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    provider = data.get('ai_provider', 'openai')
    key = data.get('user_api_key')
    text_fb = data.get('text')
    url = data.get('url')

    if not url and not text_fb:
        return jsonify({"error": "URL or text required"}), 400
    
    determined_key = key or (SERVER_OPENAI_API_KEY if provider == 'openai' else None)
    if provider == 'openai' and not determined_key:
        return jsonify({"error": "OpenAI API key unavailable."}), 503
    if provider == 'gemini' and not key:
        return jsonify({"error": "Gemini API key unavailable."}), 503
    
    content = text_fb or ""
    src = "snippet/title"
    
    if url:
        ext = fetch_text_from_url(url)
        if ext:
            content = ext
            src = "fetched URL content"
        elif not ext and text_fb:
            print(f"Summarize: Failed URL fetch {url}, using fallback.")
        elif not ext and not text_fb:
            print(f"Summarize: Failed URL fetch {url}, no fallback.")
            return jsonify({"error": "Could not fetch URL content and no fallback text provided"}), 400
    
    if not content.strip():
        return jsonify({"error": "No content to summarize."}), 400
    
    print(f"Summarize ({provider}): Content from {src} (len: {len(content)})")
    
    try:
        c_send = content[:8000]  # Limit content to avoid token limits
        
        if provider == 'openai':
            openai_client = OpenAI(api_key=determined_key)
            resp = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Summarize the following text in 3-5 clear, informative sentences."},
                    {"role": "user", "content": f"Summarize:\n\n{c_send}"}
                ],
                max_tokens=250,
                temperature=0.3
            )
            summary_text = resp.choices[0].message.content.strip()
        
        elif provider == 'gemini':
            import google.generativeai as genai
            genai.configure(api_key=key)
            model = genai.GenerativeModel('gemini-1.5-flash-latest')
            prompt = f"Summarize this text in 3-5 sentences:\n\n{c_send}"
            response = model.generate_content(prompt)
            summary_text = response.text
        
        return jsonify({"summary": summary_text, "summarized_from": src})
    
    except Exception as e:
        print(f"Error {provider} summarization: {type(e).__name__}-{e}")
        return jsonify({"error": f"Summarization error: {str(e)}"}), 500


@app.route('/fact-check', methods=['POST'])
def fact_check():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    provider = data.get('ai_provider', 'openai')
    key = data.get('user_api_key')
    claim_fb = data.get('claim')
    url = data.get('url')

    if not url and not claim_fb:
        return jsonify({"error": "URL or claim required"}), 400
    
    determined_key = key or (SERVER_OPENAI_API_KEY if provider == 'openai' else None)
    if provider == 'openai' and not determined_key:
        return jsonify({"error": "OpenAI API key unavailable."}), 503
    if provider == 'gemini' and not key:
        return jsonify({"error": "Gemini API key unavailable."}), 503
    
    context = claim_fb or ""
    src_ctx = "snippet/title"
    p_claim = claim_fb or ""
    
    if url:
        ext = fetch_text_from_url(url)
        if ext:
            context = ext
            src_ctx = "fetched URL content"
        elif not ext and claim_fb:
            print(f"Fact-check: Failed URL fetch {url}, using fallback.")
        elif not ext and not claim_fb:
            print(f"Fact-check: Failed URL fetch {url}, no fallback.")
            return jsonify({"error": "Could not fetch URL content and no fallback claim provided"}), 400
    
    if not p_claim.strip() and context.strip():
        p_claim = context[:300]
    
    if not p_claim.strip() and not context.strip():
        return jsonify({"error": "No claim or context to fact-check"}), 400
    
    if not p_claim.strip():
        p_claim = "Evaluate general credibility of provided context."
    
    print(f"Fact-check ({provider}): Claim '{p_claim[:100]}...' context from {src_ctx} (len: {len(context)})")
    
    try:
        if provider == 'openai':
            verdict, explanation = fact_check_with_openai(p_claim, context, determined_key)
        elif provider == 'gemini':
            verdict, explanation = fact_check_with_gemini(p_claim, context, key)
        else:
            return jsonify({"error": f"Unsupported AI provider: {provider}"}), 400
        
        return jsonify({
            "claim": p_claim,
            "verdict": verdict,
            "explanation": explanation,
            "source": f"AI Analysis ({provider.capitalize()}, Context: {src_ctx})"
        })
    
    except Exception as e:
        print(f"Error {provider} fact-checking: {type(e).__name__}-{e}")
        return jsonify({"error": f"Fact-checking error: {str(e)}"}), 500


def fact_check_with_openai(claim, content, api_key):
    """
    Fact-check a claim using OpenAI's API
    """
    try:
        client = OpenAI(api_key=api_key)
        
        # Prepare context and claim
        limited_content = content[:8000] if content else "No content available"
        
        prompt = f"""
        Fact check the following claim based on the provided content. 
        Return ONLY a JSON object with the following fields:
        - "verdict": one of ["verified", "false", "partially_true", "disputed", "lacks_consensus", "unverifiable"]
        - "explanation": a brief explanation of your verdict

        Claim: "{claim}"
        
        Content to check against:
        {limited_content}
        """
        
        # Call the OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a fact-checking assistant. Return ONLY a valid JSON object with the specified fields."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        result_text = response.choices[0].message.content.strip()
        fact_check_result = json.loads(result_text)
        
        # Ensure required fields exist
        if not "verdict" in fact_check_result:
            return "error", "The AI response did not include a verdict"
            
        if not "explanation" in fact_check_result:
            fact_check_result["explanation"] = "No explanation provided"
            
        return fact_check_result["verdict"], fact_check_result["explanation"]
        
    except Exception as e:
        print(f"OpenAI fact-check error: {type(e).__name__} - {e}")
        return "error", f"Error processing fact check: {str(e)}"


def fact_check_with_gemini(claim, content, api_key):
    """
    Fact-check a claim using Google's Gemini API
    """
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        # Prepare context and claim
        limited_content = content[:30000] if content else "No content available"
        
        prompt = f"""
        Fact check the following claim based on the provided content.
        Return ONLY a JSON object with the following fields:
        - "verdict": one of ["verified", "false", "partially_true", "disputed", "lacks_consensus", "unverifiable"]
        - "explanation": a brief explanation of your verdict (1-3 sentences)

        Claim: "{claim}"
        
        Content to check against:
        {limited_content}
        """
        
        gen_config = genai.types.GenerationConfig(response_mime_type="application/json")
        
        # Call the Gemini API
        response = model.generate_content(prompt, generation_config=gen_config)
        result_text = response.text
        
        # Parse the response
        fact_check_result = json.loads(result_text)
        
        # Ensure required fields exist
        if not "verdict" in fact_check_result:
            return "error", "The AI response did not include a verdict"
            
        if not "explanation" in fact_check_result:
            fact_check_result["explanation"] = "No explanation provided"
            
        return fact_check_result["verdict"], fact_check_result["explanation"]
        
    except Exception as e:
        print(f"Gemini fact-check error: {type(e).__name__} - {e}")
        return "error", f"Error processing fact check: {str(e)}"
        
@app.route('/score', methods=['POST'])
def score_endpoint():
    data=request.get_json();_ = not data and (jsonify({"error":"Invalid JSON"}),400);s_type=data.get('source_type','unknown').lower();b_trust=float(data.get('base_trust',50));r_boost=float(data.get('recency_boost',0));fc_v=data.get('factcheckVerdict','pending').lower();BTS_MAX=60;RMS_MAX=15;FCS_MAX=20;ITA_MAX=10;bts=min(max(b_trust/100*BTS_MAX,0),BTS_MAX);rs=min(max(r_boost/100*RMS_MAX,0),RMS_MAX);fcs_map={"verified":FCS_MAX,"neutral":0,"disputed":-FCS_MAX,"disputed_false":-FCS_MAX,"pending":-2,"lacks_consensus":-int(FCS_MAX*.4),"needs_context":0,"needs_context_format_error":0,"needs_context_ast_eval":0,"needs_context_fallback":0,"service_unavailable":0,"unverifiable":-int(FCS_MAX*.6),"error_parsing":-5};fcs=fcs_map.get(fc_v,0);itq_map={"government":.8,"academic_institution":.9,"research_publication":.9,"encyclopedia":.7,"news_media_mainstream":.6,"news_opinion_blog_live":.3,"ngo_nonprofit_publication":.5,"ngo_nonprofit_organization":.4,"ngo_nonprofit_general":.2,"corporate_blog_pr_info":.1,"news_media_other_or_blog":-.3,"social_media_platform":-.8,"social_media_platform_video":-.7,"social_media_channel_creator":-.5,"social_blogging_platform_user_pub":-.4,"social_blogging_platform":-.6,"website_general":0,"unknown_url":-.9,"unknown_other":-.9,"unknown_error_parsing":-1,"mainstream":.6,"alternative":-.4,"unknown":-.7};tqv=itq_map.get(s_type,0.);ita=tqv*ITA_MAX;tis=bts+rs+fcs+ita;fs=int(round(min(max(tis,0),100)));return jsonify({"intrinsic_credibility_score":fs,"factors":{"base_trust_contribution":round(bts,2),"recency_contribution":round(rs,2),"fact_check_contribution":round(fcs,2),"type_quality_adjustment":round(ita,2)}})

@app.route('/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    """Simple endpoint to verify if a token is valid"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "valid": True, 
        "user_id": current_user_id, 
        "email": user.email
    }), 200

def handle_preflight():
    """Handle CORS preflight requests by returning appropriate headers"""
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')  # Or specify your frontend origin
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response, 200

@app.route('/classify-perspectives', methods=['POST'])
def classify_perspectives():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    results = data.get('results', [])
    ai_provider = data.get('ai_provider', 'openai')
    api_key = data.get('api_key')
    
    if not results:
        return jsonify({'error': 'No results to classify'}), 400
    
    # For OpenAI, we can use server key as fallback
    if ai_provider == 'openai':
        key_to_use = api_key or SERVER_OPENAI_API_KEY
        if not key_to_use:
            return jsonify({'error': 'No OpenAI API key available'}), 400
    elif ai_provider == 'gemini':
        key_to_use = api_key
        if not key_to_use:
            return jsonify({'error': 'No Gemini API key provided'}), 400
    else:
        return jsonify({'error': 'Invalid AI provider specified'}), 400
    
    classified_results = []
    
    try:
        # Process in batches to avoid token limits
        batch_size = 5
        for i in range(0, len(results), batch_size):
            batch = results[i:i+batch_size]
            
            if ai_provider == 'openai':
                batch_classified = classify_with_openai(batch, key_to_use)
                classified_results.extend(batch_classified)
            else:
                # Implement Gemini classification later
                # For now, use the same OpenAI function with fallback to rule-based
                batch_classified = classify_with_openai(batch, key_to_use)
                classified_results.extend(batch_classified)
        
        return jsonify({'results': classified_results})
    except Exception as e:
        print(f"Error classifying perspectives: {e}")
        # On error, return the original results with rule-based classification
        for result in results:
            url = result.get('link', '').lower()
            title = result.get('title', '').lower()
            result['perspective'] = infer_perspective_from_url_and_title(url, title)
        
        return jsonify({'results': results})

def classify_with_openai(results, api_key):
    client = OpenAI(api_key=api_key)
    
    # Enhanced prompt with clearer distinction between categories and more specific guidance
    prompt = """
    You are a media bias analyst specializing in identifying the perspective of information sources.
    
    Classify each search result into ONE of these perspective categories:
    
    1. "mainstream": 
       - Major news networks (e.g., CNN, BBC, NYT, Washington Post, Reuters, AP)
       - Government official websites (.gov, .mil domains, statements from official bodies)
       - Established international health organizations (e.g., WHO, CDC, EMA)
       - University websites and reputable academic publications/journals (.edu domains, e.g., Nature, Science, The Lancet)
       - Content that presents widely accepted scientific consensus or official positions
       - Reports from well-known, broadly trusted institutions or think tanks with transparent funding and methodology.
    
    2. "alternative": 
       - Sources presenting strong contrarian views to established scientific consensus or official government/health narratives (e.g., questioning vaccine safety/efficacy based on non-mainstream interpretations, promoting unverified treatments).
       - Sites promoting unconventional or suppressed theories regarding major events or scientific topics.
       - Commentary sites with a clear, often aggressively stated, agenda against mainstream institutions or narratives.
       - Sources that consistently challenge or allege suppression/conspiracy by mainstream media, governments, or scientific bodies.
       - Content featuring theories often labeled as "conspiracy," "fringe," or "misinformation" by mainstream fact-checkers or authorities.
       - Sites using highly emotive or sensationalist language to dispute widely accepted facts or expert consensus.
       - Platforms emphasizing "uncensored truths," "what they don't want you to know," or "the hidden story."
    
    3. "neutral": 
       - Purely factual educational content from recognized, unbiased educational providers.
       - Reference materials like encyclopedias (e.g., Wikipedia, Britannica), dictionaries, or comprehensive, non-partisan databases.
       - Strictly data-driven resources with minimal interpretation or opinionated framing.
       - Technical documentation or specifications.
       - Primary research papers presented without significant political or ideological framing in their abstract/snippet (the content itself might be debated later, but the presentation is neutral).
       - Balanced news reports that clearly present multiple sides of an issue without overtly favoring one.
    
    For EACH search result, analyze:
    1. The URL (consider domain reputation, TLDs like .org, .gov, .edu vs commercial or obscure sites, known bias of the domain)
    2. The title (look for emotional/loaded language, sensationalism, claims of exclusivity or suppression)
    3. The snippet (identify bias markers, type of language used - e.g., scientific/academic vs opinionated/polemic, presence of unsubstantiated claims)
    
    Return ONLY valid JSON with the original results that include the perspective field. Ensure the output is a single JSON array.
    """
    
    # Format results for the prompt with examples
    results_str = json.dumps(results[:15], indent=2)  # Limit to avoid token issues
    
    example_json = """
    [
      {
        "title": "CDC Reports New COVID-19 Statistics and Prevention Guidelines",
        "link": "https://www.cdc.gov/coronavirus/2019-ncov/index.html",
        "snippet": "The CDC provides updated information on COVID-19 cases, vaccines, and prevention measures for the public.",
        "perspective": "mainstream"
      },
      {
        "title": "The Hidden Truth About COVID Vaccines The Government Won't Tell You",
        "link": "https://www.alternative-health-news.com/covid-vaccines-danger",
        "snippet": "Shocking revelations about the dangers of COVID vaccines that mainstream media and government agencies are covering up.",
        "perspective": "alternative"
      },
      {
        "title": "COVID-19 - Wikipedia",
        "link": "https://en.wikipedia.org/wiki/COVID-19",
        "snippet": "Coronavirus disease 2019 (COVID-19) is a contagious disease caused by the virus SARS-CoV-2. The first known case was identified in Wuhan, China, in December 2019.",
        "perspective": "neutral"
      }
    ]
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Here's an example of correctly classified results in JSON format:\n{example_json}\n\nNow classify these results and return as JSON:\n{results_str}"}
            ],
            temperature=0.1,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )
        
        classified_data = json.loads(response.choices[0].message.content)
        
        # Handle chunking for large result sets
        classified_results = []
        if isinstance(classified_data, list):
            classified_results = classified_data
        elif 'results' in classified_data:
            classified_results = classified_data['results']
            
        # Combine with any results that weren't in the first chunk
        if len(results) > 15:
            for result in results[15:]:
                # Try to infer classification from URL and title for remaining items
                perspective = infer_perspective_from_url_and_title(result.get('link', ''), result.get('title', ''))
                result['perspective'] = perspective
                classified_results.append(result)
        
        return classified_results
    except Exception as e:
        print(f"OpenAI classification error: {e}")
        # Fallback: use simple rules to classify
        for result in results:
            url = result.get('link', '').lower()
            title = result.get('title', '').lower()
            
            result['perspective'] = infer_perspective_from_url_and_title(url, title)
        
        return results

def infer_perspective_from_url_and_title(url, title):
    """Simple rule-based fallback classifier"""
    url = url.lower() if url else ''
    title = title.lower() if title else ''
    
    # Government, educational, or major health organizations
    if any(domain in url for domain in ['.gov', '.edu', 'who.int', 'cdc.gov', 'nih.gov', '.un.org']):
        return 'mainstream'
    
    # Major news outlets (expanded list for robustness)
    mainstream_news_domains = [
        'bbc.', 'cnn.', 'nytimes.', 'washingtonpost.', 'reuters.', 'apnews.', 
        'nbcnews.', 'abcnews.', 'cbsnews.', 'theguardian.', 'wsj.', 'economist.',
        'npr.org', 'pbs.org', 'usatoday.', 'bloomberg.', 'forbes.', 'politico.', 'axios.'
    ]
    if any(outlet in url for outlet in mainstream_news_domains):
        return 'mainstream'
    
    # Wikipedia and similar reference sites
    if 'wikipedia.org' in url or 'britannica.com' in url or 'snopes.com' in url or 'factcheck.org' in url:
        return 'neutral'
    
    # Keywords suggesting alternative perspectives (expanded)
    alternative_keywords = [
        'conspiracy', 'truth', 'alternative', 'freedom', 'patriot', 'liberty',
        'exposed', 'reveal', 'scandal', 'coverup', 'natural news', 'infowars',
        'shocking', 'they don\'t want you to know', 'banned', 'censored',
        'holistic approach', 'natural immunity', 'medical freedom', 'health freedom',
        'suppressed science', 'the real story', 'unreported', 'controversial study',
        'uncensored', 'deep state', 'globalist', 'great reset', 'agenda 21', 'agenda 2030',
        'plandemic', 'scamdemic', 'big pharma', 'big tech', 'hidden', 'secret', 'they lied'
    ]
    if any(term in url or term in title for term in alternative_keywords):
        return 'alternative'
    
    # Scientific and academic journals (often mainstream or neutral depending on interpretation context)
    academic_journal_domains = [
        'nature.com', 'science.org', 'nejm.org', 'bmj.com', 'thelancet.com',
        'cell.com', 'pubmed', 'sciencedirect', 'springer', 'wiley', 'oxfordjournals.org',
        'jamanetwork.com', 'arxiv.org', 'plos.org', 'frontiersin.org'
    ]
    if any(term in url for term in academic_journal_domains):
        # Could be neutral if it's just the paper, or mainstream if it's an editorial supporting consensus
        # For simplicity in rule-based, let's lean neutral/mainstream if not caught by alternative keywords
        if not any(alt_kw in title for alt_kw in ['controversial', 'disputed', 'alternative view']):
             return 'mainstream' # Or 'neutral' - this is debatable for a simple rule
    
    # Check for keywords in title that suggest alternative viewpoint (expanded)
    alternative_title_phrases = [
        'what they aren\'t telling you', 'the truth about', 'what doctors won\'t say',
        'doctors are silent', 'big-pharma agenda', 'media won\'t show you',
        'the untold story of', 'hidden agenda', 'the great awakening', 'red pill'
    ]
    if any(phrase in title for phrase in alternative_title_phrases):
        return 'alternative'
    
    # Additional patterns for mainstream content
    if re.search(r'official|report|study|research|analysis|guidelines|statement from|university study|government report', title, re.I) and not any(alt_kw in title for alt_kw in alternative_keywords + alternative_title_phrases):
        return 'mainstream'
    
    # Default to neutral if no clear signals
    return 'neutral'


def return_oauth_error(error_message):
    """Helper function to return OAuth error"""
    frontend_url = session.get('auth_redirect_url', 'http://localhost:5173')
    return f"""
    <!DOCTYPE html>
    <html>
    <head><title>Authentication Error</title></head>
    <body>
        <script>
            window.opener.postMessage({{
                type: 'GOOGLE_AUTH_ERROR',
                message: '{error_message}'
            }}, '{frontend_url}');
            window.close();
        </script>
        <p>Authentication error: {error_message}</p>
    </body>
    </html>
    """


@app.route('/auth/google')
def google_auth():
    """Initiate Google OAuth flow"""
    frontend_url = request.args.get('redirect_url', 'http://localhost:5173')
    session['auth_redirect_url'] = frontend_url
    
    # Use absolute URL with http://localhost:5001 explicitly
    redirect_uri = "http://localhost:5001/auth/google/callback"
    print(f"Google OAuth: Redirecting to Google with callback URL: {redirect_uri}")
    
    return oauth.google.authorize_redirect(redirect_uri)

@app.route('/auth/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    print(f"Google callback received")
    print(f"Request URL: {request.url}")
    print(f"Request args: {request.args}")
    
    try:
        token = oauth.google.authorize_access_token()
        print(f"Token received: {bool(token)}")
        
        user_info = token.get('userinfo')
        print(f"User info: {user_info}")
        
        if not user_info:
            return return_oauth_error("No user information received")
        
        # Find or create user
        user = User.query.filter_by(google_id=user_info['sub']).first()
        
        if not user:
            user = User.query.filter_by(email=user_info['email']).first()
            if user:
                user.google_id = user_info['sub']
                user.profile_pic_url = user_info.get('picture', '')
            else:
                user = User(
                    google_id=user_info['sub'],
                    email=user_info['email'],
                    name=user_info.get('name', ''),
                    profile_pic_url=user_info.get('picture', ''),
                    created_at=datetime.now(timezone.utc)
                )
                db.session.add(user)
        
        user.last_login_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Create JWT token
        auth_token = create_access_token(
            identity=user.id,
            additional_claims={
                'email': user.email,
                'name': user.name
            }
        )
        
        frontend_url = session.get('auth_redirect_url', 'http://localhost:5173')
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Successful</title></head>
        <body>
            <script>
                window.opener.postMessage({{
                    type: 'GOOGLE_AUTH_SUCCESS',
                    payload: {{
                        token: '{auth_token}',
                        userId: '{user.id}',
                        email: '{user.email}',
                        name: '{user.name}',
                        profilePic: '{user.profile_pic_url or ""}'
                    }}
                }}, '{frontend_url}');
                setTimeout(() => {{ window.close(); }}, 1000);
            </script>
            <h3>Authentication Successful!</h3>
            <p>This window will close automatically...</p>
        </body>
        </html>
        """
    except Exception as e:
        print(f"OAuth callback error: {e}")
        return return_oauth_error(f"Authentication failed: {str(e)}")


if __name__ == '__main__':
    # Make sure database tables are created before running the app
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully!")
        except Exception as e:
            print(f"Error creating database tables: {e}")
    
    # Run the Flask server on port 5001 to match frontend expectations
    print("Starting Flask server on http://127.0.0.1:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)