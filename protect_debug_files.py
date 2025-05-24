# protect_debug_files.py
import os
import re
import glob
import subprocess

def protect_debug_files():
    """Protect debug and repair files from being committed"""
    print("=== Protecting Debug and Repair Files ===\n")
    
    # 1. Create debug_tools directory if it doesn't exist
    if not os.path.exists('debug_tools'):
        os.makedirs('debug_tools')
        print("Created debug_tools directory")
    
    # 2. Update .gitignore file
    gitignore_entries = [
        "# Debug and repair tools",
        "debug_tools/",
        "debug_*.py",
        "fix_*.py",
        "reset_*.py",
        "check_*.py",
        "deep_*.py",
        "thorough_*.py",
        "restart_server.*",
        "*.bat",
        "*.sh",
        "test_*.py"
    ]
    
    # Read existing .gitignore
    existing_entries = []
    if os.path.exists('.gitignore'):
        with open('.gitignore', 'r') as f:
            existing_entries = [line.strip() for line in f.readlines()]
    
    # Add new entries if they don't exist
    with open('.gitignore', 'a') as f:
        for entry in gitignore_entries:
            if entry not in existing_entries:
                f.write(f"{entry}\n")
                print(f"Added '{entry}' to .gitignore")
    
    # 3. Find all debug and repair files
    debug_patterns = [
        'debug_*.py', 'fix_*.py', 'reset_*.py', 'check_*.py',
        'deep_*.py', 'thorough_*.py', 'test_*.py',
        'restart_server.*', '*.bat', '*.sh'
    ]
    
    debug_files = []
    for pattern in debug_patterns:
        debug_files.extend(glob.glob(pattern))
    
    # 4. Move files to debug_tools directory
    for file in debug_files:
        if os.path.isfile(file) and not file == 'protect_debug_files.py':
            target_path = os.path.join('debug_tools', file)
            
            # Read file content to check for API keys
            with open(file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Check if file contains API keys
            api_key_patterns = [
                r'["\']([a-f0-9]{32,})["\']',  # SERP API key pattern
                r'["\']((sk|sk-org|sk-proj)-[a-zA-Z0-9-]{20,})["\']',  # OpenAI API key pattern
                r'["\']((AIza)[a-zA-Z0-9-_]{30,})["\']'  # Google/Gemini API key pattern
            ]
            
            contains_api_key = False
            for pattern in api_key_patterns:
                if re.search(pattern, content):
                    contains_api_key = True
                    break
            
            # Copy file to debug_tools
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"Copied '{file}' to debug_tools/ directory")
            
            # If file contains API keys, remove the original
            if contains_api_key:
                os.remove(file)
                print(f"Removed original '{file}' as it contains API keys")
    
    # 5. Remove files from Git tracking if they were previously committed
    try:
        for pattern in debug_patterns:
            subprocess.run(['git', 'rm', '--cached', pattern], 
                          stdout=subprocess.PIPE, 
                          stderr=subprocess.PIPE)
        print("Removed debug files from Git tracking (if they were tracked)")
    except Exception as e:
        print(f"Note: Could not remove files from Git tracking: {e}")
    
    print("\nAll debug and repair files are now protected from being committed!")
    print("You can find them in the debug_tools/ directory.")

if __name__ == "__main__":
    protect_debug_files()
