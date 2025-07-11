import Docker from 'dockerode';
import WebSocket from 'ws';
import path from 'path';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import { getSecureWorkspacePath } from '../../utils/sanitisers';

dotenv.config();

export class DockerService {
    private docker: Docker;

    constructor() {
        this.docker = new Docker({
            socketPath: '/var/run/docker.sock',
        });
    }

    async createNewWorkspace( userId: string ): Promise<string> {
        try {

            const sanitisedPath = getSecureWorkspacePath(userId);
            const container = await this.docker.createContainer({
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
            })

            await container.start();
            console.log(`Container created for user ${userId} with ID: ${container.id}`);
            return container.id;

        } catch (error) {
            console.error(`Error creating container for user ${userId}:`, error);
            throw new Error(`Failed to create workspace for user ${userId}`);
        }
    }

    async connectToWorkspaceTerminal(containerId: string, ws: WebSocket): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId);

            if (!container) {
                console.error(`Container with ID ${containerId} not found`);
                ws.close(1008, 'Container not found');
                return;
            }

            const exec = await container.exec({
                Cmd: ['sh'], // or ['bash'] if installed
                AttachStdout: true,
                AttachStderr: true,
                AttachStdin: true,
                Tty: true,
            });

            const stream = await exec.start({ hijack: true, stdin: true });

            // Pipe Docker stream to WebSocket
            stream.on('data', (chunk: Buffer) => {
                ws.send(chunk);
            });

            // Pipe WebSocket messages to Docker stream
            ws.on('message', (message: string) => {
                stream.write(message);
            });

            ws.on('close', async () => {
                // Todo: backup files from container to a persistent storage
                stream.end();
                // await container.stop() -> Uncomment in production to stop the container
            });

        } catch (error) {
            console.error(`Error connecting to container ${containerId}:`, error);
            ws.close(1011, 'Internal error');
        }
    }

    async listWorkspaceFiles(userId: string, relativePath: string): Promise<string[]> {
        try {
            const basePath = getSecureWorkspacePath(userId);
            const finalPath = path.join(basePath, relativePath);

            // Ensure the path is within the user's workspace
            if (!finalPath.startsWith(basePath)) {
                console.log(finalPath, basePath);
                throw new Error('Path traversal attempt detected');
            }

            const entries = await fs.readdir(finalPath , { withFileTypes: true });


            return entries.map(entry => {
                const name = entry.name + (entry.isDirectory() ? '/' : '');
                return path.posix.join(relativePath, name); // relativePath + entry.name
            });
        } catch (err) {
            console.error(`Error reading workspace files for user ${userId}:`, err);
            throw new Error('Failed to list workspace files');
        }
    }

    async readFileContent(userId: string, relativePath: string): Promise<string> {
        try {
            const basePath = getSecureWorkspacePath(userId);
            const finalPath = path.join(basePath, relativePath);

            // Ensure the path is within the user's workspace
            if (!finalPath.startsWith(basePath)) {
                throw new Error('Path traversal attempt detected');
            }

            const content = await fs.readFile(finalPath, 'utf-8');
            return content;
        } catch (err) {
            console.error(`Error reading file ${relativePath} for user ${userId}:`, err);
            throw new Error('Failed to read file content');
        }
    }

    async writeFileContent(userId: string, relativePath: string, content: string): Promise<void> {
        try {
            const basePath = getSecureWorkspacePath(userId);
            const finalPath = path.join(basePath, relativePath);

            // Ensure the path is within the user's workspace
            if (!finalPath.startsWith(basePath)) {
                throw new Error('Path traversal attempt detected');
            }

            await fs.writeFile(finalPath, content, 'utf-8');
            console.log(content)
        } catch (err) {
            console.error(`Error writing file ${relativePath} for user ${userId}:`, err);
            throw new Error('Failed to write file content');
        }
    }
}
