"""
Script to debug user API keys in the database
"""
import os
from dotenv import load_dotenv
import sys

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Create app context
from perspective_engine.app import create_app
app = create_app()

with app.app_context():
    from perspective_engine.models.user import User
    from perspective_engine.models.user_api_keys import UserApiKey, cipher_suite
    
    # Get all users
    users = User.query.all()
    print(f"Found {len(users)} users in database")
    
    for user in users:
        print(f"\nUser: {user.email} (ID: {user.id})")
        
        # Get API keys for this user
        keys = UserApiKey.query.filter_by(user_id=user.id).all()
        
        if keys:
            print(f"  API Keys: {len(keys)}")
            for key in keys:
                try:
                    # Try to decrypt the key to verify it's stored correctly
                    decrypted = key.api_key
                    print(f"  - {key.key_type}: ✓ Present and decryptable (starts with: {decrypted[:5]}...)")
                except Exception as e:
                    print(f"  - {key.key_type}: ✗ ERROR decrypting: {e}")
        else:
            print("  No API keys found")
            
        # Test API key retrieval function
        print("\nTesting API key retrieval:")
        from perspective_engine.services.api_key_service import get_api_key
        
        for key_type in ['serpapi', 'openai', 'gemini']:
            key = get_api_key(user.id, key_type)
            if key:
                print(f"  - {key_type}: ✓ Retrieved successfully (starts with: {key[:5]}...)")
            else:
                print(f"  - {key_type}: ✗ Not found")
                
    # Check if we can manually add a key
    print("\nAttempting to add a test key:")
    try:
        test_user = users[0] if users else None
        if test_user:
            from perspective_engine.services.api_key_service import save_api_key
            
            # Try to save a test key
            result = save_api_key(test_user.id, 'test_key', 'test_value_12345')
            print(f"  Save result: {result}")
            
            # Verify it was saved
            test_key = UserApiKey.query.filter_by(user_id=test_user.id, key_type='test_key').first()
            if test_key:
                print(f"  Test key saved successfully: {test_key.api_key}")
                
                # Clean up test key
                UserApiKey.query.filter_by(user_id=test_user.id, key_type='test_key').delete()
                from perspective_engine.extensions import db
                db.session.commit()
                print("  Test key cleaned up")
            else:
                print("  Failed to save test key")
    except Exception as e:
        print(f"  Error testing key save: {e}")