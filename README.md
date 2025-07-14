
# Code Collab

Code Collab is a web-based development environment that allows users to create, manage, and work on projects in isolated Docker-based workspaces. It provides a file explorer, a code editor, and a terminal for a seamless development experience.

## Features

- **User Authentication:** Secure user authentication is handled using `better-auth`.
- **Workspace Management:** Users can create, list, and manage their workspaces. Workspaces are isolated in Docker containers, ensuring a clean and reproducible environment.
- **File Explorer:** A tree-view file explorer to navigate the workspace file system.
- **Collaborative Code Editor:** A Monaco-based code editor for real-time collaboration.
- **Integrated Terminal:** An xterm.js-based terminal connected to the workspace container.
- **Persistent Storage:** Workspaces are persisted to an S3-compatible storage, allowing users to resume their work later.

## Tech Stack

### Frontend

- **Framework:** React with Vite
- **Language:** TypeScript
- **UI Components:** Shadcn UI, Radix UI
- **Routing:** React Router
- **State Management:** Not explicitly defined, likely component state and props.
- **Code Editor:** Monaco Editor
- **Terminal:** xterm.js
- **Authentication:** `better-auth` client

### Backend

- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** Prisma with PostgreSQL
- **Authentication:** `better-auth`
- **Containerization:** Dockerode to interact with Docker Engine
- **WebSockets:** `ws` for terminal streaming

## Project Structure

The project is a monorepo with two main packages: `frontend` and `backend`.

- **`frontend/`**: Contains the React application, including all UI components, pages, and client-side logic.
- **`backend/`**: Contains the Express.js server, which handles API requests, user authentication, workspace management, and WebSocket connections.
- **`traefik-setup/`**: Contains the configuration for Traefik, a reverse proxy and load balancer.
- **`workspace-storage/`**: This directory is likely used for local workspace storage before it's synced to S3.

## Getting Started

### Prerequisites

- Node.js and pnpm
- Docker
- An S3-compatible object storage service

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd code-collab
   ```

2. **Install dependencies for both frontend and backend:**
   ```bash
   pnpm install
   cd frontend && pnpm install && cd ..
   cd backend && pnpm install && cd ..
   ```

3. **Set up environment variables:**
   - Create a `.env` file in the `backend` directory by copying `.env.example`.
   - Create a `.env` file in the `frontend` directory by copying `.env.example`.
   - Fill in the required environment variables, such as database credentials, S3 credentials, and authentication secrets.

4. **Set up the database:**
   - Run prisma migrations to create the necessary tables:
     ```bash
     cd backend
     pnpm prisma migrate dev
     ```

### Running the Application

You can run the frontend and backend concurrently using the root `package.json` script:

```bash
pnpm run dev
```

This will start the frontend on `http://localhost:5173` and the backend on `http://localhost:3000`.
