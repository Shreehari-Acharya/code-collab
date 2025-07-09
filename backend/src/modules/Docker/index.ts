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

            ws.on('close', () => {
                stream.end();
            });

        } catch (error) {
            console.error(`Error connecting to container ${containerId}:`, error);
            ws.close(1011, 'Internal error');
        }
    }
}
