from datetime import datetime
from flask_login import UserMixin
# Import 'db' from the application factory context in __init__.py
# This ensures 'db' is the same SQLAlchemy instance initialized with the app
from . import db # Use a relative import since models.py is in the same package as __init__.py

class User(UserMixin, db.Model):
    """
    User model for storing user information.
    UserMixin provides default implementations for properties like 
    is_authenticated, is_active, is_anonymous, get_id(), etc.
    required by Flask-Login.
    """
    __tablename__ = 'users' # Optional: Explicitly name the table

    id = db.Column(db.Integer, primary_key=True) # Primary key for our internal use
    google_id = db.Column(db.String(120), unique=True, nullable=False) # Google's unique subject identifier
    email = db.Column(db.String(120), unique=True, nullable=False) # User's email, should be verified by Google
    name = db.Column(db.String(100), nullable=True) # User's full name
    given_name = db.Column(db.String(100), nullable=True) # First name
    family_name = db.Column(db.String(100), nullable=True) # Last name
    profile_pic_url = db.Column(db.String(255), nullable=True) # URL to profile picture
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships (examples for later, if needed)
    # saved_queries = db.relationship('SavedQuery', backref='user', lazy=True)
    # api_settings = db.relationship('UserApiSetting', backref='user', lazy=True, uselist=False) # One-to-one

    def __repr__(self):
        return f'<User id={self.id} email={self.email} name={self.name}>'

    # Flask-Login requires a get_id method, UserMixin provides it, 
    # but it expects the primary key to be 'id'.
    # If your primary key was named differently, you'd override get_id().
    # Since our PK is 'id', UserMixin's default get_id() works fine.

# --- Future Models (placeholders, we'll define them when needed) ---

# class SavedQuery(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
#     query_text = db.Column(db.String(500), nullable=False)
#     selected_engines_json = db.Column(db.Text, nullable=True) # Store as JSON string
#     perspective_mode = db.Column(db.String(50), nullable=True) # e.g., 'mainstream', 'fringe'
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     # ... other fields like title, notes ...

# class UserApiSetting(db.Model): # If we store user-specific API keys in the DB (use with caution, encrypt sensitive keys)
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
#     # Encrypt these if stored in DB! For now, we are using localStorage on frontend
#     # serp_api_key_encrypted = db.Column(db.String(255), nullable=True) 
#     # openai_api_key_encrypted = db.Column(db.String(255), nullable=True)
#     # gemini_api_key_encrypted = db.Column(db.String(255), nullable=True)
#     # selected_ai_provider = db.Column(db.String(50), default='openai')