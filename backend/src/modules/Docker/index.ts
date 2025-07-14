import Docker from 'dockerode';
import WebSocket from 'ws';
import path from 'path';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import { getSecureWorkspacePath } from '../../utils/sanitisers';

dotenv.config();

export class DockerService {
    private docker: Docker;
    private userToDockerMap: Map<string, Docker.Container>;

    constructor() {
        this.docker = new Docker({
            socketPath: '/var/run/docker.sock',
        });
        this.userToDockerMap = new Map<string, Docker.Container>();

        const containers = this.docker.listContainers({ all: true });

        // may be useful for restoring containers on server restart as we will loose 
        // the mapping of users to containers
        // this will restore the containers for users who had active workspaces before server restart
        // and will allow them to continue working without needing to recreate the workspace
        // this is not a perfect solution, as it will not restore the state of the container
        // but it will allow users to continue working on their files
        containers.then((containers) => {
            containers.forEach((containerInfo) => {
                if (containerInfo.Names && containerInfo.Names.length > 0) {
                    const fullContainerName = containerInfo.Names[0].replace('/', '');
                    if(fullContainerName.startsWith('workspace-')) {
                        const username = fullContainerName.replace('workspace-', '');
                        console.log(`Restoring container for user ${username} with ID: ${containerInfo.Id}`);
                        this.userToDockerMap.set(username, this.docker.getContainer(containerInfo.Id));
                    }
                }
            });
        });
    }

    async createNewWorkspace( username: string ): Promise<string> {
        try {
            if( this.userToDockerMap.has(username) ) {
                throw new Error("DUPLICATE_WORKSPACE");
            }

            const sanitisedPath = getSecureWorkspacePath(username);
            const container = await this.docker.createContainer({
                Image: 'user-node-workspace',
                name: `workspace-${username}`,
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
                    CpuShares: 256,
                    PidsLimit: 100, // Limit to 100 processes
                    CapDrop: ['ALL'], // Drop all capabilities for security
                    SecurityOpt: ['no-new-privileges'], // Prevent privilege escalation
                    ReadonlyRootfs: false, // depends if you want user to download packages or not
                    IpcMode: 'none', // Disable IPC for security
                    OomKillDisable: false,
                    MemorySwap: -1, // disable swap
                    CpuQuota: 50000, // limit to 50% of one CPU
                },
                Labels: {
                    "traefik.enable": "true",
                     [`traefik.http.routers.${username}.rule`]: `Host(\`${username}.preview-code-collab.shreehari.dev\`)`,
                     [`traefik.http.routers.${username}.entrypoints`]: "websecure",
                     [`traefik.http.routers.${username}.tls.certresolver`]: "myresolver",
                     [`traefik.http.services.${username}.loadbalancer.server.port`]: "3000",
                },
                ExposedPorts: {
                    '3000/tcp': {},
                }
            })

            await container.start();
            console.log(`Container created for user ${username} with ID: ${container.id}`);
            this.userToDockerMap.set(username, container);

            return container.id;

        } catch (error: any) {
            console.error(`Error creating container for user ${username}:`, error.message || error);
            throw new Error(error.message || 'Failed to create workspace');
        }
    }

    async connectToWorkspaceTerminal(username: string, ws: WebSocket): Promise<void> {
        try {
            const container = this.userToDockerMap.get(username);

            if (!container) {
                console.error(`Container for ${username} not found`);
                ws.close(1008, 'Container not found');
                return;
            }

            const exec = await container.exec({
                Cmd: ['bash'], 
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
                stream.end();
            });

        } catch (error: any) {
            console.error(`Error connecting to terminal for user ${username}:`, error.message || error);
            ws.close(1011, 'Internal error');
        }
    }

    async listWorkspaceFiles(username: string, relativePath: string): Promise<string[]> {
        try {
            const basePath = getSecureWorkspacePath(username);
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
        } catch (err: any) {
            console.error(`Error reading workspace files for user ${username}:`, err.message || err);
            throw new Error('Failed to list workspace files');
        }
    }

    async readFileContent(username: string, relativePath: string): Promise<string> {
        try {
            const basePath = getSecureWorkspacePath(username);
            const finalPath = path.join(basePath, relativePath);

            // Ensure the path is within the user's workspace
            if (!finalPath.startsWith(basePath)) {
                throw new Error('Path traversal attempt detected');
            }

            const content = await fs.readFile(finalPath, 'utf-8');
            return content;
        } catch (err: any) {
            console.error(`Error reading file ${relativePath} for user ${username}:`, err.message || err);
            throw new Error('Failed to read file content');
        }
    }

    async writeFileContent(username: string, relativePath: string, content: string): Promise<void> {
        try {
            const basePath = getSecureWorkspacePath(username);
            const finalPath = path.join(basePath, relativePath);

            // Ensure the path is within the user's workspace
            if (!finalPath.startsWith(basePath)) {
                throw new Error('Path traversal attempt detected');
            }

            await fs.writeFile(finalPath, content, 'utf-8');

        } catch (err: any) {
            console.error(`Error writing file ${relativePath} for user ${username}:`, err.message || err);
            throw new Error('Failed to write file content');
        }
    }

    async closeWorkspace(username: string): Promise<void> {
        try {
            const container = this.userToDockerMap.get(username);
            if (!container) {
                console.error(`No workspace instance found for user ${username}`);
                return;
            }

            await container.stop();
            this.userToDockerMap.delete(username);
            console.log(`Workspace for user ${username} closed successfully`);

        } catch (error: any) {
            console.error(`Error closing workspace for user ${username}:`, error.message || error);
        }
    }
}
