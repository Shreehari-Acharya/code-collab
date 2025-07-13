import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { DockerService } from "../modules/Docker";
import { parseToTree } from "../utils/parseToTree";
import WebSocket from "ws";
import { type IncomingMessage } from "http";
import { fromNodeHeaders } from "better-auth/node";
import {auth} from "../lib/auth";

const workspace = new DockerService();

export async function createWorkspace(req: Request, res: Response) {
    const { username } = req.user;
    const { workspaceName } = req.body;

    if (!workspaceName) {
        return res.status(400).json({ error: "Workspace name is required" });
    }

    try {

        const containerId = await workspace.createNewWorkspace(username!)

        const newWorkspace = await prisma.workspace.create({
            data: {
                name: workspaceName,
                containerId: containerId, 
                owner: {
                    connect: { username: username || "" } // Ensure username is not null
                },
                status: "ACTIVE" // Set initial status
            },
            select: {
                id: true,
                name: true,
                status: true,
                owner: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                createdAt: true
            }
        });
        
        return res.status(201).json(newWorkspace);
    } catch (error) {
        console.error("Error creating workspace:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function listWorkspaces(req: Request, res: Response) {
    const { username } = req.user;

    try {
        const workspaces = await prisma.workspace.findMany({
            where: {
                owner: {
                    username: username || ""
                }
            },
            select: {
                id: true,
                name: true,
                status: true,
                createdAt: true
            }
        });

        return res.status(200).json(workspaces);
    } catch (error) {
        console.error("Error listing workspaces:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateStatusOfWorkspace(req: Request, res: Response) {
    const id  = req.params.id;  // this will be the workspace ID
    const username = req.user.username;
    const { status } = req.body;

    if (!status || !["ACTIVE", "INACTIVE", "DELETED"].includes(status)) {
        console.error("Invalid status provided:", status);
        return res.status(400).json({ error: "Status is required or provided invalid status" });
    }

    try {
        const currentStatus = await prisma.workspace.findUnique({
            where: { id, owner: { username: username }, deletedAt: null },
            select: { status: true }
        });

        if (!currentStatus) {
            return res.status(404).json({ error: "Workspace not found or has been deleted" });
        }
        else if (currentStatus.status === 'ACTIVE' && status === 'INACTIVE') {
            // If the workspace is active and the new status is inactive, stop the Docker container
            await workspace.closeWorkspace(username!);
        }
        else if (currentStatus.status === 'INACTIVE' && status === 'ACTIVE') {
            // If the workspace is inactive and the new status is active, start the Docker container

            // TODO: mount the files from persistent storage 
            await workspace.createNewWorkspace(username!);
        }
        else if (status === 'DELETED') {
            // If the status is deleted, remove the workspace from the database
            await prisma.workspace.delete({
                where: { id, owner: { username: username }, deletedAt: null }
            });
        }

    } catch (error) {
        console.error("Error updating workspace status:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getWorkspaceFiles(req: Request, res: Response) {
    const username = req.user.username;
    const path = req.query.path as string || '/';

    try {
        const files = await workspace.listWorkspaceFiles(username!, path);
        if(!files) {
            return res.status(200).json({ message: "No files found" });
        }
        const tree = parseToTree(files);

        return res.status(200).json(tree);
    } catch (error) {
        console.error("Error listing workspace files:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getFileContents(req: Request, res: Response) {
    const username = req.user.username;
    const filename = req.query.filename as string;

    if (!filename || filename.trim() === "") {
        return res.status(400).json({ error: "Filename is required" });
    }

    try {
        const content = await workspace.readFileContent(username!, filename);
        if (!content) {
            return res.status(404).json({ error: "File not found" });
        }
        return res.status(200).json({ content });
    } catch (error) {
        console.error("Error reading file contents:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function saveFileContents(req: Request, res: Response) {
    const username = req.user.username;
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: "Filename and content are required" });
    }

    try {
        await workspace.writeFileContent(username!, filename, content);
        return res.status(200).json({ message: "File saved successfully" });
    } catch (error) {
        console.error("Error saving file contents:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function wsTermialStreaming(ws: WebSocket, req: IncomingMessage) {
    const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
        console.error("Unauthorized access to workspace terminal");
        ws.close(1008, 'Unauthorized');
        return;
    }

    const username = session.user.username;

    console.log(`Connecting to workspace terminal for user: ${username}`);

    try {
        await workspace.connectToWorkspaceTerminal(username!, ws)
    } catch {
        console.error(`Failed to connect to workspace terminal for user ${username}`);
    }
}