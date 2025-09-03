import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { db, getChatMessages, addChatMessage, clearChatMessages } from '../db';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: string;
  userId: string;
}

interface ChatInterfaceRef {
  clearConversation: () => void;
}

const ChatInterface = forwardRef<ChatInterfaceRef>((_, ref) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearConversation = async () => {
    if (!user?.id) return;

    try {
      // Clear from database
      await clearChatMessages(user.id);

      // Clear local state
      setMessages([]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
      // Still clear local state even if database fails
      setMessages([]);
    }
  };

  useImperativeHandle(ref, () => ({
    clearConversation
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // All useEffect hooks must come before any conditional returns
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchMessages = async () => {
      try {
        const result = await getChatMessages(user.id);
        setMessages(result);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [user?.id]);

  console.log('ChatInterface component loaded', { user: user?.id });

  // Check database connection
  if (!db) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Connecting...</h2>
            <p className="text-gray-300">Setting up your chat interface...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user?.id) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      userId: user.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Save user message to database
    try {
      await addChatMessage({
        content: userMessage.content,
        sender: userMessage.sender,
        timestamp: userMessage.timestamp,
        type: userMessage.type,
        userId: user.id
      });
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    // Simulate AI typing delay
    setTimeout(async () => {
      try {
        const aiResponse = await getAIResponse(userMessage.content);

        if (aiResponse) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date(),
            type: 'text',
            userId: user.id
          };

          setMessages(prev => [...prev, aiMessage]);

          // Save AI message to database
          try {
            await addChatMessage({
              content: aiMessage.content,
              sender: aiMessage.sender,
              timestamp: aiMessage.timestamp,
              type: aiMessage.type,
              userId: user.id
            });
          } catch (error) {
            console.error('Error saving AI message:', error);
          }
        }
      } catch (error) {
        console.error('Error getting AI response:', error);

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I encountered an error while processing your request. Please try again.",
          sender: 'ai',
          timestamp: new Date(),
          type: 'text',
          userId: user.id
        };

        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    }, 1000);
  };

  const getAIResponse = async (userText: string): Promise<string | null> => {
    try {
      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
      console.log('Groq API Key check:', groqApiKey ? 'Present' : 'Missing');

      if (!groqApiKey) {
        throw new Error('Groq API key not configured');
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `You are LoanWise AI, a helpful financial assistant specializing in loans and lending. You help users with:
              - Loan application guidance
              - Financial advice and planning
              - Credit score information
              - Loan terms and conditions
              - Financial literacy education

              Be professional, accurate, and helpful. Always prioritize user financial well-being and regulatory compliance.`
            },
            {
              role: 'user',
              content: userText
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error details:', errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('Groq API error:', error);
      return null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-full relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Enhanced Messages Container */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-8">
              {/* Beautiful Welcome Card */}
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-12 max-w-2xl mx-auto shadow-2xl">
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 backdrop-blur-xl border-2 border-white/30 flex items-center justify-center">
                    <img
                      src="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400"
                      alt="LoanWise AI"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
                    />
                  </div>
                  <h1 className="text-5xl font-thin bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
                    Welcome to LoanWise AI
                  </h1>
                  <p className="text-white/80 text-xl font-light leading-relaxed">
                    Your intelligent financial assistant ready to help with loans, credit, and financial planning
                  </p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-2 gap-6 mt-8">
                  {[
                    { icon: '💰', title: 'Loan Guidance', desc: 'Application help & advice' },
                    { icon: '📊', title: 'Credit Analysis', desc: 'Score insights & tips' },
                    { icon: '📈', title: 'Financial Planning', desc: 'Strategy & budgeting' },
                    { icon: '🎯', title: 'Smart Decisions', desc: 'Personalized recommendations' }
                  ].map((feature, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
                      <div className="text-3xl mb-3">{feature.icon}</div>
                      <h3 className="text-white/90 font-medium mb-2">{feature.title}</h3>
                      <p className="text-white/60 text-sm">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className={`max-w-2xl ${message.sender === 'user' ? 'ml-16' : 'mr-16'}`}>
                  <div className={`backdrop-blur-2xl border-2 rounded-[1.5rem] p-6 shadow-2xl transform transition-all duration-300 hover:scale-[1.02] ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-blue-500/25 to-blue-600/25 border-blue-400/40 text-blue-100'
                      : 'bg-gradient-to-br from-white/15 to-white/10 border-white/30 text-white/95'
                  }`}>
                    <div className="flex items-start space-x-4">
                      <div className={`w-4 h-4 rounded-full mt-2 flex-shrink-0 shadow-lg ${
                        message.sender === 'user' ? 'bg-blue-400 shadow-blue-400/60' : 'bg-gray-400 shadow-gray-400/60'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-lg font-light leading-relaxed">{message.content}</p>
                        <p className={`text-sm mt-3 ${
                          message.sender === 'user' ? 'text-blue-300/70' : 'text-white/50'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fadeIn">
                <div className="max-w-2xl mr-16">
                  <div className="bg-white/15 backdrop-blur-2xl border-2 border-white/30 rounded-[1.5rem] p-6 shadow-2xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-4 h-4 rounded-full bg-gray-400 shadow-lg shadow-gray-400/60"></div>
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      <div className="relative z-10 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/15 backdrop-blur-2xl border-2 border-white/30 rounded-[2rem] p-4 shadow-2xl">
            <div className="flex items-end space-x-4">
              {/* Attachment Button */}
              <button className="p-4 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-2xl">
                <Paperclip size={24} />
              </button>

              {/* Input Field */}
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about loans, credit, or financial planning..."
                  className="w-full bg-transparent text-white/95 placeholder-white/60 text-lg font-light focus:outline-none py-4 px-2"
                  disabled={isTyping}
                />
              </div>

              {/* Emoji Button */}
              <button className="p-4 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-2xl">
                <Smile size={24} />
              </button>

              {/* Enhanced Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                  inputValue.trim() && !isTyping
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-slideIn {
          animation: slideIn 0.6s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
