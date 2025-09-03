import {
  Building2,
  Menu,
  User,
  FileText,
  Settings,
  MessageSquare,
  Clock,
  Trash2,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
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
  const [recentChats, setRecentChats] = useState<Array<{
    id: string;
    summary: string;
    timestamp: Date;
    messageCount: number;
  }>>([]);

  useEffect(() => {
    if (user?.id) {
      loadRecentChats();

      // Set up interval to refresh chats periodically
      const refreshInterval = setInterval(() => {
        loadRecentChats();
      }, 5000); // Refresh every 5 seconds

      // Listen for custom events when new conversations are created
      const handleNewConversation = () => {
        loadRecentChats();
      };

      // Listen for loan application creation events
      const handleLoanApplicationCreated = () => {
        console.log('📋 Sidebar: Loan application created - refreshing...');
        // Force refresh sidebar to show updated state
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
      await deleteConversation(conversationId, user.id);
      await loadRecentChats();
      console.log('✅ Sidebar: Conversation deleted successfully');
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

        // Clear all chat messages from database
        await clearChatMessages(user.id);

        // Refresh the chat list
        await loadRecentChats();

        // Clear current conversation from session storage
        sessionStorage.removeItem('currentConversationId');

        // IMPORTANT: Clear ALL conversation memory from AI services
        console.log('🔄 Sidebar: Clearing ALL AI conversation memories and flows');
        loanApplicationService.clearAllFlows();

        console.log('✅ Sidebar: All chats cleared successfully');
      } catch (error) {
        console.error('❌ Sidebar: Error clearing all chats:', error);
      }
    }
  };

  const handleConversationClick = (conversationId: string) => {
    // Navigate to chat with conversation context
    navigate('/chat', { state: { conversationId } });
  };

  const handleNewConversation = () => {
    // Clear current conversation and start new one
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
      {/* Backdrop blur overlay when sidebar is open on mobile */}
      <div className={`
        fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden
        ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `} onClick={onToggle} />

      {/* Floating Sidebar */}
      <div className={`
        fixed left-0 top-0 h-screen z-50 transition-all duration-500 ease-out
        ${isCollapsed ? 'translate-x-0' : 'translate-x-0'}
      `}>
        <div className={`
          h-full m-4 rounded-3xl bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95
          backdrop-blur-xl border border-gray-700/50 shadow-2xl shadow-black/50
          flex flex-col justify-between transition-all duration-500 ease-out
          ${isCollapsed ? 'w-20' : 'w-80'}
          hover:shadow-3xl hover:shadow-cyan-500/20
        `}>
          {/* Header Section */}
          <div>
            {/* Logo and Toggle */}
            <div className="relative p-6 border-b border-gray-700/30">
              <div className="flex items-center justify-between">
                {/* Modern Logo */}
                <div className={`
                  flex items-center space-x-3 transition-all duration-300
                  ${isCollapsed ? 'justify-center w-full' : ''}
                `}>
                  <div className="relative">
                    {/* Glow effect behind logo */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl blur-lg opacity-30 animate-pulse"></div>
                    {/* Logo container */}
                    <div className="relative bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-3 rounded-xl shadow-xl">
                      <Building2 className="text-white" size={isCollapsed ? 24 : 28} />
                    </div>
                  </div>

                  {/* Brand text with gradient */}
                  <div className={`
                    transition-all duration-300 transform
                    ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                  `}>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                      LoanWise
                    </h2>
                    <p className="text-xs text-gray-400 font-medium tracking-wide">AI ASSISTANT</p>
                  </div>
                </div>

                {/* Toggle button */}
                <button
                  onClick={onToggle}
                  className={`
                    p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30
                    transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/20
                    ${isCollapsed ? 'ml-0' : 'ml-2'}
                  `}
                >
                  <Menu size={20} className="text-cyan-400" />
                </button>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="p-4 space-y-2">
              {/* New Chat Button */}
              <button
                onClick={handleNewConversation}
                className={`
                  w-full p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20
                  border border-cyan-400/30 hover:border-cyan-400/50
                  flex items-center transition-all duration-300 group
                  hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02]
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-400/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Plus size={20} className="relative text-cyan-400 group-hover:text-cyan-300" />
                </div>
                <span className={`
                  ml-4 font-medium text-cyan-100 whitespace-nowrap transition-all duration-300
                  ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                `}>
                  New Conversation
                </span>
              </button>

              {/* Recent Chats Section */}
              <div className={`
                transition-all duration-300
                ${isCollapsed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
              `}>
                <div className="flex items-center justify-between mb-3 mt-6">
                  <h3 className="text-sm font-semibold text-gray-300 tracking-wide">RECENT CHATS</h3>
                  {recentChats.length > 0 && (
                    <button
                      onClick={handleClearAllChats}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all duration-200 group"
                      title="Clear all chats"
                    >
                      <Trash2 size={14} className="text-gray-400 group-hover:text-red-400" />
                    </button>
                  )}
                </div>

                {/* Chat List */}
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar-thin">
                  {recentChats.map((chat) => (
                    <div key={chat.id} className="group relative">
                      <button
                        onClick={() => handleConversationClick(chat.id)}
                        className="w-full p-3 rounded-xl bg-gray-800/30 hover:bg-gray-700/50 border border-transparent hover:border-gray-600/50 transition-all duration-200 group text-left"
                      >
                        <div className="flex items-center justify-between min-w-0">
                          <div className="flex items-center min-w-0 space-x-3">
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"></div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-200 truncate">
                                {chat.summary}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                                <Clock size={10} />
                                <span>{formatTimestamp(chat.timestamp)}</span>
                                <span>•</span>
                                <span>{chat.messageCount} messages</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleDeleteConversation(chat.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all duration-200"
                            title="Delete conversation"
                          >
                            <Trash2 size={12} className="text-gray-400 hover:text-red-400" />
                          </button>
                        </div>
                      </button>
                    </div>
                  ))}

                  {recentChats.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent chats</p>
                    </div>
                  )}
                </div>
              </div>
            </nav>
          </div>

          {/* Bottom Section */}
          <div className="p-6 border-t border-gray-700/30 space-y-4">
            {/* Loan Applications Button */}
            <button
              onClick={() => navigate('/loan-applications')}
              className={`
                w-full p-4 rounded-xl bg-gray-800/50 hover:bg-gray-700/50
                border border-gray-600/30 hover:border-gray-500/50
                flex items-center transition-all duration-300 group
                hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02]
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <FileText size={20} className="relative text-blue-400 group-hover:text-blue-300" />
              </div>
              <span className={`
                ml-4 font-medium text-gray-200 whitespace-nowrap transition-all duration-300
                ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
              `}>
                Loan Applications
              </span>
            </button>

            {/* User Profile Section */}
            <div className={`
              flex items-center transition-all duration-300
              ${isCollapsed ? 'justify-center' : 'justify-between'}
            `}>
              {isLoaded && user ? (
                <div className="flex items-center w-full">
                  <div className="relative group">
                    {/* Glow effect behind avatar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>

                    {/* User Button with custom styling */}
                    <div className="relative">
                      <UserButton
                        appearance={{
                          elements: {
                            userButtonAvatarBox: "w-12 h-12 border-2 border-purple-400/30 shadow-lg shadow-purple-500/20",
                            userButtonPopoverCard: "bg-gray-800 border border-gray-600",
                            userButtonPopoverActionButton: "hover:bg-gray-700 text-white",
                            userButtonPopoverActionButtonText: "text-white",
                            userButtonPopoverFooter: "border-gray-600"
                          },
                          variables: {
                            colorPrimary: "#8b5cf6",
                            colorBackground: "#1f2937",
                            colorText: "#ffffff",
                            borderRadius: "0.75rem"
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* User info */}
                  <div className={`
                    ml-3 min-w-0 flex-1 transition-all duration-300
                    ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                  `}>
                    <p className="text-sm font-semibold text-white truncate">
                      {user.firstName || user.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.emailAddresses[0]?.emailAddress || 'user@example.com'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center w-full">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center border-2 border-gray-500/30">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <div className={`
                    ml-3 transition-all duration-300
                    ${isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                  `}>
                    <p className="text-sm font-semibold text-white">Loading...</p>
                    <p className="text-xs text-gray-400">Loading user...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
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
