from flask_restful import Resource
from flask import request, jsonify
import os
import json
from openai import OpenAI
import google.generativeai as genai
import requests
from bs4 import BeautifulSoup

class SummarizeResource(Resource):
    def post(self):
        """Handle summarization requests"""
        data = request.json
        if not data:
            return {'error': 'No data provided'}, 400
            
        url = data.get('url')
        text = data.get('text')
        ai_provider = data.get('ai_provider', 'openai')

        if not url and not text:
            return {"error": "URL or text required"}, 400
        
        # If URL is provided, try to fetch content
        if url and not text:
            try:
                text = fetch_content_from_url(url)
                if not text:
                    text = f"Content from URL: {url}"
            except Exception as e:
                print(f"Error fetching URL content: {e}")
                text = f"Content from URL: {url}"
        
        content_to_summarize = text
        
        # Get API key from environment variables
        if ai_provider.lower() == 'openai':
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                try:
                    return summarize_with_openai(content_to_summarize, api_key)
                except Exception as e:
                    print(f"OpenAI summarize error: {e}")
        elif ai_provider.lower() == 'gemini':
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                try:
                    return summarize_with_gemini(content_to_summarize, api_key)
                except Exception as e:
                    print(f"Gemini summarize error: {e}")
        
        # If we get here, try OpenAI as fallback
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            try:
                return summarize_with_openai(content_to_summarize, openai_key)
            except Exception as e:
                print(f"OpenAI fallback error: {e}")
        
        # Fallback response
        return fallback_response(content_to_summarize)

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

def summarize_with_openai(text, api_key):
    """Summarize text using OpenAI"""
    client = OpenAI(api_key=api_key)
    
    prompt = f"""
    Please provide a concise summary of the following text in exactly 3 sentences:
    
    TEXT: {text}
    
    Your summary should:
    1. Be exactly 3 sentences long
    2. Capture the most important information
    3. Be clear and informative
    4. Be written in a professional tone
    
    Remember: The summary must be EXACTLY 3 sentences - no more, no less.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a summarization assistant that creates concise 3-sentence summaries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        summary = response.choices[0].message.content
        return {
            "summary": summary,
            "summarized_from": "OpenAI"
        }
    except Exception as e:
        print(f"OpenAI API error: {e}")
        raise

def summarize_with_gemini(text, api_key):
    """Summarize text using Google Gemini"""
    genai.configure(api_key=api_key)
    
    prompt = f"""
    Please provide a concise summary of the following text in exactly 3 sentences:
    
    TEXT: {text}
    
    Your summary should:
    1. Be exactly 3 sentences long
    2. Capture the most important information
    3. Be clear and informative
    4. Be written in a professional tone
    
    Remember: The summary must be EXACTLY 3 sentences - no more, no less.
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(prompt)
        
        return {
            "summary": response.text,
            "summarized_from": "Google Gemini"
        }
    except Exception as e:
        print(f"Gemini API error: {e}")
        raise

def fallback_response(text):
    """Return a fallback response when summarization fails"""
    return {
        "summary": "Unable to generate summary at this time. Please try again later or provide more specific information.",
        "summarized_from": "System message (summarization unavailable)"
    }