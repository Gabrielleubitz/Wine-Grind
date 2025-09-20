import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';

interface NetworkStatusIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ 
  position = 'bottom-right' 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineMessage(true);
      // Hide the online message after 3 seconds
      setTimeout(() => setShowOnlineMessage(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  if (isOnline && !showOnlineMessage) {
    return null;
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {!isOnline && showOfflineMessage && (
        <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-fade-in">
          <WifiOff className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-medium">You appear to be offline</p>
            <p className="text-sm">Some features may be unavailable</p>
          </div>
          <button 
            onClick={() => setShowOfflineMessage(false)}
            className="p-1 rounded-full hover:bg-red-700 transition-colors"
            aria-label="Close offline notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isOnline && showOnlineMessage && (
        <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-fade-in">
          <Wifi className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-medium">You're back online</p>
          </div>
          <button 
            onClick={() => setShowOnlineMessage(false)}
            className="p-1 rounded-full hover:bg-green-700 transition-colors"
            aria-label="Close online notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;