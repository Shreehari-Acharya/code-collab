import path from "path";
import fs from "fs";

export function sanitizeUserId(username: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new Error('Invalid userId');
  }
  return username;
}


export function getSecureWorkspacePath(username: string): string {
  const safeUserId = sanitizeUserId(username);
  const basePath = process.env.BASE_WORKSPACE_PATH ? process.env.BASE_WORKSPACE_PATH : "" ; 
  const finalPath = path.resolve(basePath, 'workspace-storage', safeUserId);

// prevent traversal
  if (!finalPath.startsWith(path.resolve(basePath))) {
    throw new Error('Path traversal attempt detected');
  }

  if (!fs.existsSync(finalPath)) {
    fs.mkdirSync(finalPath, { recursive: true });
  }
  
  return finalPath;
}