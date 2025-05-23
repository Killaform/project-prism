from datetime import datetime, timezone
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
    google_id = db.Column(db.String(120), unique=True, nullable=True) # Google's unique subject identifier
    email = db.Column(db.String(120), unique=True, nullable=False) # User's email, should be verified by Google
    name = db.Column(db.String(100), nullable=True) # User's full name
    given_name = db.Column(db.String(100), nullable=True) # First name
    family_name = db.Column(db.String(100), nullable=True) # Last name
    profile_pic_url = db.Column(db.String(255), nullable=True) # URL to profile picture
    password_hash = db.Column(db.String(128), nullable=True) # Hash of the user's password for authentication
    created_at = db.Column(db.DateTime, nullable=True, default=lambda: datetime.now(timezone.utc)) # Account creation timestamp
    last_login_at = db.Column(db.DateTime, nullable=True) # Last login timestamp

    def __repr__(self):
        return f'<User id={self.id} email={self.email} name={self.name}>'

    # Flask-Login requires a get_id method, UserMixin provides it, 
    # but it expects the primary key to be 'id'.
    # If your primary key was named differently, you'd override get_id().
    # Since our PK is 'id', UserMixin's default get_id() works fine.

class SavedQuery(db.Model):
    __tablename__ = 'saved_queries'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    query_text = db.Column(db.String(500), nullable=False)
    selected_engines = db.Column(db.JSON, nullable=False)
    perspective = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f"<SavedQuery '{self.query_text[:30]}...' by User ID {self.user_id}>"

# class UserApiSetting(db.Model): # If we store user-specific API keys in the DB (use with caution, encrypt sensitive keys)
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
#     # Encrypt these if stored in DB! For now, we are using localStorage on frontend
#     # serp_api_key_encrypted = db.Column(db.String(255), nullable=True) 
#     # openai_api_key_encrypted = db.Column(db.String(255), nullable=True)
#     # gemini_api_key_encrypted = db.Column(db.String(255), nullable=True)
#     # selected_ai_provider = db.Column(db.String(50), default='openai')