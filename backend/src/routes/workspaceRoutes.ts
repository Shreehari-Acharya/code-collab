import { Router } from "express";
import { 
    createWorkspace,
    getFileContents,
    getWorkspaceFiles,
    listWorkspaces,
    saveFileContents,
    updateStatusOfWorkspace
} from "../controllers/workspaceController";
import { betterAuthMiddleware } from "../middleware/betterAuthMiddleware";

const workspaceRoutes = Router();

// Apply authentication middleware to all workspace routes
workspaceRoutes.use(betterAuthMiddleware); 

workspaceRoutes.get("/list", listWorkspaces);
workspaceRoutes.get("/file-structure", getWorkspaceFiles);
workspaceRoutes.get("/file-content", getFileContents);
workspaceRoutes.post("/create", createWorkspace); 
workspaceRoutes.put("/file-content", saveFileContents);
workspaceRoutes.patch("/update/:id", updateStatusOfWorkspace);


export default workspaceRoutes;