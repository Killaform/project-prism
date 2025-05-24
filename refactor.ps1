# Project Prism Refactoring Script

# Create directory structure
$dirs = @(
    "perspective_engine",
    "perspective_engine/api",
    "perspective_engine/services",
    "perspective_engine/models",
    "perspective_engine/config",
    "perspective_engine/utils"
)

foreach ($dir in $dirs) {
    New-Item -Path $dir -ItemType Directory -Force
    Write-Host "Created directory: $dir"
}

# Create __init__.py files
foreach ($dir in $dirs) {
    $initPath = "$dir/__init__.py"
    if (-not (Test-Path $initPath)) {
        New-Item -Path $initPath -ItemType File -Force
        Write-Host "Created: $initPath"
    }
}

# Extract constants to config file
$constantsContent = @'
# Domain lists for classification
KNOWN_SOCIAL_MEDIA_PLATFORMS = [
    "x.com", "twitter.com", "instagram.com", "tiktok.com", "youtube.com", 
    "youtu.be", "facebook.com", "reddit.com", "linkedin.com", "pinterest.com", 
    "tumblr.com", "medium.com", "quora.com", "threads.net"
]

KNOWN_MAINSTREAM_NEWS_DOMAINS = [
    "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "apnews.com", 
    "washingtonpost.com", "wsj.com", "theguardian.com", "npr.org", 
    "abcnews.go.com", "cbsnews.com", "nbcnews.com", "foxnews.com", 
    "usatoday.com", "bloomberg.com", "forbes.com", "news.google.com", 
    "cnbc.com", "politico.com", "axios.com", "theatlantic.com", 
    "newyorker.com", "time.com", "latimes.com", "chicagotribune.com", "chron.com"
]

KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES = [
    "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "nature.com", "sciencemag.org", 
    "jamanetwork.com", "thelancet.com", "ieee.org", "acm.org", "springer.com", 
    "elsevier.com", "wiley.com", "sagepub.com", "jstor.org", "plos.org", 
    "frontiersin.org", "bmj.com", "cell.com"
]

# Classification keywords
ALTERNATIVE_KEYWORDS = [
    "conspiracy", "truth", "alternative", "freedom", "patriot", "liberty",
    "exposed", "reveal", "scandal", "coverup", "natural news", "infowars",
    "shocking", "they don't want you to know", "banned", "censored",
    "holistic approach", "natural immunity", "medical freedom", "health freedom",
    "suppressed science", "the real story", "unreported", "controversial study",
    "uncensored", "deep state", "globalist", "great reset", "agenda 21", "agenda 2030",
    "plandemic", "scamdemic", "big pharma", "big tech", "hidden", "secret", "they lied"
]

# API configuration
DEFAULT_PORT = 5001
DEFAULT_HOST = "0.0.0.0"
'@

Set-Content -Path "perspective_engine/config/constants.py" -Value $constantsContent
Write-Host "Created constants file"

