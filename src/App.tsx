import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react'
import LoginPage from './components/LoginPage'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatInterface from './components/ChatInterface'
import VoiceMode from './components/VoiceMode'
import LoanApplicationsPage from './components/LoanApplicationsPage'
import ToastContainer from './components/ToastContainer'
import { useState } from 'react'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'voice' | 'applications'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Router>
        <div className="h-screen bg-gray-50">
          <SignedOut>
            <LoginPage />
          </SignedOut>
          <SignedIn>
            <div className="h-full flex flex-col">
              <Header
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                currentView={currentView}
                setCurrentView={setCurrentView}
              />
              <div className="flex-1 flex overflow-hidden">
                <Sidebar
                  isOpen={sidebarOpen}
                  setIsOpen={setSidebarOpen}
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                />
                <main className="flex-1 overflow-hidden">
                  <Routes>
                    <Route path="/" element={<Navigate to="/chat" replace />} />
                    <Route
                      path="/chat"
                      element={<ChatInterface />}
                    />
                    <Route
                      path="/voice"
                      element={<VoiceMode />}
                    />
                    <Route
                      path="/applications"
                      element={<LoanApplicationsPage />}
                    />
                  </Routes>
                </main>
              </div>
            </div>
          </SignedIn>
          <ToastContainer />
        </div>
      </Router>
    </ClerkProvider>
  )
}

export default App
