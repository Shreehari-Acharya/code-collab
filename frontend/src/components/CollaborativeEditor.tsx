import Editor, { type OnMount } from "@monaco-editor/react"

interface CollaborativeEditorProps {
  value: string
  onChange: (filename: string, content: string) => void
  onSave: () => void
  filename: string
}

function getLanguageFromFileName(name: string) {
  if (name.endsWith(".ts")) return "typescript"
  if (name.endsWith(".js")) return "javascript"
  if (name.endsWith(".json")) return "json"
  if (name.endsWith(".py")) return "python"
  if (name.endsWith(".html")) return "html"
  if (name.endsWith(".css")) return "css"
  return "plaintext"
}

export default function CollaborativeEditor({
  value,
  onChange,
  onSave,
  filename
}: CollaborativeEditorProps) {


  const handleMount: OnMount = (editor, monaco) => {
    // Ctrl+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave()
    })
  }

  return (
    <div className="w-full h-full">
      <Editor
        value={value}
        key={filename}
        height="100%"
        theme="vs-dark"
        defaultLanguage={getLanguageFromFileName(filename)}
        onChange={(v) => onChange(filename, v || "")}
        onMount={handleMount}
      />
    </div>
  )
}
