import express from 'express';
import {WebSocketServer} from 'ws';
import http from 'http';
import { DockerService } from './modules/Docker';
import cors from 'cors';
import { parseToTree } from './utils/parseToTree';



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



app.post('/', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }
    try {
        const containerId = await docker.createNewWorkspace(userId)
        res.status(201).json({ message: 'Container created', containerId });
    } catch (error) {
        console.error(error)
    }
});

app.get('/fileStructure', async (req, res) => {
    const userId = req.query.userId as string;
    const path = req.query.path ? req.query.path as string : '/';

    if (!path) {
        return res.status(400).send('Path is required');
    }
    if (!userId) {
        return res.status(400).send('Container ID is required');
    }
    try {
        const output = await docker.listWorkspaceFiles(userId, path)
        if (!output) {
            return res.status(404).send('No files found');
        }
        const tree = parseToTree(output);

        res.status(200).json(tree);
    } catch (error) {
        console.error(error);
    }
});

app.get('/getFileContents', async (req, res) => {
    const userId = req.query.userId as string;
    const filename = req.query.filename as string;

    if (!userId || !filename) {
        return res.status(400).send('User ID and filename are required');
    }
    try {
        const content = await docker.readFileContent(userId, filename);
        if (!content) {
            return res.status(404).send('File not found');
        }
        res.status(200).json({ content });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error reading file');
    }
});

app.patch('/saveFileContents', async (req, res) => {
    const { userId, filename, content } = req.body;

    if (!userId || !filename || content === undefined) {
        return res.status(400).send('User ID, filename and content are required');
    }
    try {
        await docker.writeFileContent(userId, filename, content);
        res.status(200).send('File saved successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving file');
    }
});


server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`WebSocket secure server is running on wss://localhost:${PORT}`);
});
