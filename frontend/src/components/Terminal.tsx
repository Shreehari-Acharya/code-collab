import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { AttachAddon } from '@xterm/addon-attach'
import '@xterm/xterm/css/xterm.css'

interface TerminalComponentProps {
  webSocketUrl: string;
  onEnterPress: () => void;
}

const TerminalComponent = ({ webSocketUrl, onEnterPress }: TerminalComponentProps) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal>(null)
  const fitAddonRef = useRef<FitAddon>(null)
  const socketRef = useRef<WebSocket>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (!terminalRef.current || !webSocketUrl) return

    const xterm = new Terminal({
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

    // When enter is pressed, we will fetch folder structure
    const keyListener = xterm.onKey(({ key, domEvent }) => {
      if (key === 'Enter' || domEvent.key === 'Enter') {
        onEnterPress?.()
      }
    })

    // ResizeObserver to detect panel resize
    resizeObserverRef.current = new ResizeObserver(() => {
      fitAddon.fit()
      xterm.scrollToBottom(); 
    })

    resizeObserverRef.current.observe(terminalRef.current)


    xtermRef.current = xterm
    fitAddonRef.current = fitAddon
    socketRef.current = socket

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      socket.close()
      xterm.dispose()
      resizeObserverRef.current?.disconnect()
      keyListener.dispose()
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
