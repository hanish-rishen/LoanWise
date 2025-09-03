import React, { useEffect, useRef } from 'react';
import { X, Download, Search, Calendar, Mic, MessageCircle } from 'lucide-react';

interface TranscriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages?: any[];
}

const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({ isOpen, onClose, messages = [] }) => {
  console.log('TranscriptDrawer received messages:', messages);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl border-l border-white/20 z-50 transform transition-transform duration-300 ease-out shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-xl border border-white/30 flex items-center justify-center">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Conversation
                </h2>
                <p className="text-white/60 text-sm">Voice & Text History</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <Search size={16} />
              </button>
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <Calendar size={16} />
              </button>
            </div>
            <button className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg flex items-center text-sm transition-all duration-200">
              <Download size={14} className="mr-1.5" />
              Export
            </button>
          </div>
        </div>

        {/* Messages List - Enhanced Scrolling */}
        <div
          className="transcript-messages flex-1 min-h-0 overflow-y-scroll p-4 space-y-4"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-4">
                <Mic size={24} className="text-white/60" />
              </div>
              <h3 className="text-white/80 font-medium mb-2">Ready to Record</h3>
              <p className="text-white/50 text-sm leading-relaxed px-4">
                All your voice conversations will appear here in real-time. Use the microphone to start talking with LoanWise AI.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div key={message.id || index} className="group">
                  <div className={`p-4 rounded-2xl backdrop-blur-xl border transition-all duration-200 hover:scale-[1.02] ${
                    message.sender === 'user'
                      ? 'bg-blue-500/15 border-blue-400/30 ml-4'
                      : 'bg-white/10 border-white/20 mr-4'
                  }`}>
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          message.sender === 'user'
                            ? 'bg-blue-500/30 text-blue-300'
                            : 'bg-white/20 text-white/80'
                        }`}>
                          {message.sender === 'user' ? (
                            <Mic size={12} />
                          ) : (
                            <MessageCircle size={12} />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          message.sender === 'user' ? 'text-blue-300' : 'text-white/90'
                        }`}>
                          {message.sender === 'user' ? 'You' : 'LoanWise AI'}
                        </span>
                      </div>
                      <span className="text-white/50 text-xs">
                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Now'}
                      </span>
                    </div>

                    {/* Message Content */}
                    <p className={`text-sm leading-relaxed ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-white/90'
                    }`}>
                      {message.content}
                    </p>

                    {/* Confidence Score (for voice messages) */}
                    {message.confidence && (
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex-1 bg-white/10 rounded-full h-1.5">
                          <div
                            className="bg-green-400/60 h-full rounded-full transition-all duration-500"
                            style={{ width: `${message.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-white/50 text-xs">
                          {Math.round(message.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Timestamp Separator */}
                  {index < messages.length - 1 && (
                    <div className="flex items-center my-4">
                      <div className="flex-1 h-px bg-white/10"></div>
                      <span className="px-3 text-white/40 text-xs">
                        {message.timestamp && new Date(message.timestamp).toLocaleDateString()}
                      </span>
                      <div className="flex-1 h-px bg-white/10"></div>
                    </div>
                  )}
                </div>
              ))}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{messages.length}</div>
              <div className="text-white/60 text-xs">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">
                {messages.filter(m => m.sender === 'user').length}
              </div>
              <div className="text-white/60 text-xs">Voice Inputs</div>
            </div>
          </div>
        </div>

        {/* Enhanced Scrollbar Styles */}
        <style>
          {`
          /* Webkit scrollbar styling */
          .transcript-messages::-webkit-scrollbar {
            width: 8px;
          }

          .transcript-messages::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }

          .transcript-messages::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            transition: background 0.2s ease;
          }

          .transcript-messages::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }

          .transcript-messages::-webkit-scrollbar-thumb:active {
            background: rgba(255, 255, 255, 0.6);
          }

          /* For Firefox */
          .transcript-messages {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
          }

          /* Smooth scrolling */
          .transcript-messages {
            scroll-behavior: smooth;
          }
          `}
        </style>
      </div>
    </>
  );
};

export default TranscriptDrawer;
