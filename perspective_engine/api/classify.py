from flask_restful import Resource
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

class ClassifyResource(Resource):
    def post(self):
        """Handle classification requests"""
        from perspective_engine.services.ai_classification_service import classify_perspectives_with_ai
        
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
        
        results = data.get('results', [])
        ai_provider = data.get('ai_provider', 'openai')
        
        if not results:
            return {'error': 'No results to classify'}, 400
        
        try:
            # Classify results using AI
            classified_results = classify_perspectives_with_ai(
                results, 
                ai_provider, 
                user_id
            )
            
            return {'results': classified_results}
            
        except Exception as e:
            print(f"Classification error: {e}")
            
            # Fall back to rule-based classification
            from perspective_engine.services.classification import infer_perspective_from_url_and_title
            
            for result in results:
                url = result.get('link', '').lower()
                title = result.get('title', '').lower()
                result['perspective'] = infer_perspective_from_url_and_title(url, title)
            
            return {'results': results}