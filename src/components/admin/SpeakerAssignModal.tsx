import React from 'react';
import { User, Search } from 'lucide-react';
import { SpeakerService } from '../../services/speakerService';

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
  roleType?: 'speaker' | 'admin';
  profileImage?: string | null;
}

interface SpeakerAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserData[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAssignSpeaker: (userId: string, userName: string, userEmail: string) => void;
  assigningUser: boolean;
  eventSpeakers: any[];
  selectedEventName?: string;
}

const SpeakerAssignModal: React.FC<SpeakerAssignModalProps> = ({
  isOpen,
  onClose,
  users,
  loading,
  searchTerm,
  onSearchChange,
  onAssignSpeaker,
  assigningUser,
  eventSpeakers,
  selectedEventName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Assign Speaker to Event
        </h3>
        
        <p className="text-gray-600 mb-6">
          Select a user to assign as a speaker for {selectedEventName}.
        </p>

        {/* Debug Info */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Debug Info:</strong> Showing {users.length} users with speaker/admin roles.
            {users.length === 0 && (
              <span className="text-red-600"> No speaker-eligible users found!</span>
            )}
          </p>
        </div>
        
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={onSearchChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
        
        {/* Users List */}
        <div className="max-h-96 overflow-y-auto mb-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading speaker-eligible users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Speaker-Eligible Users Found</h4>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? `No users with speaker roles match "${searchTerm}"`
                  : "No users have the 'speaker' or 'admin' role assigned."
                }
              </p>
              
              {!searchTerm && (
                <div className="text-left bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h5 className="font-semibold text-yellow-800 mb-2">💡 To fix this:</h5>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Go to Firebase Console → Firestore</li>
                    <li>Navigate to the 'users' collection</li>
                    <li>Find the user documents you want as speakers</li>
                    <li>Add/edit the 'role' field to be "speaker" or "admin"</li>
                    <li>Refresh this page</li>
                  </ol>
                  
                  <div className="mt-3 pt-2 border-t border-yellow-300">
                    <p className="text-xs text-yellow-600">
                      <strong>Or use the browser console:</strong><br />
                      <code className="bg-yellow-100 px-1 rounded">
                        await SpeakerService.setUserAsSpeaker('user-id-here')
                      </code>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((userData) => {
                const isAlreadyAssigned = eventSpeakers.some(speaker => speaker.userId === userData.uid);
                
                return (
                  <div 
                    key={userData.uid}
                    className="p-4 rounded-xl border border-gray-200 hover:border-purple-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          {userData.profileImage ? (
                            <img 
                              src={userData.profileImage} 
                              alt={userData.displayName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMTQwIiByeD0iNDAiIHJ5PSIyMCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                              {userData.displayName?.charAt(0) || userData.email?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{userData.displayName || 'Unknown User'}</h4>
                            {/* Role Badge */}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              userData.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {userData.role === 'admin' ? '👑 Admin' : '🎤 Speaker'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{userData.email}</p>
                          <p className="text-xs text-gray-500">Role: {userData.role}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => onAssignSpeaker(userData.uid, userData.displayName || 'Unknown User', userData.email)}
                        disabled={isAlreadyAssigned || assigningUser}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${
                          isAlreadyAssigned
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        } transition-colors duration-200 disabled:opacity-50`}
                      >
                        {assigningUser ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Assigning...</span>
                          </div>
                        ) : isAlreadyAssigned ? (
                          '✅ Already Assigned'
                        ) : (
                          'Assign as Speaker'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium"
          >
            Close
          </button>
          
          {/* Quick Fix Button */}
          {users.length === 0 && !loading && (
            <button
              onClick={async () => {
                if (!window.confirm("This will set your user account to have the 'speaker' role. Continue?")) {
                  return;
                }
                
                try {
                  // Get current user ID from localStorage or auth context
                  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
                  const userId = currentUser?.uid;
                  
                  if (!userId) {
                    alert('❌ Could not determine your user ID. Please try logging out and back in.');
                    return;
                  }
                  
                  await SpeakerService.setUserAsSpeaker(userId);
                  alert('✅ Your role has been set to speaker! Refresh the page and try again.');
                  window.location.reload();
                } catch (error: any) {
                  alert('❌ Error setting role: ' + error.message);
                }
              }}
              className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors duration-200 font-medium text-sm"
            >
              🔧 Make Me Speaker
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeakerAssignModal;