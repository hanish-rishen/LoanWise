import {
  Building2,
  Menu,
  User,
  FileText,
  Settings,
  MessageSquare,
  Clock,
  Trash2,
  Plus,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser, UserButton, useClerk } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { getRecentChats, deleteConversation, clearChatMessages } from '../dbOperations';
import loanApplicationService from '../services/loanApplicationService';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [recentChats, setRecentChats] = useState<Array<{
    id: string;
    summary: string;
    timestamp: Date;
    messageCount: number;
  }>>([]);

  useEffect(() => {
    if (user?.id) {
      loadRecentChats();

      const refreshInterval = setInterval(() => {
        loadRecentChats();
      }, 5000);

      const handleNewConversation = () => {
        loadRecentChats();
      };

      const handleLoanApplicationCreated = () => {
        console.log('📋 Sidebar: Loan application created - refreshing...');
        loadRecentChats();
      };

      window.addEventListener('conversationCreated', handleNewConversation);
      window.addEventListener('loanApplicationCreated', handleLoanApplicationCreated);

      return () => {
        clearInterval(refreshInterval);
        window.removeEventListener('conversationCreated', handleNewConversation);
        window.removeEventListener('loanApplicationCreated', handleLoanApplicationCreated);
      };
    }
  }, [user?.id]);

  const loadRecentChats = async () => {
    if (!user?.id) return;

    try {
      const chats = await getRecentChats(user.id);
      setRecentChats(chats);
    } catch (error) {
      console.error('Error loading recent chats:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.id) return;

    try {
      console.log('🗑️ Sidebar: Deleting conversation:', conversationId);
      await deleteConversation(user.id, conversationId);
      await loadRecentChats();
      console.log('✅ Sidebar: Conversation deleted successfully');

      // Emit an event to notify other components that the conversation was deleted
      window.dispatchEvent(new CustomEvent('conversationDeleted', { detail: { conversationId } }));
    } catch (error) {
      console.error('❌ Sidebar: Error deleting conversation:', error);
    }
  };

  const handleClearAllChats = async () => {
    if (!user?.id) return;

    const confirmed = window.confirm('Are you sure you want to clear all conversations? This action cannot be undone.');
    if (confirmed) {
      try {
        console.log('🧹 Sidebar: Clearing all chats for user:', user.id);

        await clearChatMessages(user.id);
        await loadRecentChats();
        sessionStorage.removeItem('currentConversationId');
        loanApplicationService.clearAllFlows();

        // Emit event to notify other components that all conversations were cleared
        window.dispatchEvent(new CustomEvent('allConversationsCleared'));

        console.log('✅ Sidebar: All chats cleared successfully');
      } catch (error) {
        console.error('❌ Sidebar: Error clearing all chats:', error);
      }
    }
  };

  const handleConversationClick = (conversationId: string) => {
    navigate('/chat', { state: { conversationId } });
  };

  const handleNewConversation = () => {
    sessionStorage.removeItem('currentConversationId');
    navigate('/chat');
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const chatDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());

    if (chatDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (chatDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return timestamp.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    }
  };

  return (
    <>
      {/* Backdrop blur overlay */}
      <div className={`
        fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden
        ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `} onClick={onToggle} />

      {/* Sidebar with flexbox layout */}
      <div className={`
        flex-shrink-0 h-screen transition-all duration-500 ease-out p-2
        ${isCollapsed ? 'w-16' : 'w-56'}
      `} style={{
        width: isCollapsed ? '4rem' : '14rem'
      }}>
        <div className={`
          rounded-xl bg-gray-900/95 backdrop-blur-xl
          border border-gray-700/50 shadow-2xl shadow-black/30
          flex flex-col transition-all duration-500 ease-out
          h-[calc(100vh-1rem)]
          relative w-full
        `}>

          {/* Header Section */}
          <div className="flex-shrink-0 p-3 border-b border-gray-700/30">
            <div className="flex items-center justify-between">
              {/* Minimal Logo with L + dot */}
              <div className={`
                flex items-center space-x-3 transition-all duration-300
                ${isCollapsed ? 'justify-center w-full' : ''}
              `}>
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <div className="w-4 h-4 relative">
                    {/* L shape */}
                    <div className="absolute bottom-0 left-0 w-0.5 h-3 bg-blue-600 rounded-sm"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-0.5 bg-blue-600 rounded-sm"></div>
                    {/* Cool dot accent */}
                    <div className="absolute top-0 right-0 w-0.5 h-0.5 bg-blue-600 rounded-full"></div>
                  </div>
                </div>

                {/* Simple brand text */}
                <div className={`
                  transition-all duration-300 transform
                  ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                `}>
                  <h2 className="text-base font-semibold text-white">LoanWise</h2>
                </div>
              </div>

              {/* Toggle button - only show when not collapsed */}
              {!isCollapsed && (
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 transition-all duration-300"
                >
                  <Menu size={18} className="text-gray-300" />
                </button>
              )}
            </div>

            {/* Collapse button for collapsed state */}
            {isCollapsed && (
              <button
                onClick={onToggle}
                className="absolute top-3 -right-2 p-1.5 rounded-full bg-blue-600/80 hover:bg-blue-500 border border-blue-400/50 hover:border-blue-300 transition-all duration-300 shadow-lg z-10 group"
                title="Expand sidebar"
              >
                <Menu size={14} className="text-white group-hover:scale-110 transition-transform duration-200" />
              </button>
            )}
          </div>

          {/* Main Content Area - Takes up remaining space */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <nav className="p-3 flex flex-col h-full">
              {/* New Chat Button */}
              <button
                onClick={handleNewConversation}
                className={`
                  w-full p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30
                  border border-blue-500/30 hover:border-blue-500/50
                  flex items-center transition-all duration-300 group mb-3 relative
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
                title={isCollapsed ? "New Chat" : ""}
              >
                <Plus size={16} className="text-blue-400 group-hover:text-blue-300" />
                <span className={`
                  ml-2 font-medium text-blue-100 whitespace-nowrap transition-all duration-300 text-sm
                  ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                `}>
                  New Chat
                </span>
              </button>

              {/* Recent Chats Section */}
              <div className={`
                flex-1 flex flex-col overflow-hidden transition-all duration-300
                ${isCollapsed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
              `}>
                {!isCollapsed && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-300">Recent Chats</h3>
                      {recentChats.length > 0 && (
                        <button
                          onClick={handleClearAllChats}
                          className="p-1 rounded hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all duration-200 group"
                          title="Clear all chats"
                        >
                          <Trash2 size={12} className="text-gray-400 group-hover:text-red-400" />
                        </button>
                      )}
                    </div>

                    {/* Chat List with borders (outline) and proper scrolling */}
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar-thin">
                      {recentChats.map((chat) => (
                        <div key={chat.id} className="group relative">
                          <button
                            onClick={() => handleConversationClick(chat.id)}
                            className="w-full p-3 rounded-lg bg-gray-800/40 hover:bg-gray-700/50
                                     border border-gray-700/60 hover:border-gray-600/70
                                     transition-all duration-200 text-left group"
                          >
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex items-center min-w-0 space-x-3">
                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400"></div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-200 truncate">
                                    {chat.summary}
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                                    <Clock size={10} />
                                    <span>{formatTimestamp(chat.timestamp)}</span>
                                    <span>•</span>
                                    <span>{chat.messageCount} msgs</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={(e) => handleDeleteConversation(chat.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all duration-200"
                                title="Delete conversation"
                              >
                                <Trash2 size={10} className="text-gray-400 hover:text-red-400" />
                              </button>
                            </div>
                          </button>
                        </div>
                      ))}

                      {recentChats.length === 0 && (
                        <div className="text-center py-6 text-gray-500">
                          <MessageSquare size={20} className="mx-auto mb-2 opacity-50" />
                          <p className="text-xs">No recent chats</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </nav>
          </div>

          {/* Bottom Section - Stays at bottom */}
          <div className="flex-shrink-0 p-3 border-t border-gray-700/30 space-y-2">
            {/* Loan Applications Button */}
            <button
              onClick={() => navigate('/loan-applications')}
              className={`
                w-full p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50
                border border-gray-600/30 hover:border-gray-500/50
                flex items-center transition-all duration-300 group
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
              title={isCollapsed ? "Loan Applications" : ""}
            >
              <FileText size={16} className="text-blue-400 group-hover:text-blue-300" />
              <span className={`
                ml-2 font-medium text-gray-200 whitespace-nowrap transition-all duration-300 text-sm
                ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
              `}>
                Loan Applications
              </span>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={() => signOut()}
              className={`
                w-full p-3 rounded-lg bg-red-800/30 hover:bg-red-700/40
                border border-red-600/30 hover:border-red-500/50
                flex items-center transition-all duration-300 group
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
              title={isCollapsed ? "Sign Out" : ""}
            >
              <LogOut size={18} className="text-red-400 group-hover:text-red-300" />
              <span className={`
                ml-3 font-medium text-gray-200 whitespace-nowrap transition-all duration-300
                ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
              `}>
                Sign Out
              </span>
            </button>

            {/* User Profile Section */}
            <div className={`
              flex items-center transition-all duration-300
              ${isCollapsed ? 'justify-center' : 'justify-between'}
            `}>
              {isLoaded && user ? (
                <div className="flex items-center w-full">
                  <div className="relative">
                    <UserButton
                      appearance={{
                        elements: {
                          userButtonAvatarBox: "w-10 h-10 border border-gray-600",
                          userButtonPopoverCard: "bg-gray-800 border border-gray-600",
                          userButtonPopoverActionButton: "hover:bg-gray-700 text-white",
                          userButtonPopoverActionButtonText: "text-white",
                          userButtonPopoverFooter: "border-gray-600"
                        },
                        variables: {
                          colorPrimary: "#3b82f6",
                          colorBackground: "#1f2937",
                          colorText: "#ffffff",
                          borderRadius: "0.5rem"
                        }
                      }}
                    />
                  </div>

                  {/* User info */}
                  <div className={`
                    ml-3 min-w-0 flex-1 transition-all duration-300
                    ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                  `}>
                    <p className="text-sm font-medium text-white truncate">
                      {user.firstName || user.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.emailAddresses[0]?.emailAddress || 'user@example.com'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center w-full">
                  <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center border border-gray-500">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <div className={`
                    ml-3 transition-all duration-300
                    ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                  `}>
                    <p className="text-sm font-medium text-white">Loading...</p>
                    <p className="text-xs text-gray-400">Loading user...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(34, 197, 94, 0.3) transparent;
        }

        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.3);
          border-radius: 2px;
        }

        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.5);
        }
      `}</style>
    </>
  );
}
