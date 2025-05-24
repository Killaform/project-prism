from flask_restful import Resource
from flask import request, jsonify, make_response

class VerifyTokenResource(Resource):
    def get(self):
        """Verify if a token is valid"""
        # Simple stub implementation that returns success
        return {
            'valid': True,
            'user': {
                'id': 1,
                'email': 'user@example.com',
                'name': 'Test User',
                'profile_pic_url': None
            }
        }, 200
        
    def options(self):
        """Handle OPTIONS request for CORS preflight"""
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response