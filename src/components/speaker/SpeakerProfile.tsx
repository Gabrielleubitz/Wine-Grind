import React from 'react';
import { User, Mail, Phone, Briefcase } from 'lucide-react';
import { AuthUser } from '../../hooks/useAuth';

interface SpeakerProfileProps {
  user: AuthUser | null;
}

const SpeakerProfile: React.FC<SpeakerProfileProps> = ({ user }) => {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Speaker Profile</h3>
      
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden">
          {user?.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user?.displayName || 'Speaker'} 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMTQwIiByeD0iNDAiIHJ5PSIyMCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <div>
          <h4 className="text-xl font-bold text-gray-900">{user?.displayName || 'Speaker'}</h4>
          <p className="text-gray-600">{user?.work || 'Speaker'}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Mail className="h-5 w-5 text-gray-400" />
          <span className="text-gray-700">{user?.email}</span>
        </div>
        
        {user?.phone && (
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <span className="text-gray-700">{user?.phone}</span>
          </div>
        )}
        
        {user?.work && (
          <div className="flex items-center space-x-3">
            <Briefcase className="h-5 w-5 text-gray-400" />
            <span className="text-gray-700">{user?.work}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerProfile;