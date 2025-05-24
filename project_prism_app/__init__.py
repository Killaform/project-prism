import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from authlib.integrations.flask_client import OAuth

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
jwt = JWTManager()
oauth = OAuth()

def create_app(config_class=None):
    app = Flask(__name__)
    
    # Load configuration
    if config_class:
        app.config.from_object(config_class)
    else:
        # Fix the import path
        from config import Config
        app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    jwt.init_app(app)
    
    # Configure CORS - IMPORTANT: This must be before registering blueprints
    CORS(app, 
         origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
         supports_credentials=True,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'])
    
    # Initialize OAuth
    oauth.init_app(app)
    
    # Configure Google OAuth with environment variables
    google_client_id = app.config.get('GOOGLE_CLIENT_ID')
    google_client_secret = app.config.get('GOOGLE_CLIENT_SECRET')
    
    print(f"Configuring Google OAuth:")
    print(f"  Client ID: {google_client_id[:20] + '...' if google_client_id else 'NOT SET'}")
    print(f"  Client Secret: {'SET' if google_client_secret else 'NOT SET'}")
    
    if google_client_id and google_client_secret:
        oauth.register(
            name='google',
            client_id=google_client_id,
            client_secret=google_client_secret,
            server_metadata_url='https://accounts.google.com/.well-known/openid_configuration',
            client_kwargs={
                'scope': 'openid email profile'
            }
        )
        print("  ✓ Google OAuth configured successfully")
    else:
        print("  ✗ Google OAuth NOT configured - missing credentials")
    
    # Register blueprints
    try:
        from .search.routes import search_bp
        app.register_blueprint(search_bp, url_prefix='/search')
        print("✓ Registered search blueprint")
    except Exception as e:
        print(f"✗ Failed to register search blueprint: {e}")
    
    try:
        from .auth.routes import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/auth')
        print("✓ Registered auth blueprint")
    except Exception as e:
        print(f"✗ Failed to register auth blueprint: {e}")
        import traceback
        traceback.print_exc()
    
    # Print all registered routes
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.methods} {rule.rule}")
    
    # Login manager configuration
    login_manager.login_view = 'auth_bp.login'
    login_manager.login_message = 'Please log in to access this page.'
    
    @login_manager.user_loader
    def load_user(user_id):
        from .models import User
        return User.query.get(int(user_id))
    
    # Add a simple test route to verify the app is working
    @app.route('/test')
    def test():
        return "Flask app is working!"
    
    return app