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
  User,
  Mail,
  Phone,
  FileText,
  Image,
  Presentation,
  File,
  Filter,
  Calendar,
  Download,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { SpeakerService, SpeakerFile, EventSpeaker } from '../../services/speakerService';
import { EventService, EventData } from '../../services/eventService';
import { useAuth } from '../../hooks/useAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Toast from '../../components/ui/Toast';
import SpeakerAssignModal from '../../components/admin/SpeakerAssignModal';

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
  phone?: string;
  work?: string;
  roleType?: 'speaker' | 'admin';
}

const SpeakerManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
  const [speakerFiles, setSpeakerFiles] = useState<SpeakerFile[]>([]);
  const [eventSpeakers, setEventSpeakers] = useState<EventSpeaker[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [speakersLoading, setSpeakersLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success'
  });
  
  // Admin note state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  
  // Speaker assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningUser, setAssigningUser] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedAssignEventId, setSelectedAssignEventId] = useState<string>('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventSpeakers();
      loadSpeakerFiles();
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedSpeakerId) {
      filterFilesBySpeaker();
    } else {
      // If no speaker is selected, show all files for the event
      loadSpeakerFiles();
    }
  }, [selectedSpeakerId]);

  const loadEvents = async () => {
    try {
      const eventsData = await EventService.getAllEvents();
      setEvents(eventsData);
      
      // Auto-select the first event if none selected
      if (!selectedEventId && eventsData.length > 0) {
        setSelectedEventId(eventsData[0].id);
      }
    } catch (error) {
      console.error('❌ Error loading events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadEventSpeakers = async () => {
    if (!selectedEventId) return;
    
    try {
      setSpeakersLoading(true);
      const speakers = await SpeakerService.getEventSpeakers(selectedEventId);
      setEventSpeakers(speakers);
    } catch (error) {
      console.error('❌ Error loading event speakers:', error);
    } finally {
      setSpeakersLoading(false);
    }
  };

  const loadSpeakerFiles = async () => {
    if (!selectedEventId) return;
    
    try {
      setFilesLoading(true);
      const files = await SpeakerService.getEventFiles(selectedEventId);
      setSpeakerFiles(files);
    } catch (error) {
      console.error('❌ Error loading speaker files:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  const filterFilesBySpeaker = () => {
    if (!selectedSpeakerId) {
      loadSpeakerFiles();
      return;
    }
    
    setFilesLoading(true);
    
    // Filter the already loaded files by speaker ID
    const filteredFiles = speakerFiles.filter(file => file.uploadedBy === selectedSpeakerId);
    setSpeakerFiles(filteredFiles);
    
    setFilesLoading(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (!term.trim()) {
      loadSpeakerFiles();
      return;
    }
    
    // Filter files by filename or description
    const filtered = speakerFiles.filter(file => 
      file.originalName.toLowerCase().includes(term.toLowerCase()) ||
      file.description.toLowerCase().includes(term.toLowerCase())
    );
    
    setSpeakerFiles(filtered);
  };

  const handleAddNote = (fileId: string) => {
    setSelectedFileId(fileId);
    
    // Find existing note if any
    const file = speakerFiles.find(f => f.id === fileId);
    if (file && file.adminNote) {
      setAdminNote(file.adminNote);
    } else {
      setAdminNote('');
    }
    
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!selectedFileId || !user?.uid) return;
    
    setSubmittingNote(true);
    
    try {
      await SpeakerService.addAdminNote(selectedFileId, adminNote, user.uid);
      
      // Update local state
      setSpeakerFiles(prev => prev.map(file => 
        file.id === selectedFileId 
          ? { ...file, adminNote, adminNoteBy: user.uid, adminNoteAt: new Date() }
          : file
      ));
      
      showToast('Note added successfully!', 'success');
      setShowNoteModal(false);
      setSelectedFileId(null);
      setAdminNote('');
    } catch (error: any) {
      console.error('❌ Error adding note:', error);
      showToast(error.message || 'Failed to add note', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      await SpeakerService.deleteFile(fileId);
      
      // Update local state
      setSpeakerFiles(prev => prev.filter(file => file.id !== fileId));
      
      showToast('File deleted successfully!', 'success');
    } catch (error: any) {
      console.error('❌ Error deleting file:', error);
      showToast(error.message || 'Failed to delete file', 'error');
    }
  };

  // Enhanced function to debug user roles
  const debugUserRoles = async () => {
    try {
      console.log('🐛 === USER ROLES DEBUG ===');
      
      // Get ALL users to see what's in the database
      const usersRef = collection(db, 'users');
      const allUsersSnapshot = await getDocs(usersRef);
      
      console.log('📊 Total users in database:', allUsersSnapshot.size);
      
      const roleStats = {
        speaker: 0,
        admin: 0,
        member: 0,
        undefined: 0,
        other: 0
      };
      
      allUsersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        const role = userData.role;
        
        console.log(`👤 User: ${userData.displayName || userData.name || userData.email}`, {
          uid: doc.id,
          role: role,
          email: userData.email
        });
        
        if (role === 'speaker') roleStats.speaker++;
        else if (role === 'admin') roleStats.admin++;
        else if (role === 'member') roleStats.member++;
        else if (!role) roleStats.undefined++;
        else roleStats.other++;
      });
      
      console.log('📈 Role Statistics:', roleStats);
      console.log('🐛 === END USER ROLES DEBUG ===');
      
      return roleStats;
    } catch (error) {
      console.error('❌ Debug error:', error);
      return { speaker: 0, admin: 0, member: 0, undefined: 0, other: 0 };
    }
  };

  // Enhanced function that filters by speaker/admin roles
  const handleOpenAssignModal = async () => {
    if (!selectedEventId) {
      setError('Please select an event first');
      return;
    }
    
    setSelectedAssignEventId(selectedEventId);
    
    try {
      setUsersLoading(true);
      console.log('🔍 Loading users with speaker roles...');
      
      // Fetch users from Firestore with speaker or admin roles
      const usersRef = collection(db, 'users');
      
      // Query for users with 'speaker' role
      const speakerQuery = query(
        usersRef, 
        where('role', '==', 'speaker')
      );
      
      // Query for users with 'admin' role (admins can also be speakers)
      const adminQuery = query(
        usersRef, 
        where('role', '==', 'admin')
      );
      
      // Execute both queries
      const [speakerSnapshot, adminSnapshot] = await Promise.all([
        getDocs(speakerQuery),
        getDocs(adminQuery)
      ]);
      
      console.log('👥 Found speakers:', speakerSnapshot.size);
      console.log('👑 Found admins:', adminSnapshot.size);
      
      // Combine results and remove duplicates
      const allSpeakerUsers = new Map();
      
      // Add speakers
      speakerSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        allSpeakerUsers.set(doc.id, {
          uid: doc.id,
          ...userData,
          displayName: userData.displayName || userData.name || 'Unknown User',
          roleType: 'speaker'
        });
      });
      
      // Add admins
      adminSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        allSpeakerUsers.set(doc.id, {
          uid: doc.id,
          ...userData,
          displayName: userData.displayName || userData.name || 'Unknown User',
          roleType: 'admin'
        });
      });
      
      const users = Array.from(allSpeakerUsers.values()) as UserData[];
      
      console.log('🎯 Total speaker-eligible users:', users.length);
      console.log('📋 Users found:', users);
      
      if (users.length === 0) {
        console.log('⚠️ No users with speaker or admin roles found');
        setError('No users with speaker privileges found. Please ensure users have the "speaker" or "admin" role assigned.');
      }
      
      setAllUsers(users);
      setFilteredUsers(users);
      setShowAssignModal(true);
      
    } catch (error) {
      console.error('❌ Error loading speaker users:', error);
      setError('Failed to load users with speaker roles. Check console for details.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setUserSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredUsers(allUsers);
      return;
    }
    
    // Filter users by name or email
    const filtered = allUsers.filter(user => 
      (user.displayName?.toLowerCase().includes(term.toLowerCase()) || false) ||
      (user.email?.toLowerCase().includes(term.toLowerCase()) || false)
    );
    
    setFilteredUsers(filtered);
  };

  const handleAssignSpeaker = async (userId: string, userName: string, userEmail: string) => {
    if (!selectedAssignEventId || !user?.uid) return;
    
    // Check if user is already assigned
    const isAlreadyAssigned = eventSpeakers.some(speaker => speaker.userId === userId);
    if (isAlreadyAssigned) {
      showToast('This user is already assigned as a speaker for this event', 'error');
      return;
    }
    
    setAssigningUser(true);
    
    try {
      // Get event details for the assignment
      const eventData = events.find(e => e.id === selectedAssignEventId);
      if (!eventData) {
        throw new Error('Event not found');
      }
      
      await SpeakerService.assignSpeakerToEvent(
        selectedAssignEventId,
        userId,
        userName,
        userEmail,
        user.uid
      );
      
      // Reload speakers
      await loadEventSpeakers();
      
      showToast(`${userName} assigned as speaker for ${eventData.name}`, 'success');
      setShowAssignModal(false);
    } catch (error: any) {
      console.error('❌ Error assigning speaker:', error);
      showToast(error.message || 'Failed to assign speaker', 'error');
    } finally {
      setAssigningUser(false);
    }
  };

  const handleRemoveSpeaker = async (userId: string) => {
    if (!selectedEventId) return;
    
    if (!confirm('Are you sure you want to remove this speaker from the event?')) {
      return;
    }
    
    try {
      await SpeakerService.removeSpeakerFromEvent(selectedEventId, userId);
      
      // Reload speakers
      await loadEventSpeakers();
      
      // Reset selected speaker if it was removed
      if (selectedSpeakerId === userId) {
        setSelectedSpeakerId('');
      }
      
      showToast('Speaker removed successfully!', 'success');
    } catch (error: any) {
      console.error('❌ Error removing speaker:', error);
      showToast(error.message || 'Failed to remove speaker', 'error');
    }
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({
      visible: true,
      message,
      type
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <AdminHeader title="Speaker Management" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading speaker management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <AdminHeader 
        title="Speaker Management" 
        subtitle="Manage speakers and their uploaded files"
      />

      {/* Toast Notification */}
      {toast.visible && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, visible: false }))}
        />
      )}

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

        {/* Debug Button (remove in production) */}
        <div className="mb-4">
          <button
            onClick={async () => {
              const stats = await debugUserRoles();
              alert(`Role Statistics:\nSpeakers: ${stats?.speaker || 0}\nAdmins: ${stats?.admin || 0}\nMembers: ${stats?.member || 0}\nNo Role: ${stats?.undefined || 0}\n\nCheck console for detailed user list.`);
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
          >
            🐛 Debug All User Roles (Check Console)
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

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-600 text-sm">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 hover:text-green-700 ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Event Selection */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Event Selection</h2>
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No events found</p>
              <button
                onClick={() => navigate('/admin/events/create')}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold inline-flex items-center space-x-2"
              >
                <span>Create First Event</span>
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-3">
                Select Event to Manage:
              </label>
              <div className="relative">
                <select
                  id="event-select"
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setSelectedSpeakerId('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none bg-white pr-10"
                >
                  <option value="">Select an event...</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString()} ({event.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              
              {selectedEventId && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-semibold text-purple-900">
                        {events.find(e => e.id === selectedEventId)?.name}
                      </div>
                      <div className="text-sm text-purple-700">
                        {new Date(events.find(e => e.id === selectedEventId)?.date || '').toLocaleDateString()} • 
                        {events.find(e => e.id === selectedEventId)?.location}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedEventId && (
          <>
            {/* Speakers Section */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Event Speakers</h2>
                <button
                  onClick={handleOpenAssignModal}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-300 font-medium flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Assign Speaker</span>
                </button>
              </div>
              
              {speakersLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading speakers...</p>
                </div>
              ) : eventSpeakers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-2xl">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No speakers assigned to this event</p>
                  <p className="text-gray-500 text-sm">Assign speakers using the button above.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eventSpeakers.map((speaker) => (
                    <div 
                      key={speaker.userId}
                      className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                        selectedSpeakerId === speaker.userId 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {speaker.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{speaker.name}</h4>
                            <p className="text-sm text-gray-600">{speaker.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Assigned {formatDate(speaker.assignedAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => setSelectedSpeakerId(selectedSpeakerId === speaker.userId ? '' : speaker.userId)}
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              selectedSpeakerId === speaker.userId
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {selectedSpeakerId === speaker.userId ? 'Selected' : 'View Files'}
                          </button>
                          
                          <button
                            onClick={() => handleRemoveSpeaker(speaker.userId)}
                            className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Speaker Files Section */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedSpeakerId 
                    ? `Files from ${eventSpeakers.find(s => s.userId === selectedSpeakerId)?.name || 'Speaker'}`
                    : 'All Speaker Files'}
                </h2>
                
                <div className="flex items-center space-x-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-64 pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  
                  {/* Filter Dropdown */}
                  {eventSpeakers.length > 0 && !selectedSpeakerId && (
                    <div className="relative">
                      <select
                        value={selectedSpeakerId}
                        onChange={(e) => setSelectedSpeakerId(e.target.value)}
                        className="pl-9 pr-10 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                      >
                        <option value="">All Speakers</option>
                        {eventSpeakers.map(speaker => (
                          <option key={speaker.userId} value={speaker.userId}>
                            {speaker.name}
                          </option>
                        ))}
                      </select>
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                  
                  {/* Clear Filter Button */}
                  {selectedSpeakerId && (
                    <button
                      onClick={() => setSelectedSpeakerId('')}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
              
              {filesLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading files...</p>
                </div>
              ) : speakerFiles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No files found</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {selectedSpeakerId 
                      ? `This speaker hasn't uploaded any files yet.`
                      : searchTerm 
                        ? `No files match your search for "${searchTerm}".`
                        : `No files have been uploaded for this event yet.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {speakerFiles.map((file) => {
                    const speakerName = eventSpeakers.find(s => s.userId === file.uploadedBy)?.name || 'Unknown Speaker';
                    let fileIcon;
                    
                    if (file.fileType.includes('pdf')) {
                      fileIcon = <FileText className="h-6 w-6 text-red-600" />;
                    } else if (file.fileType.includes('image')) {
                      fileIcon = <Image className="h-6 w-6 text-blue-600" />;
                    } else if (file.fileType.includes('presentation') || file.fileType.includes('powerpoint')) {
                      fileIcon = <Presentation className="h-6 w-6 text-orange-600" />;
                    } else {
                      fileIcon = <File className="h-6 w-6 text-gray-600" />;
                    }
                    
                    return (
                      <div 
                        key={file.id}
                        className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-4 mt-1">
                            {fileIcon}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{file.originalName}</h4>
                                <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                                  title="Download file"
                                >
                                  <Download className="h-5 w-5" />
                                </a>
                                <button
                                  onClick={() => handleAddNote(file.id)}
                                  className="text-purple-600 hover:text-purple-700 p-2 rounded-lg hover:bg-purple-50 transition-colors duration-200"
                                  title="Add admin note"
                                >
                                  <MessageSquare className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                                  title="Delete file"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center mt-3 text-xs text-gray-500 space-x-3">
                              <span className="font-medium text-purple-600">Speaker: {speakerName}</span>
                              <span>•</span>
                              <span>{SpeakerService.formatFileSize(file.fileSize)}</span>
                              <span>•</span>
                              <span>Uploaded: {formatDate(file.uploadedAt)}</span>
                            </div>
                            
                            {/* Admin Note (if any) */}
                            {file.adminNote && (
                              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="text-xs font-medium text-purple-800 mb-1">Admin Note:</p>
                                <p className="text-sm text-purple-700">{file.adminNote}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Admin Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Add Admin Note
            </h3>
            
            <p className="text-gray-600 mb-4">
              This note will be visible to the speaker who uploaded the file.
            </p>
            
            <div className="mb-4">
              <label htmlFor="admin-note" className="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
              <textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                placeholder="Add feedback or instructions for the speaker..."
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setSelectedFileId(null);
                  setAdminNote('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={submittingNote}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingNote ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Note'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speaker Assignment Modal */}
      <SpeakerAssignModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        users={filteredUsers}
        loading={usersLoading}
        searchTerm={userSearchTerm}
        onSearchChange={handleUserSearch}
        onAssignSpeaker={handleAssignSpeaker}
        assigningUser={assigningUser}
        eventSpeakers={eventSpeakers}
        selectedEventName={events.find(e => e.id === selectedEventId)?.name}
      />
    </div>
  );
};

export default SpeakerManagement;