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
