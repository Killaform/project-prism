from datetime import datetime, timezone
from flask_login import UserMixin
from . import db

class User(UserMixin, db.Model):
    """
    User model for storing user information.
    UserMixin provides default implementations for properties like 
    is_authenticated, is_active, is_anonymous, get_id(), etc.
    required by Flask-Login.
    """
    __tablename__ = 'users' # Optional: Explicitly name the table

    id = db.Column(db.Integer, primary_key=True) # Primary key for our internal use
    email = db.Column(db.String(120), unique=True, nullable=False) # User's email, should be verified by Google
    password_hash = db.Column(db.String(128), nullable=True)  # Can be null for OAuth users
    name = db.Column(db.String(100), nullable=False) # User's full name
    given_name = db.Column(db.String(50), nullable=True) # First name
    family_name = db.Column(db.String(50), nullable=True) # Last name
    profile_pic_url = db.Column(db.String(255), nullable=True) # URL to profile picture
    google_id = db.Column(db.String(100), unique=True, nullable=True) # Google's unique subject identifier
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc)) # Account creation timestamp
    last_login_at = db.Column(db.DateTime, nullable=True) # Last login timestamp
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<User {self.email}>'

class SearchHistory(db.Model):
    __tablename__ = 'search_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    query = db.Column(db.String(500), nullable=False)
    engines_used = db.Column(db.String(200), nullable=True)  # JSON string of engines
    results_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = db.relationship('User', backref=db.backref('searches', lazy=True))

    def __repr__(self):
        return f'<SearchHistory {self.query[:30]}...>'

# class UserApiSetting(db.Model): # If we store user-specific API keys in the DB (use with caution, encrypt sensitive keys)
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
#     # Encrypt these if stored in DB! For now, we are using localStorage on frontend
#     # serp_api_key_encrypted = db.Column(db.String(255), nullable=True) 
#     # openai_api_key_encrypted = db.Column(db.String(255), nullable=True)
#     # gemini_api_key_encrypted = db.Column(db.String(255), nullable=True)
#     # selected_ai_provider = db.Column(db.String(50), default='openai')