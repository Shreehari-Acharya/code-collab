import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import CollaborativeEditor from "./CollaborativeEditor"
import TerminalComponent from "./Terminal"
import FileExplorer from "./FileExplorer"
import { useMemo, useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import clsx from "clsx"
import { X } from "lucide-react"
import { debounce } from "lodash"
import { useSession } from "@/lib/authClient";
import { Link, useNavigate } from "react-router-dom";


export function ResizableWorkSpace() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isPending) return;
    if (!session) {
      navigate("/");
    }
  }, [isPending, session, navigate]);

  
  const [openFiles, setOpenFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({})
  const [fetchFileTreeAgain, setFetchFileTreeAgain] = useState(false); // switch to trigger re-fetching file structure

   const fetchFileContent = async (filename: string) => {
    try {
      const res = await axios.get("/api/workspaces/file-content", {
        params: {
          filename
        }
      })

      return res.data.content
    } catch (err) {
      console.error("Error loading file:", err)
      return ""
    }
  }

  const saveFileContent = async (filename: string, content: string) => {
    try {
      await axios.put("/api/workspaces/file-content", {
        filename,
        content
      })
      setUnsavedChanges(prev => ({ ...prev, [filename]: false }))
    } catch (err) {
      console.error("Error saving file:", err)
    }
  }

  const handleFileClick = async (filename: string) => {
    if (!openFiles.includes(filename)) {
      setOpenFiles(prev => [...prev, filename])
      const content = await fetchFileContent(filename)
      setFileContents(prev => ({ ...prev, [filename]: content }))
    }
    setActiveFile(filename)
  }

  const handleCloseTab = (filename: string) => {
    setOpenFiles(prev => prev.filter(f => f !== filename))
    setActiveFile(prev => (prev === filename ? openFiles.filter(f => f !== filename).at(-1) ?? null : prev))
    setUnsavedChanges(prev => {
      const updated = { ...prev }
      delete updated[filename]
      return updated
    })
  }

  const handleEditorChange = (filename: string, value: string) => {
  if (!filename || value === undefined) return;
  setFileContents(prev => ({ ...prev, [filename]: value }))
  setUnsavedChanges(prev => ({ ...prev, [filename]: true }))
  debouncedSave(filename, value)
}



// Save content immediately when called with explicit values
const handleSave = useCallback(async (filename: string, content: string) => {
  await saveFileContent(filename, content);
}, []);

// Debounced version that always gets latest values
const debouncedSave = useMemo(
  () =>
    debounce((filename: string, content: string) => {
      handleSave(filename, content);
    }, 2500, { maxWait: 12000 }),
  [handleSave]
);

  useEffect(() => {
  return () => {
    debouncedSave.cancel();
  };
}, [debouncedSave]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="w-full h-full"
    >
      <ResizablePanel defaultSize={20}>
          <FileExplorer handleFileClick={handleFileClick} fetchAgain={fetchFileTreeAgain} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={80} className="h-screen">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={80} >
            <div className="bg-slate-900 text-white border-b border-slate-700 h-full">
              {/* Tab bar */}
              <div className="flex gap-1 px-2 py-1 text-sm bg-slate-800 h-8">
                {openFiles.map(filename => (
                  <div
                    key={filename}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1 cursor-pointer",
                      activeFile === filename
                        ? "bg-slate-700 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    )}
                    onClick={() => setActiveFile(filename)}
                  >
                    <span className="truncate max-w-[150px]">
                      {filename.split("/").pop()}
                      {unsavedChanges[filename] ? " ●" : ""}
                    </span>
                    <X
                      className="w-4 h-4 hover:text-red-400"
                      onClick={e => {
                        e.stopPropagation()
                        handleCloseTab(filename)
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Editor */}
              <div className="h-full bg-[#1e1e1e] pt-2">
                {activeFile ? (
                  <CollaborativeEditor
                    value={fileContents[activeFile]}
                    onChange={handleEditorChange}
                    onSave={() => handleSave(activeFile, fileContents[activeFile])}
                    filename={activeFile}
                  />
                ) : (
                  <div className="flex text-2xl items-center justify-center h-full text-gray-500">
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle className="bg-blue-950" />
          <ResizablePanel defaultSize={20} className="bg-slate-900">
            <div className="h-8 flex items-center justify-end pr-4 gap-8 text-xs text-slate-400"> 
              <p>NOTE: expose your application on port 3000 to preview.</p>
              <Link 
                target="_blank"
                rel="noopener noreferrer"
                to={`https://${session?.user.username}.preview.${import.meta.env.VITE_HOSTED_DOMAIN}`}
                className="text-blue-400 hover:underline"
              > see preview
              </Link>
            </div>
            <TerminalComponent webSocketUrl={`${import.meta.env.VITE_WS_URL}`} onEnterPress={() => setFetchFileTreeAgain((prev) => !prev)} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
