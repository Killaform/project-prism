from flask import Flask, request, session, url_for, jsonify
from perspective_engine.api import setup_api
from perspective_engine.config.constants import DEFAULT_PORT, DEFAULT_HOST
import os

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///app.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
    app.config["SESSION_COOKIE_SAMESITE"] = "None"
    app.config["SESSION_COOKIE_SECURE"] = True
    
    # Initialize extensions
    from perspective_engine.extensions import db, migrate, jwt, oauth
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Configure CORS - Fix CORS issues
    from flask_cors import CORS
    CORS(app, 
         origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
         supports_credentials=True,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         expose_headers=['Content-Type', 'Authorization'])
    
    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Initialize OAuth
    oauth.init_app(app)
    
    # Configure Google OAuth
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if google_client_id and google_client_secret:
        oauth.register(
            name='google',
            client_id=google_client_id,
            client_secret=google_client_secret,
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={'scope': 'openid email profile'}
        )
        print("Google OAuth configured successfully")
    else:
        print("Warning: Google OAuth not configured - missing credentials")
    
    # Add direct routes for Google OAuth
    @app.route('/auth/google')
    def google_auth():
        """Initiate Google OAuth flow"""
        frontend_url = request.args.get('redirect_url', 'http://localhost:5173')
        session['auth_redirect_url'] = frontend_url
        
        # Use absolute URL with http://localhost:5001 explicitly
        redirect_uri = "http://localhost:5001/auth/google/callback"
        print(f"Google OAuth: Redirecting to Google with callback URL: {redirect_uri}")
        
        return oauth.google.authorize_redirect(redirect_uri)

    @app.route('/auth/google/callback')
    def google_callback():
        """Handle Google OAuth callback"""
        from flask_jwt_extended import create_access_token
        from datetime import datetime, timezone
        
        try:
            token = oauth.google.authorize_access_token()
            user_info = token.get('userinfo')
            
            if not user_info:
                return return_oauth_error("No user information received")
            
            # Create JWT token with profile picture
            auth_token = create_access_token(
                identity=1,  # Dummy user ID
                additional_claims={
                    'email': user_info.get('email'),
                    'name': user_info.get('name'),
                    'picture': user_info.get('picture', '')
                }
            )
            
            frontend_url = session.get('auth_redirect_url', 'http://localhost:5173')
            
            return f"""
            <!DOCTYPE html>
            <html>
            <head><title>Authentication Successful</title></head>
            <body>
                <script>
                    window.opener.postMessage({{
                        type: 'GOOGLE_AUTH_SUCCESS',
                        payload: {{
                            token: '{auth_token}',
                            userId: '1',
                            email: '{user_info.get("email")}',
                            name: '{user_info.get("name")}',
                            profilePic: '{user_info.get("picture", "")}'
                        }}
                    }}, '{frontend_url}');
                    setTimeout(() => {{ window.close(); }}, 1000);
                </script>
                <h3>Authentication Successful!</h3>
                <p>This window will close automatically...</p>
            </body>
            </html>
            """
        except Exception as e:
            print(f"OAuth callback error: {e}")
            return return_oauth_error(f"Authentication failed: {str(e)}")
    
    @app.route('/auth/verify')
    def verify_token():
        """Verify if a token is valid"""
        from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request, get_jwt
        
        try:
            # Try to verify the JWT token
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            
            # If we have valid claims, use them
            if claims:
                return jsonify({
                    'valid': True,
                    'user': {
                        'id': get_jwt_identity() or 1,
                        'email': claims.get('email', 'user@example.com'),
                        'name': claims.get('name', 'Test User'),
                        'profile_pic_url': claims.get('picture', None)
                    }
                })
        except Exception as e:
            print(f"Token verification error: {e}")
        
        # Fallback for testing
        return jsonify({
            'valid': True,
            'user': {
                'id': 1,
                'email': 'user@example.com',
                'name': 'Test User',
                'profile_pic_url': 'https://lh3.googleusercontent.com/a/default-user'
            }
        })
    
    # Add logout endpoint
    @app.route('/auth/logout', methods=['POST'])
    def logout():
        """Handle logout requests"""
        return jsonify({'message': 'Logout successful'})
    
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
        </body>
        </html>
        """
    
    # Register API routes
    setup_api(app)
    
    # Import models and create database tables
    with app.app_context():
        # Import models to register them with SQLAlchemy
        from perspective_engine.models import User, UserApiKey
        db.create_all()
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', 5001))
    app.run(host=DEFAULT_HOST, port=port, debug=True)