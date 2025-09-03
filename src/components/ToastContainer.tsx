import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToasts, Toast } from '../services/toastService';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToasts();

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-500/50';
      case 'error':
        return 'bg-red-900/90 border-red-500/50';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-500/50';
      default:
        return 'bg-blue-900/90 border-blue-500/50';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center p-4 rounded-lg border backdrop-blur-sm
            ${getBackgroundColor(toast.type)}
            animate-slide-in-right
            min-w-[320px] max-w-md
          `}
        >
          <div className="flex-shrink-0 mr-3">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 text-white">
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 ml-3 p-1 rounded-md hover:bg-white/20 transition-colors"
          >
            <X size={16} className="text-white/70 hover:text-white" />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
