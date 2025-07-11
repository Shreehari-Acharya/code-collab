import path from "path";
import fs from "fs";
export function sanitizeUserId(userId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new Error('Invalid userId');
  }
  return userId;
}


export function getSecureWorkspacePath(userId: string): string {
  const safeUserId = sanitizeUserId(userId);
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