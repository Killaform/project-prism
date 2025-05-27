from flask_restful import Resource
from flask import request, jsonify
import os

class SearchResource(Resource):
    def post(self):
        """Handle search requests"""
        data = request.get_json()
        if not data:
            return {"error": "Invalid JSON"}, 400
        
        query = data.get('query')
        if not query:
            return {"error": "Search query is required"}, 400
            
        engines = data.get('engines', ['google'])
        perspective = data.get('perspective', 'balanced')
        
        try:
            # Use hardcoded API key
            api_key = os.getenv("SERPAPI_KEY")
            
            # Perform real search
            print(f"Search API: Using real search for query '{query}'")
            results = []
            
            for engine in engines:
                engine_results = fetch_results_via_serpapi(query, engine, api_key)
                if engine_results:
                    results.extend(engine_results)
            
            # If no results, fall back to mock results
            if not results:
                print("No results from SerpAPI, using mock results")
                results = get_mock_results(query)
            
            # Process results with enhanced classification
            for result in results:
                # Get URL and title for analysis
                url = result.get('link', '').lower()
                title = result.get('title', '').lower()
                snippet = result.get('snippet', '').lower()
                
                # Initialize credibility factors
                source_reputation = 0
                evidence_quality = 0
                bias_level = 0
                transparency = 0
                
                # ===== SOURCE REPUTATION ANALYSIS =====
                # Government and educational institutions (highest credibility)
                if any(domain in url for domain in ['.gov', '.mil', '.edu', 'who.int', 'un.org', 'europa.eu', 'nih.gov', 'cdc.gov']):
                    source_reputation = 9
                    result['source_type_label'] = 'government'
                
                # Major news organizations with established fact-checking
                elif any(domain in url for domain in ['reuters.com', 'apnews.com', 'bloomberg.com', 'economist.com']):
                    source_reputation = 8
                    result['source_type_label'] = 'news_media_mainstream'
                
                # Established mainstream news sources
                elif any(domain in url for domain in ['nytimes.com', 'washingtonpost.com', 'wsj.com', 'bbc.', 
                                                    'cnn.com', 'nbcnews.com', 'abcnews.go.com', 'cbsnews.com',
                                                    'nypost.com', 'latimes.com', 'chicagotribune.com', 'bostonglobe.com',
                                                    'usatoday.com', 'sfchronicle.com', 'dallasnews.com']):
                    source_reputation = 7
                    result['source_type_label'] = 'news_media_mainstream'
                
                # Other mainstream news sources
                elif any(domain in url for domain in ['foxnews.com', 'msnbc.com', 'newsweek.com', 'time.com', 
                                                    'theatlantic.com', 'politico.com', 'axios.com', 'vox.com',
                                                    'huffpost.com', 'businessinsider.com', 'forbes.com']):
                    source_reputation = 6
                    result['source_type_label'] = 'news_media_mainstream'
                
                # Academic publishers and encyclopedias
                elif any(domain in url for domain in ['nature.com', 'science.org', 'jstor.org', 'springer', 
                                                    'wikipedia.org', 'britannica.com', 'scholarpedia.org']):
                    source_reputation = 8
                    result['source_type_label'] = 'encyclopedia'
                
                # Established blogs and opinion sites
                elif any(domain in url for domain in ['medium.com', 'substack.com', 'wordpress.com', 'blogspot.com']):
                    source_reputation = 4
                    result['source_type_label'] = 'news_media_other_or_blog'
                
                # Social media platforms
                elif any(domain in url for domain in ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 
                                                    'reddit.com', 'youtube.com', 'linkedin.com']):
                    source_reputation = 3
                    result['source_type_label'] = 'social_media_platform'
                
                # Alternative news sources
                elif any(domain in url for domain in ['breitbart.com', 'infowars.com', 'dailycaller.com', 'thegatewaypundit.com',
                                                    'motherjones.com', 'democracynow.org', 'counterpunch.org',
                                                    'zerohedge.com', 'dailywire.com', 'theblaze.com', 'alternet.org']):
                    source_reputation = 4
                    result['source_type_label'] = 'news_media_other_or_blog'
                
                # Default for other websites
                else:
                    source_reputation = 5
                    result['source_type_label'] = 'website_general'
                
                # ===== EVIDENCE QUALITY ASSESSMENT =====
                # Look for indicators of evidence in snippet
                evidence_indicators = ['according to', 'study', 'research', 'evidence', 'data', 'survey', 'report', 
                                    'analysis', 'found that', 'statistics', 'experts say', 'published in']
                evidence_count = sum(1 for indicator in evidence_indicators if indicator in snippet)
                evidence_quality = min(8, evidence_count * 2 + 2)  # Base of 2, max of 8
                
                # ===== BIAS ASSESSMENT =====
                # Check for emotional or biased language
                bias_indicators = ['shocking', 'outrageous', 'scandal', 'hoax', 'conspiracy', 'truth', 'exposed', 
                                'they don\'t want you to know', 'mainstream media won\'t tell you', 'wake up']
                bias_count = sum(1 for indicator in bias_indicators if indicator in title.lower() or indicator in snippet.lower())
                bias_level = max(0, 10 - bias_count * 2)  # Higher score means less bias
                
                # ===== TRANSPARENCY ASSESSMENT =====
                # Higher for sources that typically provide clear authorship
                if result['source_type_label'] in ['government', 'news_media_mainstream', 'encyclopedia']:
                    transparency = 8
                elif result['source_type_label'] in ['news_media_other_or_blog']:
                    transparency = 5
                else:
                    transparency = 4
                
                # ===== CALCULATE OVERALL CREDIBILITY SCORE =====
                # Weighted average of factors (out of 100)
                credibility_score = int((
                    (source_reputation * 4) +  # 40% weight
                    (evidence_quality * 3) +   # 30% weight
                    (bias_level * 2) +         # 20% weight
                    (transparency * 1)         # 10% weight
                ) * 10 / 10)  # Convert to 0-100 scale
                
                result['intrinsic_credibility_score'] = credibility_score
                
                # Assign credibility level
                if credibility_score >= 75:
                    result['source_credibility'] = 'high'
                elif credibility_score >= 50:
                    result['source_credibility'] = 'medium'
                elif credibility_score >= 25:
                    result['source_credibility'] = 'low'
                else:
                    result['source_credibility'] = 'unknown'
                
                # ===== PERSPECTIVE CLASSIFICATION =====
                # IMPORTANT: Set perspective based on source type FIRST
                if result['source_type_label'] == 'news_media_mainstream':
                    # All mainstream news sources are classified as mainstream perspective
                    result['perspective'] = 'mainstream'
                
                # Neutral: Factual, balanced, minimal bias (primarily encyclopedias and academic sources)
                elif result['source_type_label'] in ['encyclopedia'] or (
                    result['source_type_label'] == 'government' and 
                    any(edu in url for edu in ['.edu', 'university', 'college', 'academic'])):
                    result['perspective'] = 'neutral'
                
                # Government sources generally reflect mainstream perspective
                elif result['source_type_label'] == 'government':
                    result['perspective'] = 'mainstream'
                
                # Alternative: Divergent viewpoints, challenges consensus
                elif (result['source_type_label'] in ['social_media_platform', 'news_media_other_or_blog'] or
                     (bias_level <= 5) or
                     any(term in title.lower() or term in snippet.lower() for term in 
                         ['conspiracy', 'alternative', 'truth movement', 'cover-up', 'hidden', 'secret'])):
                    result['perspective'] = 'alternative'
                
                # Default fallback - if we can't determine, use neutral
                else:
                    result['perspective'] = 'neutral'
                
                # Add detailed analysis data
                result['credibility_factors'] = {
                    'source_reputation': source_reputation,
                    'evidence_quality': evidence_quality,
                    'bias_level': bias_level,
                    'transparency': transparency
                }
            
            return {
                "query": query,
                "engines": engines,
                "perspective": perspective,
                "results": results
            }
            
        except Exception as e:
            print(f"Search error: {e}")
            # Fall back to mock results
            mock_results = get_mock_results(query)
            
            return {
                "query": query,
                "engines": engines,
                "perspective": perspective,
                "results": mock_results,
                "error_info": str(e)
            }

