# create_tables.py
from app import app, db

def main():
    with app.app_context():
        print("Attempting to create database tables...")
        db.create_all()
        print("Database tables should now be created (if they didn't exist).")
        print("Please verify using a DB tool like pgAdmin or DBeaver.")

if __name__ == '__main__':
    main()