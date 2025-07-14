import { Tree, File, Folder, type TreeViewElement } from "./ui/freeTreeView"
import { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import axios from "@/lib/axios";
import { useCallback } from "react";

interface FileExplorerProps {
  handleFileClick: (id: string) => void;
  fetchAgain: boolean; // This prop is used to trigger a re-fetch of the file structure
}
export default function FileExplorer({ handleFileClick, fetchAgain }: FileExplorerProps) {
  const [treeData, setTreeData] = useState<TreeViewElement[]>([]);

  const fetchWorkspaceFiles = useCallback(async (path: string = '/') => {
    try {
      console.log("Fetching workspace files for path:", path);
      const { data } = await axios.get(`/api/workspaces/file-structure`, {
        params: {
          path,
        }
      });
      return data as TreeViewElement[];
    } catch (error) {
      console.error("Error fetching workspace files:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    (async () => {
      const rootData = await fetchWorkspaceFiles('/');
      setTreeData(rootData);
    })();
  }, [fetchWorkspaceFiles, fetchAgain]);

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

    if (!id.endsWith("/")) return; 
    const children = await fetchWorkspaceFiles(id);

    console.log("Adding children to", id, "children:", children);
    
    const updatedTree = addChildrenToNode(treeData, id, children);
    setTreeData(updatedTree);
    console.log(treeData);
  }

  const renderTree = (elements: TreeViewElement[]) => {

    if(!elements || elements.length === 0) {
      return <div className="text-gray-500">No files found</div>;
    }
    
    return elements.map((element) => {


      const isFolder = element.children !== undefined || element.isSelectable === false;
      if (isFolder) {
        return (
          <Folder
            key={element.id}
            element={element.name}
            value={element.id}
            handleSelect={async() => await handleFolderClick(element.id)}
          >
            {renderTree(element.children ?? [])}
          </Folder>
        );
      } else {
        return (
          <File
            key={element.id}
            value={element.id}
            isSelectable={element.isSelectable}
            handleSelect={(id) => handleFileClick(id)}
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
