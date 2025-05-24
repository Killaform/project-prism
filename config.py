import os
from dotenv import load_dotenv

# Construct the path to the .env file relative to this config.py file
# This assumes config.py is in the project root, same level as .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

class Config:
    """Base configuration settings."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'fallback-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # SERP API Key
    SERPAPI_KEY = os.environ.get('SERPAPI_KEY')
    
    # AI API Keys
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    # Frontend URL for OAuth redirects
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('SECRET_KEY') or 'jwt-secret-string'
    JWT_ACCESS_TOKEN_EXPIRES = False  # Tokens don't expire for now

# You can add other configurations like DevelopmentConfig, ProductionConfig later if needed:
# class DevelopmentConfig(Config):
#     DEBUG = True
#     SQLALCHEMY_ECHO = True # Log SQL queries

# class ProductionConfig(Config):
#     DEBUG = False
#     # Add other production-specific settings

# For now, we'll just use the base Config directly.
# You can select which config to use in your app factory later.
# Example: app.config.from_object('config.DevelopmentConfig')