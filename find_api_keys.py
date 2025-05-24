"""
Script to find all instances of API keys in the project
"""
import os
import re
import sys

def search_file(file_path):
    """Search a file for potential API keys"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
            # Look for environment variables
            env_matches = re.findall(r'SERPAPI_KEY["\'\s]*=["\'\s]*(.*?)["\'\s]*', content)
            if env_matches:
                print(f"Found SERPAPI_KEY in {file_path}: {env_matches}")
                
            # Look for direct API key patterns
            api_matches = re.findall(r'api_key["\'\s]*=["\'\s]*(.*?)["\'\s]*', content)
            if api_matches:
                print(f"Found api_key in {file_path}: {api_matches}")
                
            # Look for SerpAPI client initialization
            serp_matches = re.findall(r'SerpApiClient\((.*?)\)', content, re.DOTALL)
            if serp_matches:
                print(f"Found SerpApiClient in {file_path}")
                
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

def search_directory(directory):
    """Search all files in a directory recursively"""
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.py', '.js', '.jsx', '.env', '.txt')):
                file_path = os.path.join(root, file)
                search_file(file_path)

# Search the project directory
search_directory('.')