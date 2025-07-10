import { Tree, File, Folder, type TreeViewElement } from "./ui/freeTreeView"
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RefreshCcw } from "lucide-react";

export default function FileExplorer({containerId}: {containerId: string}) {
  const [treeData, setTreeData] = useState<TreeViewElement[]>([]);

  const fetchWorkspaceFiles = useCallback(async (path: string = '/') => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/fileStructure/?containerId=${containerId}&path=${path}`);
      return data as TreeViewElement[];
    } catch (error) {
      console.error("Error fetching workspace files:", error);
      return [];
    }
  }, [containerId]);

  useEffect(() => {
    (async () => {
      const rootData = await fetchWorkspaceFiles('/');
      setTreeData(rootData);
    })();
  }, [fetchWorkspaceFiles]);

  // Recursive helper to update a node by id and insert its children
  const addChildrenToNode = (nodes: TreeViewElement[], id: string, children: TreeViewElement[]): TreeViewElement[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          children,
        };
      }
      if (node.children) {
        return {
          ...node,
          children: addChildrenToNode(node.children, id, children),
        };
      }
      return node;
    });
  };

  async function handleFolderClick(id: string) {

    const children = await fetchWorkspaceFiles(id);
    const updatedTree = addChildrenToNode(treeData, id, children);
    setTreeData(updatedTree);
  }

  function handleFileClick(id: string) {
    console.log(`File clicked: ${id}`);
  }

  const renderTree = (elements: TreeViewElement[], parentPath = '') => {

    if(!elements || elements.length === 0) {
      return <div className="text-gray-500">No files found</div>;
    }
    return elements.map((element) => {
      const currentPath = `${parentPath}${element.name}${element.children ? '/' : ''}`;

      const isFolder = element.children !== undefined || element.isSelectable === false;
      if (isFolder) {
        return (
          <Folder
            key={element.id}
            element={element.name}
            value={element.id}
            handleSelect={async() => await handleFolderClick(element.id)}
          >
            {renderTree(element.children ?? [] , currentPath)}
          </Folder>
        );
      } else {
        return (
          <File
            key={element.id}
            value={element.id}
            isSelectable={element.isSelectable}
            handleSelect={() => handleFileClick(element.id)}
          >
            {element.name}
          </File>
        );
      }
    });
  };

  return (
    <>
      <div className="h-8 flex px-2 py-1.5 bg-gray-950 text-xs items-center justify-between text-slate-100 font-semibold">
        WORKSPACE
        <RefreshCcw className="h-4 w-4" 
        onClick={
          async () =>{
            const rootData = await fetchWorkspaceFiles()
            setTreeData(rootData);
          }}/>  
      </div>
      <Tree elements={treeData} className="h-full w-full p-3 bg-gray-900 text-white">
        {renderTree(treeData)}
      </Tree>
    </>
  );
}
