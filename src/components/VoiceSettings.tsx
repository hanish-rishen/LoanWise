import React, { useState, useEffect } from 'react';
import { enhancedVoiceService, VoiceOption } from '../services/enhancedVoiceService';

interface VoiceSettingsProps {
  onVoiceChange: (voiceId: string) => void;
  currentVoiceId: string;
}

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ onVoiceChange, currentVoiceId }) => {
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Get only free voices for display
    const freeVoices = enhancedVoiceService.getFreeVoices();
    setAvailableVoices(freeVoices);
  }, []);

  const handleTestVoice = async (voiceId: string) => {
    if (isTestingVoice) return;

    setIsTestingVoice(voiceId);
    try {
      await enhancedVoiceService.testVoice(voiceId);
    } catch (error) {
      console.error('Voice test failed:', error);
    } finally {
      setIsTestingVoice(null);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    onVoiceChange(voiceId);
    setShowSettings(false);
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      basic: 'bg-gray-100 text-gray-800'
    };
    return colors[quality as keyof typeof colors] || colors.basic;
  };

  return (
    <div className="relative">
      {/* Voice Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        title="Voice Settings"
      >
        🎙️ Voice Settings
      </button>

      {/* Voice Settings Panel */}
      {showSettings && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Choose Your Voice</h3>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {availableVoices.map((voice) => (
                <div
                  key={voice.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    currentVoiceId === voice.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1" onClick={() => handleVoiceSelect(voice.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{voice.name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getQualityBadge(voice.provider.quality)}`}>
                          {voice.provider.quality}
                        </span>
                        {voice.provider.free && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Free
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <div>{voice.accent} • {voice.gender}</div>
                        <div className="text-xs text-gray-500 mt-1">{voice.provider.description}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestVoice(voice.id);
                      }}
                      disabled={isTestingVoice !== null}
                      className="ml-2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded disabled:opacity-50"
                      title="Test Voice"
                    >
                      {isTestingVoice === voice.id ? '▶️' : '🔊'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                💡 <strong>Tip:</strong> ResponsiveVoice provides the most natural sounding voices for free!
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSettings;
