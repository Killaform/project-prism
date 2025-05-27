# API Documentation

## Overview

This document provides details about the APIs exposed by Project Prism.

## Authentication

### Endpoint: `/api/auth`
- **Method**: POST
- **Description**: Authenticates a user and returns a token.
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "token": "string"
  }
  ```

## Classification

### Endpoint: `/api/classify`
- **Method**: POST
- **Description**: Classifies input data.
- **Request Body**:
  ```json
  {
    "data": "string"
  }
  ```
- **Response**:
  ```json
  {
    "classification": "string"
  }
  ```

## Perspective Classification API

### Endpoint: `/api/perspective`
- **Method**: POST
- **Description**: Classifies the perspective of a given URL and title.
- **Request Body**:
  ```json
  {
    "url": "string",
    "title": "string"
  }
  ```
- **Response**:
  ```json
  {
    "perspective": "string"
  }
  ```

### Notes
- The `perspective` field can have values like `mainstream`, `neutral`, or `alternative` based on the classification logic.

Refer to the codebase for additional endpoints.
