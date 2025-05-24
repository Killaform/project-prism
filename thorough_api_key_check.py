# thorough_api_key_check.py
import os
import re
import sys

def check_for_api_keys(directory='.'):
    """Check for hardcoded API keys in all text files"""
    # API key patterns
    api_key_patterns = [
        # SERP API key pattern (hexadecimal string)
        (r'["\']([a-f0-9]{32,})["\']', "SERP API Key"),
        
        # OpenAI API key pattern (starts with sk-)
        (r'["\']((sk|sk-org|sk-proj)-[a-zA-Z0-9-]{20,})["\']', "OpenAI API Key"),
        
        # Google/Gemini API key pattern (starts with AIza)
        (r'["\']((AIza)[a-zA-Z0-9-_]{30,})["\']', "Google/Gemini API Key")
    ]
    
    # File extensions to check
    text_extensions = ['.py', '.js', '.jsx', '.ts', '.tsx', '.json', '.yml', '.yaml', '.md', '.txt', '.html', '.css', '.env']
    
    # Files to skip
    skip_files = ['.env', '.env.example', 'check_and_fix_api_keys.py', 'thorough_api_key_check.py']
    
    # Directories to skip
    skip_dirs = ['venv', 'node_modules', '.git', '__pycache__']
    
    # Results
    files_with_keys = []
    
    # Walk through all files
    for root, dirs, files in os.walk(directory):
        # Skip directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            # Skip binary files and specific files
            if file in skip_files:
                continue
                
            # Check if it's a text file by extension
            if not any(file.endswith(ext) for ext in text_extensions):
                continue
                
            file_path = os.path.join(root, file)
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                for pattern, key_type in api_key_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        for match in matches:
                            key = match[0] if isinstance(match, tuple) else match
                            files_with_keys.append((file_path, key_type, key))
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    
    # Report results
    if files_with_keys:
        print(f"Found potential API keys in {len(files_with_keys)} instances:")
        for file_path, key_type, key in files_with_keys:
            print(f"  - {file_path}: {key_type} - {key[:5]}...{key[-5:]}")
        return False
    else:
        print("No hardcoded API keys found.")
        return True

if __name__ == "__main__":
    safe = check_for_api_keys()
    if safe:
        print("\nSafe to commit!")
    else:
        print("\nWARNING: Please fix the hardcoded API keys before committing!")
        sys.exit(1)