def fetch_results_via_serpapi(query, engine_name, api_key, num_results=10):
    """Fetch search results from SerpAPI"""
    if not api_key:
        print(f"No API key for {engine_name}")
        return []
        
    params = {
        "q": query,
        "engine": engine_name.lower(),
        "api_key": api_key,
        "num": num_results,
        "hl": "en",
        "gl": "us"
    }
    
    print(f"SerpApi: Querying {engine_name} for '{query}' (num:{num_results})")
    
    try:
        from serpapi import SerpApiClient
        s_client = SerpApiClient(params)
        r_data = s_client.get_dict()
        o_results = r_data.get("organic_results", [])
        
        if not o_results:
            print(f"SerpApi: No organic_results for '{query}' on {engine_name}. Response: {r_data.get('error', 'Unknown')}")
            return []
            
        p_results = [{
            "title": i.get("title", "No title"),
            "link": i.get("link"),
            "snippet": i.get("snippet", "No snippet."),
            "source_engine": engine_name.capitalize()
        } for i in o_results if i.get("link")]
        
        print(f"SerpApi: Found {len(p_results)} results for {engine_name}")
        return p_results
        
    except Exception as e:
        print(f"SerpApi: Error {engine_name}: {type(e).__name__} - {e}")
        return []

def get_mock_results(query):
    """Return mock results for testing"""
    print(f"Generating mock results for query: {query}")
    
    return [
        {
            "title": f"COVID-19: What You Need to Know About {query}",
            "link": "https://www.cdc.gov/coronavirus/2019-ncov/index.html",
            "snippet": "Learn about COVID-19, including symptoms, complications, how it spreads, prevention, treatment, and more from the Centers for Disease Control.",
            "source_engine": "Google"
        },
        {
            "title": f"Latest Research on {query} and Vaccines",
            "link": "https://www.nih.gov/coronavirus",
            "snippet": "The National Institutes of Health provides the latest research and clinical trials related to COVID-19 vaccines and treatments.",
            "source_engine": "Google"
        },
        {
            "title": f"The Truth About {query} That Mainstream Media Won't Tell You",
            "link": "https://alternative-health-news.com/covid-truth",
            "snippet": "Discover the hidden facts about COVID-19 that government agencies and mainstream media are keeping from the public.",
            "source_engine": "Bing"
        },
        {
            "title": f"{query} - Wikipedia",
            "link": "https://en.wikipedia.org/wiki/COVID-19",
            "snippet": "Coronavirus disease 2019 (COVID-19) is a contagious disease caused by the virus SARS-CoV-2. The first known case was identified in Wuhan, China, in December 2019.",
            "source_engine": "Google"
        },
        {
            "title": f"World Health Organization: {query} Pandemic",
            "link": "https://www.who.int/emergencies/diseases/novel-coronavirus-2019",
            "snippet": "WHO is working with global experts, governments and partners to track the pandemic, advise on critical interventions and distribute vital medical supplies.",
            "source_engine": "Bing"
        }
    ]
