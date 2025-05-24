import re

def inject_auth_fixes():
    """Automatically inject authentication fixes into app.py"""
    
    # Read the current app.py file
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("app.py not found. Please make sure you're in the correct directory.")
        return False
    
    # Check and add missing imports
    imports_to_add = []
    
    if 'from flask import' in content:
        # Find the existing flask import line
        flask_import_match = re.search(r'from flask import ([^\n]+)', content)
        if flask_import_match:
            existing_imports = flask_import_match.group(1)
            if 'url_for' not in existing_imports:
                imports_to_add.append('url_for')
            if 'session' not in existing_imports:
                imports_to_add.append('session')
            if 'request' not in existing_imports:
                imports_to_add.append('request')
            
            if imports_to_add:
                new_import_line = flask_import_match.group(0) + ', ' + ', '.join(imports_to_add)
                content = content.replace(flask_import_match.group(0), new_import_line)
    
    # Add JWT import if missing
    if 'from flask_jwt_extended import create_access_token' not in content:
        jwt_import = 'from flask_jwt_extended import create_access_token'
        # Find a good place to insert (after other imports)
        import_section = re.search(r'(from flask[^\n]*\n)', content)
        if import_section:
            content = content.replace(import_section.group(0), 
                                    import_section.group(0) + jwt_import + '\n')
    
    # Add datetime import if missing
    if 'from datetime import datetime, timezone' not in content:
        datetime_import = 'from datetime import datetime, timezone'
        import_section = re.search(r'(from flask[^\n]*\n)', content)
        if import_section:
            content = content.replace(import_section.group(0), 
                                    import_section.group(0) + datetime_import + '\n')
    
    # Add the helper function
    helper_function = '''
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
'''
    
    # Add Google OAuth routes
    oauth_routes = '''
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
'''
    
    # Find where to insert the new code (before the main block)
    if 'if __name__ == \'__main__\':' in content:
        content = content.replace('if __name__ == \'__main__\':', 
                                helper_function + '\n' + oauth_routes + '\n\nif __name__ == \'__main__\':')
    else:
        # Append to the end
        content += helper_function + '\n' + oauth_routes
    
    # Write the updated content back
    try:
        with open('app.py', 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Authentication fixes successfully injected into app.py")
        return True
    except Exception as e:
        print(f"❌ Error writing to app.py: {e}")
        return False

if __name__ == "__main__":
    inject_auth_fixes()