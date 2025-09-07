import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Mic, MessageSquare, Square, Edit3, Check, X } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getConversationMessages, addChatMessage, clearChatMessages } from '../dbOperations';
import { speechService } from '../services/speechService';
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

interface VoiceModeRef {
  clearConversation: () => void;
  getMessages: () => any[];
}

const VoiceMode = forwardRef<VoiceModeRef>((_, ref) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [currentLoanData, setCurrentLoanData] = useState<any>({});
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null);

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());

  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Keep-alive for listening after long AI responses (e.g., terms review)
  const listenKeepAliveRef = useRef<number | null>(null);

  const stopListenKeepAlive = () => {
    if (listenKeepAliveRef.current) {
      clearInterval(listenKeepAliveRef.current);
      listenKeepAliveRef.current = null;
    }
  };

  const startListenKeepAlive = (durationMs: number = 20000) => {
    stopListenKeepAlive();
    const startTime = Date.now();
    listenKeepAliveRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs) {
        stopListenKeepAlive();
        return;
      }

      // If not speaking and not currently listening, re-arm the mic
      if (!speechService.isCurrentlySpeaking() && !speechService.isCurrentlyListening()) {
        speechService.setContinuousMode(true);
        speechService.startListening().catch(() => {});
      }
    }, 1200);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  console.log('VoiceMode component loaded', { user: user?.id });

  // Helper function to stop all speech services
  const stopAllSpeechServices = () => {
    speechService.stopSpeaking();
    speechService.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
  };

  // Get or create conversation ID
  useEffect(() => {
    if (user?.id) {
      const locationState = location.state as { conversationId?: string } | null;
      console.log('🎤 VoiceMode: Location state:', locationState);

      if (locationState?.conversationId) {
        console.log('🎤 VoiceMode: Using conversation ID from location:', locationState.conversationId);
        setCurrentConversationId(locationState.conversationId);
        // Store in sessionStorage for cross-mode sharing
        sessionStorage.setItem('currentConversationId', locationState.conversationId);
      } else {
        // Check if there's an ongoing conversation in sessionStorage
        const storedConversationId = sessionStorage.getItem('currentConversationId');
        console.log('🎤 VoiceMode: Stored conversation ID:', storedConversationId);

        if (storedConversationId) {
          console.log('🎤 VoiceMode: Using stored conversation ID:', storedConversationId);
          setCurrentConversationId(storedConversationId);
        } else {
          // Create new conversation ID
          const newConversationId = `${user.id}-${Date.now()}`;
          console.log('🎤 VoiceMode: Creating new conversation ID:', newConversationId);
          setCurrentConversationId(newConversationId);
          sessionStorage.setItem('currentConversationId', newConversationId);
        }
      }
    }
  }, [user?.id, location.state]);

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

      if (voices.length > 0 && !selectedVoice) {
        // Use the improved voice selection
        const bestVoice = speechService.getBestVoice();
        console.log('🔊 Selected best voice:', bestVoice?.name);
        setSelectedVoice(bestVoice);
        speechService.setVoice(bestVoice);
      }
    };

    loadVoices();
    if (speechService.getAvailableVoices().length === 0) {
      setTimeout(loadVoices, 1000);
    }
  }, [selectedVoice]);

  useEffect(() => {
    if (!user?.id || !currentConversationId) return;

    const fetchMessages = async () => {
      try {
        console.log('🎤 VoiceMode: Loading conversation messages:', currentConversationId);
        console.log('🎤 VoiceMode: User ID:', user.id);
        console.log('🎤 VoiceMode: SessionStorage conversation ID:', sessionStorage.getItem('currentConversationId'));
        const result = await getConversationMessages(user.id, currentConversationId);
        console.log('📨 VoiceMode: Loaded messages from database:', result);
        setMessages(result);
      } catch (error) {
        console.error('❌ VoiceMode: Error fetching conversation messages:', error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [user?.id, currentConversationId]);

  // Handle conversation deletion events
  useEffect(() => {
    const handleConversationDeleted = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      console.log('🎤 VoiceMode: Conversation deleted event received:', conversationId);

      // If current conversation was deleted, clear the interface
      if (conversationId === currentConversationId) {
        console.log('🎤 VoiceMode: Current conversation deleted, clearing interface');
        setMessages([]);
        setCurrentLoanData({});
        setSubmittedApplicationId(null);
        // Don't create new conversation here - let user start fresh
        sessionStorage.removeItem('currentConversationId');
        setCurrentConversationId('');
      }
    };

    const handleAllConversationsCleared = () => {
      console.log('🎤 VoiceMode: All conversations cleared event received');
      setMessages([]);
      setCurrentLoanData({});
      setSubmittedApplicationId(null);
      sessionStorage.removeItem('currentConversationId');
      setCurrentConversationId('');
    };

    window.addEventListener('conversationDeleted', handleConversationDeleted as EventListener);
    window.addEventListener('allConversationsCleared', handleAllConversationsCleared);

    return () => {
      window.removeEventListener('conversationDeleted', handleConversationDeleted as EventListener);
      window.removeEventListener('allConversationsCleared', handleAllConversationsCleared);
    };
  }, [currentConversationId]);

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
  // Stop any previous keep-alive loop while we process
  stopListenKeepAlive();

  // Set a timeout to ensure processing doesn't get stuck
  let processingTimeout: any = setTimeout(() => {
        console.warn('⚠️ Processing timeout - resetting states');
        setIsProcessing(false);
        setCurrentTranscript('');
      }, 30000); // 30 second timeout

      // Ensure we have a conversation ID
  const conversationId = currentConversationId || sessionStorage.getItem('currentConversationId') || `${user.id}-${Date.now()}`;
      if (!currentConversationId) {
        setCurrentConversationId(conversationId);
        sessionStorage.setItem('currentConversationId', conversationId);
      }

      console.log('🎤 VoiceMode: Using conversation ID for message:', conversationId);

      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        content: text,
        sender: 'user',
        timestamp: new Date(),
        type: 'text',
        user_id: user.id,
        conversation_id: conversationId
      };

      // Add to state and save to database
      console.log('Adding user message:', userMessage);
      setMessages(prev => [...prev, userMessage]);
      await saveMessage(userMessage);

      try {
        // Get AI response with the active conversation ID
        const aiResponse = await getAIResponse(text, conversationId);

        if (aiResponse) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date(),
            type: 'text',
            user_id: user.id,
            conversation_id: conversationId
          };

          console.log('Adding AI message:', aiMessage);
          setMessages(prev => [...prev, aiMessage]);
          await saveMessage(aiMessage);

          // Check if this response indicates conversation completion (post-submission only)
          // Avoid stopping during terms review; only stop on clear submission confirmation
          const isConversationComplete = aiResponse.includes("Application Submitted Successfully") ||
                                         aiResponse.includes("loan application with ID");

          // Speak the response
          setIsSpeaking(true);
          try {
            // Long TTS can exceed 30s; clear the processing timeout before speaking to avoid false resets
            if (processingTimeout) {
              clearTimeout(processingTimeout);
              processingTimeout = null;
            }
            await speechService.speak(aiResponse);
          } catch (error) {
            console.error('Speech synthesis error:', error);
          } finally {
            setIsSpeaking(false);

            // If conversation is complete (application submitted), stop the voice mode
            if (isConversationComplete) {
              console.log('🎤 Conversation completed - stopping voice mode');
              speechService.stopListening();
              setIsListening(false);
              // Don't restart listening
              return;
            }

            // Proactively ensure mic stays armed for the user's reply (e.g., yes/no after terms)
            // Start a short keep-alive loop to re-arm listening if it drops due to silence
            startListenKeepAlive(25000);

            // Also explicitly re-arm immediately for responsiveness
            try {
              speechService.setContinuousMode(true);
              await speechService.startListening();
            } catch {}
          }
        }
      } catch (error) {
        console.error('Error processing voice input:', error);
        setIsSpeaking(true);
        try {
          await speechService.speak("I'm sorry, I encountered an error processing your request.");
        } catch (speechError) {
          console.error('Speech synthesis error:', speechError);
        } finally {
          setIsSpeaking(false);
        }
      } finally {
        clearTimeout(processingTimeout);
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
  stopListenKeepAlive();
    };
  }, [user?.id]);

  const saveMessage = async (message: Omit<Message, 'id'>) => {
    if (!user?.id) return;

    try {
      console.log('🎤 VoiceMode: Saving message to database:', message);
      console.log('🎤 VoiceMode: Message conversation_id:', message.conversation_id);
      await addChatMessage({
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        type: message.type,
        user_id: user.id,
        conversation_id: message.conversation_id
      });
      console.log('✅ VoiceMode: Message saved successfully');

      // Dispatch event to notify sidebar of new message/conversation
      window.dispatchEvent(new CustomEvent('messageAdded', {
        detail: { conversationId: message.conversation_id }
      }));
    } catch (error) {
      console.error('❌ VoiceMode: Error saving message:', error);
    }
  };

  const getAIResponse = async (userText: string, conversationId: string): Promise<string | null> => {
    try {
      if (!user?.id) {
        return "Please log in to continue.";
      }

      // Check if this is loan application related and process with service
      const loanResult = await loanApplicationService.processUserInput(
        conversationId,
        userText,
        user.id
      );

      // Update current loan data for display - but preserve existing edits
      if (loanResult.flow && loanResult.flow.data) {
        // Smart merge: only update fields that have new values and don't overwrite manual edits
        setCurrentLoanData((prevData: any) => {
          const newData = { ...prevData };

          // Only update fields that have new non-empty values AND haven't been manually edited
          Object.keys(loanResult.flow.data).forEach(key => {
            const newValue = loanResult.flow.data[key];
            const existingValue = prevData[key];

            // Skip if this field has been manually edited
            if (manuallyEditedFields.has(key)) {
              console.log(`🔒 Preserving manually edited field: ${key} = ${existingValue}`);
              return;
            }

            // Only update if:
            // 1. There's no existing value, OR
            // 2. The new value is different and not empty/null
            if (!existingValue || (newValue && newValue !== existingValue)) {
              newData[key] = newValue;
            }
          });

          // Also merge calculated terms if available
          if (loanResult.flow.calculatedTerms) {
            newData.calculatedTerms = loanResult.flow.calculatedTerms;
          }

          console.log('🔄 Smart merging loan data:', {
            previous: prevData,
            fromFlow: loanResult.flow.data,
            calculatedTerms: loanResult.flow.calculatedTerms,
            merged: newData
          });
          return newData;
        });
      }

      // If loan service handled it, return its response
      if (loanResult.response !== "general_response") {
        // Dispatch event to update sidebar if application was created
        if (loanResult.shouldCreateApplication) {
          window.dispatchEvent(new CustomEvent('loanApplicationCreated'));

          // Show the application ID if available
          if (loanResult.flow && loanResult.flow.applicationId) {
            console.log('🎤 Application created with ID:', loanResult.flow.applicationId);
            setSubmittedApplicationId(loanResult.flow.applicationId);

            // Clear the current loan data after a delay to show the success state
            setTimeout(() => {
              // Only clear if we're not currently editing fields
              if (!editingField) {
                setCurrentLoanData({});
                setManuallyEditedFields(new Set());
                setSubmittedApplicationId(null);
              }
            }, 5000); // Show success for 5 seconds
          }

          // Stop voice mode after successful loan application submission
          console.log('🎤 Stopping voice mode after successful loan application submission');
          speechService.setContinuousMode(false);
          stopAllSpeechServices();
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
              content: `You are LoanWise AI, a helpful financial assistant for India. Keep responses VERY SHORT (1-2 sentences max) and conversational. Be friendly and natural.

              If someone asks about loans, say: "I'd be happy to help you apply for a loan! What type of loan are you looking for - personal, home, or vehicle?"

              For other topics, provide brief helpful responses relevant to Indian financial context. Always keep it short and friendly.`
            },
            {
              role: 'user',
              content: userText
            }
          ],
          max_tokens: 80,
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
    setIsListening(false);
    setIsProcessing(false);
    setCurrentTranscript('');
  };

  const stopVoiceMode = () => {
    // Stop all voice operations
    speechService.setContinuousMode(false);
    speechService.stopSpeaking();
    speechService.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(false);
    setCurrentTranscript('');
  };

  const clearConversation = async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 VoiceMode: Clearing conversation for user:', user.id);
      console.log('🔄 VoiceMode: Current conversation ID:', currentConversationId);

      // Clear from database
      await clearChatMessages(user.id);

      // IMPORTANT: Clear conversation memory from AI services
      if (currentConversationId) {
        console.log('🔄 VoiceMode: Clearing AI conversation memory for:', currentConversationId);

        // Clear conversation from AI service
        const conversationalAI = ConversationalAI.getInstance();
        conversationalAI.clearConversation(currentConversationId);

        // Clear flow from loan application service
        loanApplicationService.clearFlow(currentConversationId);
      }
    } catch (error) {
      console.error('❌ VoiceMode: Error clearing conversation from database:', error);
    }

    // Clear local state and stop all voice operations
    setMessages([]);
    setCurrentLoanData({});
    setManuallyEditedFields(new Set()); // Clear manual edit tracking
    setCurrentTranscript(''); // Clear any pending transcript
    setIsProcessing(false);

    // Clear session storage and create new conversation
    sessionStorage.removeItem('currentConversationId');
    const newConversationId = `${user.id}-${Date.now()}`;
    console.log('🔄 VoiceMode: Creating new conversation ID:', newConversationId);
    setCurrentConversationId(newConversationId);
    sessionStorage.setItem('currentConversationId', newConversationId);

    speechService.setContinuousMode(false);
    speechService.stopSpeaking();
    speechService.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
  };

  // Helper functions for editing
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingField || !editValue.trim()) {
      console.log('❌ Save edit failed: missing field or value');
      return;
    }

    try {
      console.log('💾 Saving edit:', { field: editingField, value: editValue.trim() });

      // Update the current loan data immediately
      const updatedData = { ...currentLoanData, [editingField]: editValue.trim() };
      setCurrentLoanData(updatedData);

      // Mark this field as manually edited
      setManuallyEditedFields(prev => new Set([...prev, editingField]));
      console.log('🔒 Marked field as manually edited:', editingField);

      // Update the loan application flow if it exists
      const currentFlow = loanApplicationService.getCurrentFlow(currentConversationId);
      if (currentFlow) {
        currentFlow.data = { ...currentFlow.data, [editingField]: editValue.trim() };
        console.log('💾 Updated flow data:', currentFlow.data);

        // Mark this field as manually edited in the service
        loanApplicationService.markFieldAsManuallyEdited(currentConversationId, editingField);

        // The flow is stored by reference in the service, so this update persists automatically
      }

      console.log('✅ Edit saved successfully:', { field: editingField, value: editValue.trim() });

      // Clear editing state immediately after successful local update
      setEditingField(null);
      setEditValue('');

      // NO AI CALL - just update local state to prevent overwriting
      // The data is already updated in both local state and flow

    } catch (error) {
      console.error('❌ Error saving edit:', error);
      // Don't clear editing state on error - keep the field open for user to try again
    }
  };

  useImperativeHandle(ref, () => ({
    clearConversation,
    getMessages: () => {
      console.log('VoiceMode getMessages called, returning messages:', messages);
      return messages;
    }
  }));

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-full relative overflow-hidden min-h-0">
      {/* Futuristic Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}></div>
        </div>

        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-purple-400/20 to-green-400/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-cyan-400/20 to-green-400/20 rounded-full blur-2xl animate-float-fast"></div>

        {/* Energy Particles */}
        {isListening && (
          <>
            <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            <div className="absolute top-40 right-32 w-1 h-1 bg-green-300 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute bottom-32 left-32 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-20 right-20 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
          </>
        )}
      </div>

      {/* Three Column Layout - Wider Side Panels */}
      <div className="relative z-10 flex-1 flex py-4 w-full min-h-0">

        {/* Left Panel - Transcription */}
        <div className="w-2/5 flex flex-col pl-4 pr-2 min-h-0">
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-transparent to-green-400/10 rounded-2xl blur-xl"></div>
            <div className="relative bg-gray-900/60 backdrop-blur-2xl border border-green-400/20 rounded-xl p-4 shadow-2xl h-full flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    currentTranscript ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-green-300 text-sm font-medium tracking-wide">TRANSCRIPTION</span>
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {isListening ? 'LIVE' : 'STANDBY'}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                {messages.length > 0 ? (
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pl-4">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${
                          message.sender === 'user'
                            ? 'bg-green-500/20 border border-green-400/30 text-green-100'
                            : 'bg-blue-500/20 border border-blue-400/30 text-blue-100'
                        }`}>
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
                          <div className="text-xs opacity-60 mt-1">
                            {message.sender === 'user' ? 'You' : 'LoanWise AI'}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      {isProcessing ? (
                        <>
                          <p className="text-yellow-400 text-lg tracking-wide mb-4">
                            Processing transcription...
                          </p>
                          <div className="flex justify-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-400/60 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-yellow-400/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-yellow-400/60 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </>
                      ) : currentTranscript ? (
                        <>
                          <p className="text-blue-400 text-lg tracking-wide mb-4">
                            "{currentTranscript}"
                          </p>
                          <p className="text-gray-500 text-sm">
                            Preparing response...
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-400 text-lg tracking-wide mb-4">
                            Ready to listen
                          </p>
                          <p className="text-gray-500 text-sm">
                            Click the microphone to start speaking
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Switch Button */}
              <div className="mt-6 pt-6 border-t border-green-400/20">
                <button
                  onClick={() => navigate('/chat')}
                  className="group w-full px-6 py-3 bg-gray-800/60 backdrop-blur-xl border border-blue-400/30 rounded-full text-white/80 hover:text-white hover:border-blue-400/60 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center space-x-3">
                    <MessageSquare size={20} />
                    <span className="font-medium tracking-wide">SWITCH TO CHAT MODE</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Main Voice Interface */}
        <div className="w-1/5 flex flex-col items-center justify-center space-y-6 px-2">

          {/* Advanced Audio Visualizer */}
          <div className="relative">
            {/* Outer Ring Animation */}
            <div className={`absolute -inset-12 rounded-full border border-green-400/20 transition-all duration-1000 ${
              isListening ? 'animate-spin-slow scale-110' : 'scale-100'
            }`}></div>
            <div className={`absolute -inset-8 rounded-full border border-green-400/30 transition-all duration-700 ${
              isListening ? 'animate-pulse scale-105' : 'scale-100'
            }`}></div>

            {/* Central Audio Bars Container */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80 backdrop-blur-xl border border-green-400/20 flex items-center justify-center shadow-2xl">

              {/* Glowing Center */}
              <div className={`absolute inset-4 rounded-full blur-lg transition-all duration-500 ${
                isListening ? 'bg-green-400/60 animate-pulse' :
                isSpeaking ? 'bg-blue-400/60 animate-pulse' :
                isProcessing ? 'bg-yellow-400/60 animate-pulse' :
                'bg-white/20'
              }`}></div>

              {/* Audio Bars */}
              <div className="relative flex items-end space-x-0.5 h-8">
                {isListening ? (
                  <>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '10px', animationDelay: '0ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '18px', animationDelay: '100ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '8px', animationDelay: '200ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '24px', animationDelay: '300ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '12px', animationDelay: '400ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '20px', animationDelay: '500ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '16px', animationDelay: '600ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '28px', animationDelay: '700ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-green-600 to-green-300 rounded-full shadow-lg shadow-green-400/50 animate-bounce" style={{height: '10px', animationDelay: '800ms'}}></div>
                  </>
                ) : isSpeaking ? (
                  <>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '8px', animationDelay: '0ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '20px', animationDelay: '50ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '10px', animationDelay: '100ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '18px', animationDelay: '150ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '15px', animationDelay: '200ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '22px', animationDelay: '250ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '12px', animationDelay: '300ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '20px', animationDelay: '350ms'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-blue-600 to-blue-300 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" style={{height: '10px', animationDelay: '400ms'}}></div>
                  </>
                ) : (
                  <>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '5px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '8px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '4px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '10px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '6px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '9px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '5px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '12px'}}></div>
                    <div className="w-0.5 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full opacity-30" style={{height: '4px'}}></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Futuristic Status Display - Updated for smaller size */}
          <div className="text-center space-y-4">
            <div className="relative">
              <h2 className={`text-2xl font-extralight tracking-wider transition-all duration-700 ${
                isListening ? 'text-green-300 animate-pulse' :
                isSpeaking ? 'text-blue-300 animate-pulse' :
                isProcessing ? 'text-yellow-300 animate-pulse' :
                'text-white/90'
              }`} style={{
                fontSize: '1.25rem',
                lineHeight: '1.75rem',
                textShadow: isListening ? '0 0 15px rgba(34, 197, 94, 0.5)' :
                           isSpeaking ? '0 0 15px rgba(59, 130, 246, 0.5)' :
                           isProcessing ? '0 0 15px rgba(251, 191, 36, 0.5)' :
                           '0 0 8px rgba(255, 255, 255, 0.3)'
              }}>
                {isListening ? 'LISTENING' :
                 isSpeaking ? 'SPEAKING' :
                 isProcessing ? 'PROCESSING' :
                 'READY'}
              </h2>

              <div className={`h-0.5 mx-auto mt-3 transition-all duration-700 ${
                isListening ? 'w-24 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse' :
                isSpeaking ? 'w-24 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse' :
                isProcessing ? 'w-24 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse' :
                'w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent'
              }`}></div>
            </div>
          </div>

          {/* Control Interface */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {isListening && (
                <>
                  <div className="absolute -inset-6 rounded-full border border-green-400/30 animate-ping"></div>
                  <div className="absolute -inset-8 rounded-full border border-green-400/20 animate-ping" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute -inset-10 rounded-full border border-green-400/10 animate-ping" style={{animationDelay: '1s'}}></div>
                </>
              )}

              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking || isProcessing}
                className={`relative w-16 h-16 rounded-full transition-all duration-500 transform hover:scale-110 active:scale-95 ${
                  isListening
                    ? 'bg-gradient-to-br from-green-500 via-green-400 to-green-600 shadow-2xl shadow-green-500/50'
                    : 'bg-gradient-to-br from-green-500 via-green-400 to-green-600 hover:from-green-400 hover:via-green-300 hover:to-green-500 shadow-xl shadow-green-500/30'
                }`} style={{
                  boxShadow: isListening ? '0 0 30px rgba(34, 197, 94, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.2)' :
                            '0 0 15px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>

                <div className="relative flex items-center justify-center w-full h-full">
                  {isListening ? (
                    <Square size={20} className="text-white drop-shadow-lg" />
                  ) : (
                    <Mic size={20} className="text-white drop-shadow-lg" />
                  )}
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                )}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={stopVoiceMode}
                className="group relative px-6 py-2 bg-gradient-to-r from-red-600/20 via-red-500/20 to-red-600/20 backdrop-blur-xl border border-red-500/40 rounded-full text-red-300 hover:text-red-100 hover:border-red-400/70 transition-all duration-500 overflow-hidden transform hover:scale-105 active:scale-95 text-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 via-red-500/30 to-red-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 rounded-full shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow duration-500"></div>
                <span className="relative font-bold tracking-wider text-sm" style={{
                  textShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                }}>⚡ TERMINATE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Application Slate */}
        <div className="w-2/5 flex flex-col pl-4 pr-8 min-h-0">
          {currentLoanData && Object.keys(currentLoanData).length > 0 ? (
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-transparent to-blue-400/10 rounded-2xl blur-xl"></div>
              <div className={`relative backdrop-blur-2xl border rounded-2xl p-6 shadow-2xl h-full flex flex-col overflow-hidden ${
                submittedApplicationId
                  ? 'bg-green-500/20 border-green-400/50'
                  : 'bg-gray-900/60 border-blue-400/20'
              }`}>
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <h3 className="text-white/95 text-lg font-medium">
                    {submittedApplicationId ? 'APPLICATION SUBMITTED!' : 'CURRENT APPLICATION'}
                  </h3>
                  {submittedApplicationId && (
                    <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                      ✓ SUCCESS
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">

                {submittedApplicationId && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-400/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-300 text-sm font-medium">Application ID:</span>
                      <span className="text-green-200 text-lg font-mono">{submittedApplicationId}</span>
                    </div>
                    <p className="text-green-300/80 text-sm">
                      Your application has been successfully submitted.
                    </p>
                  </div>
                )}

                  {currentLoanData.applicant_name && (
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-blue-400/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-sm font-medium">Name</span>
                        {editingField === 'applicant_name' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing('applicant_name', currentLoanData.applicant_name)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>
                      {editingField === 'applicant_name' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-gray-700/50 border border-blue-400/30 rounded-lg px-3 py-2 text-white/95 text-sm focus:outline-none focus:border-blue-400"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="text-white/95 text-sm">{currentLoanData.applicant_name}</span>
                      )}
                    </div>
                  )}

                  {currentLoanData.loan_type && (
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-blue-400/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-sm font-medium">Loan Type</span>
                        {editingField === 'loan_type' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing('loan_type', currentLoanData.loan_type)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>
                      {editingField === 'loan_type' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-gray-700/50 border border-blue-400/30 rounded-lg px-3 py-2 text-white/95 text-sm focus:outline-none focus:border-blue-400"
                          placeholder="e.g., Personal Loan, Home Loan, Vehicle Loan, Business Loan"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="text-white/95 text-sm">{currentLoanData.loan_type}</span>
                      )}
                    </div>
                  )}

                  {currentLoanData.loan_amount && (
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-blue-400/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-sm font-medium">Amount</span>
                        {editingField === 'loan_amount' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing('loan_amount', currentLoanData.loan_amount)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>
                      {editingField === 'loan_amount' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-gray-700/50 border border-blue-400/30 rounded-lg px-3 py-2 text-white/95 text-sm focus:outline-none focus:border-blue-400"
                          placeholder="e.g., 500000, 5 lakhs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="text-white/95 text-sm">₹{parseFloat(currentLoanData.loan_amount).toLocaleString()}</span>
                      )}
                    </div>
                  )}

                  {currentLoanData.monthly_income && (
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-blue-400/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-sm font-medium">Monthly Income</span>
                        {editingField === 'monthly_income' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing('monthly_income', currentLoanData.monthly_income)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>
                      {editingField === 'monthly_income' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-gray-700/50 border border-blue-400/30 rounded-lg px-3 py-2 text-white/95 text-sm focus:outline-none focus:border-blue-400"
                          placeholder="e.g., 50000, 50k"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="text-white/95 text-sm">₹{parseFloat(currentLoanData.monthly_income).toLocaleString()}/month</span>
                      )}
                    </div>
                  )}

                  {currentLoanData.employment_status && (
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-blue-400/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-sm font-medium">Employment</span>
                        {editingField === 'employment_status' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing('employment_status', currentLoanData.employment_status)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>
                      {editingField === 'employment_status' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-gray-700/50 border border-blue-400/30 rounded-lg px-3 py-2 text-white/95 text-sm focus:outline-none focus:border-blue-400"
                          placeholder="e.g., Employed, Self-Employed, Business Owner, Student, Retired"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="text-white/95 text-sm">{currentLoanData.employment_status}</span>
                      )}
                    </div>
                  )}

                  {/* Calculated Terms Section */}
                  {currentLoanData.calculatedTerms && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-300 text-sm font-medium">Loan Terms Calculated</span>
                      </div>

                      <div className="bg-gradient-to-r from-green-800/20 to-blue-800/20 backdrop-blur-xl border border-green-400/30 rounded-xl p-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="truncate">
                            <span className="text-green-300 font-medium block mb-1">Interest Rate</span>
                            <span className="text-white/95 font-semibold">{currentLoanData.calculatedTerms.interestRate}</span>
                          </div>
                          <div className="truncate">
                            <span className="text-green-300 font-medium block mb-1">Term</span>
                            <span className="text-white/95 font-semibold">{currentLoanData.calculatedTerms.loanTerm}y</span>
                          </div>
                          <div className="col-span-2 border-t border-green-400/20 pt-2 mt-2">
                            <div className="text-center">
                              <span className="text-green-300 font-medium block mb-1">Monthly Payment</span>
                              <span className="text-white/95 font-semibold text-sm">{currentLoanData.calculatedTerms.monthlyPayment}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div> {/* Close the scrollable container */}
              </div>
            </div>
          ) : (
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/10 via-transparent to-gray-400/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-gray-900/60 backdrop-blur-2xl border border-gray-600/20 rounded-2xl p-6 shadow-2xl h-full flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                    <MessageSquare size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-white/80 text-lg font-medium mb-2">No Active Application</h3>
                  <p className="text-gray-400 text-sm">Start a conversation to begin your loan application</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Futuristic Styles */}
      <style>
        {`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(59, 130, 246, 0.1);
          border-radius: 2px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 2px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(10px) rotate(240deg); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(15px) rotate(-120deg); }
          66% { transform: translateY(-10px) rotate(-240deg); }
        }

        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.1); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
          animation-delay: 1s;
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; scale: 0.9; }
          to { opacity: 1; scale: 1; }
        }

        /* Custom Scrollbar Styles - Left Side */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(34, 197, 94, 0.5) rgba(31, 41, 55, 0.3);
          direction: rtl;
        }

        .custom-scrollbar > * {
          direction: ltr;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.3);
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(34, 197, 94, 0.8) 0%,
            rgba(34, 197, 94, 0.6) 50%,
            rgba(34, 197, 94, 0.8) 100%
          );
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.3);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(34, 197, 94, 1) 0%,
            rgba(34, 197, 94, 0.8) 50%,
            rgba(34, 197, 94, 1) 100%
          );
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(
            180deg,
            rgba(16, 185, 129, 1) 0%,
            rgba(16, 185, 129, 0.9) 50%,
            rgba(16, 185, 129, 1) 100%
          );
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.7);
        }
        `}
      </style>
    </div>
  );
});

VoiceMode.displayName = 'VoiceMode';

export default VoiceMode;
