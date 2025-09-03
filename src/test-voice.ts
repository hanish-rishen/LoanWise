// Voice Service Test
// Run this to verify voice functionality is working

import { voiceService } from './services/voiceService';

console.log('🎤 Voice Service Test Starting...');

// Test 1: Check if service initializes
console.log('✅ Voice service imported successfully');

// Test 2: Check available voices
const voices = voiceService.getAvailableVoices();
console.log(`🎵 Available voices: ${voices.length}`);

// Test 3: Check if currently listening
console.log(`🎤 Currently listening: ${voiceService.isCurrentlyListening()}`);

// Test 4: Check if API key is configured
const hasApiKey = import.meta.env.VITE_GROQ_API_KEY && import.meta.env.VITE_GROQ_API_KEY !== 'your_groq_api_key_here';
console.log(`🔑 Groq API key configured: ${hasApiKey ? 'Yes' : 'No (please add to .env)'}`);

// Test 5: Check VAD worklet files
const checkWorkletFiles = async () => {
  try {
    const workletResponse = await fetch('/vad.worklet.js');
    const modelResponse = await fetch('/568bf886c02ac597add4.onnx');

    console.log(`📁 Worklet file accessible: ${workletResponse.ok}`);
    console.log(`📁 Model file accessible: ${modelResponse.ok}`);

    if (workletResponse.ok && modelResponse.ok) {
      console.log('✅ VAD worklet files are properly configured');
    } else {
      console.log('❌ VAD worklet files not found - check public directory');
    }
  } catch (error) {
    console.log('❌ Error checking worklet files:', error);
  }
};

checkWorkletFiles();

console.log('🎤 Voice Service Test Complete!');
console.log('💡 To test voice: Click microphone icon in chat → speak → AI should respond');
console.log('🔧 Make sure you have a Groq API key in .env for AI responses');

// Export for potential use
export { voiceService };
