# hometutorweb-api

Node.js + Express + MongoDB backend using clean architecture for authentication.

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create `.env` from the example:

```bash
cp .env.example .env
```

3. Start the server:

```bash
npm run dev
```

Health check:

```http
GET http://localhost:5050/health
```

## API Endpoints (Postman)

Base URL: `http://localhost:5050`

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user1@example.com",
  "password": "password123",
  "role": "user"
}
```

Successful response (201):

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user1@example.com",
    "role": "user",
    "createdAt": "..."
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user1@example.com",
  "password": "password123"
}
```

Successful response (200):

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "...",
      "email": "user1@example.com",
      "role": "user",
      "createdAt": "..."
    }
  }
}
```

## DTO Validation Examples

Invalid DTO (missing email):

```http
POST /api/auth/register
Content-Type: application/json

{
  "password": "password123"
}
```

Response (400):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Required"
    }
  ]
}
```

## Business Logic Error Examples

Duplicate email (409):

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user1@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": false,
  "message": "Email already exists"
}
```

Invalid password (401):

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user1@example.com",
  "password": "wrongpass"
}
```

Response:

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

## GitHub Branch Instructions

```bash
git checkout -b sprint-1
git add .
git commit -m "feat(auth): register & login with zod, bcrypt, jwt"
git push origin sprint-1
```

## Postman Video Requirements (2-5 minutes)

1. Successful user registration
2. Duplicate email registration (409)
3. Invalid DTO validation (400)
4. Successful login (JWT token)
5. Invalid password login (401)
