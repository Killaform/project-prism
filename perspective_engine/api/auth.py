from flask_restful import Resource
from flask import request, jsonify, session, url_for, redirect, Blueprint
from datetime import datetime, timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask_jwt_extended import create_access_token
import os
import requests

from perspective_engine.extensions import db
from perspective_engine.models.user import User

auth_bp = Blueprint('auth', __name__)

class GoogleAuthResource(Resource):
    def get(self):
        """Initiate Google OAuth flow"""
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        redirect_uri = f"{request.host_url.rstrip('/')}/auth/google/callback"
        
        # Use Google's OAuth 2.0 endpoint
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope=openid%20email%20profile"
        
        print(f"Google OAuth: Redirecting to Google with callback URL: {redirect_uri}")
        
        # Redirect to Google's OAuth 2.0 server
        return redirect(auth_url)

class GoogleCallbackResource(Resource):
    def get(self):
        """Handle Google OAuth callback"""
        code = request.args.get('code')
        if not code:
            return jsonify({"error": "Authorization code not provided"}), 400
        
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = f"{request.host_url.rstrip('/')}/auth/google/callback"
        
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        token_response = requests.post(token_url, data=token_data)
        if token_response.status_code != 200:
            return jsonify({"error": f"Failed to get token: {token_response.text}"}), 400
        
        token_json = token_response.json()
        id_token_value = token_json.get('id_token')
        
        # Verify the ID token
        try:
            idinfo = id_token.verify_oauth2_token(
                id_token_value, 
                google_requests.Request(), 
                client_id
            )
            
            # Get user info
            user_id = idinfo['sub']
            email = idinfo.get('email')
            name = idinfo.get('name')
            given_name = idinfo.get('given_name')
            family_name = idinfo.get('family_name')
            picture = idinfo.get('picture')
            
            # Check if user exists
            user = User.query.filter_by(google_id=user_id).first()
            if not user:
                # Check if email exists
                user = User.query.filter_by(email=email).first()
                if user:
                    # Update existing user with Google ID
                    user.google_id = user_id
                    user.profile_pic_url = picture
                    if not user.name:
                        user.name = name
                    if not user.given_name:
                        user.given_name = given_name
                    if not user.family_name:
                        user.family_name = family_name
                else:
                    # Create new user
                    user = User(
                        email=email,
                        name=name,
                        given_name=given_name,
                        family_name=family_name,
                        google_id=user_id,
                        profile_pic_url=picture
                    )
                    db.session.add(user)
            
            # Update last login
            user.last_login_at = datetime.now(timezone.utc)
            db.session.commit()
            
            # Generate JWT token
            access_token = create_access_token(identity=user.id)
            
            # Redirect to frontend with token
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
            return redirect(f"{frontend_url}?token={access_token}")
            
        except ValueError as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401

@auth_bp.route('/google/token', methods=['POST'])
def google_token():
    """Handle Google token verification"""
    token = request.json.get('token')
    if not token:
        return jsonify({"error": "No token provided"}), 400
    
    try:
        # Verify the token
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        
        # Check if the token is valid
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return jsonify({"error": "Invalid token issuer"}), 401
        
        # Get user info from the token
        user_id = idinfo['sub']
        email = idinfo.get('email')
        name = idinfo.get('name')
        given_name = idinfo.get('given_name')
        family_name = idinfo.get('family_name')
        picture = idinfo.get('picture')
        
        # Check if user exists
        user = User.query.filter_by(google_id=user_id).first()
        if not user:
            # Check if email exists
            user = User.query.filter_by(email=email).first()
            if user:
                # Update existing user with Google ID
                user.google_id = user_id
                user.profile_pic_url = picture
                if not user.name:
                    user.name = name
                if not user.given_name:
                    user.given_name = given_name
                if not user.family_name:
                    user.family_name = family_name
            else:
                # Create new user
                user = User(
                    email=email,
                    name=name,
                    given_name=given_name,
                    family_name=family_name,
                    google_id=user_id,
                    profile_pic_url=picture
                )
                db.session.add(user)
        
        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Generate JWT token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            "token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "profile_pic_url": user.profile_pic_url
            }
        })
    
    except ValueError as e:
        # Invalid token
        print(f"Google token verification error: {e}")
        return jsonify({"error": f"Invalid token: {str(e)}"}), 401
    except Exception as e:
        # Other errors
        print(f"Google login error: {e}")
        return jsonify({"error": f"Login failed: {str(e)}"}), 500