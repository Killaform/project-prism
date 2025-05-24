"""
Script to fix API keys in the database
"""
import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Create app context
from perspective_engine.app import create_app
app = create_app()

with app.app_context():
    from perspective_engine.models.user import User
    from perspective_engine.models.user_api_keys import UserApiKey
    from perspective_engine.extensions import db
    
    # Get all users
    users = User.query.all()
    print(f"Found {len(users)} users in database")
    
    # Get the first user (or create one if none exists)
    if not users:
        print("No users found, creating a test user")
        test_user = User(
            email="test@example.com",
            name="Test User"
        )
        db.session.add(test_user)
        db.session.commit()
        user = test_user
    else:
        user = users[0]
        
    print(f"Using user: {user.email} (ID: {user.id})")
    
    # Add sample API keys
    keys_to_add = {
        'serpapi': os.getenv('SERPAPI_KEY') or 'sample_serpapi_key_12345',
        'openai': os.getenv('OPENAI_API_KEY') or 'sample_openai_key_12345',
        'gemini': os.getenv('GEMINI_API_KEY') or 'sample_gemini_key_12345'
    }
    
    for key_type, key_value in keys_to_add.items():
        # Check if key already exists
        existing_key = UserApiKey.query.filter_by(user_id=user.id, key_type=key_type).first()
        
        if existing_key:
            print(f"Updating existing {key_type} key")
            existing_key.api_key = key_value
        else:
            print(f"Adding new {key_type} key")
            new_key = UserApiKey(
                user_id=user.id,
                key_type=key_type,
                api_key=key_value
            )
            db.session.add(new_key)
            
    # Commit changes
    db.session.commit()
    print("API keys added/updated successfully")
    
    # Verify keys were saved
    keys = UserApiKey.query.filter_by(user_id=user.id).all()
    print(f"\nVerifying keys for user {user.email}:")
    for key in keys:
        try:
            decrypted = key.api_key
            print(f"- {key.key_type}: ✓ Present and decryptable (starts with: {decrypted[:5]}...)")
        except Exception as e:
            print(f"- {key.key_type}: ✗ ERROR decrypting: {e}")
            
    print("\nAPI keys are now set up for testing")