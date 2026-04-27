# Project Transfer Document: Ghost & Goblin Agent Management Platform

## 1. Project Overview
This is a full-stack AI-driven platform built with **React (Vite)**, **Express**, and **PostgreSQL (Neon)**. The core concept is a hierarchy of AI agents:
- **Ghosts (Managers):** High-level agents that can command other agents.
- **Goblins (Workers):** Task-oriented agents managed by Ghosts.
- **Admin:** The user (flixnettv@gmail.com) who oversees the entire system.

## 2. Tech Stack
- **Frontend:** React 18, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend:** Express.js, Postgres (via `postgres` library), bcryptjs.
- **AI Integration:** Google Gemini API (`@google/genai`), custom model support, and **Model Context Protocol (MCP)**.
- **Storage:** Hybrid approach (Neon Postgres for cloud, IndexedDB for local fallback).

## 3. Database Schema (PostgreSQL)
The database is automatically initialized in `server.ts`. Key tables:
- `users`: Stores users and their roles (`admin`, `manager`, `user`).
- `agents`: Stores persona configurations, including `type` (ghost/goblin), `manager_id`, and `mcp_config`.
- `conversations` & `messages`: Chat history.
- `tasks`: Agent-specific tasks.
- `memories`: Long-term memory storage for agents.

## 4. Key Features to Maintain
- **Ghost/Goblin Hierarchy:** Ghosts have the `command_goblin` tool to delegate tasks to Goblins.
- **MCP (Model Context Protocol):** Custom agents can be configured with an external API endpoint and a list of tools.
- **Role-Based Access Control (RBAC):** Admins manage everything; Managers (Ghosts) manage their assigned Goblins.
- **Admin Dashboard:** Comprehensive view for user management, agent monitoring, and system stats.

## 5. Environment Variables (.env)
Ensure these are set in the new account's Settings:
- `DATABASE_URL`: Neon Postgres connection string.
- `GEMINI_API_KEY`: Google Gemini API key.
- `VITE_APP_NAME`: "Ghost & Goblin Platform".

## 6. Instructions for the New AI Agent
**System Prompt for Continuation:**
"You are the lead developer for the Ghost & Goblin Platform. Your goal is to continue the development and deployment of this multi-agent management system. 
- **Core Logic:** Respect the Ghost/Goblin hierarchy. Ghosts command Goblins via the `command_goblin` tool.
- **MCP:** Ensure the MCP tool call handler in `App.tsx` and `ai.worker.ts` remains functional for custom tool integration.
- **Admin:** The primary admin email is `flixnettv@gmail.com`.
- **Database:** All storage operations should go through `storageService` which handles the Neon/Local fallback.
- **Next Steps:** Polish the MCP integration, enhance the Ghost-to-Goblin communication loop, and prepare for production deployment."

## 7. Deployment
- The app is ready for Cloud Run deployment.
- Ensure `npm run build` is used for production.
- The `start` script in `package.json` should point to `node server.ts`.
