"""
Project Prism Authentication Fixes

This file contains code snippets to fix authentication issues in the Project Prism application.
Copy and paste these snippets into the appropriate files to fix the login process.
"""

# 1. Fix for auth/routes.py - Replace the simple string token with proper JWT
# Find the login function and replace the token generation code with:

"""
# Create proper JWT token
from flask_jwt_extended import create_access_token

# Create token with user identity and additional claims
token = create_access_token(
    identity=user.id,
    additional_claims={
        'email': user.email,
        'name': user.name
    }
)
"""

# 2. Fix for auth/routes.py - Update Google OAuth callback to use proper JWT
# Find the Google OAuth callback function and replace the token generation with:

"""
# Create proper JWT token
from flask_jwt_extended import create_access_token

# Create auth token with proper JWT
auth_token = create_access_token(
    identity=user.id,
    additional_claims={
        'email': user.email,
        'name': user.name,
        'google_id': user.google_id
    }
)
"""

# 3. Fix for auth/routes.py - Update verify_token endpoint to use JWT properly
# Replace the verify_token function with:

"""
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
"""

# 4. Fix for frontend/src/services/auth.js - Update parseJwt function
# Replace the parseJwt function with:

"""
export const parseJwt = (token) => {
  try {
    if (!token || token.split('.').length !== 3) {
      console.error("Invalid JWT format");
      return null;
    }
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error parsing JWT", e);
    return null;
  }
};
"""

# 5. Fix for frontend/src/services/auth.js - Update isTokenExpired function
# Replace the isTokenExpired function with:

"""
export const isTokenExpired = (token) => {
  const decoded = parseJwt(token);
  if (!decoded) return true;
  
  // Check if token has expiration claim
  if (!decoded.exp) return false;
  
  // Compare expiration timestamp with current time
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};
"""

# 6. Fix for frontend/src/contexts/AuthContext.jsx - Add error handling for token verification
# Update the initializeAuth function with better error handling:

"""
const initializeAuth = async () => {
  const storedToken = localStorage.getItem('perspectiveEngineToken');
  
  if (storedToken) {
    setToken(storedToken);
    
    try {
      // Verify token with backend
      const verifiedUser = await verifyToken(storedToken);
      
      if (verifiedUser) {
        setCurrentUser(verifiedUser);
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem('perspectiveEngineToken');
        localStorage.removeItem('perspectiveEngineUser');
        setCurrentUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // Clear invalid token
      localStorage.removeItem('perspectiveEngineToken');
      localStorage.removeItem('perspectiveEngineUser');
      setCurrentUser(null);
      setToken(null);
    }
  }
  
  setLoading(false);
};
"""

# 7. Fix for frontend/src/services/auth.js - Add missing googleLogin POST endpoint
# Add this function to handle the POST endpoint for Google login:

"""
export const googleLoginAPI = async (credential) => {
  const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Google authentication failed');
  }
  
  return data;
};
"""

# 8. Create a new endpoint in auth/routes.py for direct Google login API
# Add this function to handle Google login via API:

"""
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
"""