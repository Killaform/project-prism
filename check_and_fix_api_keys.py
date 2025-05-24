# check_and_fix_api_keys.py
import os
import re
import sys

def check_and_fix_api_keys(directory='.'):
    """Check for and fix hardcoded API keys in Python files"""
    api_key_patterns = [
        # SERP API key pattern (hexadecimal string)
        (r'api_key\s*=\s*["\']([a-f0-9]{32,})["\']', 
         'api_key = os.getenv("SERPAPI_KEY", "YOUR_SERPAPI_KEY_HERE")'),
        
        # OpenAI API key pattern (starts with sk-)
        (r'api_key\s*=\s*["\']((sk|sk-org)-[a-zA-Z0-9-]{20,})["\']', 
         'api_key = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_KEY_HERE")'),
        
        # Google/Gemini API key pattern (starts with AIza)
        (r'api_key\s*=\s*["\']((AIza)[a-zA-Z0-9-_]{30,})["\']', 
         'api_key = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_KEY_HERE")')
    ]
    
    # Ensure .env is in .gitignore
    if os.path.exists('.gitignore'):
        with open('.gitignore', 'r') as f:
            gitignore_content = f.read()
        
        if '.env' not in gitignore_content:
            with open('.gitignore', 'a') as f:
                f.write('\n# Environment variables\n.env\n')
            print("Added .env to .gitignore")
    else:
        with open('.gitignore', 'w') as f:
            f.write('# Environment variables\n.env\n')
        print("Created .gitignore with .env entry")
    
    # Create .env.example if it doesn't exist
    if not os.path.exists('.env.example'):
        with open('.env.example', 'w') as f:
            f.write('''# API Keys
SERPAPI_KEY=your_serpapi_key_here
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here

# Security
SECRET_KEY=your_secret_key_here

# Frontend URL
FRONTEND_URL=http://localhost:5173
''')
        print("Created .env.example template")
    
    # Walk through all Python files
    files_with_keys = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                
                # Skip virtual environment files
                if 'venv' in file_path or 'env' in file_path:
                    continue
                
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                modified = False
                for pattern, replacement in api_key_patterns:
                    if re.search(pattern, content):
                        content = re.sub(pattern, replacement, content)
                        modified = True
                        files_with_keys.append(file_path)
                
                # Add import os if needed
                if modified and 'import os' not in content:
                    content = 'import os\n' + content
                
                # Write back the file if modified
                if modified:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
    
    # Report results
    if files_with_keys:
        print(f"Fixed hardcoded API keys in {len(files_with_keys)} files:")
        for file in files_with_keys:
            print(f"  - {file}")
    else:
        print("No hardcoded API keys found.")
    
    print("\nSafe to commit now!")

if __name__ == "__main__":
    check_and_fix_api_keys()
