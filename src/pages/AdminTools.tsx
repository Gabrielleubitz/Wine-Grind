import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { EventService } from '../services/eventService';
import { useAdminScanner } from '../hooks/useAdminScanner';
import { Calendar, Users, ChevronDown, MessageSquare, Megaphone, Mic, UserCog, UserPlus, Zap, FileText } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

import AdminHeader from '../components/admin/AdminHeader';
import StatsCards from '../components/admin/StatsCards';
import QRScanner from '../components/admin/QRScanner';
import ManualSearch from '../components/admin/ManualSearch';
import RegistrationDetails from '../components/admin/RegistrationDetails';
import UserListModal from '../components/admin/UserListModal';

const AdminTools: React.FC = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    registered: 0,
    attended: 0
  });
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loadingPendingCount, setLoadingPendingCount] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUsers, setModalUsers] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');

  const {
    scanResult,
    scannedRegistration,
    scanning,
    error,
    success,
    autoCheckInEnabled,
    handleScanSuccess,
    handleManualSearch,
    handleManualCheckIn,
    clearScanResult,
    toggleAutoCheckIn,
    setEventForScanning
  } = useAdminScanner(user?.uid);

  // Load events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await EventService.getAllEvents();
        setEvents(eventsData);
        
        // Auto-select the first active event if none selected
        if (!selectedEventId && eventsData.length > 0) {
          const activeEvent = eventsData.find(e => e.status === 'active') || eventsData[0];
          setSelectedEventId(activeEvent.id);
        }
      } catch (error) {
        console.error('❌ Error loading events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    if (isAdmin) {
      loadEvents();
      loadPendingCount();
    }
  }, [isAdmin, selectedEventId]);

  // Load stats and registrations for selected event
  useEffect(() => {
    const loadEventData = async () => {
      if (selectedEventId && isAdmin) {
        setLoadingStats(true);
        try {
          console.log('📊 Loading data for event:', selectedEventId);
          
          // Get all registrations for the event
          const eventRegistrations = await EventService.getEventRegistrations(selectedEventId);
          setRegistrations(eventRegistrations);
          
          const total = eventRegistrations.length;
          const checkedIn = eventRegistrations.filter(reg => reg.checkedIn === true).length;
          const awaitingCheckIn = total - checkedIn;
          
          setStats({
            total: total,
            registered: awaitingCheckIn,
            attended: checkedIn
          });
          
          console.log('✅ Data loaded:', { total, awaitingCheckIn, checkedIn });
        } catch (error) {
          console.error('❌ Error loading event data:', error);
          setStats({ total: 0, registered: 0, attended: 0 });
          setRegistrations([]);
        } finally {
          setLoadingStats(false);
        }
      }
    };

    loadEventData();
  }, [selectedEventId, isAdmin]);

  // Load pending registrations count
  const loadPendingCount = async () => {
    try {
      setLoadingPendingCount(true);
      
      // Get count of users with pending status
      const pendingUsers = await getPendingUsersCount();
      setPendingCount(pendingUsers);
      
    } catch (error) {
      console.error('❌ Error loading pending count:', error);
      setPendingCount(0);
    } finally {
      setLoadingPendingCount(false);
    }
  };

  // Get count of pending users
  const getPendingUsersCount = async (): Promise<number> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      
      return snapshot.size;
    } catch (error) {
      console.error('❌ Error getting pending users count:', error);
      return 0;
    }
  };

  // Update stats when check-in occurs
  useEffect(() => {
    if (success && success.includes('checked in successfully')) {
      setStats(prev => ({
        ...prev,
        registered: prev.registered - 1,
        attended: prev.attended + 1
      }));
      
      // Reload registrations to get updated data
      if (selectedEventId) {
        EventService.getEventRegistrations(selectedEventId).then(setRegistrations);
      }
    }
  }, [success, selectedEventId]);

  // Handle event selection
  const handleEventSelect = (eventId: string) => {
    console.log('📅 Event selected:', eventId);
    setSelectedEventId(eventId);
    setEventForScanning(eventId);
  };

  // Handle stat card clicks
  const handleStatClick = (type: 'total' | 'registered' | 'attended') => {
    let filteredUsers: any[] = [];
    let title = '';

    switch (type) {
      case 'total':
        filteredUsers = registrations;
        title = 'All Registered Users';
        break;
      case 'registered':
        filteredUsers = registrations.filter(reg => !reg.checkedIn);
        title = 'Users Awaiting Check-in';
        break;
      case 'attended':
        filteredUsers = registrations.filter(reg => reg.checkedIn === true);
        title = 'Checked In Users';
        break;
    }

    setModalUsers(filteredUsers);
    setModalTitle(title);
    setModalOpen(true);
  };

  // Handle user update from modal (when manually checked in)
  const handleUserUpdate = (userId: string, updatedUser: any) => {
    // Update the registrations state
    setRegistrations(prev => 
      prev.map(reg => 
        reg.userId === userId ? updatedUser : reg
      )
    );

    // Update stats
    setStats(prev => ({
      ...prev,
      registered: prev.registered - 1,
      attended: prev.attended + 1
    }));

    // Update modal users if modal is open
    setModalUsers(prev => 
      prev.map(user => 
        user.userId === userId ? updatedUser : user
      )
    );
  };

  // Handle Excel export
  const handleExportExcel = () => {
    if (!selectedEventId || registrations.length === 0) {
      alert('No data to export');
      return;
    }

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const eventName = selectedEvent?.name || 'Event';

    // Prepare data for export
    const exportData = registrations.map(reg => ({
      Name: reg.name,
      Email: reg.email,
      Phone: reg.phone || '',
      Work: reg.work || '',
      'Check-In Status': reg.checkedIn ? 'Checked In' : 'Awaiting Check-in',
      'Registered At': formatDateForExport(reg.registeredAt),
      'Checked In At': reg.checkedInAt ? formatDateForExport(reg.checkedInAt) : ''
    }));

    // Convert to CSV format
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row] || '';
          // Escape commas and quotes in CSV
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_registrations.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date for export
  const formatDateForExport = (timestamp: any) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date for display
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Show loading while checking admin status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // This should be handled by ProtectedRoute, but keeping as fallback
  if (!isAdmin) {
    console.log('❌ Access denied - user is not admin');
    return <Navigate to="/unauthorized" replace />;
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <AdminHeader 
        title="Admin Dashboard" 
        subtitle={`Welcome, ${user?.displayName || user?.email}! Manage events, registrations, and check-ins.`}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Admin <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-lg text-gray-600">
            Select an event below to view registration statistics and manage check-ins
          </p>
        </div>

        {/* Quick Actions - Updated to include System Test */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Link
            to="/admin/events"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Event Management</h3>
                <p className="text-gray-600 text-sm">Create and manage events</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/sms"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">SMS Panel</h3>
                <p className="text-gray-600 text-sm">Send messages to registrants</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/announcements"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Megaphone className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Announcements</h3>
                <p className="text-gray-600 text-sm">Publish updates to members</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <UserCog className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                <p className="text-gray-600 text-sm">Manage user roles</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Additional Admin Tools */}
        <div className="grid md:grid-cols-5 gap-6 mb-12">
          <Link
            to="/admin/events/create"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Event</h3>
                <p className="text-gray-600 text-sm">Add a new Wine & Grind event</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/speakers"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Mic className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Speaker Management</h3>
                <p className="text-gray-600 text-sm">Manage speakers and their files</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/pending-registrations"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift relative"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <UserPlus className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pending Registrations</h3>
                <p className="text-gray-600 text-sm">Approve new user signups</p>
              </div>
            </div>
            
            {/* Pending Count Badge */}
            {!loadingPendingCount && pendingCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {pendingCount}
              </div>
            )}
          </Link>
          
          <Link
            to="/admin/system-test"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Zap className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Test</h3>
                <p className="text-gray-600 text-sm">Test APIs and integrations</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/badges"
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 hover-lift"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Badge Generator</h3>
                <p className="text-gray-600 text-sm">Generate lanyard badges PDF</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Event Selection Dropdown */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Event Selection</h2>
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          
          {loadingEvents ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No events found</p>
              <Link
                to="/admin/events/create"
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold inline-flex items-center space-x-2"
              >
                <span>Create First Event</span>
              </Link>
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
                  onChange={(e) => handleEventSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none bg-white pr-10"
                >
                  <option value="">Select an event...</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {event.location} - {formatEventDate(event.date)} ({event.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              
              {selectedEvent && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-semibold text-purple-900">{selectedEvent.name}</div>
                      <div className="text-sm text-purple-700">
                        {selectedEvent.location} • {formatEventDate(selectedEvent.date)} • Status: {selectedEvent.status}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Registration Stats - Only show if event is selected */}
        {selectedEventId ? (
          <div className="mb-8">
            {loadingStats ? (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading registration statistics...</p>
                </div>
              </div>
            ) : (
              <StatsCards 
                stats={stats} 
                onStatClick={handleStatClick}
                onExportClick={handleExportExcel}
                selectedEventName={selectedEvent?.name}
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mb-8">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Event</h3>
              <p className="text-gray-600">Choose an event from the dropdown above to view registration statistics and manage check-ins.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <QRScanner
            onScanSuccess={handleScanSuccess}
            scanResult={scanResult}
            onClearResult={clearScanResult}
            autoCheckInEnabled={autoCheckInEnabled}
            onToggleAutoCheckIn={toggleAutoCheckIn}
            scanning={scanning}
            selectedEventId={selectedEventId}
            onEventSelect={handleEventSelect}
          />

          <ManualSearch
            onSearch={handleManualSearch}
            searching={false}
          />
        </div>

        {/* Registration Details */}
        {(scannedRegistration && !scanResult) && (
          <RegistrationDetails
            registration={scannedRegistration}
            onCheckIn={handleManualCheckIn}
            error={error}
            success={success}
          />
        )}
      </div>

      {/* User List Modal */}
      <UserListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        users={modalUsers}
        title={modalTitle}
        eventName={selectedEvent?.name || 'Event'}
        eventId={selectedEventId}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
};

export default AdminTools;