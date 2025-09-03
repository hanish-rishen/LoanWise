// Simplified speech service for voice mode in LoanWise
// Uses Web Speech API for speech recognition and synthesis

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
  onstart: (() => void) | null;
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

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isSpeaking = false;
  private continuousMode = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  // Callback functions
  public onSpeechStart: (() => void) | null = null;
  public onSpeechEnd: (() => void) | null = null;
  public onSpeechResult: ((text: string) => void) | null = null;
  public onSpeechError: ((error: string) => void) | null = null;

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();

      if (this.recognition) {
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
          this.isListening = true;
          this.onSpeechStart?.();
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            if (transcript) {
              console.log('🎤 Recognized:', transcript);
              this.onSpeechResult?.(transcript);
            }
          }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('🎤 Speech recognition error:', event.error);
          this.isListening = false;
          this.onSpeechError?.(event.error);
        };

        this.recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          this.isListening = false;
          this.onSpeechEnd?.();
        };
      }
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  }

  // Public methods
  startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      if (this.isListening) {
        console.log('Already listening');
        resolve();
        return;
      }

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        reject(error);
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set the selected voice if available
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      // Configure utterance for more natural, human-like speech
      utterance.rate = 0.95; // Slightly slower for better clarity
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 0.9;

      utterance.onstart = () => {
        console.log('🔊 Speaking:', text.substring(0, 50) + '...');
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        console.log('🔊 Speech finished');
        this.isSpeaking = false;

        // Restart listening in continuous mode
        if (this.continuousMode && this.recognition) {
          setTimeout(() => {
            this.startListening().catch(console.error);
          }, 500); // Small delay to avoid issues
        }

        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        this.isSpeaking = false;
        reject(new Error(event.error));
      };

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() || [];
  }

  setVoice(voice: SpeechSynthesisVoice | null): void {
    this.selectedVoice = voice;
    console.log('🔊 Voice changed to:', voice?.name || 'default');
  }

  getBestVoice(): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    if (voices.length === 0) return null;

    // Priority order for more natural, human-like voices
    const preferredVoices = [
      // Google voices (highest quality, most natural)
      voices.find(v => v.name.includes('Google') && v.lang.includes('en-US') && v.name.includes('Wavenet')),
      voices.find(v => v.name.includes('Google') && v.lang.includes('en-US') && v.name.includes('Studio')),
      voices.find(v => v.name.includes('Google') && v.lang.includes('en-US') && v.name.includes('Neural')),
      voices.find(v => v.name.includes('Google') && v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('US'))),
      voices.find(v => v.name.includes('Google') && v.lang.includes('en')),

      // Microsoft Edge voices (very natural)
      voices.find(v => v.name.includes('Microsoft') && v.name.includes('Aria')),
      voices.find(v => v.name.includes('Microsoft') && v.name.includes('Jenny')),
      voices.find(v => v.name.includes('Microsoft') && v.name.includes('Guy')),
      voices.find(v => v.name.includes('Microsoft') && v.name.includes('Zira')),

      // Apple/Mac voices (good quality)
      voices.find(v => v.name.includes('Samantha')),
      voices.find(v => v.name.includes('Alex')),
      voices.find(v => v.name.includes('Victoria')),
      voices.find(v => v.name.includes('Karen')),
      voices.find(v => v.name.includes('Allison')),

      // Chrome/Chromium enhanced voices
      voices.find(v => v.name.includes('Chrome') && v.lang.includes('en-US')),

      // Any high-quality English voice
      voices.find(v => v.lang.includes('en-US') && !v.name.includes('eSpeak')),
      voices.find(v => v.lang.includes('en-GB') && !v.name.includes('eSpeak')),
      voices.find(v => v.lang.includes('en') && !v.name.includes('eSpeak')),

      // Fallback to any English voice
      voices.find(v => v.lang.includes('en')),
      voices[0]
    ];

    const selectedVoice = preferredVoices.find(v => v) || null;

    if (selectedVoice) {
      console.log('🎙️ Selected voice:', selectedVoice.name, 'Lang:', selectedVoice.lang);
    }

    return selectedVoice;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  isSupported(): boolean {
    return !!(this.recognition && this.synthesis);
  }

  setContinuousMode(enabled: boolean): void {
    this.continuousMode = enabled;
    console.log('🎤 Continuous mode:', enabled ? 'enabled' : 'disabled');
  }

  isContinuousModeEnabled(): boolean {
    return this.continuousMode;
  }

  destroy(): void {
    this.stopListening();
    this.stopSpeaking();
    this.continuousMode = false;
  }
}

// Export singleton instance
export const speechService = new SpeechService();
