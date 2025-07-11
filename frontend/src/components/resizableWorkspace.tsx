import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import CollaborativeEditor from "./CollaborativeEditor"
import TerminalComponent from "./Terminal"
import FileExplorer from "./FileExplorer"
import { useCallback, useState } from "react";
import axios from "axios";
import clsx from "clsx"
import { X } from "lucide-react"
import { debounce } from "lodash"


export function ResizableWorkSpace() {
  const containerId = "6be06b09aa30c7424a36dcff1024b39aec34fe1468cd61df6184d955bb8d5552"
  const userId = "shree-06"

  const [openFiles, setOpenFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({})

   const fetchFileContent = async (filename: string) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/getFileContents?userId=${userId}&filename=${filename}`)
      return res.data.content
    } catch (err) {
      console.error("Error loading file:", err)
      return ""
    }
  }

  const saveFileContent = async (filename: string, content: string) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/saveFileContents`, {
        userId,
        filename,
        content,
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

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFile || value === undefined) return
    setFileContents(prev => ({ ...prev, [activeFile]: value }))
    setUnsavedChanges(prev => ({ ...prev, [activeFile]: true }))

    debouncedSave(); 
  }



 const handleSave = useCallback(() => {
  if (activeFile && fileContents[activeFile] !== undefined) {
    saveFileContent(activeFile, fileContents[activeFile]);
  }
}, [activeFile, fileContents]); 

  const debouncedSave = useCallback(
  debounce(handleSave, 2000, { maxWait: 10000 }),
  [handleSave]
);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="w-full h-full"
    >
      <ResizablePanel defaultSize={15}>
          <FileExplorer userId={userId} handleFileClick={handleFileClick} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} className="h-screen">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={15} >
            <div className="bg-slate-900 text-white border-b border-slate-700 h-full">
              {/* Tab bar */}
              <div className="flex gap-1 px-2 py-1 text-sm bg-slate-800">
                {openFiles.map(filename => (
                  <div
                    key={filename}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1 rounded-t-md cursor-pointer",
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
              <div className="h-full">
                {activeFile ? (
                  <CollaborativeEditor
                    value={fileContents[activeFile]}
                    onChange={handleEditorChange}
                    onSave={handleSave}
                    filename={activeFile}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle className="bg-amber-400" />
          <ResizablePanel defaultSize={5} className="bg-slate-900">
            {/* <div className="h-8"></div> */}
            <TerminalComponent webSocketUrl={`ws://localhost:3000/?containerId=${containerId}&userId=${userId}`} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
