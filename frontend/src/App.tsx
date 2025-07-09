import './App.css'
import CollaborativeEditor from './components/CollaborativeEditor'
import TerminalComponent from './components/Terminal'


function App() {
  return (
    <>
      <div>
        <CollaborativeEditor roomId="shreehari-6206" />
      </div>
      <div>
        <TerminalComponent webSocketUrl="ws://localhost:8080/ws" />
      </div>
    </>
  )
}

export default App
