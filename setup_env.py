"""
Script to set up environment variables for Project Prism
"""
import os
import sys

def main():
    # Check if .env file exists
    if os.path.exists('.env'):
        print("An .env file already exists. Do you want to overwrite it? (y/n)")
        response = input().lower()
        if response != 'y':
            print("Operation cancelled.")
            return
    
    # Get API keys from user
    print("\n=== API Keys Setup ===")
    print("Enter your API keys (leave blank to skip):")
    
    serpapi_key = input("SERP API Key: ").strip()
    openai_key = input("OpenAI API Key: ").strip()
    gemini_key = input("Google Gemini API Key: ").strip()
    
    # Create .env file
    with open('.env', 'w') as f:
        f.write("# API Keys\n")
        if serpapi_key:
            f.write(f"SERPAPI_KEY={serpapi_key}\n")
        if openai_key:
            f.write(f"OPENAI_API_KEY={openai_key}\n")
        if gemini_key:
            f.write(f"GEMINI_API_KEY={gemini_key}\n")
        
        f.write("\n# Security\n")
        f.write("SECRET_KEY=dev_secret_key_change_in_production\n")
        
        f.write("\n# Frontend URL\n")
        f.write("FRONTEND_URL=http://localhost:5173\n")
    
    print("\n.env file created successfully!")
    print("API keys have been saved to the .env file.")
    
    # Instructions
    print("\n=== Next Steps ===")
    print("1. Restart your server: python run.py")
    print("2. Try searching and fact-checking again")
    print("\nNote: The application will now use these API keys directly from environment variables.")

if __name__ == "__main__":
    main()