from perspective_engine.models.user_api_keys import UserApiKey
import os

def get_api_key(user_id, key_type):
    """Get API key for a user, falling back to server key if not found"""
    if not user_id:
        return get_server_api_key(key_type)
        
    user_key = UserApiKey.query.filter_by(
        user_id=user_id, 
        key_type=key_type
    ).first()
    
    if user_key:
        return user_key.api_key
    
    return get_server_api_key(key_type)
    
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
    
    # Check if key already exists
    existing_key = UserApiKey.query.filter_by(
        user_id=user_id, 
        key_type=key_type
    ).first()
    
    if existing_key:
        # Update existing key
        existing_key.api_key = api_key
    else:
        # Create new key
        new_key = UserApiKey(
            user_id=user_id,
            key_type=key_type,
            api_key=api_key
        )
        db.session.add(new_key)
        
    db.session.commit()
    return True