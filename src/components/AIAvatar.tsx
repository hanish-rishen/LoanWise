import React from 'react';
import { Mic, PhoneOff } from 'lucide-react';

interface AIAvatarProps {
  isVoiceActive: boolean;
  onMicToggle: () => void;
}

export default function AIAvatar({ isVoiceActive, onMicToggle }: AIAvatarProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center pb-16">
      <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-10">
        <div className={`
          absolute w-full h-full rounded-full transition-all duration-500 ease-in-out
          ${isVoiceActive 
            ? 'shadow-[0_0_80px_20px_rgba(59,130,246,0.7),0_0_120px_30px_rgba(59,130,246,0.4)] animate-pulse' 
            : 'shadow-none'
          }
        `} />
        
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/40 to-blue-600/20 animate-pulse" 
               style={{ 
                 animation: 'subtle-pulse 4s infinite ease-in-out',
                 transform: 'scale(1.15)'
               }} />
          <img 
            alt="AI Avatar" 
            className="relative w-full h-full rounded-full object-cover shadow-2xl z-10" 
            src="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400"
          />
        </div>
      </div>

      <p className="text-gray-300 text-lg mb-8 text-center max-w-md">
        Hello! I'm your AI loan manager. How can I assist you today?
      </p>

      <div className="flex space-x-8">
        <button 
          onClick={onMicToggle}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg transform hover:scale-105
            ${isVoiceActive 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
            }
          `}
        >
          <Mic className="text-white" size={32} />
        </button>
        <button className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-all duration-300 shadow-lg transform hover:scale-105">
          <PhoneOff className="text-white" size={32} />
        </button>
      </div>
    </div>
  );
}