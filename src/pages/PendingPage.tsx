import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import logoSvg from '../assets/W&G Logo.svg';

const PendingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center px-4 relative">
      {/* Logo in top left corner */}
      <div className="absolute top-6 left-6 z-10">
        <Link to="/" className="hover:opacity-80 transition-opacity duration-200">
          <img 
            src={logoSvg}
            alt="Wine & Grind Logo" 
            className="h-8 md:h-10 w-auto"
          />
        </Link>
      </div>

      <div className="max-w-md w-full">
        {/* Back button */}
        <div className="mb-6">
          <Link 
            to="/"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to site</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Account Pending Approval
            </h2>
            <p className="text-gray-600 mb-6">
              Thanks for signing up. Your account is under review. You'll receive an SMS once approved.
            </p>
            
            <div className="bg-yellow-50 rounded-xl p-6 mb-6 text-left">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">What happens next?</h3>
                  <ul className="text-sm text-yellow-700 space-y-2">
                    <li>• Our team will review your LinkedIn profile</li>
                    <li>• We'll verify your professional information</li>
                    <li>• You'll receive an SMS notification when approved</li>
                    <li>• Once approved, you can log in and access all features</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-6 text-left">
              <div className="flex items-start space-x-3">
                <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2">Need assistance?</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    If you have any questions or need to update your information, please contact us:
                  </p>
                  <a 
                    href="mailto:info@winengrind.com" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    info@winengrind.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingPage;