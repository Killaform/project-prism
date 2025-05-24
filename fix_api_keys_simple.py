"""
Simple script to add API keys directly to the database
"""
import os
import sqlite3
import json
from cryptography.fernet import Fernet

# Generate a key for encryption
key = Fernet.generate_key()
cipher_suite = Fernet(key)

# Connect to the database
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Check if user_api_keys table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_api_keys'")
if not cursor.fetchone():
    print("Creating user_api_keys table...")
    cursor.execute('''
    CREATE TABLE user_api_keys (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        key_type TEXT NOT NULL,
        encrypted_key TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    conn.commit()

# Get the first user ID
cursor.execute("SELECT id FROM users LIMIT 1")
user_row = cursor.fetchone()

if not user_row:
    print("No users found in the database. Please create a user first.")
    conn.close()
    exit(1)

user_id = user_row[0]
print(f"Using user ID: {user_id}")

# Sample API keys
api_keys = {
    'serpapi': os.getenv('SERPAPI_KEY') or 'sample_serpapi_key',
    'openai': os.getenv('OPENAI_API_KEY') or 'sample_openai_key',
    'gemini': os.getenv('GEMINI_API_KEY') or 'sample_gemini_key'
}

# Add keys to the database
for key_type, api_key in api_keys.items():
    # Check if key already exists
    cursor.execute("SELECT id FROM user_api_keys WHERE user_id = ? AND key_type = ?", 
                  (user_id, key_type))
    existing = cursor.fetchone()
    
    # Encrypt the key
    encrypted_key = cipher_suite.encrypt(api_key.encode()).decode()
    
    if existing:
        print(f"Updating existing {key_type} key...")
        cursor.execute("UPDATE user_api_keys SET encrypted_key = ? WHERE user_id = ? AND key_type = ?",
                      (encrypted_key, user_id, key_type))
    else:
        print(f"Adding new {key_type} key...")
        cursor.execute("INSERT INTO user_api_keys (user_id, key_type, encrypted_key) VALUES (?, ?, ?)",
                      (user_id, key_type, encrypted_key))

conn.commit()

# Save the encryption key to a file
with open('encryption_key.txt', 'wb') as f:
    f.write(key)
print(f"Encryption key saved to encryption_key.txt")

# Verify keys were added
cursor.execute("SELECT key_type FROM user_api_keys WHERE user_id = ?", (user_id,))
keys = cursor.fetchall()
print(f"Added {len(keys)} API keys for user {user_id}:")
for key in keys:
    print(f"- {key[0]}")

conn.close()
print("Done!")