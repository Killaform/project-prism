from flask_restful import Resource
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

class SummarizeResource(Resource):
    def post(self):
        """Handle summarization requests"""
        from perspective_engine.services.api_key_service import get_api_key
        
        # Try to get user ID from JWT token if available
        user_id = None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            pass
        
        data = request.json
        if not data:
            return {'error': 'No data provided'}, 400
            
        url = data.get('url')
        text = data.get('text')
        ai_provider = data.get('ai_provider', 'openai')

        if not url and not text:
            return {"error": "URL or text required"}, 400
        
        # Get API key from user settings or fallback to server key
        api_key = get_api_key(user_id, ai_provider.lower())
        
        if not api_key:
            return {"error": f"No {ai_provider} API key available"}, 400
        
        # This is a stub implementation
        return {
            "summary": "This is a placeholder summary. In production, this would use AI to summarize the content.",
            "summarized_from": "stub implementation"
        }