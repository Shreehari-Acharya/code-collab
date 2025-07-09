import express from 'express';
import {WebSocketServer} from 'ws';
import http from 'http';
import { DockerService } from './modules/Docker';
import cors from 'cors';


const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// add cors for ws and express
app.use(cors({
    origin: '*', // Allow all origins for simplicity, adjust as needed
}));



app.use(express.json());

const PORT = 3000;

const docker = new DockerService();

wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection established');
    
    const query = req.url ? new URL(req.url, `http://${req.headers.host}`).searchParams : null;
    const userId = query ? query.get('userId') : null;
    const containerId = query ? query.get('containerId') : null;

    if (!userId || !containerId) {
        console.error('User ID and Container ID are required');
        ws.close(1008, 'User ID and Container ID are required');
        return;
    }

    try {
        await docker.connectToWorkspaceTerminal(containerId, ws)
    } catch {
        console.error(`Failed to connect to container ${containerId} for user ${userId}`);
        ws.close(1008, 'Failed to connect to container');
        return;
    }

});



app.post('/', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }
    const containerId = docker.createNewWorkspace(userId)
    res.status(201).json({ message: 'Container created', containerId });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`WebSocket secure server is running on wss://localhost:${PORT}`);
});
