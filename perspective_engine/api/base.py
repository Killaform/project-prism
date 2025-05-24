from flask import Blueprint, jsonify, request

# Create a simple API without flask-restful dependency
def create_api_blueprint():
    api_bp = Blueprint('api', __name__)
    
    @api_bp.route('/test', methods=['GET'])
    def test():
        return jsonify({"status": "API is working"})
        
    return api_bp