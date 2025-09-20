import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'member';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading, isAdmin, isMember, isPending, isRejected, networkError } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);

  // Show retry button after multiple attempts
  useEffect(() => {
    if (networkError && retryCount >= 2) {
      setShowRetryButton(true);
    }
  }, [networkError, retryCount]);

  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setShowRetryButton(false);
    window.location.reload();
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show network error message
  if (networkError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Network Connection Error</h2>
          <p className="text-gray-600 mb-6">
            You appear to be offline. Please check your internet connection and try again.
          </p>
          {showRetryButton && (
            <button
              onClick={handleRetry}
              className="bg-gradient-to-r from-red-700 to-blue-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300 font-semibold"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('❌ ProtectedRoute - User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user is pending approval - CRITICAL CHECK
  if (isPending) {
    console.log('⏳ ProtectedRoute - User is pending approval, redirecting to pending page');
    return <Navigate to="/pending" replace />;
  }

  // Check if user is rejected
  if (isRejected) {
    console.log('❌ ProtectedRoute - User is rejected');
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole) {
    if (requiredRole === 'admin' && !isAdmin) {
      console.log('❌ ProtectedRoute - Admin access required but user is not admin');
      return <Navigate to="/unauthorized" replace />;
    }
    
    if (requiredRole === 'member' && !isMember && !isAdmin) {
      console.log('❌ ProtectedRoute - Member access required but user has no valid role');
      return <Navigate to="/unauthorized" replace />;
    }
  }

  console.log('✅ ProtectedRoute - Access granted for role:', user.role);
  return <>{children}</>;
};

export default ProtectedRoute;