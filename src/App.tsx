import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import LoginPage from './components/LoginPage';
import LoanApplicationsPage from './components/LoanApplicationsPage';
import ChatInterface from './components/ChatInterface';
import VoiceMode from './components/VoiceMode';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';
import { seedDemoData } from './seedData';

function Dashboard({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { userId } = useAuth();

  // Refs for components (keeping for potential future use)
  const chatRef = useRef<{ clearConversation: () => void }>(null);
  const voiceRef = useRef<{ clearConversation: () => void; getMessages: () => any[] }>(null);

  // Seed demo data when user first logs in
  useEffect(() => {
    if (userId) {
      seedDemoData(userId).catch(console.error);
    }
  }, [userId]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Clone children with refs
  const childrenWithRefs = React.cloneElement(children as React.ReactElement, {
    ref: window.location.pathname === '/chat' ? chatRef :
         window.location.pathname === '/voice' ? voiceRef : null
  });

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white flex">
      {/* Sidebar with proper spacing to prevent border cutoff */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <main className="flex-1 h-full flex flex-col bg-gray-900 transition-all duration-500 ease-out min-w-0">
        {window.location.pathname !== '/voice' && <Header />}

        {childrenWithRefs}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
        }

        @keyframes subtle-pulse {
          0%, 100% {
            transform: scale(1.15);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function App() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login/*" element={<LoginPage />} />
        <Route path="/chat" element={
          userId ? (
            <Dashboard>
              <ChatInterface />
            </Dashboard>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        <Route path="/voice" element={
          userId ? (
            <Dashboard>
              <VoiceMode />
            </Dashboard>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        <Route path="/loan-applications" element={userId ? <LoanApplicationsPage /> : <Navigate to="/login" replace />} />
        <Route path="/" element={<Navigate to="/chat" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
