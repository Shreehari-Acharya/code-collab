import './App.css'
import { Toaster } from './components/ui/sonner'
import LandingPage from './pages/landingPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ResizableWorkSpace } from './components/resizableWorkspace'
import Dashboard from './pages/dashboard'


function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path='/workspace/:id' element={<ResizableWorkSpace/>} />
          <Route path='/dashboard' element={<Dashboard/>} />
        </Routes>
        <Toaster />
    </BrowserRouter>
  )
}

export default App
