from perspective_engine.models.user_api_keys import UserApiKey
import os

def get_api_key(user_id, key_type):
    """Get API key for a user, falling back to server key if not found"""
    print(f"API Key Service: Getting {key_type} key for user_id={user_id}")
    
    if not user_id:
        server_key = get_server_api_key(key_type)
        print(f"API Key Service: No user_id, using server key: {'Yes' if server_key else 'No'}")
        return server_key
    
    try:
        user_key = UserApiKey.query.filter_by(
            user_id=user_id, 
            key_type=key_type
        ).first()
        
        if user_key:
            print(f"API Key Service: Found user key for {key_type}")
            return user_key.api_key
    except Exception as e:
        print(f"API Key Service: Error retrieving user key: {e}")
    
    # Fall back to server key
    server_key = get_server_api_key(key_type)
    print(f"API Key Service: Falling back to server key: {'Yes' if server_key else 'No'}")
    return server_key
    
def get_server_api_key(key_type):
    """Get server API key from environment variables"""
    if key_type == 'openai':
        return os.getenv("OPENAI_API_KEY")
    elif key_type == 'gemini':
        return os.getenv("GEMINI_API_KEY")
    elif key_type == 'serpapi':
        return os.getenv("SERPAPI_KEY")
    return None

def save_api_key(user_id, key_type, api_key):
    """Save or update an API key for a user"""
    from perspective_engine.extensions import db
    
    print(f"API Key Service: Saving {key_type} key for user_id={user_id}")
    
    try:
        # Check if key already exists
        existing_key = UserApiKey.query.filter_by(
            user_id=user_id, 
            key_type=key_type
        ).first()
        
        if existing_key:
            # Update existing key
            existing_key.api_key = api_key
            print(f"API Key Service: Updated existing {key_type} key")
        else:
            # Create new key
            new_key = UserApiKey(
                user_id=user_id,
                key_type=key_type,
                api_key=api_key
            )
            db.session.add(new_key)
            print(f"API Key Service: Created new {key_type} key")
            
        db.session.commit()
        return True
    except Exception as e:
        print(f"API Key Service: Error saving key: {e}")
        db.session.rollback()
        return False