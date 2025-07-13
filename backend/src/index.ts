import express from 'express';
import {WebSocketServer} from 'ws';
import http from 'http';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth'; 
import workspaceRoutes from './routes/workspaceRoutes';
import { wsTermialStreaming } from './controllers/workspaceController';
import dontenv from 'dotenv';


dontenv.config();
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3000;

// add cors for ws and express
app.use(cors({
    origin: process.env.FRONTEND_URL as string, // Allow all origins for simplicity, adjust as needed
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true, // Allow credentials if needed
}));

app.all("/api/auth/{*any}", toNodeHandler(auth));  // express v5 * is replaced with {*any} to match all paths

app.use(express.json());

wss.on('connection',  wsTermialStreaming);

app.use('/api/workspaces', workspaceRoutes);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`WebSocket secure server is running on wss://localhost:${PORT}`);
});
