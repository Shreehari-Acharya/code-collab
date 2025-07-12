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
exports.DockerService = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const dotenv_1 = __importDefault(require("dotenv"));
const sanitisers_1 = require("../../utils/sanitisers");
dotenv_1.default.config();
class DockerService {
    constructor() {
        this.docker = new dockerode_1.default({
            socketPath: '/var/run/docker.sock',
        });
    }
    createNewWorkspace(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sanitisedPath = (0, sanitisers_1.getSecureWorkspacePath)(userId);
                const container = yield this.docker.createContainer({
                    Image: 'user-node-workspace',
                    name: `workspace-${userId}`,
                    Cmd: ['sh'],
                    Tty: true,
                    HostConfig: {
                        Binds: [
                            `${sanitisedPath}:/home/code-collab/workspace`, // Bind mount user workspace
                        ],
                        PortBindings: {
                            '3000/tcp': [{ HostPort: '' }], // random port
                        },
                        AutoRemove: true,
                        Memory: 512 * 1024 * 1024, // 512 MB RAM
                        CpuShares: 256
                    },
                    ExposedPorts: {
                        '3000/tcp': {},
                    }
                });
                yield container.start();
                console.log(`Container created for user ${userId} with ID: ${container.id}`);
                return container.id;
            }
            catch (error) {
                console.error(`Error creating container for user ${userId}:`, error);
                throw new Error(`Failed to create workspace for user ${userId}`);
            }
        });
    }
    connectToWorkspaceTerminal(containerId, ws) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = this.docker.getContainer(containerId);
                if (!container) {
                    console.error(`Container with ID ${containerId} not found`);
                    ws.close(1008, 'Container not found');
                    return;
                }
                const exec = yield container.exec({
                    Cmd: ['bash'],
                    AttachStdout: true,
                    AttachStderr: true,
                    AttachStdin: true,
                    Tty: true,
                });
                const stream = yield exec.start({ hijack: true, stdin: true });
                // Pipe Docker stream to WebSocket
                stream.on('data', (chunk) => {
                    ws.send(chunk);
                });
                // Pipe WebSocket messages to Docker stream
                ws.on('message', (message) => {
                    stream.write(message);
                });
                ws.on('close', () => __awaiter(this, void 0, void 0, function* () {
                    // Todo: backup files from container to a persistent storage
                    stream.end();
                    // await container.stop() -> Uncomment in production to stop the container
                }));
            }
            catch (error) {
                console.error(`Error connecting to container ${containerId}:`, error);
                ws.close(1011, 'Internal error');
            }
        });
    }
    listWorkspaceFiles(userId, relativePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const basePath = (0, sanitisers_1.getSecureWorkspacePath)(userId);
                const finalPath = path_1.default.join(basePath, relativePath);
                // Ensure the path is within the user's workspace
                if (!finalPath.startsWith(basePath)) {
                    console.log(finalPath, basePath);
                    throw new Error('Path traversal attempt detected');
                }
                const entries = yield fs_1.promises.readdir(finalPath, { withFileTypes: true });
                return entries.map(entry => {
                    const name = entry.name + (entry.isDirectory() ? '/' : '');
                    return path_1.default.posix.join(relativePath, name); // relativePath + entry.name
                });
            }
            catch (err) {
                console.error(`Error reading workspace files for user ${userId}:`, err);
                throw new Error('Failed to list workspace files');
            }
        });
    }
    readFileContent(userId, relativePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const basePath = (0, sanitisers_1.getSecureWorkspacePath)(userId);
                const finalPath = path_1.default.join(basePath, relativePath);
                // Ensure the path is within the user's workspace
                if (!finalPath.startsWith(basePath)) {
                    throw new Error('Path traversal attempt detected');
                }
                const content = yield fs_1.promises.readFile(finalPath, 'utf-8');
                return content;
            }
            catch (err) {
                console.error(`Error reading file ${relativePath} for user ${userId}:`, err);
                throw new Error('Failed to read file content');
            }
        });
    }
    writeFileContent(userId, relativePath, content) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const basePath = (0, sanitisers_1.getSecureWorkspacePath)(userId);
                const finalPath = path_1.default.join(basePath, relativePath);
                // Ensure the path is within the user's workspace
                if (!finalPath.startsWith(basePath)) {
                    throw new Error('Path traversal attempt detected');
                }
                yield fs_1.promises.writeFile(finalPath, content, 'utf-8');
                console.log(content);
            }
            catch (err) {
                console.error(`Error writing file ${relativePath} for user ${userId}:`, err);
                throw new Error('Failed to write file content');
            }
        });
    }
}
exports.DockerService = DockerService;
