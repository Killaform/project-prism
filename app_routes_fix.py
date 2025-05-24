"""
This file contains the minimal code needed to fix the Google OAuth routes in app.py.
Add these imports at the top of app.py if they're not already there:
"""

from flask import url_for, session
from flask_jwt_extended import create_access_token

"""
Then add these routes to app.py right after the OAuth initialization section:
"""

@app.route('/auth/google')
def google_auth():
    """Initiate Google OAuth flow"""
    frontend_url = request.args.get('redirect_url', 'http://localhost:5173')
    session['auth_redirect_url'] = frontend_url
    redirect_uri = url_for('google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@app.route('/auth/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    try:
        token = oauth.google.authorize_access_token()
        user_info = token.get('userinfo')
        
        if not user_info:
            return return_oauth_error("No user information received")
        
        # Find or create user
        user = User.query.filter_by(google_id=user_info['sub']).first()
        
        if not user:
            user = User.query.filter_by(email=user_info['email']).first()
            if user:
                user.google_id = user_info['sub']
                user.profile_pic_url = user_info.get('picture', '')
            else:
                user = User(
                    google_id=user_info['sub'],
                    email=user_info['email'],
                    name=user_info.get('name', ''),
                    profile_pic_url=user_info.get('picture', ''),
                    created_at=datetime.now(timezone.utc)
                )
                db.session.add(user)
        
        user.last_login_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Create JWT token
        auth_token = create_access_token(
            identity=user.id,
            additional_claims={
                'email': user.email,
                'name': user.name
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
                        userId: '{user.id}',
                        email: '{user.email}',
                        name: '{user.name or user.email}',
                        profilePic: '{user.profile_pic_url or ""}'
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