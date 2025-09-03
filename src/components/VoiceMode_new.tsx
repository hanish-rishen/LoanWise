import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Mic, Volume2, VolumeX, MessageSquare, Settings } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { db, getChatMessages, addChatMessage, clearChatMessages } from '../db';
import { speechService } from '../services/speechService';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: string;
  userId: string;
}

interface VoiceModeRef {
  clearConversation: () => void;
}

const VoiceMode = forwardRef<VoiceModeRef>((_, ref) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  console.log('VoiceMode component loaded', { user: user?.id });

  // Check database connection
  if (!db) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-full items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Starting Voice Mode...</h2>
          <p className="text-gray-300">Loading voice interface...</p>
        </div>
      </div>
    );
  }

  // Check if speech is supported
  if (!speechService.isSupported()) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-full items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Voice Not Supported</h2>
          <p className="text-gray-300">Your browser doesn't support voice features.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechService.getAvailableVoices();
      setAvailableVoices(voices);

      if (voices.length > 0 && !selectedVoice) {
        const preferredVoice = voices.find(voice =>
          voice.lang.includes('en') && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.includes('en'));
        setSelectedVoice(preferredVoice || voices[0]);
      }
    };

    loadVoices();
    if (speechService.getAvailableVoices().length === 0) {
      setTimeout(loadVoices, 1000);
    }
  }, [selectedVoice]);

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

  useEffect(() => {
    if (!user?.id) return;

    speechService.onSpeechStart = () => {
      setIsListening(true);
      setCurrentTranscript('');
      console.log('🎤 Listening...');
    };

    speechService.onSpeechEnd = () => {
      setIsListening(false);
      console.log('🎤 Stopped listening');
    };

    speechService.onSpeechResult = async (text: string) => {
      if (!text.trim()) return;

      setCurrentTranscript(text);
      setIsProcessing(true);

      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        content: text,
        sender: 'user',
        timestamp: new Date(),
        type: 'text',
        userId: user.id
      };

      // Add to state and save to database
      setMessages(prev => [...prev, userMessage]);
      await saveMessage(userMessage);

      try {
        // Get AI response
        const aiResponse = await getAIResponse(text);

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
          await saveMessage(aiMessage);

          // Speak the response if not muted
          if (!isMuted) {
            setIsSpeaking(true);
            try {
              await speechService.speak(aiResponse);
            } catch (error) {
              console.error('Speech synthesis error:', error);
            } finally {
              setIsSpeaking(false);
            }
          }
        }
      } catch (error) {
        console.error('Error processing voice input:', error);
        if (!isMuted) {
          setIsSpeaking(true);
          try {
            await speechService.speak("I'm sorry, I encountered an error processing your request.");
          } catch (speechError) {
            console.error('Speech synthesis error:', speechError);
          } finally {
            setIsSpeaking(false);
          }
        }
      } finally {
        setIsProcessing(false);
        setCurrentTranscript('');
      }
    };

    speechService.onSpeechError = (error: string) => {
      console.error('Speech recognition error:', error);
      setIsListening(false);
      setIsProcessing(false);
      setCurrentTranscript('');
    };

    return () => {
      speechService.onSpeechStart = null;
      speechService.onSpeechEnd = null;
      speechService.onSpeechResult = null;
      speechService.onSpeechError = null;
    };
  }, [user?.id, isMuted]);

  const saveMessage = async (message: Omit<Message, 'id'>) => {
    if (!user?.id) return;

    try {
      await addChatMessage({
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        type: message.type,
        userId: user.id
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
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

              Be professional, accurate, and helpful. Always prioritize user financial well-being and regulatory compliance. Keep responses conversational and natural for voice interaction. Keep responses concise and under 200 words.`
            },
            {
              role: 'user',
              content: userText
            }
          ],
          max_tokens: 300,
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

  const startListening = async () => {
    try {
      // Enable continuous mode for uninterrupted conversation
      speechService.setContinuousMode(true);
      await speechService.startListening();
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const stopListening = () => {
    // Disable continuous mode when manually stopping
    speechService.setContinuousMode(false);
    speechService.stopListening();
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
    } else {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      setIsMuted(true);
    }
  };

  const clearConversation = async () => {
    if (!user?.id) return;

    try {
      // Clear from database
      await clearChatMessages(user.id);
    } catch (error) {
      console.error('Error clearing conversation from database:', error);
    }

    // Clear local state and stop all voice operations
    setMessages([]);
    speechService.setContinuousMode(false);
    speechService.stopSpeaking();
    speechService.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
  };

  useImperativeHandle(ref, () => ({
    clearConversation
  }));

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-full relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Main Content Container - Perfectly Centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-5xl mx-auto">

        {/* AI Avatar with Amazing Glow Effect */}
        <div className="mb-16 relative">
          <div className="relative">
            {/* Outer Glow Rings */}
            <div className={`absolute -inset-8 rounded-full transition-all duration-1000 ${
              isListening ? 'animate-pulse' : isSpeaking ? 'animate-spin' : ''
            }`}>
              <div className="w-40 h-40 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-2xl"></div>
            </div>
            <div className={`absolute -inset-4 rounded-full transition-all duration-500 ${
              isListening ? 'bg-red-400/30 animate-pulse' :
              isSpeaking ? 'bg-blue-400/30 animate-pulse' :
              'bg-white/10'
            } blur-xl`}></div>

            {/* Avatar Container with Enhanced Glow */}
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-2xl border-2 border-white/40 flex items-center justify-center shadow-2xl">
              <img
                src="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400"
                alt="AI Assistant"
                className="w-28 h-28 rounded-full object-cover border-4 border-white/20"
              />

              {/* Animated Status Indicator */}
              <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-gray-900 shadow-lg ${
                isListening ? 'bg-red-500 animate-pulse' :
                isSpeaking ? 'bg-blue-500 animate-bounce' :
                isProcessing ? 'bg-yellow-500 animate-spin' : 'bg-green-500'
              }`}>
                <div className={`absolute inset-2 rounded-full ${
                  isListening ? 'bg-red-300 animate-ping' :
                  isSpeaking ? 'bg-blue-300' :
                  isProcessing ? 'bg-yellow-300' : 'bg-green-300'
                }`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Status Display with Gradient Text */}
        <div className="text-center mb-20">
          {isListening ? (
            <div className="space-y-8 animate-pulse">
              <h1 className="text-7xl font-thin bg-gradient-to-r from-red-400 via-pink-400 to-red-500 bg-clip-text text-transparent">
                Listening...
              </h1>
              <div className="flex items-center justify-center space-x-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 bg-red-400 rounded-full animate-bounce shadow-lg shadow-red-400/50"
                    style={{animationDelay: `${i * 0.2}s`}}
                  ></div>
                ))}
              </div>
              {currentTranscript && (
                <div className="mt-12 p-10 bg-white/15 backdrop-blur-2xl border-2 border-white/30 rounded-[2rem] max-w-4xl mx-auto shadow-2xl animate-fadeIn">
                  <p className="text-white/95 text-3xl font-light leading-relaxed">"{currentTranscript}"</p>
                </div>
              )}
            </div>
          ) : isSpeaking ? (
            <div className="space-y-8">
              <h1 className="text-7xl font-thin bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Speaking...
              </h1>
              <div className="flex items-center justify-center space-x-3">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 bg-gradient-to-t from-blue-400 to-cyan-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"
                    style={{
                      height: `${Math.random() * 50 + 20}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.5s'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          ) : isProcessing ? (
            <div className="space-y-8">
              <h1 className="text-7xl font-thin bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
                Thinking...
              </h1>
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-yellow-400/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-2 border-yellow-300/50 rounded-full"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <h1 className="text-7xl font-thin bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                Ready to chat
              </h1>
              <p className="text-white/80 text-3xl font-light">Touch the microphone to begin</p>
            </div>
          )}
        </div>

        {/* Enhanced Main Voice Control Button */}
        <div className="relative mb-20">
          {/* Multiple Ripple Effects for Listening */}
          {isListening && (
            <>
              <div className="absolute -inset-12 rounded-full border-2 border-red-400/15 animate-ping"></div>
              <div className="absolute -inset-16 rounded-full border-2 border-red-400/10 animate-ping" style={{animationDelay: '0.4s'}}></div>
              <div className="absolute -inset-20 rounded-full border-2 border-red-400/5 animate-ping" style={{animationDelay: '0.8s'}}></div>
            </>
          )}

          {/* Massive Glow Effect */}
          <div className={`absolute -inset-8 rounded-full blur-2xl transition-all duration-700 ${
            isListening ? 'bg-red-500/40 animate-pulse' :
            isSpeaking ? 'bg-blue-500/40' :
            'bg-white/30'
          }`}></div>

          {/* Main Button - Larger and More Beautiful */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking || isProcessing}
            className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 transform hover:scale-110 active:scale-95 ${
              isListening
                ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-red-500/60 shadow-2xl scale-110'
                : isSpeaking || isProcessing
                ? 'bg-gradient-to-br from-gray-600/60 to-gray-700/60 cursor-not-allowed scale-95'
                : 'bg-gradient-to-br from-white via-gray-100 to-white shadow-white/50 shadow-2xl hover:shadow-white/70'
            }`}
          >
            {/* Inner Glow */}
            <div className={`absolute inset-4 rounded-full blur-md ${
              isListening ? 'bg-red-200/60' : 'bg-white/40'
            }`}></div>

            {isListening ? (
              <div className="relative w-16 h-16 bg-white rounded-xl shadow-2xl"></div>
            ) : (
              <Mic className={`relative w-20 h-20 ${isListening ? 'text-white' : 'text-gray-900'} drop-shadow-2xl`} />
            )}
          </button>
        </div>

        {/* Action Buttons - Enhanced */}
        <div className="flex items-center space-x-8 mb-12">
          <button
            onClick={toggleMute}
            className={`p-6 rounded-3xl backdrop-blur-2xl border-2 transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              isMuted
                ? 'bg-red-500/25 border-red-400/50 text-red-400 shadow-red-400/30 shadow-xl'
                : 'bg-white/15 border-white/30 text-white/80 hover:bg-white/25 shadow-white/20 shadow-xl'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
          </button>

          <button
            onClick={() => navigate('/chat')}
            className="p-6 rounded-3xl bg-white/15 backdrop-blur-2xl border-2 border-white/30 text-white/80 hover:bg-white/25 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-white/20 shadow-xl"
            title="Exit Voice Mode"
          >
            <MessageSquare size={32} />
          </button>
        </div>

        {/* Enhanced Messages Display - Fixed Scrolling */}
        {messages.length > 0 && (
          <div className="w-full max-w-4xl">
            <div className="space-y-6 max-h-72 overflow-y-auto px-6 pb-4 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
              {messages.slice(-3).map((message, index) => (
                <div
                  key={message.id}
                  className={`transform transition-all duration-700 hover:scale-[1.02] ${
                    message.sender === 'user' ? 'ml-12' : 'mr-12'
                  }`}
                  style={{
                    animation: `slideUp 0.8s ease-out ${index * 0.15}s both`
                  }}
                >
                  <div className={`p-8 rounded-[2rem] backdrop-blur-2xl border-2 shadow-2xl ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-blue-500/25 to-blue-600/25 border-blue-400/40 text-blue-100'
                      : 'bg-gradient-to-br from-white/15 to-white/10 border-white/30 text-white/95'
                  }`}>
                    <div className="flex items-start space-x-6">
                      <div className={`w-5 h-5 rounded-full mt-3 shadow-xl flex-shrink-0 ${
                        message.sender === 'user' ? 'bg-blue-400 shadow-blue-400/60' : 'bg-gray-400 shadow-gray-400/60'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-xl font-light leading-relaxed">
                          {message.content.length > 140
                            ? message.content.substring(0, 140) + '...'
                            : message.content
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Floating Voice Settings */}
      {availableVoices.length > 0 && (
        <div className="absolute bottom-8 right-8">
          <div className="bg-black/30 backdrop-blur-2xl border-2 border-white/30 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center space-x-5">
              <Settings className="w-7 h-7 text-white/80" />
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.name === e.target.value);
                  setSelectedVoice(voice || null);
                }}
                className="bg-transparent text-white/95 text-lg focus:outline-none cursor-pointer"
              >
                {availableVoices
                  .filter(voice => voice.lang.includes('en'))
                  .map((voice) => (
                    <option key={voice.name} value={voice.name} className="bg-gray-800 text-white">
                      {voice.name.split(' ')[0]}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; scale: 0.9; }
          to { opacity: 1; scale: 1; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .scrollbar-thin {
          scrollbar-width: thin;
        }

        .scrollbar-thumb-white\/30::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 9999px;
        }

        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
      `}</style>
    </div>
  );
});

VoiceMode.displayName = 'VoiceMode';

export default VoiceMode;
