# Project Architecture

## Overview

Project Prism is structured into multiple components to ensure modularity and scalability. Below is an overview of the key components:

### Backend
- **app.py**: Main application entry point.
- **perspective_engine/**: Contains core logic for the Perspective Engine.
- **project_prism_app/**: Houses models and application-specific logic.

### Frontend
- **frontend/**: Contains the React-based frontend application.

### Database
- **migrations/**: Handles database migrations using Alembic.

### Utilities
- **utils/**: Contains utility scripts and helper functions.

## Key Interactions
- The backend serves APIs consumed by the frontend.
- Database models are defined in `models/` and managed via Alembic migrations.

Refer to `README.md` for setup instructions.
