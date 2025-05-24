from flask_restful import Resource
from flask import request, jsonify

class ClassifyResource(Resource):
    def post(self):
        """Handle classification requests"""
        from perspective_engine.services.classification import infer_perspective_from_url_and_title
        
        data = request.json
        if not data:
            return {'error': 'No data provided'}, 400
        
        results = data.get('results', [])
        
        if not results:
            return {'error': 'No results to classify'}, 400
        
        # Simple classification implementation
        for result in results:
            url = result.get('link', '').lower()
            title = result.get('title', '').lower()
            result['perspective'] = infer_perspective_from_url_and_title(url, title)
        
        return {'results': results}