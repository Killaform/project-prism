# Setup Instructions

## Prerequisites

- Python 3.11+
- Node.js 16+
- PostgreSQL

## Backend Setup

1. Create a virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

3. Run database migrations:
   ```powershell
   alembic upgrade head
   ```

4. Start the backend server:
   ```powershell
   python run_server.py
   ```

## Frontend Setup

1. Navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the development server:
   ```powershell
   npm run dev
   ```

Your application should now be running!
