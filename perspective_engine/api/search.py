from flask_restful import Resource
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
import json

class SearchResource(Resource):
    def post(self):
        """Handle search requests"""
        from perspective_engine.services.api_key_service import get_api_key
        from perspective_engine.services.classification import classify_source_type
        
        # Try to get user ID from JWT token if available
        user_id = None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            pass
        
        data = request.get_json()
        if not data:
            return {"error": "Invalid JSON"}, 400
        
        query = data.get('query')
        if not query:
            return {"error": "Search query is required"}, 400
            
        engines = data.get('engines', ['google'])
        perspective = data.get('perspective', 'balanced')
        
        # Get API key from user settings or fallback to server key
        serpapi_key = get_api_key(user_id, 'serpapi')
        
        if not serpapi_key:
            return {"error": "No SERP API key available"}, 400
        
        # Return mock results for testing
        mock_results = [
            {
                "title": "Sample Result 1",
                "link": "https://example.com/1",
                "snippet": "This is a sample search result for testing purposes.",
                "source_engine": "Google",
                "source_type_label": "website_general",
                "perspective": "neutral",
                "base_trust": 50,
                "recency_boost": 5,
                "intrinsic_credibility_score": 65
            },
            {
                "title": "Sample Result 2",
                "link": "https://example.org/2",
                "snippet": "Another sample result with different perspective.",
                "source_engine": "Google",
                "source_type_label": "news_media_mainstream",
                "perspective": "mainstream",
                "base_trust": 75,
                "recency_boost": 5,
                "intrinsic_credibility_score": 80
            }
        ]
        
        return {
            "query": query,
            "engines": engines,
            "perspective": perspective,
            "results": mock_results
        }