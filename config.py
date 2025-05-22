import os
from dotenv import load_dotenv

# Construct the path to the .env file relative to this config.py file
# This assumes config.py is in the project root, same level as .env
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')

# Check if .env exists and load it
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f"Config: .env file loaded from {dotenv_path}")
else:
    print(f"Config: Warning - .env file not found at {dotenv_path}. Relying on environment variables directly.")

class Config:
    """Base configuration settings."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_default_fallback_secret_key_123!') # Fallback only for extreme cases
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # API Keys (Server-side fallbacks or primary keys if not user-provided system)
    SERVER_SERPAPI_KEY = os.getenv("SERPAPI_KEY")
    SERVER_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    # SERVER_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # If you decide to have a server-side Gemini key

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
    
    # Database Configuration
    # Default to a SQLite DB if DATABASE_URL is not set, for easier initial setup if PG isn't ready.
    # However, we are targeting PostgreSQL.
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///./default_perspective_engine.db')
    if not os.getenv('DATABASE_URL'):
        print("Config: Warning - DATABASE_URL not found in .env. Defaulting to local SQLite 'default_perspective_engine.db'.")
    else:
        print(f"Config: DATABASE_URL found: {os.getenv('DATABASE_URL')[:30]}...") # Print part of it for confirmation

    # Frontend URL (for redirects after OAuth)
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

    # Flask Port (primarily for the run script, but good to have in config)
    FLASK_PORT = os.getenv('FLASK_PORT', 5001)

    # Basic check for essential keys
    if not SECRET_KEY or SECRET_KEY == 'your_default_fallback_secret_key_123!':
        print("Config: CRITICAL WARNING - SECRET_KEY is not set or is using the default fallback. Please set a strong secret key in your .env file!")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        print("Config: Warning - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found. Google OAuth will not work.")
    if not SQLALCHEMY_DATABASE_URI: # Should have a default, but good check
        print("Config: CRITICAL WARNING - SQLALCHEMY_DATABASE_URI is not set. Database operations will fail.")


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