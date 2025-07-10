import { TreeViewElement } from "../types/treeViewElement";

function sanitizeString(input: string): string {
  // Remove non-printable characters (nulls, tabs, control chars)
  return input.replace(/[^\x20-\x7E]/g, '');
}

export function parseToTree(output: string, path: string): TreeViewElement[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((rawName): TreeViewElement => {
      const sanitisedName = sanitizeString(rawName);
      const isDir = sanitisedName.endsWith('/');
      const filename = sanitisedName.replace(/\/$/, ''); // Remove trailing slash for files

      return {
        id: `${sanitisedName}`,
        isSelectable: !isDir,
        name: filename,
        children: isDir ? [] : undefined,
      };
    });
}
