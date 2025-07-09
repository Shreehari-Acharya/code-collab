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
app.post('/', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }
    const containerId = docker.createNewWorkspace(userId);
    res.status(201).json({ message: 'Container created', containerId });
});
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`WebSocket secure server is running on wss://localhost:${PORT}`);
});
