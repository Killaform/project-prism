# C:\Perspective-Engine\perspective_engine_app\auth\routes.py
from flask import Blueprint, request, jsonify, redirect, url_for, session, current_app
from flask_login import login_user, logout_user, current_user, login_required
from flask_bcrypt import Bcrypt
from authlib.integrations.flask_client import OAuth
from ..models import User, db
import requests
import json
from datetime import datetime, timezone

auth_bp = Blueprint('auth_bp', __name__)
bcrypt = Bcrypt()

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
            
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'User already exists with this email'}), 400
            
        # Create new user
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            email=email,
            password_hash=password_hash,
            name=email.split('@')[0]  # Use part before @ as default name
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'name': new_user.name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
            
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401
            
        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Create token (simplified - in production use proper JWT)
        token = f"user_{user.id}_{user.email}"
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'profile_pic_url': user.profile_pic_url
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/google')
def google_auth():
    """Initiate Google OAuth flow"""
    from .. import oauth
    
    # Store the frontend URL to redirect back to after auth
    frontend_url = request.args.get('redirect_url', current_app.config.get('FRONTEND_URL', 'http://localhost:5173'))
    session['auth_redirect_url'] = frontend_url
    
    redirect_uri = url_for('auth_bp.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    try:
        from .. import oauth
        
        # Get token from Google
        token = oauth.google.authorize_access_token()
        user_info = token.get('userinfo')
        
        if not user_info:
            return redirect(f"{session.get('auth_redirect_url', 'http://localhost:5173')}?error=oauth_failed")
        
        # Find or create user
        user = User.query.filter_by(google_id=user_info['sub']).first()
        
        if not user:
            # Check if user exists with same email
            user = User.query.filter_by(email=user_info['email']).first()
            if user:
                # Link Google account to existing user
                user.google_id = user_info['sub']
            else:
                # Create new user
                user = User(
                    google_id=user_info['sub'],
                    email=user_info['email'],
                    name=user_info.get('name', ''),
                    given_name=user_info.get('given_name', ''),
                    family_name=user_info.get('family_name', ''),
                    profile_pic_url=user_info.get('picture', '')
                )
                db.session.add(user)
        
        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Create auth token
        auth_token = f"google_{user.id}_{user.email}"
        
        # Redirect to frontend with auth data
        frontend_url = session.get('auth_redirect_url', 'http://localhost:5173')
        
        # Create a success page that closes the popup and sends data to parent
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Successful</title>
        </head>
        <body>
            <script>
                // Send auth data to parent window
                window.opener.postMessage({{
                    type: 'GOOGLE_AUTH_SUCCESS',
                    payload: {{
                        token: '{auth_token}',
                        userId: '{user.id}',
                        email: '{user.email}',
                        name: '{user.name}',
                        profilePic: '{user.profile_pic_url or ''}'
                    }}
                }}, '{frontend_url}');
                window.close();
            </script>
            <p>Authentication successful! This window should close automatically.</p>
        </body>
        </html>
        """
        
    except Exception as e:
        print(f"Google OAuth error: {e}")
        frontend_url = session.get('auth_redirect_url', 'http://localhost:5173')
        return redirect(f"{frontend_url}?error=oauth_error")

@auth_bp.route('/logout', methods=['POST'])
def logout():
    try:
        # In a real app, you'd invalidate the token here
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500

@auth_bp.route('/verify', methods=['GET'])
def verify_token():
    """Verify if a token is valid"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No valid token provided'}), 401
    
    token = auth_header.replace('Bearer ', '')
    
    # Simple token validation (in production, use proper JWT)
    if token.startswith('user_') or token.startswith('google_'):
        try:
            parts = token.split('_')
            user_id = int(parts[1])
            user = User.query.get(user_id)
            
            if user:
                return jsonify({
                    'valid': True,
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.name,
                        'profile_pic_url': user.profile_pic_url
                    }
                }), 200
        except:
            pass
    
    return jsonify({'error': 'Invalid token'}), 401

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
