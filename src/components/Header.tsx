import { BarChart3, MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  // Props can be added here if needed in the future
}

export default function Header({}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isVoiceMode = location.pathname === '/voice';
  const isChatMode = location.pathname === '/chat';

  // Get current conversation ID from location state or sessionStorage
  const getCurrentConversationId = () => {
    const locationState = location.state as { conversationId?: string } | null;
    return locationState?.conversationId || sessionStorage.getItem('currentConversationId');
  };

  const handleModeSwitch = (mode: 'voice' | 'chat') => {
    const conversationId = getCurrentConversationId();
    if (conversationId) {
      navigate(`/${mode}`, { state: { conversationId } });
    } else {
      navigate(`/${mode}`);
    }
  };

  return (
    <div className="flex justify-between items-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-md border-b border-white/10">
      {/* Mode Toggle */}
      <div className="flex bg-black/30 backdrop-blur-lg p-2 rounded-2xl border border-white/10">
        <button
          onClick={() => handleModeSwitch('voice')}
          className={`
            px-6 py-3 rounded-xl flex items-center transition-all duration-300 transform hover:scale-105
            ${isVoiceMode
              ? 'bg-white text-gray-900 shadow-white/20 shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/10'
            }
          `}
        >
          <BarChart3 className="mr-2" size={18} />
          <span className="font-medium">Voice</span>
        </button>
        <button
          onClick={() => handleModeSwitch('chat')}
          className={`
            px-6 py-3 rounded-xl flex items-center transition-all duration-300 transform hover:scale-105
            ${isChatMode
              ? 'bg-white text-gray-900 shadow-white/20 shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/10'
            }
          `}
        >
          <MessageCircle className="mr-2" size={18} />
          <span className="font-medium">Chat</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {/* Additional actions can be added here if needed */}
      </div>
    </div>
  );
}
