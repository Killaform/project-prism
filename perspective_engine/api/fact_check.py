from flask_restful import Resource
from flask import request, jsonify
import os
import json
from openai import OpenAI
import google.generativeai as genai
import requests
from bs4 import BeautifulSoup

class FactCheckResource(Resource):
    def post(self):
        """Handle fact checking requests"""
        data = request.json
        if not data:
            return {'error': 'No data provided'}, 400
            
        url = data.get('url')
        claim = data.get('claim')
        ai_provider = data.get('ai_provider', 'openai')

        if not url and not claim:
            return {"error": "URL or claim required"}, 400
        
        # If URL is provided, try to fetch content
        if url and not claim:
            try:
                content = fetch_content_from_url(url)
                if content:
                    claim = content
                else:
                    claim = f"Content from URL: {url}"
            except Exception as e:
                print(f"Error fetching URL content: {e}")
                claim = f"Content from URL: {url}"
        
        # Get API key from environment variables
        if ai_provider.lower() == 'openai':
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                try:
                    return fact_check_with_openai(claim, api_key)
                except Exception as e:
                    print(f"OpenAI fact check error: {e}")
        elif ai_provider.lower() == 'gemini':
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                try:
                    return fact_check_with_gemini(claim, api_key)
                except Exception as e:
                    print(f"Gemini fact check error: {e}")
        
        # If we get here, try OpenAI as fallback
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            try:
                return fact_check_with_openai(claim, openai_key)
            except Exception as e:
                print(f"OpenAI fallback error: {e}")
        
        # Fallback response
        return fallback_response(claim)

def fetch_content_from_url(url):
    """Fetch content from a URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.extract()
        
        # Get text
        text = soup.get_text()
        
        # Break into lines and remove leading and trailing space
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Limit text length to avoid token limits
        return text[:5000]
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return None

def fact_check_with_openai(text, api_key):
    """Fact check using OpenAI"""
    client = OpenAI(api_key=api_key)
    
    prompt = f"""
    Please fact check the following claim and provide a verdict:
    
    CLAIM: {text}
    
    Analyze the claim and provide:
    1. A verdict (true, false, partially true, unverifiable)
    2. A concise explanation of your reasoning (maximum 2-3 sentences)
    3. Any key evidence that supports your verdict
    
    Your response should be human-readable and NOT in JSON format.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a fact-checking assistant that provides concise, human-readable verdicts."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        result = response.choices[0].message.content
        
        # Extract verdict from the response
        verdict_line = None
        for line in result.split('\n'):
            if "verdict" in line.lower() or any(v in line.lower() for v in ["true", "false", "partially", "unverifiable"]):
                verdict_line = line
                break
        
        verdict = "Unverifiable"
        if verdict_line:
            if "true" in verdict_line.lower() and "false" in verdict_line.lower():
                verdict = "Partially True"
            elif "true" in verdict_line.lower():
                verdict = "True"
            elif "false" in verdict_line.lower():
                verdict = "False"
            elif "unverifiable" in verdict_line.lower():
                verdict = "Unverifiable"
            elif "partially" in verdict_line.lower():
                verdict = "Partially True"
        
        # Format the response
        return {
            "claim": text[:100] + ("..." if len(text) > 100 else ""),
            "verdict": verdict,
            "explanation": result
        }
    except Exception as e:
        print(f"OpenAI API error: {e}")
        raise

def fact_check_with_gemini(text, api_key):
    """Fact check using Google Gemini"""
    genai.configure(api_key=api_key)
    
    prompt = f"""
    Please fact check the following claim and provide a verdict:
    
    CLAIM: {text}
    
    Analyze the claim and provide:
    1. A verdict (true, false, partially true, unverifiable)
    2. A concise explanation of your reasoning (maximum 2-3 sentences)
    3. Any key evidence that supports your verdict
    
    Your response should be human-readable and NOT in JSON format.
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(prompt)
        
        result = response.text
        
        # Extract verdict from the response
        verdict_line = None
        for line in result.split('\n'):
            if "verdict" in line.lower() or any(v in line.lower() for v in ["true", "false", "partially", "unverifiable"]):
                verdict_line = line
                break
        
        verdict = "Unverifiable"
        if verdict_line:
            if "true" in verdict_line.lower() and "false" in verdict_line.lower():
                verdict = "Partially True"
            elif "true" in verdict_line.lower():
                verdict = "True"
            elif "false" in verdict_line.lower():
                verdict = "False"
            elif "unverifiable" in verdict_line.lower():
                verdict = "Unverifiable"
            elif "partially" in verdict_line.lower():
                verdict = "Partially True"
        
        # Format the response
        return {
            "claim": text[:100] + ("..." if len(text) > 100 else ""),
            "verdict": verdict,
            "explanation": result
        }
    except Exception as e:
        print(f"Gemini API error: {e}")
        raise

def fallback_response(claim):
    """Return a fallback response when fact checking fails"""
    return {
        "claim": claim[:100] + ("..." if len(claim) > 100 else ""),
        "verdict": "Unverifiable",
        "explanation": "Unable to verify this claim at this time. Please try again later or provide more specific information."
    }