# Create content fetching service
$contentFetchContent = @'
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def fetch_text_from_url(url):
    """Extract main text content from a URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', '').lower()
        if not ('html' in content_type or 'xml' in content_type or 'text/plain' in content_type):
            print(f"Skipping URL {url}, content type: {content_type}")
            return None
            
        response.encoding = response.apparent_encoding if response.apparent_encoding else 'utf-8'
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Remove non-content elements
        for el_name in ["script", "style", "header", "footer", "nav", "aside", "form", 
                        "button", "iframe", "noscript", "figure", "figcaption", "img", 
                        "svg", "link", "meta"]:
            for el in soup.find_all(el_name):
                el.decompose()
        
        # Try to find main content
        main_selectors = ['article', 'main', '[role="main"]', '.main-content', '.article-body',
                         '#content', '#main', '.post-content', '.entry-content', '.story-body', 
                         '.articletext']
        
        content_element = None
        for selector in main_selectors:
            content_element = soup.select_one(selector)
            if content_element:
                break
                
        if not content_element:
            content_element = soup.body
            
        if content_element:
            text_chunks = []
            for element in content_element.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                                                    'li', 'td', 'pre', 'blockquote'], recursive=True):
                chunk = element.get_text(separator=' ', strip=True)
                if chunk and len(chunk.split()) > 3:
                    text_chunks.append(chunk)
                    
            if not text_chunks and content_element:
                text = content_element.get_text(separator='\n', strip=True)
            else:
                text = "\n".join(text_chunks)
                
            text = '\n'.join([line.strip() for line in text.splitlines() 
                             if line.strip() and len(line.strip().split()) > 2])
            
            print(f"Extracted ~{len(text)} chars from {url}")
            return text if len(text) > 150 else None
            
        return None
        
    except requests.exceptions.Timeout:
        print(f"Timeout URL {url}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request error URL {url}: {e}")
        return None
    except Exception as e:
        print(f"Parsing error URL {url}: {type(e).__name__} - {e}")
        return None
'@

Set-Content -Path "perspective_engine/services/content_fetch.py" -Value $contentFetchContent
Write-Host "Created content fetching service"

# Create classification service
$classificationContent = @'
import re
from urllib.parse import urlparse
from perspective_engine.config.constants import (
    KNOWN_SOCIAL_MEDIA_PLATFORMS, KNOWN_MAINSTREAM_NEWS_DOMAINS,
    KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES, ALTERNATIVE_KEYWORDS
)

def classify_source_type(result_url, source_engine_name=None):
    """Classify a URL by source type"""
    if not result_url:
        return "unknown_url"
        
    try:
        parsed_url = urlparse(result_url)
        netloc = parsed_url.netloc.lower()
        path = parsed_url.path.lower()
        
        if netloc.startswith("www."):
            netloc = netloc[4:]
            
        # Government or educational
        if netloc.endswith((".gov", ".mil")) or ".gov." in netloc or ".mil." in netloc:
            return "government"
        if netloc.endswith(".edu"):
            return "academic_institution"
            
        # Encyclopedia
        if "wikipedia.org" in netloc:
            return "encyclopedia"
            
        # Social media
        for domain in KNOWN_SOCIAL_MEDIA_PLATFORMS:
            if domain == netloc or netloc.endswith("." + domain) or domain in netloc:
                if (domain == "youtube.com" or "youtube.com" in netloc or "youtu.be" in netloc) and \
                   ("/channel/" in path or "/c/" in path or "/user/" in path or path.startswith("/@")):
                    return "social_media_channel_creator"
                if "youtube.com" in netloc or "youtu.be" in netloc:
                    return "social_media_platform_video"
                if "medium.com" in netloc:
                    p_parts = [p for p in path.split('/') if p]
                    return "social_blogging_platform_user_pub" if p_parts and \
                           (p_parts[0].startswith('@') or (not '.' in p_parts[0] and \
                           p_parts[0] not in ['search', 'tag', 'topic', 'collections', 'about', 
                                             'jobs', 'policy', 'help', 'settings', 'explore', 
                                             'me', 'new-story'])) else "social_blogging_platform"
                return "social_media_platform"
                
        # Academic publishers
        for domain in KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES:
            if domain in netloc:
                return "research_publication"
                
        # News media
        for domain in KNOWN_MAINSTREAM_NEWS_DOMAINS:
            if domain == netloc or netloc.endswith("." + domain):
                return "news_opinion_blog_live" if any(p in path for p in ["/blog", "/opinion", 
                       "/contributor", "/live/"]) else "news_media_mainstream"
                
        # Non-profits and NGOs
        if netloc.endswith(".org"):
            if any(p in path for p in ["/blog", "/news", "/press", "/report", "/briefing", 
                                      "/article", "/story"]):
                return "ngo_nonprofit_publication"
            if any(p in netloc for p in ["foundation", "institute", "society", "association", 
                                        "charity", "trust", "fund", "council", "union"]):
                return "ngo_nonprofit_organization"
            return "ngo_nonprofit_general"
            
        # Corporate blogs
        if any(p in path for p in ["/blog", "/press-release", "/newsroom", "/insights", "/pr/", 
                                  "/investors", "/company/about", "/about-us", "/corporate"]):
            if not any(n_dom in netloc for n_dom in KNOWN_MAINSTREAM_NEWS_DOMAINS):
                return "corporate_blog_pr_info"
                
        # Other news or blogs
        if any(p in path for p in ["/news/", "/article/", "/story/", "/post/", "/views/"]) and \
           any(tld in netloc for tld in [".com", ".net", ".info", ".co", ".online", ".io", 
                                        ".news", ".press", ".report", ".blog"]):
            return "news_media_other_or_blog"
            
        # General websites
        if any(tld in netloc for tld in [".com", ".net", ".biz", ".info", ".org", ".co", ".io", 
                                        ".app", ".site", ".online", ".me", ".tv", ".news", 
                                        ".blog", ".press", ".report"]):
            return "website_general"
            
        return "unknown_other"
        
    except Exception as e:
        print(f"Error classifying URL '{result_url}': {type(e).__name__} - {e}")
        return "unknown_error_parsing"

def infer_perspective_from_url_and_title(url, title):
    """Simple rule-based classifier for perspective"""
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
    
    # Reference sites
    if 'wikipedia.org' in url or 'britannica.com' in url or 'snopes.com' in url or 'factcheck.org' in url:
        return 'neutral'
    
    # Alternative keywords
    alternative_keywords = ALTERNATIVE_KEYWORDS
    if any(term in url or term in title for term in alternative_keywords):
        return 'alternative'
    
    # Academic journals
    academic_journal_domains = [
        'nature.com', 'science.org', 'nejm.org', 'bmj.com', 'thelancet.com',
        'cell.com', 'pubmed', 'sciencedirect', 'springer', 'wiley', 'oxfordjournals.org',
        'jamanetwork.com', 'arxiv.org', 'plos.org', 'frontiersin.org'
    ]
    if any(term in url for term in academic_journal_domains):
        if not any(alt_kw in title for alt_kw in ['controversial', 'disputed', 'alternative view']):
             return 'mainstream'
    
    # Alternative title phrases
    alternative_title_phrases = [
        'what they aren\'t telling you', 'the truth about', 'what doctors won\'t say',
        'doctors are silent', 'big-pharma agenda', 'media won\'t show you',
        'the untold story of', 'hidden agenda', 'the great awakening', 'red pill'
    ]
    if any(phrase in title for phrase in alternative_title_phrases):
        return 'alternative'
    
    # Mainstream patterns
    if re.search(r'official|report|study|research|analysis|guidelines|statement from|university study|government report', 
                title, re.I) and not any(alt_kw in title for alt_kw in alternative_keywords + alternative_title_phrases):
        return 'mainstream'
    
    # Default
    return 'neutral'
'@

Set-Content -Path "perspective_engine/services/classification.py" -Value $classificationContent
Write-Host "Created classification service"

# Create main app file
$appContent = @'
from flask import Flask
from perspective_engine.api import setup_api
from perspective_engine.config.constants import DEFAULT_PORT, DEFAULT_HOST
import os

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object('perspective_engine.config.settings.Config')
    
    # Initialize extensions
    from perspective_engine.extensions import db, migrate, jwt, oauth
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Configure CORS
    from flask_cors import CORS
    CORS(app, 
         origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
         supports_credentials=True,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'])
    
    # Initialize OAuth
    oauth.init_app(app)
    
    # Register API routes
    setup_api(app)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', DEFAULT_PORT))
    app.run(host=DEFAULT_HOST, port=port, debug=True)
'@

Set-Content -Path "perspective_engine/app.py" -Value $appContent
Write-Host "Created main app file"

# Create extensions file
$extensionsContent = @'
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from authlib.integrations.flask_client import OAuth

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
oauth = OAuth()
'@

Set-Content -Path "perspective_engine/extensions.py" -Value $extensionsContent
Write-Host "Created extensions file"

# Create settings file
$settingsContent = @'
import os
from datetime import timedelta

class Config:
    """Base configuration settings."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'fallback-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # SERP API Key
    SERPAPI_KEY = os.environ.get('SERPAPI_KEY')
    
    # AI API Keys
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    # Frontend URL for OAuth redirects
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('SECRET_KEY') or 'jwt-secret-string'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
'@

