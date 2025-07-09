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
class DockerService {
    constructor() {
        this.docker = new dockerode_1.default({
            socketPath: '/var/run/docker.sock',
        });
    }
    createNewWorkspace(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield this.docker.createContainer({
                    Image: 'user-node-workspace',
                    name: `workspace-${userId}`,
                    Cmd: ['sh'],
                    Tty: true,
                    HostConfig: {
                        Binds: [`/workspace-storage/${userId}:/workspace`],
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
                const exec = yield container.exec({
                    Cmd: ['sh'], // or ['bash'] if installed
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
                ws.on('close', () => {
                    stream.end();
                });
            }
            catch (error) {
                console.error(`Error connecting to container ${containerId}:`, error);
                ws.close(1011, 'Internal error');
            }
        });
    }
}
exports.DockerService = DockerService;
