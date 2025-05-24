"""
Add this code to app.py after the OAuth initialization section
"""

@app.route('/auth/google')
def google_auth():
    """Initiate Google OAuth flow"""
    try:
        # Store the frontend URL to redirect back to after auth
        frontend_url = request.args.get('redirect_url', 'http://localhost:5173')
        session['auth_redirect_url'] = frontend_url
        
        redirect_uri = url_for('google_callback', _external=True)
        print(f"Google OAuth: Redirecting to Google with callback URL: {redirect_uri}")
        
        return oauth.google.authorize_redirect(redirect_uri)
        
    except Exception as e:
        print(f"Google OAuth initiation error: {e}")
        return return_oauth_error(f"OAuth initialization failed: {str(e)}")

@app.route('/auth/google/callback')
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
        
        # Create JWT token
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