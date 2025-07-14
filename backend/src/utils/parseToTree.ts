import { TreeViewElement } from "../types/treeViewElement";

export function parseToTree(output: string[]): TreeViewElement[] {
  const tree = output.map((rawPath): TreeViewElement => {
    const isDir = rawPath.endsWith('/');
    const cleanedPath = rawPath.replace(/\/$/, '');
    const parts = cleanedPath.split('/');
    const name = parts[parts.length - 1]; // just filename
    return {
      id: rawPath,              // full relative path
      name,                     // just filename
      isSelectable: !isDir,
      children: isDir ? [] : undefined,
    };
  });

  return tree
}
