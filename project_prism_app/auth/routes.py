# C:\Perspective-Engine\perspective_engine_app\auth\routes.py
from flask import Blueprint, request, jsonify, redirect, url_for, session, current_app
from flask_login import login_user, logout_user, current_user, login_required
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timezone
import os
import jwt

# Import from parent package
from .. import db, oauth
from ..models import User

auth_bp = Blueprint('auth_bp', __name__)

# Initialize bcrypt
bcrypt = Bcrypt()

@auth_bp.route('/test')
def test():
    return "Auth blueprint is working!"

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        print(f"Registration attempt for email: {email}")
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
            
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'User already exists with this email'}), 400
            
        # Create new user
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            email=email,
            password_hash=password_hash,
            name=email.split('@')[0],  # Use part before @ as default name
            created_at=datetime.now(timezone.utc)
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"Successfully created user: {email}")
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'name': new_user.name
            }
        }), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        print(f"Login attempt for email: {email}")
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
            
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"User not found: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401
            
        if not user.password_hash:
            print(f"User has no password (OAuth user): {email}")
            return jsonify({'error': 'Please use Google login for this account'}), 401
            
        if not bcrypt.check_password_hash(user.password_hash, password):
            print(f"Invalid password for user: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401
            
        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Replace simple token with proper JWT
        token = create_access_token(
            identity=user.id,
            additional_claims={
                'email': user.email,
                'name': user.name
            }
        )
        
        print(f"Successful login for user: {email}")
        
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
        print(f"Login error: {e}")
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/google')
def google_auth():
    """Initiate Google OAuth flow"""
    try:
        # Check if OAuth is configured
        if not hasattr(oauth, 'google'):
            return return_oauth_error("Google OAuth not configured")
        
        # Store the frontend URL to redirect back to after auth
        frontend_url = request.args.get('redirect_url', current_app.config.get('FRONTEND_URL', 'http://localhost:5173'))
        session['auth_redirect_url'] = frontend_url
        
        redirect_uri = url_for('auth_bp.google_callback', _external=True)
        print(f"Google OAuth: Redirecting to Google with callback URL: {redirect_uri}")
        
        return oauth.google.authorize_redirect(redirect_uri)
        
    except Exception as e:
        print(f"Google OAuth initiation error: {e}")
        return return_oauth_error(f"OAuth initialization failed: {str(e)}")

@auth_bp.route('/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    try:
        # Get token from Google
        token = oauth.google.authorize_access_token()
        user_info = token.get('userinfo')
        
        if not user_info:
            print("Google OAuth: No user info received")
            return return_oauth_error("No user information received from Google")
        
        print(f"Google OAuth: User info received for {user_info.get('email')}")
        
        # Find or create user
        user = User.query.filter_by(google_id=user_info['sub']).first()
        
        if not user:
            # Check if user exists with same email
            user = User.query.filter_by(email=user_info['email']).first()
            if user:
                # Link Google account to existing user
                user.google_id = user_info['sub']
                user.profile_pic_url = user_info.get('picture', '')
                print(f"Google OAuth: Linked Google account to existing user {user.email}")
            else:
                # Create new user
                user = User(
                    google_id=user_info['sub'],
                    email=user_info['email'],
                    name=user_info.get('name', ''),
                    given_name=user_info.get('given_name', ''),
                    family_name=user_info.get('family_name', ''),
                    profile_pic_url=user_info.get('picture', ''),
                    created_at=datetime.now(timezone.utc)
                )
                db.session.add(user)
                print(f"Google OAuth: Created new user {user.email}")
        
        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Replace token generation with proper JWT
        auth_token = create_access_token(
            identity=user.id,
            additional_claims={
                'email': user.email,
                'name': user.name,
                'google_id': user.google_id
            }
        )
        
        # Get frontend URL
        frontend_url = session.get('auth_redirect_url', 'http://localhost:5173')
        
        print(f"Google OAuth: Success for user {user.email}, closing popup")
        
        # Create a success page that closes the popup and sends data to parent
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Successful</title>
            <style>
                body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                .success {{ color: green; }}
            </style>
        </head>
        <body>
            <div class="success">
                <h3>✓ Authentication Successful!</h3>
                <p>Welcome, {user.name or user.email}!</p>
                <p>This window will close automatically...</p>
            </div>
            <script>
                console.log('Google OAuth success, sending message to parent window');
                
                // Send auth data to parent window
                window.opener.postMessage({{
                    type: 'GOOGLE_AUTH_SUCCESS',
                    payload: {{
                        token: '{auth_token}',
                        userId: '{user.id}',
                        email: '{user.email}',
                        name: '{user.name or user.email}',
                        profilePic: '{user.profile_pic_url or ''}'
                    }}
                }}, '{frontend_url}');
                
                // Close window after short delay
                setTimeout(() => {{
                    window.close();
                }}, 1000);
            </script>
        </body>
        </html>
        """
        
    except Exception as e:
        print(f"Google OAuth callback error: {e}")
        return return_oauth_error(f"Authentication failed: {str(e)}")

def return_oauth_error(error_message):
    """Helper function to return OAuth error"""
    frontend_url = session.get('auth_redirect_url', 'http://localhost:5173')
    return f"""
    <!DOCTYPE html>
    <html>
    <head><title>Authentication Error</title></head>
    <body>
        <script>
            window.opener.postMessage({{
                type: 'GOOGLE_AUTH_ERROR',
                message: '{error_message}'
            }}, '{frontend_url}');
            window.close();
        </script>
        <p>Authentication error: {error_message}</p>
        <p>This window should close automatically.</p>
    </body>
    </html>
    """

@auth_bp.route('/logout', methods=['POST'])
def logout():
    try:
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify if a token is valid using JWT"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'valid': True,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'profile_pic_url': user.profile_pic_url
        }
    }), 200

@auth_bp.route('/google-login', methods=['POST'])
def google_login_api():
    """Handle Google login via API (alternative to popup flow)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        credential = data.get('credential')
        if not credential:
            return jsonify({'error': 'Google credential is required'}), 400
        
        # Verify the Google token with Google's API
        # This is a simplified example - in production, verify the token with Google
        # https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
        
        # For now, extract user info from the token (in production, verify first)
        try:
            # This would be replaced with proper verification
            import jwt
            user_info = jwt.decode(credential, options={"verify_signature": False})
            
            # Find or create user based on Google ID
            user = User.query.filter_by(email=user_info['email']).first()
            
            if not user:
                # Create new user
                user = User(
                    email=user_info['email'],
                    name=user_info.get('name', ''),
                    google_id=user_info.get('sub', ''),
                    profile_pic_url=user_info.get('picture', ''),
                    created_at=datetime.now(timezone.utc)
                )
                db.session.add(user)
            else:
                # Update existing user with Google info
                user.google_id = user_info.get('sub', '')
                user.name = user_info.get('name', user.name)
                user.profile_pic_url = user_info.get('picture', user.profile_pic_url)
            
            # Update last login
            user.last_login_at = datetime.now(timezone.utc)
            db.session.commit()
            
            # Create JWT token
            token = create_access_token(
                identity=user.id,
                additional_claims={
                    'email': user.email,
                    'name': user.name,
                    'google_id': user.google_id
                }
            )
            
            return jsonify({
                'message': 'Google login successful',
                'token': token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                    'profile_pic_url': user.profile_pic_url
                }
            }), 200
            
        except Exception as e:
            print(f"Error processing Google credential: {e}")
            return jsonify({'error': 'Invalid Google credential'}), 400
            
    except Exception as e:
        print(f"Google login API error: {e}")
        return jsonify({'error': f'Google login failed: {str(e)}'}), 500
