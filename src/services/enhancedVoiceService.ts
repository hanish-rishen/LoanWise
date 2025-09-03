// Enhanced Voice Service with multiple free voice providers
// Provides natural, human-like voices as alternatives to built-in browser voices

export interface VoiceProvider {
  name: string;
  type: 'browser' | 'external';
  quality: 'basic' | 'good' | 'excellent';
  free: boolean;
  description: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  provider: VoiceProvider;
  gender: 'male' | 'female';
  accent: string;
  sampleRate?: number;
}

class EnhancedVoiceService {
  // Available voice providers
  private providers: VoiceProvider[] = [
    {
      name: 'Browser Built-in',
      type: 'browser',
      quality: 'good',
      free: true,
      description: 'Enhanced browser voices with better selection'
    },
    {
      name: 'ResponsiveVoice',
      type: 'external',
      quality: 'excellent',
      free: true,
      description: 'Free tier: 5000 characters/day, very natural voices'
    },
    {
      name: 'SpeechSynthesis API',
      type: 'external',
      quality: 'excellent',
      free: true,
      description: 'Free web API with high quality voices'
    },
    {
      name: 'ElevenLabs',
      type: 'external',
      quality: 'excellent',
      free: false, // Has free tier but limited
      description: 'Premium quality, 10k chars/month free'
    }
  ];

  // Available voice options
  private voiceOptions: VoiceOption[] = [
    // Browser voices (enhanced selection)
    {
      id: 'browser-female-us',
      name: 'Sarah (US Female)',
      provider: this.providers[0],
      gender: 'female',
      accent: 'US English'
    },
    {
      id: 'browser-male-us',
      name: 'David (US Male)',
      provider: this.providers[0],
      gender: 'male',
      accent: 'US English'
    },

    // ResponsiveVoice (completely free)
    {
      id: 'responsive-uk-female',
      name: 'Emma (UK Female)',
      provider: this.providers[1],
      gender: 'female',
      accent: 'UK English'
    },
    {
      id: 'responsive-us-female',
      name: 'Amy (US Female)',
      provider: this.providers[1],
      gender: 'female',
      accent: 'US English'
    },
    {
      id: 'responsive-us-male',
      name: 'John (US Male)',
      provider: this.providers[1],
      gender: 'male',
      accent: 'US English'
    },

    // Free Web Speech API
    {
      id: 'webspeech-neural-female',
      name: 'Neural Female Voice',
      provider: this.providers[2],
      gender: 'female',
      accent: 'US English'
    }
  ];

  async speak(text: string, voiceId: string = 'browser-female-us'): Promise<void> {
    const voice = this.voiceOptions.find(v => v.id === voiceId);
    if (!voice) {
      throw new Error(`Voice ${voiceId} not found`);
    }

    console.log(`🎙️ Speaking with ${voice.name} (${voice.provider.name})`);

    switch (voice.provider.name) {
      case 'Browser Built-in':
        return this.speakWithBrowser(text, voice);
      case 'ResponsiveVoice':
        return this.speakWithResponsiveVoice(text, voice);
      case 'SpeechSynthesis API':
        return this.speakWithWebAPI(text, voice);
      default:
        throw new Error(`Provider ${voice.provider.name} not implemented`);
    }
  }

  // Enhanced browser speech with better voice selection
  private async speakWithBrowser(text: string, voice: VoiceOption): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser speech not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();

