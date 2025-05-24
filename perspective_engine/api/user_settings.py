from flask_restful import Resource
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from perspective_engine.extensions import db
from perspective_engine.models.user_api_keys import UserApiKey
from perspective_engine.services.api_key_service import save_api_key

class UserApiKeyResource(Resource):
    @jwt_required()
    def get(self):
        """Get user's API keys"""
        user_id = get_jwt_identity()
        
        # Get all API keys for the user
        keys = UserApiKey.query.filter_by(user_id=user_id).all()
        
        # Return key types only (not the actual keys for security)
        return {
            'api_keys': [{'type': key.key_type, 'exists': True} for key in keys]
        }
    
    @jwt_required()
    def post(self):
        """Save or update an API key"""
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'key_type' not in data or 'api_key' not in data:
            return {'error': 'Missing key_type or api_key'}, 400
            
        key_type = data['key_type']
        api_key = data['api_key']
        
        # Validate key_type
        if key_type not in ['openai', 'gemini', 'serpapi']:
            return {'error': 'Invalid key_type'}, 400
            
        # Save the API key
        save_api_key(user_id, key_type, api_key)
        
        return {'message': f'{key_type} API key saved successfully'}