import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS
from authlib.integrations.flask_client import OAuth

# Import the Config class from config.py (which is in the parent directory)
# To do this, we need to make sure the parent directory (project root) is in Python's path
# or use relative imports carefully if this __init__.py is part of a larger package structure.
# For simplicity, assuming config.py can be imported directly or we adjust sys.path if needed.
# A common way is to ensure your project root is in PYTHONPATH or to structure imports like:
# from ..config import Config # If project_prism_app is sibling to config.py and project_prism_app is a package

# Initialize extensions without an app instance first
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
oauth = OAuth()
cors = CORS() # Initialize CORS

# Application Factory Function
def create_app(config_class_name='config.Config'): # Default to Config class in config.py
    """
    Creates and configures the Flask application instance.
    :param config_class_string: The configuration class string, e.g., 'config.DevelopmentConfig'
    """
    app = Flask(__name__)
    
    # Load configuration from config.py
    # The config_class_name should be a string like 'config.Config' or 'config.DevelopmentConfig'
    # For this to work, your project root (where config.py lives) must be in Python's import path.
    # If app.py is in the root and runs this, it usually works.
    # If you run from within project_prism_app, paths might need adjustment.
    try:
        app.config.from_object(config_class_name)
        print(f"App Factory: Successfully loaded config from {config_class_name}")
    except ImportError:
        print(f"App Factory: Error - Could not import config '{config_class_name}'. Ensure config.py is accessible.")
        # Fallback to direct environment variable loading if config object fails, though less ideal
        app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback_secret_key_for_init_error')
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///./error_default.db')
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
        app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')
        app.config['GOOGLE_DISCOVERY_URL'] = "https://accounts.google.com/.well-known/openid-configuration"
        app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', 'http://localhost:5173')


    # Initialize Flask extensions with the app instance
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    oauth.init_app(app)
    cors.init_app(app, supports_credentials=True) # Initialize CORS with app, enable credentials

    # Flask-Login settings
    login_manager.login_view = None # No specific login page, OAuth handles it
    login_manager.session_protection = "strong" # Or "basic"

    @login_manager.user_loader
    def load_user(user_id):
        # Import User model here to avoid circular imports if models.py imports db from here
        from .models import User 
        return User.query.get(int(user_id))

    # Register Google OAuth client with Authlib
    # This configuration should now primarily live in config.py and be accessed via app.config
    if app.config.get('GOOGLE_CLIENT_ID') and app.config.get('GOOGLE_CLIENT_SECRET'):
        oauth.register(
            name='google',
            client_id=app.config['GOOGLE_CLIENT_ID'],
            client_secret=app.config['GOOGLE_CLIENT_SECRET'],
            server_metadata_url=app.config.get('GOOGLE_DISCOVERY_URL'), # Ensure this key exists in config
            client_kwargs={
                'scope': 'openid email profile'
            }
        )
        print("App Factory: Google OAuth client registered with Authlib.")
    else:
        print("App Factory: Warning - Google OAuth credentials not fully configured in app.config. OAuth will not work.")


    # Import and register Blueprints here to avoid circular imports
    # We define these Blueprints in their respective routes.py files later

    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth') # All auth routes will be under /auth
    print("App Factory: Auth Blueprint registered.")

    from .search.routes import search_bp
    app.register_blueprint(search_bp, url_prefix='/api') # Core API routes under /api
    print("App Factory: Search API Blueprint registered.")
    
    # A simple route to test if the app is working before Blueprints are fully defined
    @app.route('/hello')
    def hello():
        return "Hello from Perspective Engine App Factory!"

    return app