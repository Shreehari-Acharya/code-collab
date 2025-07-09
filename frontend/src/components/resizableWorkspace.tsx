import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import CollaborativeEditor from "./CollaborativeEditor"
import TerminalComponent from "./Terminal"

export function ResizableWorkSpace() {
  const containerId = "350108d2bf05"
  const userId = "shreehari-6206"
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="w-full h-full"
    >
      <ResizablePanel defaultSize={15}>
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">One</span>
        </div>
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
