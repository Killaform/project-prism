from perspective_engine.app import create_app

if __name__ == '__main__':
    app = create_app()
    print("Starting Perspective Engine API server...")
    app.run(host='0.0.0.0', port=5001, debug=True)
