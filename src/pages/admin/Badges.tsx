import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Users, 
  Calendar, 
  MapPin, 
  AlertCircle,
  CheckCircle,
  FileText,
  Printer,
  Eye
} from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import BadgePreview from '../../components/admin/BadgePreview';
import Toast from '../../components/ui/Toast';

interface EventData {
  id: string;
  name: string;
  title?: string;
  date: Date;
  location: string;
  description: string;
}

interface AttendeeData {
  id: string;
  name: string;
  email: string;
  work: string;
  linkedinUsername: string;
  phone: string;
  status: string;
  userId: string;
  role?: string; // Event registration role
  ticket_type?: string;
  tags?: string[];
  badgeRole?: string; // Manually assigned role for badge display only
  userRole?: string; // Actual user profile role (member, admin, speaker)
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

const AdminBadges: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [event, setEvent] = useState<EventData | null>(null);
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState(25); // 25% default
  const [headerColor, setHeaderColor] = useState('#7A1E1E'); // Wine color default
  const [roleFilter, setRoleFilter] = useState<string>('all'); // 'all', 'admin', 'speaker', 'member'
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }

    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event details
      const eventDoc = await getDoc(doc(db, 'events', eventId!));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      const event: EventData = {
        id: eventDoc.id,
        name: eventData.name || eventData.title || 'Wine & Grind Event',
        title: eventData.title,
        date: eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date),
        location: eventData.location || 'TBD',
        description: eventData.description || ''
      };
      setEvent(event);

      // Load attendees using subcollection pattern from EventService analysis
      console.log(`🔍 Loading attendees for event: ${eventId}`);
      console.log(`🔍 Getting registrations from: events/${eventId}/registrations`);
      
      const registrationsQuery = query(collection(db, 'events', eventId, 'registrations'));
      const registrationsSnapshot = await getDocs(registrationsQuery);
      console.log(`📊 Found ${registrationsSnapshot.size} registrations`);
      
      // Log sample registration data
      if (registrationsSnapshot.size > 0) {
        const firstDoc = registrationsSnapshot.docs[0];
        console.log(`📄 Sample registration:`, {
          id: firstDoc.id,
          data: firstDoc.data()
        });
      }

      const attendeesData: AttendeeData[] = [];
      
      // First, get all registrations
      const registrations = registrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      // Then fetch user profile roles for each attendee
      for (const regDoc of registrations) {
        const registration = regDoc.data;
        
        // Fetch user profile role from users collection
        let userRole = 'member'; // default
        try {
          const userDoc = await getDoc(doc(db, 'users', regDoc.id));
          if (userDoc.exists()) {
            userRole = userDoc.data().role || 'member';
          }
        } catch (error) {
          console.warn(`Could not fetch user role for ${regDoc.id}:`, error);
        }
        
        attendeesData.push({
          id: regDoc.id, // This is the userId in the subcollection structure
          name: registration.name || 'Guest',
          email: registration.email || '',
          work: registration.work || '',
          linkedinUsername: registration.linkedinUsername || '',
          phone: registration.phone || '',
          status: 'registered', // All registrations in subcollection are valid
          userId: regDoc.id, // userId is the document ID in subcollection
          role: registration.role || '', // Event registration role
          ticket_type: registration.ticket_type || '', // For role inference
          tags: registration.tags || [], // For role inference
          badgeRole: registration.badgeRole || '', // Badge-specific role assignment
          userRole: userRole // Actual user profile role (member, admin, speaker)
        });
      }

      setAttendees(attendeesData);
      console.log(`🎫 Final loaded attendees for "${event.name}": ${attendeesData.length}`);

    } catch (err: any) {
      console.error('❌ Error loading event data:', err);
      setError(err.message || 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBadges = async () => {
    if (!eventId || attendees.length === 0) return;

    // Validate required URLs
    if (!backgroundImageUrl.trim()) {
      showToast('Background image URL is required', 'error');
      return;
    }
    
    if (!logoUrl.trim()) {
      showToast('Logo URL is required', 'error');
      return;
    }

    setGenerating(true);
    
    try {
      console.log(`🎫 Generating badges for event: ${eventId}`);
      
      // Call the enhanced badges API with custom URLs and styling
      const params = new URLSearchParams({
        eventId,
        backgroundImageUrl: backgroundImageUrl.trim(),
        logoUrl: logoUrl.trim(),
        overlayOpacity: overlayOpacity.toString(),
        headerColor: headerColor
      });
      
      const response = await fetch(`/api/event-badges-enhanced?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `winegrind-badges-${eventId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(downloadUrl);
      
      showToast('Badges PDF generated and downloaded successfully!', 'success');
      console.log('✅ Badges PDF downloaded successfully');

    } catch (err: any) {
      console.error('❌ Error generating badges:', err);
      showToast(err.message || 'Failed to generate badges PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  const updateBadgeRole = async (attendeeId: string, newRole: string) => {
    if (!eventId) return;

    try {
      // Update the badge role in the database
      const attendeeRef = doc(db, 'events', eventId, 'registrations', attendeeId);
      await updateDoc(attendeeRef, {
        badgeRole: newRole
      });

      // Update local state
      setAttendees(prev => prev.map(attendee => 
        attendee.id === attendeeId 
          ? { ...attendee, badgeRole: newRole }
          : attendee
      ));

      showToast(`Badge role updated to ${newRole}`, 'success');
    } catch (error) {
      console.error('Error updating badge role:', error);
      showToast('Failed to update badge role', 'error');
    }
  };

  const getFilteredAttendees = () => {
    if (roleFilter === 'all') return attendees;
    
    return attendees.filter(attendee => {
      // Use actual user profile role from users collection
      const userProfileRole = attendee.userRole || 'member';
      
      switch (roleFilter) {
        case 'admin':
          return userProfileRole.toLowerCase() === 'admin';
        case 'speaker':
          return userProfileRole.toLowerCase() === 'speaker';
        case 'member':
          return userProfileRole.toLowerCase() === 'member';
        default:
          return true;
      }
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <AdminHeader title="Generate Event Badges" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading event data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <AdminHeader title="Generate Event Badges" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/badges')}
              className="mt-4 text-red-600 hover:text-red-800 font-medium"
            >
              ← Back to Badge Manager
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <AdminHeader 
        title="Generate Event Badges" 
        subtitle="Create printable lanyard badges for event attendees"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Toast Notification */}
        {toast.visible && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(prev => ({ ...prev, visible: false }))}
          />
        )}

        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/badges')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Badge Manager</span>
          </button>
        </div>

        {event && (
          <>
            {/* Event Information Card */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">{event.name}</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 text-gray-600">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">{formatDate(event.date)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-gray-600">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">{event.location}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-gray-600">
                      <Users className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">{attendees.length} Confirmed Attendees</span>
                    </div>

                    <div className="flex items-center space-x-3 text-gray-600">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">{attendees.length} Pages (1 badge per page)</span>
                    </div>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-700">{event.description}</p>
                </div>
              )}

              {/* Badge Configuration */}
              <div className="border-t border-gray-200 pt-6 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Badge Configuration</h3>
                  <p className="text-gray-600 mb-6">
                    Configure badge assets and generate professional lanyard badges for all confirmed attendees.
                  </p>
                  
                  {/* URL Configuration Fields */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="backgroundUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                        Background Image URL *
                      </label>
                      <input
                        type="url"
                        id="backgroundUrl"
                        placeholder="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200"
                        value={backgroundImageUrl}
                        onChange={(e) => setBackgroundImageUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Event background image (JPEG/PNG, will appear at 15% opacity)
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="logoUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                        Logo URL *
                      </label>
                      <input
                        type="url"
                        id="logoUrl"
                        placeholder="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/react.svg"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Logo for badge header (SVG/PNG, will appear white on dark header)
                      </p>
                    </div>
                  </div>
                  
                  {/* Styling Controls */}
                  <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                    <div>
                      <label htmlFor="overlayOpacity" className="block text-sm font-semibold text-gray-700 mb-2">
                        Background Overlay Darkness
                      </label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          id="overlayOpacity"
                          min="0"
                          max="80"
                          step="5"
                          value={overlayOpacity}
                          onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Light (0%)</span>
                          <span className="font-medium">{overlayOpacity}%</span>
                          <span>Dark (80%)</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Controls dark overlay opacity over background image
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="headerColor" className="block text-sm font-semibold text-gray-700 mb-2">
                        Header Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          id="headerColor"
                          value={headerColor}
                          onChange={(e) => setHeaderColor(e.target.value)}
                          className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={headerColor}
                            onChange={(e) => setHeaderColor(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
                            placeholder="#7A1E1E"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Color for badge header band and role chip backgrounds
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Management Section */}
                {attendees.length > 0 && (
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Badge Role Management</h4>
                    <p className="text-gray-600 mb-4">
                      Assign roles for badge display only. This doesn't affect user login permissions.
                    </p>
                    
                    {/* Filter Buttons */}
                    <div className="flex items-center space-x-3 mb-6">
                      <span className="text-sm font-medium text-gray-700">Filter by:</span>
                      {[
                        { key: 'all', label: 'All', count: attendees.length },
                        { key: 'admin', label: 'Admins', count: attendees.filter(a => (a.userRole || 'member').toLowerCase() === 'admin').length },
                        { key: 'speaker', label: 'Speakers', count: attendees.filter(a => (a.userRole || 'member').toLowerCase() === 'speaker').length },
                        { key: 'member', label: 'Members', count: attendees.filter(a => (a.userRole || 'member').toLowerCase() === 'member').length }
                      ].map(({ key, label, count }) => (
                        <button
                          key={key}
                          onClick={() => setRoleFilter(key)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            roleFilter === key
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {label} ({count})
                        </button>
                      ))}
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4 max-h-64 overflow-y-auto">
                      {getFilteredAttendees().length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No attendees found for "{roleFilter}" filter</p>
                        </div>
                      ) : (
                        getFilteredAttendees().map((attendee) => {
                        const availableRoles = ['attendee', 'speaker', 'organizer', 'sponsor', 'vip', 'staff'];
                        return (
                          <div key={attendee.id} className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
                            <div>
                              <div className="font-medium text-gray-900">{attendee.name}</div>
                              <div className="text-sm text-gray-500">{attendee.work || attendee.email}</div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <select
                                value={attendee.badgeRole || 'attendee'}
                                onChange={(e) => updateBadgeRole(attendee.id, e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                              >
                                {availableRoles.map(role => (
                                  <option key={role} value={role}>
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                        })
                      )}
                    </div>
                  </div>
                )}
                
                {/* Badge Generation Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Generate Badges</h4>
                    <p className="text-gray-600">
                      Each badge includes name, company, LinkedIn, role chip, and QR code.
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {attendees.length > 0 ? (
                      <button
                        onClick={handleGenerateBadges}
                        disabled={generating || !backgroundImageUrl.trim() || !logoUrl.trim()}
                        className={`px-8 py-4 rounded-full hover:shadow-lg transition-all duration-300 font-semibold text-lg flex items-center space-x-3 disabled:cursor-not-allowed ${
                          !backgroundImageUrl.trim() || !logoUrl.trim() 
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white disabled:opacity-50'
                        }`}
                      >
                        {generating ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating...</span>
                          </>
                        ) : !backgroundImageUrl.trim() || !logoUrl.trim() ? (
                          <>
                            <AlertCircle className="h-6 w-6" />
                            <span>Configure URLs First</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-6 w-6" />
                            <span>Generate Badges PDF</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                        <p className="text-yellow-800 font-medium">No confirmed attendees</p>
                        <p className="text-yellow-600 text-sm">Cannot generate badges without attendees</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Badge Preview */}
            {attendees.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-3">
                  <Eye className="h-6 w-6 text-purple-600" />
                  <span>Badge Preview</span>
                </h3>
                
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                  <div>
                    <p className="text-gray-600 mb-4">
                      Preview of how badges will appear when printed. This shows the exact layout, 
                      colors, and proportions of the PDF output.
                    </p>
                    
                    <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: headerColor }}></div>
                        <span className="text-sm text-gray-600">Custom header color</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                        <span className="text-sm text-gray-600">QR Code (38×32mm)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: headerColor }}></div>
                        <span className="text-sm text-gray-600">Role chip (matches header)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 bg-gray-200 rounded relative overflow-hidden"
                        >
                          <div 
                            className="absolute inset-0 bg-black"
                            style={{ opacity: overlayOpacity / 100 }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">Background + {overlayOpacity}% overlay</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="relative">
                      {backgroundImageUrl && logoUrl ? (
                        <>
                          <BadgePreview 
                            attendee={attendees[0]} 
                            className="transform scale-90 origin-center"
                            backgroundImageUrl={backgroundImageUrl}
                            logoUrl={logoUrl}
                            overlayOpacity={overlayOpacity}
                            headerColor={headerColor}
                          />
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
                            Sample: {attendees[0].name}
                          </div>
                        </>
                      ) : (
                        <div className="w-80 h-96 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
                          <AlertCircle className="h-12 w-12 mb-2" />
                          <p className="text-sm font-medium">Badge Preview</p>
                          <p className="text-xs text-center px-4">
                            Configure background and logo URLs to see preview
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-green-800">
                      <p className="font-medium">Preview Matches PDF Output</p>
                      <p className="text-sm text-green-700">
                        This preview shows exactly how badges will appear in the generated PDF, 
                        including role colors, text sizing, and QR code positioning.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Badge Specifications */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-3">
                <Printer className="h-6 w-6 text-purple-600" />
                <span>Badge Specifications</span>
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Layout</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• <strong>Format:</strong> A4 (210 × 297 mm)</li>
                    <li>• <strong>Layout:</strong> 2 × 2 grid, 4 badges per page</li>
                    <li>• <strong>Badge size:</strong> 90 × 133.5 mm</li>
                    <li>• <strong>Margins:</strong> 10 mm all around</li>
                    <li>• <strong>Gutter:</strong> 10 mm between badges</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Content</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• <strong>Wine & Grind branding</strong> at top</li>
                    <li>• <strong>Name:</strong> Large, bold typography</li>
                    <li>• <strong>Company:</strong> From registration work field</li>
                    <li>• <strong>LinkedIn:</strong> If provided by attendee</li>
                    <li>• <strong>QR Code:</strong> Links to networking profile</li>
                    <li>• <strong>Crop marks:</strong> For precise cutting</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-blue-800">
                    <p className="font-medium">Ready for Professional Printing</p>
                    <p className="text-sm text-blue-700">
                      Badges are designed to fit standard lanyard sleeves and include crop marks for precise cutting.
                      Print on heavy cardstock (250gsm recommended) for best results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminBadges;