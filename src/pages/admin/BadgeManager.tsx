import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Download, 
  AlertCircle,
  CheckCircle,
  FileText,
  Search,
  Filter,
  Badge
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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
  status: 'upcoming' | 'ongoing' | 'completed';
  attendeeCount: number;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

const BadgeManager: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [generatingBadges, setGeneratingBadges] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Load all events
      const eventsQuery = query(
        collection(db, 'events'),
        orderBy('date', 'desc')
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData: EventData[] = [];

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        
        // Count attendees for this event - try different status values
        console.log(`🔍 Checking registrations for event: ${eventDoc.id} (${eventData.name})`);
        
        // First, try to get registrations from flat collection with eventId
        let allRegistrationsQuery = query(
          collection(db, 'registrations'),
          where('eventId', '==', eventDoc.id)
        );
        
        let allRegistrationsSnapshot = await getDocs(allRegistrationsQuery);
        console.log(`📊 Flat collection registrations for ${eventData.name}: ${allRegistrationsSnapshot.size}`);
        
        // If no results, try subcollection pattern: events/{eventId}/registrations
        if (allRegistrationsSnapshot.size === 0) {
          console.log(`🔍 Trying subcollection pattern: events/${eventDoc.id}/registrations`);
          allRegistrationsQuery = query(collection(db, 'events', eventDoc.id, 'registrations'));
          allRegistrationsSnapshot = await getDocs(allRegistrationsQuery);
          console.log(`📊 Subcollection registrations for ${eventData.name}: ${allRegistrationsSnapshot.size}`);
        }
        
        // If no registrations found, let's investigate alternative field names
        if (allRegistrationsSnapshot.size === 0) {
          console.log(`🔍 No registrations found with eventId: ${eventDoc.id}, checking for alternative field names...`);
          
          // Try alternative eventId field names
          const alternativeFields = ['eventid', 'event_id', 'event', 'eventSlug'];
          let foundAlternative = false;
          
          for (const fieldName of alternativeFields) {
            const altQuery = query(
              collection(db, 'registrations'),
              where(fieldName, '==', eventDoc.id)
            );
            
            const altSnapshot = await getDocs(altQuery);
            if (altSnapshot.size > 0) {
              console.log(`✅ Found ${altSnapshot.size} registrations using field '${fieldName}'`);
              foundAlternative = true;
              break;
            }
          }
          
          // If still no results, let's see what collections actually exist
          if (!foundAlternative) {
            console.log(`🔍 Checking what collections exist in the database...`);
            
            // Check common collection names for registrations
            const possibleCollections = ['registrations', 'registration', 'users', 'attendees', 'signups', 'event-registrations'];
            
            for (const collectionName of possibleCollections) {
              try {
                const testQuery = query(collection(db, collectionName));
                const testSnapshot = await getDocs(testQuery);
                
                if (testSnapshot.size > 0) {
                  console.log(`📋 Found collection '${collectionName}' with ${testSnapshot.size} documents`);
                  
                  // Show sample documents
                  let count = 0;
                  testSnapshot.forEach(doc => {
                    if (count < 3) {
                      console.log(`📄 Sample from ${collectionName} ${count + 1}:`, {
                        id: doc.id,
                        data: doc.data()
                      });
                      count++;
                    }
                  });
                } else {
                  console.log(`❌ Collection '${collectionName}' is empty`);
                }
              } catch (error) {
                console.log(`❌ Error accessing collection '${collectionName}':`, error.message);
              }
            }
            
            console.log(`🔍 Also checking for subcollections under first few events...`);
            try {
              const eventsQuery = query(collection(db, 'events'));
              const eventsSnapshot = await getDocs(eventsQuery);
              
              let eventCount = 0;
              for (const eventDoc of eventsSnapshot.docs) {
                if (eventCount < 3) {
                  console.log(`📅 Checking subcollections for event: ${eventDoc.id}`);
                  
                  // Try to get subcollections (this is limited in web SDK)
                  const possibleSubcollections = ['registrations', 'attendees', 'participants'];
                  for (const subName of possibleSubcollections) {
                    try {
                      const subQuery = query(collection(db, 'events', eventDoc.id, subName));
                      const subSnapshot = await getDocs(subQuery);
                      
                      if (subSnapshot.size > 0) {
                        console.log(`📋 Found subcollection 'events/${eventDoc.id}/${subName}' with ${subSnapshot.size} documents`);
                        
                        // Show one sample
                        const firstDoc = subSnapshot.docs[0];
                        if (firstDoc) {
                          console.log(`📄 Sample from events/${eventDoc.id}/${subName}:`, {
                            id: firstDoc.id,
                            data: firstDoc.data()
                          });
                        }
                      }
                    } catch (subError) {
                      // Silent - subcollection doesn't exist
                    }
                  }
                  eventCount++;
                }
              }
            } catch (error) {
              console.log(`❌ Error checking event subcollections:`, error.message);
            }
          }
        }
        
        // Log the status values we find
        const statusCounts: Record<string, number> = {};
        allRegistrationsSnapshot.forEach(doc => {
          const registration = doc.data();
          const status = registration.status || 'undefined';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        console.log(`📈 Status breakdown for ${eventData.name}:`, statusCounts);
        
        // Determine which collection pattern to use for status filtering
        const isSubcollection = allRegistrationsSnapshot.size > 0 && allRegistrationsQuery.toString().includes(`events/${eventDoc.id}/registrations`);
        
        // Count confirmed attendees (using the correct collection pattern)
        let confirmedQuery;
        if (isSubcollection) {
          confirmedQuery = query(
            collection(db, 'events', eventDoc.id, 'registrations'),
            where('status', '==', 'confirmed')
          );
        } else {
          confirmedQuery = query(
            collection(db, 'registrations'),
            where('eventId', '==', eventDoc.id),
            where('status', '==', 'confirmed')
          );
        }
        
        const confirmedSnapshot = await getDocs(confirmedQuery);
        let attendeeCount = confirmedSnapshot.size;
        
        // If no confirmed registrations, try other common status values
        if (attendeeCount === 0) {
          const alternativeStatuses = ['approved', 'registered', 'active', 'paid'];
          
          for (const status of alternativeStatuses) {
            let altQuery;
            if (isSubcollection) {
              altQuery = query(
                collection(db, 'events', eventDoc.id, 'registrations'),
                where('status', '==', status)
              );
            } else {
              altQuery = query(
                collection(db, 'registrations'),
                where('eventId', '==', eventDoc.id),
                where('status', '==', status)
              );
            }
            
            const altSnapshot = await getDocs(altQuery);
            if (altSnapshot.size > 0) {
              console.log(`✅ Found ${altSnapshot.size} registrations with status '${status}' for ${eventData.name}`);
              attendeeCount = altSnapshot.size;
              break;
            }
          }
        }
        
        // If still no attendees, count all registrations (maybe status field is missing/different)
        if (attendeeCount === 0 && allRegistrationsSnapshot.size > 0) {
          console.log(`⚠️ No status-filtered registrations found, using total count: ${allRegistrationsSnapshot.size}`);
          attendeeCount = allRegistrationsSnapshot.size;
        }
        
        console.log(`🎫 Final attendee count for ${eventData.name}: ${attendeeCount}`);

        const eventDate = eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date);
        const now = new Date();
        
        // Determine event status
        let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
        if (eventDate < now) {
          const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
          status = daysDiff > 1 ? 'completed' : 'ongoing';
        }

        eventsData.push({
          id: eventDoc.id,
          name: eventData.name || eventData.title || 'Wine & Grind Event',
          title: eventData.title,
          date: eventDate,
          location: eventData.location || 'TBD',
          description: eventData.description || '',
          status,
          attendeeCount
        });
      }

      setEvents(eventsData);
      console.log(`✅ Loaded ${eventsData.length} events for badge management`);

    } catch (error: any) {
      console.error('❌ Error loading events:', error);
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBadges = async (eventId: string, eventName: string) => {
    setGeneratingBadges(prev => ({ ...prev, [eventId]: true }));
    
    try {
      console.log(`🎫 Generating badges for event: ${eventId}`);
      
      // Call the badges API using query parameter
      const response = await fetch(`/api/event-badges?eventId=${eventId}`, {
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
      
      showToast(`Badges for "${eventName}" downloaded successfully!`, 'success');
      console.log('✅ Badges PDF downloaded successfully');

    } catch (err: any) {
      console.error('❌ Error generating badges:', err);
      showToast(err.message || 'Failed to generate badges PDF', 'error');
    } finally {
      setGeneratingBadges(prev => ({ ...prev, [eventId]: false }));
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <AdminHeader title="Badge Management" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <AdminHeader 
        title="Badge Management" 
        subtitle="Generate professional lanyard badges for any event"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Toast Notification */}
        {toast.visible && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(prev => ({ ...prev, visible: false }))}
          />
        )}

        {/* Header Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                <Badge className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Badge Management System</h1>
                <p className="text-gray-600">Generate professional lanyard badges for your events</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-600">{events.length}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {events.filter(e => e.status === 'upcoming').length}
                  </p>
                  <p className="text-sm text-blue-700">Upcoming Events</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">
                    {events.filter(e => e.status === 'ongoing').length}
                  </p>
                  <p className="text-sm text-green-700">Ongoing Events</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {events.reduce((sum, e) => sum + e.attendeeCount, 0)}
                  </p>
                  <p className="text-sm text-gray-700">Total Attendees</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
              >
                <option value="all">All Events</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 border border-gray-100 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'No events available for badge generation.'}
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h2>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
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
                        <span className="font-medium">{event.attendeeCount} Confirmed</span>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {event.attendeeCount > 0 
                        ? `Ready to generate ${Math.ceil(event.attendeeCount / 4)} pages (4 badges per page)`
                        : 'No confirmed attendees'
                      }
                    </div>
                    
                    <div className="flex space-x-4">
                      <button
                        onClick={() => navigate(`/admin/badges/event?eventId=${event.id}`)}
                        className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full hover:bg-gray-200 transition-colors duration-200 font-medium flex items-center space-x-2"
                      >
                        <FileText className="h-5 w-5" />
                        <span>View Details</span>
                      </button>
                      
                      {event.attendeeCount > 0 ? (
                        <button
                          onClick={() => handleGenerateBadges(event.id, event.name)}
                          disabled={generatingBadges[event.id]}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300 font-semibold flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingBadges[event.id] ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-5 w-5" />
                              <span>Generate Badges</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="px-6 py-3 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium border border-yellow-200">
                          No attendees to badge
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeManager;