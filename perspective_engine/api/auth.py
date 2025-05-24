from flask_restful import Resource
from flask import request, jsonify, session, url_for
from datetime import datetime, timezone

class GoogleAuthResource(Resource):
    def get(self):
        """Initiate Google OAuth flow"""
        from flask import current_app
        from perspective_engine.extensions import oauth
        
        frontend_url = request.args.get('redirect_url', 'http://localhost:5173')
        session['auth_redirect_url'] = frontend_url
        
        # Use absolute URL with http://localhost:5001 explicitly
        redirect_uri = "http://localhost:5001/auth/google/callback"
        
        return oauth.google.authorize_redirect(redirect_uri)

class GoogleCallbackResource(Resource):
    def get(self):
        """Handle Google OAuth callback"""
        from flask import current_app
        from perspective_engine.extensions import oauth, db
        from flask_jwt_extended import create_access_token
        
        try:
            token = oauth.google.authorize_access_token()
            user_info = token.get('userinfo')
            
            if not user_info:
                return return_oauth_error("No user information received")
            
            # This is a stub implementation - in production, this would use the actual user model
            # For now, just return a simple response
            auth_token = "dummy_token"
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
    </body>
    </html>
    """

def register_auth_routes(app):
    """Register non-resource auth routes"""
    # Add any additional auth routes here
    pass