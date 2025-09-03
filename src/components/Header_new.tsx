import React from 'react';
import { FileText } from 'lucide-react';

interface HeaderProps {
  onTranscriptToggle: () => void;
}

export default function Header({ onTranscriptToggle }: HeaderProps) {
  return (
    <div className="flex justify-end items-center p-6">
      <button
        onClick={onTranscriptToggle}
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center transition-colors"
      >
        <FileText className="mr-2" size={20} />
        <span>Transcript</span>
      </button>
    </div>
  );
}
