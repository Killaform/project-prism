import os

def find_env_files(start_dir='.'):
    """Find all .env files in the project"""
    env_files = []
    
    for root, dirs, files in os.walk(start_dir):
        for file in files:
            if file.endswith('.env') or file == '.env':
                full_path = os.path.join(root, file)
                env_files.append(full_path)
                
                # Try to read the file to see if it contains SERPAPI_KEY
                try:
                    with open(full_path, 'r') as f:
                        content = f.read()
                        if 'SERPAPI_KEY' in content:
                            print(f"Found SERPAPI_KEY in {full_path}")
                except:
                    print(f"Could not read {full_path}")
    
    return env_files

if __name__ == "__main__":
    env_files = find_env_files()
    
    print(f"\nFound {len(env_files)} .env files:")
    for file in env_files:
        print(f"- {file}")