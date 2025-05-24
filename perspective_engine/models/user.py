from datetime import datetime, timezone
from flask_login import UserMixin
from perspective_engine.extensions import db

class User(UserMixin, db.Model):
    """User model for storing user information."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)  # Can be null for OAuth users
    name = db.Column(db.String(100), nullable=True)
    given_name = db.Column(db.String(50), nullable=True)
    family_name = db.Column(db.String(50), nullable=True)
    profile_pic_url = db.Column(db.String(255), nullable=True)
    google_id = db.Column(db.String(100), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    # Relationship to API keys
    api_keys = db.relationship('UserApiKey', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<User {self.email}>'