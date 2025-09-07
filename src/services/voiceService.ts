// Voice service for LoanWise application
// Handles VAD, STT, TTS, and Groq AI integration

import { MicVAD } from '@ricky0123/vad';

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface VoiceMessage {
  text: string;
  timestamp: Date;
  isUser: boolean;
}

export interface VoiceServiceConfig {
  groqApiKey: string;
  model?: string;
  voice?: SpeechSynthesisVoice;
  language?: string;
}

export class VoiceService {
  private vad: MicVAD | null = null;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isProcessing = false;
  private config: VoiceServiceConfig;
  private onMessage?: (message: VoiceMessage) => void;
  private onVadStateChange?: (isActive: boolean) => void;

  constructor(config: VoiceServiceConfig) {
    this.config = {
      model: 'llama3-8b-8192',
      language: 'en-US',
      ...config
    };

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }

    // Initialize components with error handling
    this.initializeVAD().catch(console.error);
    this.initializeSpeechRecognition();
  }

  private async initializeVAD() {
    try {
      console.log('🎤 Initializing VAD...');

      // Check if worklet files exist before initializing
      const workletResponse = await fetch('/vad.worklet.js');
      const modelResponse = await fetch('/silero_vad.onnx');

      if (!workletResponse.ok) {
        throw new Error(`VAD worklet file not found: ${workletResponse.status}`);
      }
      if (!modelResponse.ok) {
        throw new Error(`VAD model file not found: ${modelResponse.status}`);
      }

      console.log('✅ VAD files found, initializing MicVAD...');

      // Disable VAD for now as it's causing worklet issues
      console.log('⚠️ VAD temporarily disabled due to worklet loading issues');

      // this.vad = await MicVAD.new({
      //   onSpeechStart: () => {
      //     console.log('🎤 Speech started');
      //     this.onVadStateChange?.(true);
      //   },
      //   onSpeechEnd: (audio: Float32Array) => {
      //     console.log('🎤 Speech ended, processing audio...');
      //     this.onVadStateChange?.(false);
      //     this.processAudio(audio);
      //   },
      //   onVADMisfire: () => {
      //     console.log('🎤 VAD misfire - false positive');
      //   }
      // });

      console.log('✅ Voice service initialized (VAD disabled)');
    } catch (error) {
      console.error('❌ Failed to initialize VAD:', error);
      // VAD is optional, so don't throw - just log the error
    }
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();

      if (this.recognition) {
        this.recognition.continuous = false; // Single utterance mode
        this.recognition.interimResults = false;
        this.recognition.lang = this.config.language!;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          if (transcript.trim()) {
            console.log('🎤 Recognized:', transcript);
            this.handleUserMessage(transcript);
          }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('🎤 Speech recognition error:', event.error);
          this.isListening = false;
        };

        this.recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          this.isListening = false;
        };
      }
    }
  }

  private async processAudio(audio: Float32Array) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      console.log('🎤 Processing audio with', audio.length, 'samples...');

      // Start speech recognition if not already started
      if (!this.recognition) {
        this.initializeSpeechRecognition();
      }

      if (this.recognition && !this.isListening) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (error) {
          console.warn('Speech recognition already started or not available');
        }
      }
    } catch (error) {
      console.error('Audio processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleUserMessage(text: string) {
    const userMessage: VoiceMessage = {
      text,
      timestamp: new Date(),
      isUser: true
    };

    this.onMessage?.(userMessage);

    // Get AI response from Groq
    const aiResponse = await this.getAIResponse(text);

    if (aiResponse) {
      const aiMessage: VoiceMessage = {
        text: aiResponse,
        timestamp: new Date(),
        isUser: false
      };

      this.onMessage?.(aiMessage);
      this.speakText(aiResponse);
    }
  }

  private async getAIResponse(userText: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `You are LoanWise AI, a helpful financial assistant specializing in loans and lending. You help users with:
              - Loan application guidance
              - Financial advice and planning
              - Credit score information
              - Loan terms and conditions
              - Financial literacy education

              Be professional, accurate, and helpful. Always prioritize user financial well-being and regulatory compliance. Keep responses conversational and natural for voice interaction.`
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
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('Groq API error:', error);
      return "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
    }
  }

  private speakText(text: string) {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice if configured
    if (this.config.voice) {
      utterance.voice = this.config.voice;
    }

  // Adjust speech settings for faster voice as requested
  utterance.rate = 1.15; // Faster speaking rate
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    this.synthesis.speak(utterance);
  }

  // Public methods
  async startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        console.log('🎤 Voice listening started');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    } else {
      console.log('🎤 Speech recognition not available or already listening');
    }
  }

  async stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      console.log('🎤 Voice listening stopped');
    }
  }

  speak(text: string) {
    this.speakText(text);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  setOnMessage(callback: (message: VoiceMessage) => void) {
    this.onMessage = callback;
  }

  setOnVadStateChange(callback: (isActive: boolean) => void) {
    this.onVadStateChange = callback;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() || [];
  }

  setVoice(voice: SpeechSynthesisVoice) {
    this.config.voice = voice;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  // Cleanup
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

// Export singleton instance
export const voiceService = new VoiceService({
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || '',
});
