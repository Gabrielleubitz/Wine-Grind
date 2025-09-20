import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

const OfflineNotice: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOffline(!navigator.onLine);

    // Add event listeners for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-yellow-500 text-white p-4 text-center">
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-5 w-5" />
        <span className="font-medium">You're currently offline. Some features may be unavailable.</span>
      </div>
    </div>
  );
};

export default OfflineNotice;