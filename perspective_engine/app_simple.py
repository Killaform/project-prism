from flask import Flask
from perspective_engine.api.base import create_api_blueprint
import os

def create_app():
    """Create and configure the Flask application without flask-restful"""
    app = Flask(__name__)
    
    # Register the API blueprint
    api_bp = create_api_blueprint()
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/')
    def index():
        return "Perspective Engine API is running"
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)