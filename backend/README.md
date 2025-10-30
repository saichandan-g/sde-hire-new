# SDE Hire Backend

This directory contains the backend services for the SDE Hire application.

## Problem Assistance Server

The Problem Assistance Server provides AI-powered explanations for DSA problems using a chat API.


### Setup

1. Navigate to the backend directory:
   \`\`\`bash
   cd backend
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

   For development with auto-restart:
   \`\`\`bash
   npm run dev
   \`\`\`

### API Endpoints

#### GET /health
Checks if the server is running.

#### GET /explain
Generates an explanation for a DSA problem using the chat API.

**Query Parameters:**
- `index`: The index of the problem (default: 0)
- `refresh`: Whether to force a refresh of the cached explanation (default: false)

#### DELETE /clear-cache
Clears the cached responses.

## Folder Structure

- `app/storage/` - Directory for cached responses
- `server.js` - Main server file

## Integration with Frontend

The frontend application is configured to connect to this server via the `/api/problem-assistance` endpoint, which proxies requests to this server.

## Fallback Behavior

If the chat API is not available or encounters an error, the server will fall back to using pre-generated responses. This ensures the application remains functional even without the AI service.
