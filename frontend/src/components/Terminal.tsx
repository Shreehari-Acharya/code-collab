import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { AttachAddon } from '@xterm/addon-attach'
import '@xterm/xterm/css/xterm.css'

interface TerminalComponentProps {
  webSocketUrl: string;
}

const TerminalComponent = ({ webSocketUrl }: TerminalComponentProps) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal>(null)
  const fitAddonRef = useRef<FitAddon>(null)
  const socketRef = useRef<WebSocket>(null)

  useEffect(() => {
    if (!terminalRef.current || !webSocketUrl) return

    const xterm = new Terminal({
      rows: 13,
      cursorBlink: true,
      cursorStyle: 'underline',
      fontSize: 14,
      fontFamily: 'monospace',
      scrollback: 200, // enables backward scrolling
      theme: {
        background: '#00001a',
        foreground: '#e6ffff',
        cursor: '#d4d4d4',
      }
    })

    const fitAddon = new FitAddon()
    const socket = new WebSocket(webSocketUrl)
    const attachAddon = new AttachAddon(socket)

    xterm.loadAddon(fitAddon)
    xterm.loadAddon(attachAddon)

    xterm.open(terminalRef.current)
    fitAddon.fit()

    xterm.onRender(() => { //scroll to bottom when new content is rendered
      const buffer = xterm.buffer.active;
      const isAtBottom = buffer.viewportY >= buffer.baseY - 1;
      if (isAtBottom) {
        xterm.scrollToBottom();
      }
    });

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon
    socketRef.current = socket

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      socket.close()
      xterm.dispose()
    }
  }, [webSocketUrl])

  return (
    <div
      ref={terminalRef}
      style={{
        height: '100%',
        width: '101%', // to avoid horizontal scrollbar
        backgroundColor: '#000',
      }}
    />
  )
}

export default TerminalComponent
