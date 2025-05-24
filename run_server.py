from project_prism_app import create_app
import os

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', 5001))
    
    print(f"Starting Perspective Engine server on port {port}")
    print(f"Google Client ID: {os.getenv('GOOGLE_CLIENT_ID', 'NOT SET')}")
    print(f"Available routes:")
    
    for rule in app.url_map.iter_rules():
        print(f"  {rule.methods} {rule.rule}")
    
    app.run(host='0.0.0.0', port=port, debug=True)