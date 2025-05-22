import os
import json
import ast
from datetime import datetime, timedelta, timezone # Added timezone for UTC
from flask import Flask, request, jsonify
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

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f".env file loaded successfully from {dotenv_path}")
else:
    print(f"Warning: .env file not found at {dotenv_path}. API keys might not be loaded.")

app = Flask(__name__)
CORS(app)

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

# --- BEGIN AUTHENTICATION ROUTES ---

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Basic email validation (you might want a more robust one)
    if '@' not in email or '.' not in email.split('@')[-1]:
        return jsonify({"error": "Invalid email format"}), 400
    
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 409 # 409 Conflict

    try:
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            email=email, 
            password_hash=hashed_password,
            # Other fields like name, given_name can be added here if provided during registration
            # For now, we'll stick to email and password for simplicity
            # google_id will be null for email/password registration
        )
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({"message": "Registration successful. Please log in."}), 201

    except Exception as e:
        db.session.rollback() # Rollback in case of error
        print(f"Error during registration: {e}") # Log the error
        return jsonify({"error": "An error occurred during registration. Please try again."}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.password_hash and bcrypt.check_password_hash(user.password_hash, password):
        # User exists and password matches for an email/password user
        access_token = create_access_token(identity=user.id) # Create JWT token with user.id as identity
        return jsonify(access_token=access_token, user_id=user.id, email=user.email), 200
    elif user and not user.password_hash and user.google_id:
        # User exists but seems to be a Google OAuth user without a local password
        return jsonify({"error": "Please log in with Google. This account was registered via Google."}), 401
    else:
        # Invalid credentials (user not found or password mismatch)
        return jsonify({"error": "Invalid email or password"}), 401

# --- END AUTHENTICATION ROUTES ---

def search_endpoint():
    data = request.json; o_query = data.get('query'); s_engines = data.get('engines',['google','bing','duckduckgo']); user_serp_key = data.get('user_serpapi_key')
    active_serp_key = user_serp_key or SERVER_SERPAPI_KEY
    if not active_serp_key: return jsonify({"error":"Search API key not configured or provided."}),500
    if not o_query: return jsonify({"error":"Query required"}),400
    if not s_engines: return jsonify({"error":"No engines selected."}),400
    print(f"Search: '{o_query}' on {s_engines}. User SERP key: {'Provided' if user_serp_key else 'Not Provided (using server key if available)'}")
    queries={"mainstream_fetch":f"{o_query}","fringe_fetch":f"{o_query} (forum OR discussion OR \"alternative opinion\" OR blog) -site:wikipedia.org -site:*.gov -site:*.mil -site:who.int -site:nih.gov"}
    all_res=[];p_ai_provider=data.get('ai_provider','openai');p_user_ai_key=data.get('user_api_key',None)
    for p_type,s_query in queries.items():
        for engine in s_engines:
            e_res=fetch_results_via_serpapi(s_query,engine,active_serp_key,num_results=10)
            for item in e_res: item['perspective_query_type']=p_type;all_res.append(item)
    temp_map={};_=[(temp_map.update({i['link']:i})if i['link']not in temp_map or(temp_map[i['link']]['perspective_query_type']=='fringe_fetch'and i['perspective_query_type']=='mainstream_fetch')else None)for i in all_res]
    unique_list=list(temp_map.values());print(f"Fetched: {len(all_res)}, Unique: {len(unique_list)}")
    output_res=[]
    for r in unique_list:
        r['source_type_label']=classify_source_type(r['link'],r.get('source_engine'))
        txt_analyze=f"{r.get('title','')} {r.get('snippet','')}"
        sentiment,bias=get_sentiment_and_bias(txt_analyze, p_ai_provider, p_user_ai_key)
        r['sentiment']=sentiment;r['bias']=bias;r['base_trust']=50;r['recency_boost']=0;r['factcheckVerdict']='pending'
        r['intrinsic_credibility_score']=None;r['intrinsic_credibility_factors']=None;output_res.append(r)
    print(f"Returning {len(output_res)} processed results.");return jsonify(output_res)

@app.route('/summarize', methods=['POST'])
def summarize_endpoint():
    data = request.json; provider = data.get('ai_provider','openai'); key = data.get('user_api_key'); text_fb = data.get('text'); url = data.get('url')
    if not url and not text_fb: return jsonify({"error":"URL or text required"}),400
    determined_key = key or (SERVER_OPENAI_API_KEY if provider == 'openai' else None)
    if provider=='openai'and not determined_key: return jsonify({"error":"OpenAI key (user or server) unavailable."}),503
    if provider=='gemini'and not key: return jsonify({"error":"Gemini API key not provided."}),503
    content=text_fb or "";src="snippet/title"
    if url: ext=fetch_text_from_url(url)
    if url and ext: content=ext;src="fetched URL content"
    elif url and not ext and text_fb:print(f"Summarize: Failed URL fetch {url}, using fallback.");
    elif url and not ext and not text_fb:print(f"Summarize: Failed URL fetch {url}, no fallback.");
    if not content.strip(): return jsonify({"error":"No content to summarize."}),400
    print(f"Summarize ({provider}): Content from {src} (len: {len(content)})")
    try:
        c_send=content[:8000];summary_text="Error processing summary."
        if provider=='openai':
            client_to_use=OpenAI(api_key=determined_key)
            resp=client_to_use.chat.completions.create(model="gpt-3.5-turbo",messages=[{"role":"system","content":"Summarize (3-5 sentences)."},{"role":"user","content":f"Summarize:\n\n{c_send}"}],max_tokens=250,temperature=.3)
            summary_text=resp.choices[0].message.content.strip()
        elif provider=='gemini':
            genai.configure(api_key=key);model=genai.GenerativeModel('gemini-1.5-flash-latest')
            resp=model.generate_content(f"Summarize this text concisely (3-5 sentences):\n\n{c_send}");summary_text=resp.text.strip()
        return jsonify({"summary":summary_text,"summarized_from":src})
    except Exception as e:print(f"Error {provider} summarization: {type(e).__name__}-{e}");return jsonify({"error":f"Summarize failed ({provider}):{type(e).__name__}"}),500

@app.route('/fact-check', methods=['POST'])
def fact_check_endpoint():
    data = request.json; provider = data.get('ai_provider','openai'); key = data.get('user_api_key'); claim_fb = data.get('claim'); url = data.get('url')
    if not url and not claim_fb: return jsonify({"error":"URL or claim required"}),400
    determined_key = key or (SERVER_OPENAI_API_KEY if provider == 'openai' else None)
    if provider=='openai'and not determined_key: return jsonify({"claim":claim_fb or "N/A","verdict":"service_unavailable","explanation":"OpenAI key unavailable.","source":"System"}),503
    if provider=='gemini'and not key: return jsonify({"claim":claim_fb or "N/A","verdict":"service_unavailable","explanation":"Gemini key not provided.","source":"System"}),503
    context=claim_fb or "";src_ctx="snippet/title";p_claim=claim_fb or ""
    if url: ext=fetch_text_from_url(url)
    if url and ext: context=ext;src_ctx="fetched URL content"
    elif url and not ext and claim_fb:print(f"Fact-check: Failed URL fetch {url}, using fallback.");
    elif url and not ext and not claim_fb:print(f"Fact-check: Failed URL fetch {url}, no fallback.");
    if not p_claim.strip()and context.strip():p_claim=context[:300]
    if not p_claim.strip()and not context.strip():return jsonify({"error":"No claim/context."}),400
    if not p_claim.strip():p_claim="Evaluate general credibility of provided context."
    print(f"Fact-check ({provider}): Claim '{p_claim[:100]}...' context from {src_ctx} (len: {len(context)})")
    try:
        ctx_send=context[:8000];claim_send=p_claim[:1000];verdict,explanation="error_processing",f"Could not process fact-check with {provider}."
        sys_prompt=("Analyze claim... Respond ONLY with valid JSON: {\"verdict\":\"string\", \"explanation\":\"string\"}.")
        user_prompt=f"Claim: \"{claim_send}\"\n\nContext: \"{ctx_send}\"";fc_str=""
        if provider=='openai':
            client_to_use=OpenAI(api_key=determined_key)
            resp=client_to_use.chat.completions.create(model="gpt-3.5-turbo",messages=[{"role":"system","content":sys_prompt},{"role":"user","content":user_prompt}],max_tokens=350,temperature=.2)
            fc_str=resp.choices[0].message.content.strip()
        elif provider=='gemini':
            genai.configure(api_key=key);model=genai.GenerativeModel('gemini-1.5-flash-latest')
            try:
                generation_config = genai.types.GenerationConfig(response_mime_type="application/json")
                gemini_response = model.generate_content([sys_prompt, user_prompt],generation_config=generation_config)
                fc_str = gemini_response.text
                print(f"Gemini raw JSON mode response: '{fc_str}'")
            except Exception as e_json_mode:
                print(f"Gemini JSON mode failed ({e_json_mode}), trying plain text generation and manual parsing.")
                text_user_prompt_for_gemini = (f"Analyze claim...Format as JSON...Claim: \"{claim_send}\"\n\nContext: \"{ctx_send}\"")
                gemini_response = model.generate_content(text_user_prompt_for_gemini);fc_str=gemini_response.text.strip()
                if fc_str.startswith("```json"):fc_str=fc_str[7:];fc_str=fc_str.endswith("```")and fc_str[:-3]or fc_str
        else:raise ValueError(f"Unsupported AI provider: {provider}")
        print(f"Attempting to parse AI response ({provider}): '{fc_str}'")
        try:
            fc_data=json.loads(fc_str);verdict=fc_data.get("verdict","needs_context").lower().replace(" ","_");expl=fc_data.get("explanation","AI provided no detail.")
        except json.JSONDecodeError:
            print(f"Fact-check ({provider}): Not direct JSON. Trying ast.literal_eval. Raw: '{fc_str}'")
            try:
                pseudo_json=ast.literal_eval(fc_str);_ = isinstance(pseudo_json,dict)or ValueError("ast.literal_eval not dict.")
                verdict=pseudo_json.get("verdict","needs_context_ast").lower().replace(" ","_");expl=pseudo_json.get("explanation",f"AI explanation (from dict-like by {provider}): {fc_str}")
                print(f"Fact-check ({provider}): Successfully parsed with ast.literal_eval. Verdict: {verdict}")
            except Exception as e_ast:print(f"Fact-check ({provider}): ast.literal_eval failed: {e_ast}. Keyword fallback.");expl=f"AI response format error ({provider}). Raw: {fc_str}";verdict="verified"if"verified"in fc_str.lower()else"disputed_false"if"disputed"in fc_str.lower()or"false"in fc_str.lower()else"lacks_consensus"if"lacks consensus"in fc_str.lower()else"needs_context_fallback"
        return jsonify({"claim":claim_send,"verdict":verdict,"explanation":expl,"source":f"AI Analysis ({provider.capitalize()}, Context: {src_ctx})"})
    except Exception as e:print(f"Error {provider} fact-checking: {type(e).__name__}-{e}");return jsonify({"error":f"Fact-check failed ({provider}):{type(e).__name__}","claim":p_claim}),500

@app.route('/score', methods=['POST'])
def score_endpoint():
    data=request.get_json();_ = not data and (jsonify({"error":"Invalid JSON"}),400);s_type=data.get('source_type','unknown').lower();b_trust=float(data.get('base_trust',50));r_boost=float(data.get('recency_boost',0));fc_v=data.get('factcheckVerdict','pending').lower();BTS_MAX=60;RMS_MAX=15;FCS_MAX=20;ITA_MAX=10;bts=min(max(b_trust/100*BTS_MAX,0),BTS_MAX);rs=min(max(r_boost/100*RMS_MAX,0),RMS_MAX);fcs_map={"verified":FCS_MAX,"neutral":0,"disputed":-FCS_MAX,"disputed_false":-FCS_MAX,"pending":-2,"lacks_consensus":-int(FCS_MAX*.4),"needs_context":0,"needs_context_format_error":0,"needs_context_ast_eval":0,"needs_context_fallback":0,"service_unavailable":0,"unverifiable":-int(FCS_MAX*.6),"error_parsing":-5,"neutral_unavailable":0,"neutral_parsing_error":0,"neutral_error":0,"error":-5};fcs=fcs_map.get(fc_v,0);itq_map={"government":.8,"academic_institution":.9,"research_publication":.9,"encyclopedia":.7,"news_media_mainstream":.6,"news_opinion_blog_live":.3,"ngo_nonprofit_publication":.5,"ngo_nonprofit_organization":.4,"ngo_nonprofit_general":.2,"corporate_blog_pr_info":.1,"news_media_other_or_blog":-.3,"social_media_platform":-.8,"social_media_platform_video":-.7,"social_media_channel_creator":-.5,"social_blogging_platform_user_pub":-.4,"social_blogging_platform":-.6,"website_general":0.,"unknown_url":-.9,"unknown_other":-.9,"unknown_error_parsing":-1.,"mainstream":.6,"alternative":-.4,"unknown":-.7};tqv=itq_map.get(s_type,0.);ita=tqv*ITA_MAX;tis=bts+rs+fcs+ita;fs=int(round(min(max(tis,0),100)));return jsonify({"intrinsic_credibility_score":fs,"factors":{"base_trust_contribution":round(bts,2),"recency_contribution":round(rs,2),"fact_check_contribution":round(fcs,2),"type_quality_adjustment":round(ita,2)}})

if __name__ == '__main__':
    port = int(os.getenv("FLASK_PORT", 5001))
    print(f"Flask app attempting to start on port {port}...")
    app.run(debug=True, port=port)