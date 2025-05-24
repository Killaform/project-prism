from project_prism_app import create_app
import os

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"Starting Perspective Engine server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)