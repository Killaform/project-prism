"""
Script to check API keys in the environment and database
"""
import os
from dotenv import load_dotenv
import sys

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f".env file loaded successfully from {dotenv_path}")
else:
    print(f"Warning: .env file not found at {dotenv_path}.")

# Check environment variables
print("\n=== Environment API Keys ===")
serpapi_key = os.getenv("SERPAPI_KEY")
openai_key = os.getenv("OPENAI_API_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

print(f"SERPAPI_KEY: {'✓ Present' if serpapi_key else '✗ Missing'}")
print(f"OPENAI_API_KEY: {'✓ Present' if openai_key else '✗ Missing'}")
print(f"GEMINI_API_KEY: {'✓ Present' if gemini_key else '✗ Missing'}")

# Check database keys
try:
    from perspective_engine.app import create_app
    from perspective_engine.models.user_api_keys import UserApiKey
    
    app = create_app()
    with app.app_context():
        print("\n=== Database API Keys ===")
        
        # Get all users
        from perspective_engine.models.user import User
        users = User.query.all()
        print(f"Found {len(users)} users in database")
        
        for user in users:
            print(f"\nUser: {user.email} (ID: {user.id})")
            
            # Get API keys for this user
            keys = UserApiKey.query.filter_by(user_id=user.id).all()
            
            if keys:
                print(f"  API Keys: {len(keys)}")
                for key in keys:
                    print(f"  - {key.key_type}: {'✓ Present'}")
            else:
                print("  No API keys found")
                
except Exception as e:
    print(f"\nError checking database: {e}")
    
print("\nTo fix missing API keys:")
print("1. Add them to your .env file")
print("2. Or add them through the API Settings modal in the UI")