import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { DockerService } from "../modules/Docker";
import { parseToTree } from "../utils/parseToTree";
import WebSocket from "ws";
import { type IncomingMessage } from "http";
import { fromNodeHeaders } from "better-auth/node";
import {auth} from "../lib/auth";
import { syncLocalToS3, syncS3ToLocal } from "../modules/Aws-S3";
import * as fs from "node:fs/promises"
import { getSecureWorkspacePath } from "../utils/sanitisers";

const workspace = new DockerService();

export async function createWorkspace(req: Request, res: Response) {
    const { username } = req.user;
    const { workspaceName } = req.body;

    if (!workspaceName) {
        return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspaceExists = await prisma.workspace.findFirst({
        where: {
            name: workspaceName,
            owner: {
                username: username 
            },
            deletedAt: null //check active workspaces
        }
    });

    if (workspaceExists) {
        return res.status(400).json({ message: "Workspace with this name already exists" });
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
                createdAt: true
            }
        });
        
        return res.status(201).json(newWorkspace);
    } catch (error: any) {
        if (error.message === "DUPLICATE_WORKSPACE") {
            return res.status(400).json({ message: "another workspace is running. You can only have one running workspace at a given time" });
        }
        return res.status(500).json({ message: "Internal Server Error" });
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
    } catch {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateStatusOfWorkspace(req: Request, res: Response) {
    const id  = req.params.id;  // this will be the workspace ID
    const username = req.user.username;
    const { status } = req.body;

    const localWorkspacePath = getSecureWorkspacePath(username!);

    if (!status || !["ACTIVE", "INACTIVE", "DELETED"].includes(status)) {
        console.error("Invalid status provided:", status);
        return res.status(400).json({ error: "Status is required or provided invalid status" });
    }

    try {
        const currentWorkspace = await prisma.workspace.findUnique({
            where: { id, owner: { username: username }, deletedAt: null },
            select: { name: true, status: true }
        });

        if (!currentWorkspace) {
            return res.status(404).json({ message: "Workspace not found or has been deleted" });
        }
        else if (currentWorkspace.status === 'ACTIVE' && status === 'INACTIVE') {
            // If the workspace is active and the new status is inactive
            
            // copy files to persistent storage
            syncLocalToS3(username!, currentWorkspace.name);

            // remove the files from local file system
            await fs.rm(localWorkspacePath, { recursive: true, force: true });

            await workspace.closeWorkspace(username!); // this will stop & kill container as autoRemove is set to true

            // finally update the status in the database
            await prisma.workspace.update({
                where: { id, owner: { username: username }, deletedAt: null },
                data: { status: 'INACTIVE' }
            });

            res.status(200).json({ message: "Workspace paused successfully" });
        }
        else if (currentWorkspace.status === 'INACTIVE' && status === 'ACTIVE') {
            // If the workspace is inactive and the new status is active

            // recreate the workspace from persistent storage
            syncS3ToLocal(username!, currentWorkspace.name);

            // create a new workspace instance
            await workspace.createNewWorkspace(username!);

            // finally update the status in the database
            await prisma.workspace.update({
                where: { id, owner: { username: username }, deletedAt: null },
                data: { status: 'ACTIVE' }
            });
            
            res.status(200).json({ message: "Workspace started successfully" });
        }
        else if (status === 'DELETED') {
            // If the status is deleted, remove the workspace from the database
            await prisma.workspace.delete({
                where: { id, owner: { username: username }, deletedAt: null }
            });
            // No need to store files as it is being deleted
            await workspace.closeWorkspace(username!);

            // remove the files from local file system
            await fs.rm(localWorkspacePath, { recursive: true, force: true });

            res.status(200).json({ message: "Workspace deleted successfully" });
        }

    } catch {
        return res.status(500).json({ message: "Internal Server Error" });
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
    } catch {
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