import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import CollaborativeEditor from "./CollaborativeEditor"
import TerminalComponent from "./Terminal"
import FileExplorer from "./FileExplorer"

export function ResizableWorkSpace() {
  const containerId = "c175de09d2cf5df91bd8b7b4cd329c41a0278419887500e3756c4b552bf2f55f"
  const userId = "shreehari-6206"
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="w-full h-full"
    >
      <ResizablePanel defaultSize={15}>
          <FileExplorer containerId={containerId} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} className="h-screen">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={15} >
            <CollaborativeEditor roomId="shreehari-6206" />
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
