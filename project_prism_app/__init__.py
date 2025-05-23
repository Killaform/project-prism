import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS
from authlib.integrations.flask_client import OAuth

# Initialize extensions outside of create_app()
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
oauth = OAuth()

def create_app(config_class='config.Config'):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    oauth.init_app(app)
    CORS(app, supports_credentials=True)
    
    # Register OAuth provider
    oauth.register(
        name="google",
        client_id=app.config.get("GOOGLE_CLIENT_ID"),
        client_secret=app.config.get("GOOGLE_CLIENT_SECRET"),
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    
    # Import and register blueprints
    from .auth.routes import auth_bp
    from .search.routes import search_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(search_bp, url_prefix='/')
    
    # Setup user loader
    from .models import User
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    return app