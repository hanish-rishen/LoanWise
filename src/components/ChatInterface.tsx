import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import { getChatMessages, getConversationMessages, addChatMessage, clearChatMessages } from '../dbOperations';
import loanApplicationService from '../services/loanApplicationService';
import ConversationalAI from '../services/conversationalAI';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: string;
  user_id: string;
  conversation_id: string;
}

interface ChatInterfaceRef {
  clearConversation: () => void;
}

const ChatInterface = forwardRef<ChatInterfaceRef>((_, ref) => {
  const { user } = useUser();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get or create conversation ID
  useEffect(() => {
    if (user?.id) {
      const locationState = location.state as { conversationId?: string; initialMessage?: string } | null;
      console.log('🔍 ChatInterface: Location state:', locationState);

      if (locationState?.conversationId) {
        console.log('🔍 ChatInterface: Using conversation ID from location:', locationState.conversationId);
        setCurrentConversationId(locationState.conversationId);
        // Store in sessionStorage for cross-mode sharing
        sessionStorage.setItem('currentConversationId', locationState.conversationId);

        // If there's an initial message, add it as an AI response
        if (locationState.initialMessage) {
          setTimeout(async () => {
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              content: locationState.initialMessage!,
              sender: 'assistant',
              timestamp: new Date(),
              type: 'text',
              user_id: user.id!,
              conversation_id: locationState.conversationId!
            };

            // Save to database
            await addChatMessage(aiMessage);
            // Add to UI
            setMessages(prev => [...prev, aiMessage]);
          }, 500);
        }
      } else {
        // Check if there's an ongoing conversation in sessionStorage
        const storedConversationId = sessionStorage.getItem('currentConversationId');
        console.log('🔍 ChatInterface: Stored conversation ID:', storedConversationId);

        if (storedConversationId) {
          console.log('🔍 ChatInterface: Using stored conversation ID:', storedConversationId);
          setCurrentConversationId(storedConversationId);
        } else {
          // Create new conversation ID
          const newConversationId = `${user.id}-${Date.now()}`;
          console.log('🔍 ChatInterface: Creating new conversation ID:', newConversationId);
          setCurrentConversationId(newConversationId);
          sessionStorage.setItem('currentConversationId', newConversationId);
        }
      }
    }
  }, [user?.id, location.state]);

  const clearConversation = async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 ChatInterface: Clearing conversation for user:', user.id);
      console.log('🔄 ChatInterface: Current conversation ID:', currentConversationId);

      // Clear from database
      const result = await clearChatMessages(user.id);
      console.log('🔄 ChatInterface: Clear chat database result:', result);

      // Clear local state immediately
      setMessages([]);

      // IMPORTANT: Clear conversation memory from AI services
      if (currentConversationId) {
        console.log('🔄 ChatInterface: Clearing AI conversation memory for:', currentConversationId);

        // Clear conversation from AI service
        const conversationalAI = ConversationalAI.getInstance();
        conversationalAI.clearConversation(currentConversationId);

        // Clear flow from loan application service
        loanApplicationService.clearFlow(currentConversationId);
      }

      // Clear session storage and create new conversation
      sessionStorage.removeItem('currentConversationId');
      const newConversationId = `${user.id}-${Date.now()}`;
      console.log('🔄 ChatInterface: Creating new conversation ID:', newConversationId);
      setCurrentConversationId(newConversationId);
      sessionStorage.setItem('currentConversationId', newConversationId);

      // Force a reload of messages to verify they're cleared
      setTimeout(async () => {
        const remainingMessages = await getChatMessages(user.id);
        console.log('🔄 ChatInterface: Messages after clear:', remainingMessages);
        if (remainingMessages.length > 0) {
          console.warn('⚠️ ChatInterface: Messages still exist after clear!');
        }
      }, 100);

    } catch (error) {
      console.error('❌ ChatInterface: Error clearing conversation:', error);
      // Still clear local state even if database fails
      setMessages([]);
    }
  };

  useImperativeHandle(ref, () => ({
    clearConversation
  }));

  console.log('ChatInterface component loaded', { user: user?.id });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user?.id || !currentConversationId) return;

    const fetchMessages = async () => {
      try {
        console.log('🔍 ChatInterface: Fetching messages for conversation:', currentConversationId);
        console.log('🔍 ChatInterface: User ID:', user.id);
        console.log('🔍 ChatInterface: SessionStorage conversation ID:', sessionStorage.getItem('currentConversationId'));
        const result = await getConversationMessages(user.id, currentConversationId);
        console.log('📨 ChatInterface: Loaded conversation messages from database:', result);
        setMessages(result);
      } catch (error) {
        console.error('❌ ChatInterface: Error loading conversation messages:', error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [user?.id, currentConversationId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user?.id || !currentConversationId) return;

    console.log('🔍 ChatInterface: Sending message with conversation ID:', currentConversationId);
    console.log('🔍 ChatInterface: Message content:', inputValue.trim());

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      user_id: user.id,
      conversation_id: currentConversationId
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Save user message to database
    try {
      console.log('💬 ChatInterface: Saving user message to database:', userMessage);
      console.log('💬 ChatInterface: Message conversation_id:', userMessage.conversation_id);
      await addChatMessage({
        content: userMessage.content,
        sender: userMessage.sender,
        timestamp: userMessage.timestamp,
        type: userMessage.type,
        user_id: user.id,
        conversation_id: currentConversationId
      });
      console.log('✅ ChatInterface: User message saved successfully');

      // Dispatch event to notify sidebar of new message/conversation
      window.dispatchEvent(new CustomEvent('messageAdded', {
        detail: { conversationId: currentConversationId }
      }));
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
            user_id: user.id,
            conversation_id: currentConversationId
          };

          setMessages(prev => [...prev, aiMessage]);

          // Save AI message to database
          try {
            await addChatMessage({
              content: aiMessage.content,
              sender: aiMessage.sender,
              timestamp: aiMessage.timestamp,
              type: aiMessage.type,
              user_id: user.id,
              conversation_id: currentConversationId
            });

            // Dispatch event to notify sidebar of new message
            window.dispatchEvent(new CustomEvent('messageAdded', {
              detail: { conversationId: currentConversationId }
            }));
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
          user_id: user.id,
          conversation_id: currentConversationId
        };

        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    }, 1000);
  };

  const getAIResponse = async (userText: string): Promise<string | null> => {
    try {
      if (!user?.id) {
        return "Please log in to continue.";
      }

      console.log('🔍 ChatInterface: Getting AI response for conversation:', currentConversationId);
      console.log('🔍 ChatInterface: User text:', userText);

      // Check if this is loan application related and process with service
      const loanResult = await loanApplicationService.processUserInput(
        currentConversationId,
        userText,
        user.id
      );

      console.log('🔍 ChatInterface: Loan service response:', loanResult.response);

      // If loan service handled it, return its response
      if (loanResult.response !== "general_response") {
        // Dispatch event to update sidebar if application was created
        if (loanResult.shouldCreateApplication) {
          window.dispatchEvent(new CustomEvent('loanApplicationCreated'));
        }

        return loanResult.response;
      }

      // Otherwise, use general AI response
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
              content: `You are LoanWise AI, a helpful financial assistant for India. Keep responses SHORT and helpful. Be professional and friendly.

              If someone asks about loans, say: "I'd be happy to help you apply for a loan! What type of loan are you looking for - personal, home, or vehicle?"

              For other financial topics, provide brief helpful guidance relevant to Indian banking and finance. Always keep responses concise and actionable.`
            },
            {
              role: 'user',
              content: userText
            }
          ],
          max_tokens: 150,
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
            <div className="text-center space-y-6">
              {/* Beautiful Welcome Card */}
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 max-w-3xl mx-auto shadow-2xl">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 backdrop-blur-xl border-2 border-white/30 flex items-center justify-center">
                    <img
                      src="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400"
                      alt="LoanWise AI"
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
                    />
                  </div>
                  <h1 className="text-3xl font-thin bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-3">
                    Welcome to LoanWise AI
                  </h1>
                  <p className="text-white/80 text-base font-light leading-relaxed">
                    Your intelligent financial assistant ready to help with loans, credit, and financial planning
                  </p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {[
                    { icon: '💰', title: 'Loan Guidance', desc: 'Application help & advice' },
                    { icon: '📊', title: 'Credit Analysis', desc: 'Score insights & tips' },
                    { icon: '📈', title: 'Financial Planning', desc: 'Strategy & budgeting' },
                    { icon: '🎯', title: 'Smart Decisions', desc: 'Personalized recommendations' }
                  ].map((feature, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-2">{feature.icon}</div>
                      <h3 className="text-white/90 text-sm font-medium mb-1">{feature.title}</h3>
                      <p className="text-white/60 text-xs">{feature.desc}</p>
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
                <div className={`max-w-xl ${message.sender === 'user' ? 'ml-8' : 'mr-8'}`}>
                  <div className={`backdrop-blur-2xl border rounded-2xl p-4 shadow-xl transform transition-all duration-300 hover:scale-[1.01] ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-blue-500/25 to-blue-600/25 border-blue-400/40 text-blue-100'
                      : 'bg-gradient-to-br from-white/15 to-white/10 border-white/30 text-white/95'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 shadow-lg ${
                        message.sender === 'user' ? 'bg-blue-400 shadow-blue-400/60' : 'bg-gray-400 shadow-gray-400/60'
                      }`}></div>
                      <div className="flex-1">
                        <div className="text-sm font-light leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                              em: ({children}) => <em className="italic">{children}</em>,
                              ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                              li: ({children}) => <li className="mb-1">{children}</li>,
                              code: ({children}) => <code className="bg-black/20 px-1 py-0.5 rounded text-xs">{children}</code>,
                              h3: ({children}) => <h3 className="font-semibold text-base mb-2">{children}</h3>,
                              h4: ({children}) => <h4 className="font-medium text-sm mb-1">{children}</h4>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        <p className={`text-xs mt-2 ${
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
                <div className="max-w-xl mr-8">
                  <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-gray-400 shadow-lg shadow-gray-400/60"></div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
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
      <div className="relative z-10 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl p-3 shadow-xl">
            <div className="flex items-end space-x-3">
              {/* Attachment Button */}
              <button className="p-3 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-xl">
                <Paperclip size={18} />
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
                  className="w-full bg-transparent text-white/95 placeholder-white/60 text-sm font-light focus:outline-none py-3 px-2"
                  disabled={isTyping}
                />
              </div>

              {/* Emoji Button */}
              <button className="p-3 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-xl">
                <Smile size={18} />
              </button>

              {/* Enhanced Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  inputValue.trim() && !isTyping
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Styles */}
      <style>
        {`
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
        `}
      </style>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
