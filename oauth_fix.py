"""
Fix for Google OAuth redirect_uri_mismatch error
"""

# Update the redirect_uri in your google_auth function:
@app.route('/auth/google')
def google_auth():
    """Initiate Google OAuth flow"""
    frontend_url = request.args.get('redirect_url', 'http://localhost:5173')
    session['auth_redirect_url'] = frontend_url
    
    # Use absolute URL with http://localhost:5001 explicitly
    redirect_uri = "http://localhost:5001/auth/google/callback"
    print(f"Google OAuth: Redirecting to Google with callback URL: {redirect_uri}")
    
    return oauth.google.authorize_redirect(redirect_uri)

# Make sure your Google Cloud Console OAuth configuration has exactly this redirect URI:
# http://localhost:5001/auth/google/callback

# Instructions:
# 1. Go to Google Cloud Console: https://console.cloud.google.com/
# 2. Select your project
# 3. Go to "APIs & Services" > "Credentials"
# 4. Edit your OAuth 2.0 Client ID
# 5. Add "http://localhost:5001/auth/google/callback" to Authorized redirect URIs
# 6. Save changes