Set-Content -Path "perspective_engine/config/settings.py" -Value $settingsContent
Write-Host "Created settings file"

# Create API setup file
$apiSetupContent = @'
from flask_restful import Api

def setup_api(app):
    """Set up the REST API with all resources"""
    api = Api(app)
    
    # Import and register resources
    from perspective_engine.api.search import SearchResource
    from perspective_engine.api.auth import GoogleAuthResource, GoogleCallbackResource
    from perspective_engine.api.classify import ClassifyResource
    from perspective_engine.api.summarize import SummarizeResource
    from perspective_engine.api.fact_check import FactCheckResource
    
    # Register resources
    api.add_resource(SearchResource, '/search')
    api.add_resource(ClassifyResource, '/classify-perspectives')
    api.add_resource(SummarizeResource, '/summarize')
    api.add_resource(FactCheckResource, '/fact-check')
    api.add_resource(GoogleAuthResource, '/auth/google')
    api.add_resource(GoogleCallbackResource, '/auth/google/callback')
    
    # Add non-resource routes
    from perspective_engine.api.auth import register_auth_routes
    register_auth_routes(app)
    
    return api
'@

Set-Content -Path "perspective_engine/api/__init__.py" -Value $apiSetupContent
Write-Host "Created API setup file"

# Create run script
$runScriptContent = @'
from perspective_engine.app import create_app

if __name__ == '__main__':
    app = create_app()
    print("Starting Perspective Engine API server...")
    app.run(host='0.0.0.0', port=5001, debug=True)
'@

Set-Content -Path "run.py" -Value $runScriptContent
Write-Host "Created run script"

Write-Host "Refactoring complete! The project has been restructured for better maintainability."
Write-Host "To run the refactored application, use: python run.py"