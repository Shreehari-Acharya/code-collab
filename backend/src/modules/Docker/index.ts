import Docker from 'dockerode';
import WebSocket from 'ws';

export class DockerService {
    private docker: Docker;

    constructor() {
        this.docker = new Docker({
            socketPath: '/var/run/docker.sock',
        });
    }

    async createNewWorkspace( userId: string ): Promise<string> {
        try {
            const container = await this.docker.createContainer({
                Image: 'user-node-workspace',
                name: `workspace-${userId}`,
                Cmd: ['sh'],
                Tty: true,
                HostConfig: {
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

    async listWorkspaceFiles(containerId: string, path: string) : Promise<string> {
        try {
            const container = this.docker.getContainer(containerId);

            if( !container ) {
                console.error(`Container with ID ${containerId} not found`);
                throw new Error('Container not found');
            }

            const exec = await container.exec({
                Cmd: ['ls', '-1Ap', `/workspace/${path}`], 
                AttachStdout: true,
                AttachStderr: true,
            });

            const stream = await exec.start({});

            return await new Promise((resolve, reject) => {
                let output = '';

                stream.on('data', (chunk: Buffer) => {
                    output += chunk.toString();
                });

                stream.on('end', () => {
                    resolve(output);
                });

                stream.on('error', (err) => {
                    reject(err);
                });
            });
        } catch (error) {
            console.error(`Failed to list files in container ${containerId}:`, error);
            throw new Error('Could not retrieve file list');
        }
    }

}
