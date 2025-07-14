import { execSync } from "child_process";
import { getSecureWorkspacePath } from "../../utils/sanitisers";

// there is no official sync command for S3, so we use AWS CLI
// although there is a third-party package `s3-sync`, but I feel this would be more reliable

// Define folders to exclude
const blacklist = ["node_modules", "dist", ".git", "build"];

export function syncLocalToS3(username: string, workspaceName: string) {
  if (!process.env.S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME environment variable is not defined");
  }

  try {
    execSync("aws --version", { stdio: "ignore" });
  } catch {
    throw new Error("AWS CLI is not installed or not in PATH");
  }

  // Build exclude string (e.g. --exclude "node_modules/*" --exclude "dist/*" ...)
  const excludeOptions = blacklist.map((folder) => `--exclude "${folder}/*"`).join(" ");

  const s3Path = `s3://${process.env.S3_BUCKET_NAME}/${username}/${workspaceName}`;
  const sanitizedLocal = getSecureWorkspacePath(username);

  const command = `aws s3 sync "${sanitizedLocal}" "${s3Path}" ${excludeOptions} --delete`;

  try {
    console.log(`Syncing local workspace for user ${username} to S3 at ${workspaceName}`);
    execSync(command, { stdio: "ignore" });
    console.log("Sync completed.");
  } catch (err) {
    console.error("S3 sync failed:");
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
  }
}

export function syncS3ToLocal(username: string, workspaceName: string) {
    if (!process.env.S3_BUCKET_NAME) {
        throw new Error("S3_BUCKET_NAME environment variable is not defined");
    }
    
    try {
        execSync("aws --version", { stdio: "ignore" });
    } catch {
        throw new Error("AWS CLI is not installed or not in PATH");
    }
    
    const s3Path = `s3://${process.env.S3_BUCKET_NAME}/${username}/${workspaceName}`;
    const sanitizedLocal = getSecureWorkspacePath(username);
    
    const command = `aws s3 sync "${s3Path}" "${sanitizedLocal}" --delete`;
    
    try {
        console.log(`Syncing S3 workspace for user ${username} to local at ${workspaceName}`);
        execSync(command, { stdio: "ignore" });
        console.log("Sync completed.");
    } catch (err) {
        console.error("S3 sync failed:");
        if (err instanceof Error) {
        console.error(err.message);
        } else {
        console.error(err);
        }
    }
}
