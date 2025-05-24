from perspective_engine.extensions import db
from cryptography.fernet import Fernet
import os

# Create encryption key or load from environment
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)

class UserApiKey(db.Model):
    __tablename__ = 'user_api_keys'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    key_type = db.Column(db.String(50), nullable=False)  # 'openai', 'gemini', 'serpapi'
    encrypted_key = db.Column(db.Text, nullable=False)
    
    @property
    def api_key(self):
        """Decrypt the API key"""
        return cipher_suite.decrypt(self.encrypted_key.encode()).decode()
    
    @api_key.setter
    def api_key(self, key):
        """Encrypt the API key"""
        self.encrypted_key = cipher_suite.encrypt(key.encode()).decode()