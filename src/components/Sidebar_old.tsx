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

      window.addEventListener('newConversationCreated', handleNewConversation);
      window.addEventListener('messageAdded', handleNewConversation);
      window.addEventListener('loanApplicationCreated', handleLoanApplicationCreated);

      return () => {
        clearInterval(refreshInterval);
        window.removeEventListener('newConversationCreated', handleNewConversation);
        window.removeEventListener('messageAdded', handleNewConversation);
        window.removeEventListener('loanApplicationCreated', handleLoanApplicationCreated);
      };
    }
  }, [user?.id]);

  const loadRecentChats = async () => {
    try {
      const chats = await getRecentChats(user!.id);
      setRecentChats(chats);
    } catch (error) {
      console.error('Error loading recent chats:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await deleteConversation(user!.id, conversationId);
        loadRecentChats(); // Refresh the list
      } catch (error) {
        console.error('Error deleting conversation:', error);
      }
    }
  };

  const handleClearAllChats = async () => {
    if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
      try {
        console.log('🔄 Sidebar: Clearing all chats for user:', user!.id);

        // Clear from database
        await clearChatMessages(user!.id);

        // Clear local state
        setRecentChats([]);

        // Clear session storage
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

        <nav className="mt-6 px-2 space-y-2">
          {/* Chat History */}
          <div className={`
            transition-opacity duration-300
            ${isCollapsed ? 'opacity-0' : 'opacity-100'}
          `}>
            <div className="flex items-center justify-between mb-3 px-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Recent Chats
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleNewConversation}
                  className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-green-600/20 transition-all"
                  title="Start new conversation"
                >
                  <Plus size={14} />
                </button>
                {recentChats.length > 0 && (
                  <button
                    onClick={handleClearAllChats}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-600/20 transition-all text-xs"
                    title="Clear all conversations"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            {recentChats.map((chat) => (
              <div
                key={chat.id}
                className="relative group"
              >
                <button
                  onClick={() => handleConversationClick(chat.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                >
                  <div className="flex items-center min-w-0">
                    <MessageSquare size={16} className="flex-shrink-0 mr-3" />
                    <div className="text-left min-w-0">
                      <div className="text-sm font-medium whitespace-nowrap text-ellipsis overflow-hidden">
                        {chat.summary}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(chat.timestamp)} • {chat.messageCount} messages
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={12} className="flex-shrink-0 opacity-50" />
                    <button
                      onClick={(e) => handleDeleteConversation(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-600 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 size={12} className="text-red-400 hover:text-white" />
                    </button>
                  </div>
                </button>
              </div>
            ))}
            {recentChats.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No recent chats
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => navigate('/loan-applications')}
          className="w-full text-left p-3 mb-4 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center transition-colors group"
        >
          <FileText size={20} className="flex-shrink-0" />
          <span className={`
            ml-4 text-sm font-medium whitespace-nowrap transition-opacity duration-300
            ${isCollapsed ? 'opacity-0' : 'opacity-100'}
          `}>
            Loan Applications
          </span>
        </button>

        <div className="flex items-center justify-between">
          {isLoaded && user ? (
            <>
              {/* User Info Section */}
              <div className="flex items-center flex-1 min-w-0">
                <img
                  alt="User avatar"
                  className="h-10 w-10 rounded-full flex-shrink-0"
                  src={user.imageUrl || "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400"}
                />
                <div className={`
                  ml-3 transition-opacity duration-300 overflow-hidden
                  ${isCollapsed ? 'opacity-0' : 'opacity-100'}
                `}>
                  <p className="text-sm font-semibold text-white whitespace-nowrap">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 whitespace-nowrap truncate">
                    {user.primaryEmailAddress?.emailAddress || 'user@example.com'}
                  </p>
                </div>
              </div>

              {/* UserButton for Settings */}
              <div className="ml-2 flex-shrink-0">
                <div className="relative">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "hidden", // Hide the default avatar
                        userButtonTrigger: "h-8 w-8 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center transition-all focus:ring-2 focus:ring-blue-500 relative",
                        userButtonPopoverCard: "bg-gray-800 border border-gray-600 shadow-xl",
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
                  {/* Settings icon overlay */}
                  <Settings size={16} className="absolute inset-0 m-auto text-gray-300 hover:text-white transition-colors" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                <User size={20} className="text-gray-400" />
              </div>
              <div className={`
                ml-3 transition-opacity duration-300
                ${isCollapsed ? 'opacity-0' : 'opacity-100'}
              `}>
                <p className="text-sm font-semibold text-white whitespace-nowrap">Loading...</p>
                <p className="text-xs text-gray-400 whitespace-nowrap">Loading user...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
