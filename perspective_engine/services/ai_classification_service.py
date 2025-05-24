from openai import OpenAI
import google.generativeai as genai
import json
from perspective_engine.services.api_key_service import get_api_key

def classify_perspectives_with_ai(results, ai_provider, user_id=None):
    """
    Use AI to classify search results into perspective categories
    
    Args:
        results: List of search results to classify
        ai_provider: 'openai' or 'gemini'
        user_id: Optional user ID for retrieving API keys
        
    Returns:
        List of search results with AI-determined perspectives
    """
    # Get API key from user settings or fallback to server key
    api_key = get_api_key(user_id, ai_provider.lower())
    
    if not api_key:
        # Fall back to rule-based classification if no API key
        return classify_with_rules(results)
    
    try:
        if ai_provider == 'openai':
            return classify_with_openai(results, api_key)
        elif ai_provider == 'gemini':
            return classify_with_gemini(results, api_key)
        else:
            # Fall back to rule-based classification for unknown providers
            return classify_with_rules(results)
    except Exception as e:
        print(f"AI classification error: {e}")
        # Fall back to rule-based classification on error
        return classify_with_rules(results)

def classify_with_openai(results, api_key):
    """Classify search results using OpenAI"""
    client = OpenAI(api_key=api_key)
    
    # Enhanced prompt with clearer distinction between categories
    prompt = """
    You are a media bias analyst specializing in identifying the perspective of information sources.
    
    Classify each search result into ONE of these perspective categories:
    
    1. "mainstream": 
       - Major news networks, government websites, established health organizations
       - University websites and reputable academic publications
       - Content that presents widely accepted scientific consensus or official positions
    
    2. "alternative": 
       - Sources presenting contrarian views to established scientific consensus
       - Sites promoting unconventional theories regarding major events
       - Sources that consistently challenge mainstream media, governments, or scientific bodies
       - Content featuring theories often labeled as "conspiracy" or "fringe"
    
    3. "neutral": 
       - Purely factual educational content from recognized providers
       - Reference materials like encyclopedias, dictionaries, or databases
       - Technical documentation or specifications
       - Primary research papers presented without significant political framing
    
    For EACH search result, analyze the URL, title, and snippet.
    Return ONLY valid JSON with the original results that include the perspective field.
    """
    
    # Format results for the prompt
    results_str = json.dumps(results[:15], indent=2)  # Limit to avoid token issues
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Classify these results and return as JSON:\n{results_str}"}
            ],
            temperature=0.1,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )
        
        classified_data = json.loads(response.choices[0].message.content)
        
        # Handle different response formats
        classified_results = []
        if isinstance(classified_data, list):
            classified_results = classified_data
        elif 'results' in classified_data:
            classified_results = classified_data['results']
            
        # Process any remaining results with rule-based classification
        if len(results) > len(classified_results):
            from perspective_engine.services.classification import infer_perspective_from_url_and_title
            
            # Map results by some identifier
            result_map = {r.get('link', i): r for i, r in enumerate(results)}
            classified_map = {r.get('link', i): r for i, r in enumerate(classified_results)}
            
            # Add any missing results with rule-based classification
            for key, result in result_map.items():
                if key not in classified_map:
                    url = result.get('link', '')
                    title = result.get('title', '')
                    result['perspective'] = infer_perspective_from_url_and_title(url, title)
                    classified_results.append(result)
        
        return classified_results
        
    except Exception as e:
        print(f"OpenAI classification error: {e}")
        return classify_with_rules(results)

def classify_with_gemini(results, api_key):
    """Classify search results using Google Gemini"""
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        # Similar prompt as OpenAI but formatted for Gemini
        prompt = """
        Classify each search result into ONE of these perspective categories:
        "mainstream", "alternative", or "neutral".
        
        Return ONLY valid JSON with the original results that include the perspective field.
        """
        
        # Format results for the prompt
        results_str = json.dumps(results[:10], indent=2)  # Smaller batch for Gemini
        
        generation_config = genai.types.GenerationConfig(
            response_mime_type="application/json"
        )
        
        response = model.generate_content(
            f"{prompt}\n\nResults to classify:\n{results_str}",
            generation_config=generation_config
        )
        
        # Parse the response
        classified_data = json.loads(response.text)
        
        # Handle different response formats
        classified_results = []
        if isinstance(classified_data, list):
            classified_results = classified_data
        elif 'results' in classified_data:
            classified_results = classified_data['results']
            
        # Process any remaining results with rule-based classification
        if len(results) > len(classified_results):
            remaining_results = classify_with_rules(results[len(classified_results):])
            classified_results.extend(remaining_results)
        
        return classified_results
        
    except Exception as e:
        print(f"Gemini classification error: {e}")
        return classify_with_rules(results)

def classify_with_rules(results):
    """Classify search results using rule-based approach"""
    from perspective_engine.services.classification import infer_perspective_from_url_and_title
    
    for result in results:
        url = result.get('link', '').lower()
        title = result.get('title', '').lower()
        
        # Only set perspective if not already set
        if 'perspective' not in result or not result['perspective']:
            result['perspective'] = infer_perspective_from_url_and_title(url, title)
    
    return results