      // Select best voice based on gender and accent
      let selectedVoice = null;
      if (voice.gender === 'female') {
        selectedVoice = voices.find(v =>
          (v.name.includes('Aria') || v.name.includes('Jenny') ||
           v.name.includes('Samantha') || v.name.includes('Zira') ||
           v.name.includes('Google') && v.name.includes('Female')) &&
          v.lang.includes('en')
        );
      } else {
        selectedVoice = voices.find(v =>
          (v.name.includes('Guy') || v.name.includes('Alex') ||
           v.name.includes('David') || v.name.includes('Google') && v.name.includes('Male')) &&
          v.lang.includes('en')
        );
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Optimize for natural speech
      utterance.rate = 0.9;
      utterance.pitch = voice.gender === 'female' ? 1.1 : 0.9;
      utterance.volume = 0.95;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(new Error(e.error));

      speechSynthesis.speak(utterance);
    });
  }

  // ResponsiveVoice - completely free, no API key needed
  private async speakWithResponsiveVoice(text: string, voice: VoiceOption): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load ResponsiveVoice script if not already loaded
      if (!(window as any).responsiveVoice) {
        const script = document.createElement('script');
        script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=FREE'; // FREE key for testing
        script.onload = () => {
          this.executeResponsiveVoice(text, voice, resolve, reject);
        };
        script.onerror = () => reject(new Error('Failed to load ResponsiveVoice'));
        document.head.appendChild(script);
      } else {
        this.executeResponsiveVoice(text, voice, resolve, reject);
      }
    });
  }

  private executeResponsiveVoice(text: string, voice: VoiceOption, resolve: () => void, reject: (error: Error) => void) {
    const rv = (window as any).responsiveVoice;

    // Map voice IDs to ResponsiveVoice voice names
    const voiceMap: { [key: string]: string } = {
      'responsive-uk-female': 'UK English Female',
      'responsive-us-female': 'US English Female',
      'responsive-us-male': 'US English Male'
    };

    const voiceName = voiceMap[voice.id] || 'US English Female';

    rv.speak(text, voiceName, {
      rate: 0.9,
      pitch: 1,
      volume: 1,
      onend: resolve,
      onerror: () => reject(new Error('ResponsiveVoice error'))
    });
  }

  // Free Web Speech API (alternative implementation)
  private async speakWithWebAPI(text: string, voice: VoiceOption): Promise<void> {
    try {
      // This is a placeholder for a free TTS API
      // You can replace with any free TTS service
      const response = await fetch('https://api.streamelements.com/kappa/v2/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: voice.gender === 'female' ? 'Amy' : 'Brian',
          text: text
        })
      });

      if (!response.ok) {
        throw new Error('Web API request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => reject(new Error('Audio playback failed'));
        audio.play();
      });
    } catch (error) {
      console.warn('Web API failed, falling back to browser speech');
      return this.speakWithBrowser(text, voice);
    }
  }

  // Get available voices
  getAvailableVoices(): VoiceOption[] {
    return this.voiceOptions;
  }

  // Get voices by provider
  getVoicesByProvider(providerName: string): VoiceOption[] {
    return this.voiceOptions.filter(v => v.provider.name === providerName);
  }

  // Get free voices only
  getFreeVoices(): VoiceOption[] {
    return this.voiceOptions.filter(v => v.provider.free);
  }

  // Get best free voice recommendation
  getBestFreeVoice(): VoiceOption {
    // Prefer ResponsiveVoice for best free quality
    const responsiveVoices = this.getVoicesByProvider('ResponsiveVoice');
    if (responsiveVoices.length > 0) {
      return responsiveVoices.find(v => v.gender === 'female') || responsiveVoices[0];
    }

    // Fallback to enhanced browser voice
    return this.voiceOptions.find(v => v.id === 'browser-female-us') || this.voiceOptions[0];
  }

  // Test voice with sample text
  async testVoice(voiceId: string): Promise<void> {
    const sampleText = "Hello! I'm your loan advisor. How can I help you with your loan application today?";
    return this.speak(sampleText, voiceId);
  }

  // Stop current speech
  stopSpeaking(): void {
    // Stop browser speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    // Stop ResponsiveVoice
    if ((window as any).responsiveVoice) {
      (window as any).responsiveVoice.cancel();
    }

    // Stop any playing audio
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}

// Export singleton
export const enhancedVoiceService = new EnhancedVoiceService();
export default EnhancedVoiceService;
