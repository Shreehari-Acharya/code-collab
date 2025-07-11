"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const Docker_1 = require("./modules/Docker");
const cors_1 = __importDefault(require("cors"));
const parseToTree_1 = require("./utils/parseToTree");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
// add cors for ws and express
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for simplicity, adjust as needed
}));
app.use(express_1.default.json());
const PORT = 3000;
const docker = new Docker_1.DockerService();
wss.on('connection', (ws, req) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield docker.connectToWorkspaceTerminal(containerId, ws);
    }
    catch (_a) {
        console.error(`Failed to connect to container ${containerId} for user ${userId}`);
        ws.close(1008, 'Failed to connect to container');
        return;
    }
}));
app.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }
    try {
        const containerId = yield docker.createNewWorkspace(userId);
        res.status(201).json({ message: 'Container created', containerId });
    }
    catch (error) {
        console.error(error);
    }
}));
app.get('/fileStructure', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.query.userId;
    const path = req.query.path ? req.query.path : '/';
    if (!path) {
        return res.status(400).send('Path is required');
    }
    if (!userId) {
        return res.status(400).send('Container ID is required');
    }
    try {
        const output = yield docker.listWorkspaceFiles(userId, path);
        if (!output) {
            return res.status(404).send('No files found');
        }
        const tree = (0, parseToTree_1.parseToTree)(output);
        res.status(200).json(tree);
    }
    catch (error) {
        console.error(error);
    }
}));
app.get('/getFileContents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.query.userId;
    const filename = req.query.filename;
    if (!userId || !filename) {
        return res.status(400).send('User ID and filename are required');
    }
    try {
        const content = yield docker.readFileContent(userId, filename);
        if (!content) {
            return res.status(404).send('File not found');
        }
        res.status(200).json({ content });
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Error reading file');
    }
}));
app.patch('/saveFileContents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, filename, content } = req.body;
    if (!userId || !filename || content === undefined) {
        return res.status(400).send('User ID, filename and content are required');
    }
    try {
        yield docker.writeFileContent(userId, filename, content);
        res.status(200).send('File saved successfully');
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Error saving file');
    }
}));
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`WebSocket secure server is running on wss://localhost:${PORT}`);
});
