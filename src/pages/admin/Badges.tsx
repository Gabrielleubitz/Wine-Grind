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
  Printer
} from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import AdminHeader from '../../components/admin/AdminHeader';
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

      // Load confirmed attendees
      const registrationsQuery = query(
        collection(db, 'registrations'),
        where('eventId', '==', eventId),
        where('status', '==', 'confirmed')
      );

      const registrationsSnapshot = await getDocs(registrationsQuery);
      const attendeesData: AttendeeData[] = [];

      registrationsSnapshot.forEach(doc => {
        const registration = doc.data();
        attendeesData.push({
          id: doc.id,
          name: registration.name || 'Guest',
          email: registration.email || '',
          work: registration.work || '',
          linkedinUsername: registration.linkedinUsername || '',
          phone: registration.phone || '',
          status: registration.status || 'confirmed',
          userId: registration.userId || ''
        });
      });

      setAttendees(attendeesData);
      console.log(`✅ Loaded event "${event.name}" with ${attendeesData.length} confirmed attendees`);

    } catch (err: any) {
      console.error('❌ Error loading event data:', err);
      setError(err.message || 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBadges = async () => {
    if (!eventId || attendees.length === 0) return;

    setGenerating(true);
    
    try {
      console.log(`🎫 Generating badges for event: ${eventId}`);
      
      // Call the badges API
      const response = await fetch(`/api/events/${eventId}/badges.pdf`, {
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
                      <span className="font-medium">{Math.ceil(attendees.length / 4)} Pages (4 badges per page)</span>
                    </div>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-700">{event.description}</p>
                </div>
              )}

              {/* Badge Generation Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Badge Generation</h3>
                    <p className="text-gray-600">
                      Generate professional lanyard badges for all confirmed attendees. 
                      Each badge includes name, company, LinkedIn, and QR code.
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {attendees.length > 0 ? (
                      <button
                        onClick={handleGenerateBadges}
                        disabled={generating}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-full hover:shadow-lg transition-all duration-300 font-semibold text-lg flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generating ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating...</span>
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