"""
Script to clear environment variable cache and update .env file
"""
import os
import sys

def clear_env_cache():
    """Clear environment variables and update .env file"""
    # Get the new API key
    print("Enter your new SERP API key:")
    new_key = input().strip()
    
    if not new_key:
        print("No key entered. Exiting.")
        return
    
    # Update .env file
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    new_env_content = []
    
    if os.path.exists(env_path):
        # Read existing .env file
        with open(env_path, 'r') as f:
            lines = f.readlines()
            
        # Update or add SERPAPI_KEY
        key_found = False
        for line in lines:
            if line.strip().startswith('SERPAPI_KEY='):
                new_env_content.append(f'SERPAPI_KEY={new_key}\n')
                key_found = True
            else:
                new_env_content.append(line)
                
        if not key_found:
            new_env_content.append(f'SERPAPI_KEY={new_key}\n')
    else:
        # Create new .env file
        new_env_content = [f'SERPAPI_KEY={new_key}\n']
    
    # Write updated .env file
    with open(env_path, 'w') as f:
        f.writelines(new_env_content)
    
    print(f"Updated .env file with new SERP API key")
    
    # Clear environment variables in current process
    if 'SERPAPI_KEY' in os.environ:
        del os.environ['SERPAPI_KEY']
        print("Cleared SERPAPI_KEY from environment")
    
    # Set the new key in the current process
    os.environ['SERPAPI_KEY'] = new_key
    print("Set new SERPAPI_KEY in environment")
    
    print("\nRestart your server for the changes to take effect.")

if __name__ == "__main__":
    clear_env_cache()