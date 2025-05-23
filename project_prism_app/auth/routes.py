# C:\Perspective-Engine\perspective_engine_app\auth\routes.py
from flask import Blueprint, redirect, url_for, session, current_app, jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from datetime import datetime 

from .. import oauth, db 
from ..models import User 

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/google/login')
def google_login():
    redirect_uri = url_for('auth_bp.google_authorize_callback', _external=True) 
    print(f"Auth: Attempting Google login. Redirect URI for Google: {redirect_uri}")
    if 'google' not in oauth._clients:
         print("Auth: CRITICAL - Google OAuth client not registered in Authlib instance during create_app.")
         return "Google OAuth is not configured correctly on the server. Please check server logs.", 500
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/google/callback') 
def google_authorize_callback(): 
    try:
        token = oauth.google.authorize_access_token()
        if not token:
            print("Auth: Google OAuth failed to authorize access token.")
            return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:5173')}/login?error=token_authorization_failed")

        userinfo_response = oauth.google.get('https://www.googleapis.com/oauth2/v3/userinfo')
        userinfo_response.raise_for_status() 
        user_google_info = userinfo_response.json()

        google_id = user_google_info.get('sub')
        email = user_google_info.get('email')
        name = user_google_info.get('name')
        given_name = user_google_info.get('given_name')
        family_name = user_google_info.get('family_name')
        profile_pic_url = user_google_info.get('picture')

        if not google_id or not email:
            print("Auth: Critical information (google_id or email) missing from Google userinfo.")
            return redirect(f"{current_app.config.get('FRONTEND_URL', 'http://localhost:5173')}/login?error=missing_google_info")

        user = User.query.filter_by(google_id=google_id).first()
        if user:
            user.email = email 
            user.name = name
            user.given_name = given_name
            user.family_name = family_name
            user.profile_pic_url = profile_pic_url
            user.last_login_at = datetime.utcnow()
            print(f"Auth: Existing user {user.email} found. Updating last login.")
        else:
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                given_name=given_name,
                family_name=family_name,
                profile_pic_url=profile_pic_url
            )
            db.session.add(user)
            print(f"Auth: New user {user.email} created.")
        
        db.session.commit() 
        login_user(user, remember=True) 
        print(f"Auth: User {user.email} logged in successfully via Google session.")
        
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(frontend_url)

    except Exception as e:
        print(f"Auth: Error during Google OAuth callback processing: {type(e).__name__} - {e}")
        db.session.rollback() 
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}/login?error=google_oauth_failed_internal") 


@auth_bp.route('/logout', methods=['POST']) 
@login_required 
def logout():
    try:
        user_email_for_log = current_user.email if current_user.is_authenticated else "Unknown user"
        logout_user() 
        print(f"Auth: User {user_email_for_log} logged out successfully.")
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        print(f"Auth: Error during logout: {type(e).__name__} - {e}")
        return jsonify({"error": "Logout failed due to an internal error"}), 500


@auth_bp.route('/me', methods=['GET']) 
@login_required 
def me():
    if current_user.is_authenticated:
        return jsonify({
            "id": current_user.id, 
            "google_id": current_user.google_id,
            "email": current_user.email,
            "name": current_user.name,
            "given_name": current_user.given_name,
            "family_name": current_user.family_name,
            "profile_pic_url": current_user.profile_pic_url,
            "is_authenticated": True
        })
    else:
        # The erroneous JavaScript comment was here and has been removed.
        # This block is typically not reached if @login_required works.
        return jsonify({"error": "User not authenticated"}), 401 

@auth_bp.route('/hello-auth')
def hello_auth():
    return "Hello from the Auth Blueprint! If you see this, blueprint registration worked."
