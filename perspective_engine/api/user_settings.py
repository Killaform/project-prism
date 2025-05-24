from flask_restful import Resource
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from perspective_engine.extensions import db
from perspective_engine.models.user_api_keys import UserApiKey
from perspective_engine.services.api_key_service import save_api_key

class UserApiKeyResource(Resource):
    @jwt_required()
    def get(self):
        """Get user's API keys"""
        user_id = get_jwt_identity()
        print(f"API Keys GET: User ID = {user_id}")
        
        # Get all API keys for the user
        keys = UserApiKey.query.filter_by(user_id=user_id).all()
        print(f"API Keys GET: Found {len(keys)} keys")
        
        # Return key types only (not the actual keys for security)
        return {
            'api_keys': [{'type': key.key_type, 'exists': True} for key in keys]
        }
    
    @jwt_required()
    def post(self):
        """Save or update an API key"""
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"API Keys POST: User ID = {user_id}, Data = {data}")
        
        if not data or 'key_type' not in data or 'api_key' not in data:
            return {'error': 'Missing key_type or api_key'}, 400
            
        key_type = data['key_type']
        api_key = data['api_key']
        
        # Validate key_type
        if key_type not in ['openai', 'gemini', 'serpapi']:
            return {'error': 'Invalid key_type'}, 400
            
        # Save the API key
        try:
            result = save_api_key(user_id, key_type, api_key)
            if result:
                print(f"API Keys POST: Successfully saved {key_type} key for user {user_id}")
                return {'message': f'{key_type} API key saved successfully'}
            else:
                print(f"API Keys POST: Failed to save {key_type} key for user {user_id}")
                return {'error': 'Failed to save API key'}, 500
        except Exception as e:
            print(f"API Keys POST: Error saving key: {e}")
            return {'error': f'Error saving API key: {str(e)}'}, 500
            
    def options(self):
        """Handle OPTIONS request for CORS preflight"""
        from flask import make_response
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response