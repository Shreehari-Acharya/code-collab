import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { WebsocketProvider } from "y-websocket";
import { useEffect, useMemo, useState } from "react";



export default function CollaborativeEditor({ roomId }: { roomId: string }) {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const [editor, setEditor] = useState<any | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)

  // this effect manages the lifetime of the Yjs document and the provider
  useEffect(() => {
    const provider = new WebsocketProvider('wss://demos.yjs.dev/ws', roomId, ydoc)
    setProvider(provider)
    return () => {
      provider?.destroy()
      ydoc.destroy()
    }
  }, [ydoc])

  // this effect manages the lifetime of the editor binding
  useEffect(() => {
    if (provider == null || editor == null) {
      return
    }
    console.log('reached', provider)
    const binding = new MonacoBinding(ydoc.getText(), editor.getModel()!, new Set([editor]), provider?.awareness)
    return () => {
      binding.destroy()
    }
  }, [ydoc, provider, editor])

  return (
    <div className="w-full h-full">
      <Editor height="100vh" theme="vs-dark" defaultLanguage="javascript" onMount={editor => { setEditor(editor) }} />
    </div>
  )
}

