import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  X, 
  ChevronDown, 
  Shield, 
  User as UserIcon,
  Mic,
  Mail,
  Calendar,
  Trash2,
  Phone,
  Briefcase,
  Linkedin,
  Eye
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import AdminHeader from '../../components/admin/AdminHeader';

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: 'member' | 'admin' | 'speaker';
  createdAt?: any;
  profileImage?: string | null;
  phone?: string;
  company?: string;
  work?: string;
  linkedinUsername?: string;
  position?: string;
  status?: string;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success'
  });
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    uid: string;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name'));
      const snapshot = await getDocs(q);
      
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserData[];
      
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error: any) {
      console.error('❌ Error loading users:', error);
      setError(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = users.filter(user => 
      (user.name?.toLowerCase().includes(term) || false) || 
      (user.email?.toLowerCase().includes(term) || false)
    );
    
    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    if (!user?.uid) return;
    
    // Prevent changing your own role
    if (uid === user.uid) {
      showToast('You cannot change your own role', 'error');
      return;
    }
    
    setUpdatingUser(uid);
    
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { 
        role: newRole
      });
      
      // Update local state
      const updatedUsers = users.map(u => 
        u.uid === uid ? { ...u, role: newRole as 'member' | 'admin' | 'speaker' } : u
      );
      setUsers(updatedUsers);
      
      // Get user name for toast
      const updatedUser = updatedUsers.find(u => u.uid === uid);
      showToast(`Role updated to ${newRole} for ${updatedUser?.name || 'user'}`, 'success');
    } catch (error: any) {
      console.error('❌ Error updating user role:', error);
      showToast(error.message || 'Failed to update user role', 'error');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleUserProfileClick = (userData: UserData) => {
    setSelectedUser(userData);
    setShowProfileModal(true);
  };

  const handleCloseProfileModal = () => {
    setSelectedUser(null);
    setShowProfileModal(false);
  };

  const formatPosition = (position: string) => {
    if (!position) return '';
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleDeleteClick = (userData: UserData) => {
    // Prevent deleting yourself
    if (userData.uid === user?.uid) {
      showToast('You cannot delete your own account', 'error');
      return;
    }
    
    setDeleteConfirmation({
      uid: userData.uid,
      name: userData.name || 'Unknown User',
      email: userData.email
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation || !user?.uid) return;
    
    setDeletingUser(deleteConfirmation.uid);
    
    try {
      // Call Netlify function to delete user
      // TODO: Convert to Vercel API
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIdToDelete: deleteConfirmation.uid,
          adminId: user.uid
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }
      
      // Remove user from local state
      setUsers(prev => prev.filter(u => u.uid !== deleteConfirmation.uid));
      setFilteredUsers(prev => prev.filter(u => u.uid !== deleteConfirmation.uid));
      
      showToast(`User ${deleteConfirmation.name} has been deleted successfully`, 'success');
    } catch (error: any) {
      console.error('❌ Error deleting user:', error);
      showToast(error.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingUser(null);
      setDeleteConfirmation(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({
      visible: true,
      message,
      type
    });
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'speaker':
        return <Mic className="h-4 w-4 text-orange-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'speaker':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <AdminHeader title="User Management" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <AdminHeader 
        title="User Management" 
        subtitle="Manage user roles and permissions"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin-tools')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Admin Tools</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700 ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Toast Notification */}
        {toast.visible && (
          <div className="fixed top-6 right-6 z-50 animate-fade-in">
            <div 
              className={`flex items-center p-4 rounded-xl shadow-lg border ${
                toast.type === 'success' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <p 
                className={`mx-3 text-sm font-medium ${
                  toast.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {toast.message}
              </p>
              <button
                onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                className={`p-1 rounded-full ${
                  toast.type === 'success' 
                    ? 'text-green-600 hover:bg-green-100' 
                    : 'text-red-600 hover:bg-red-100'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <div className="text-sm text-gray-500">
              {filteredUsers.length} of {users.length} users
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No users found</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {searchTerm ? `No results for "${searchTerm}"` : 'Try adjusting your filters'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((userData) => (
                    <tr key={userData.uid} className="group hover:bg-gray-50 cursor-pointer" onClick={() => handleUserProfileClick(userData)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 text-gray-400 mr-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden">
                            {userData.profileImage ? (
                              <img 
                                src={userData.profileImage} 
                                alt={userData.name || 'User'} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMTQwIiByeD0iNDAiIHJ5PSIyMCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                {userData.name?.charAt(0) || userData.email?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userData.name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {formatDate(userData.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {userData.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeClass(userData.role)}`}>
                          {getRoleIcon(userData.role)}
                          <span className="ml-1 capitalize">{userData.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="relative flex-1">
                            <select
                              value={userData.role}
                              onChange={(e) => handleRoleChange(userData.uid, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              disabled={updatingUser === userData.uid || userData.uid === user?.uid}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                              <option value="speaker">Speaker</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            
                            {updatingUser === userData.uid && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            
                            {userData.uid === user?.uid && (
                              <div className="mt-1 text-xs text-gray-500">
                                Cannot change your own role
                              </div>
                            )}
                          </div>
                          
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(userData);
                            }}
                            disabled={userData.uid === user?.uid || deletingUser === userData.uid}
                            className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={userData.uid === user?.uid ? "You cannot delete your own account" : "Delete user"}
                          >
                            {deletingUser === userData.uid ? (
                              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Information Box */}
        <div className="mt-8 bg-gray-50 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">👥 User Role Information:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• <strong>Member:</strong> Regular users who can register for events and access their dashboard</li>
            <li>• <strong>Speaker:</strong> Users who can upload presentation materials and access the speaker dashboard</li>
            <li>• <strong>Admin:</strong> Full access to all admin features including user management</li>
            <li>• <strong>Note:</strong> Changing a user's role takes effect immediately</li>
            <li>• <strong>Security:</strong> Admins cannot change their own role or delete their own account</li>
            <li>• <strong>Deletion:</strong> Deleting a user removes them from both Firebase Authentication and Firestore</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Delete User?
              </h3>
              
              <p className="text-gray-600 mb-2">
                Are you sure you want to permanently delete:
              </p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="font-semibold text-gray-900">
                  {deleteConfirmation.name}
                </p>
                <p className="text-gray-600 text-sm">
                  {deleteConfirmation.email}
                </p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ This action cannot be undone!
                </p>
                <p className="text-red-700 text-sm mt-1">
                  This will permanently delete the user from both Firebase Authentication and Firestore.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingUser === deleteConfirmation.uid}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {deletingUser === deleteConfirmation.uid ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      <span>Delete User</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-16 w-16 rounded-full overflow-hidden">
                  {selectedUser.profileImage ? (
                    <img 
                      src={selectedUser.profileImage} 
                      alt={selectedUser.name || 'User'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMTQwIiByeD0iNDAiIHJ5PSIyMCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                      {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedUser.name || 'No Name'}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(selectedUser.role)}`}>
                      {getRoleIcon(selectedUser.role)}
                      <span className="ml-1 capitalize">{selectedUser.role}</span>
                    </span>
                    {selectedUser.status && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedUser.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedUser.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseProfileModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium text-gray-900">{selectedUser.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="font-medium text-gray-900">{selectedUser.phone || 'Not provided'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Company</div>
                      <div className="font-medium text-gray-900">{selectedUser.company || 'Not provided'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Position</div>
                      <div className="font-medium text-gray-900">{formatPosition(selectedUser.position || '') || 'Not provided'}</div>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-start space-x-3">
                    <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Job Description</div>
                      <div className="font-medium text-gray-900">{selectedUser.work || 'Not provided'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              {selectedUser.linkedinUsername && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h4>
                  <div className="flex items-center space-x-3">
                    <Linkedin className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">LinkedIn</div>
                      <a 
                        href={`https://linkedin.com/in/${selectedUser.linkedinUsername.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-700 underline"
                      >
                        linkedin.com/in/{selectedUser.linkedinUsername.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Member Since</div>
                      <div className="font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">User ID</div>
                      <div className="font-medium text-gray-900 font-mono text-sm">{selectedUser.uid}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleCloseProfileModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

export default UserManagement;