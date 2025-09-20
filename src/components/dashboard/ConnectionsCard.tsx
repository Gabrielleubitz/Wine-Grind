import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, User, Briefcase, Linkedin, Mail, ChevronRight, ChevronLeft, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ConnectionService, Connection } from '../../services/connectionService';
import { EventService } from '../../services/eventService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface EnrichedConnection extends Connection {
  partnerData?: {
    uid: string;
    name: string;
    work: string;
    position: string;
    linkedin: string;
    email: string;
    profileImage: string | null;
  };
}

const ConnectionsCard: React.FC = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<EnrichedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  // Scroll container ref
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Load events and connections
  useEffect(() => {
    if (user?.uid) {
      loadUserRegisteredEvents();
      loadConnections();
    }
  }, [user]);
  
  // Load only events the user has registered for
  const loadUserRegisteredEvents = async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingEvents(true);
      
      // Get all events
      const allEvents = await EventService.getPublicEvents();
      
      // Filter to only include events the user has registered for
      const userRegisteredEvents = [];
      
      for (const event of allEvents) {
        const registration = await EventService.getUserRegistration(event.id, user.uid);
        if (registration) {
          userRegisteredEvents.push(event);
        }
      }
      
      setEvents(userRegisteredEvents);
    } catch (error) {
      console.error('❌ Error loading user registered events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch user data if not available in connection
  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('🔍 Fetched user data for', userId, ':', {
          profileImage: userData.profileImage,
          photoURL: userData.photoURL,
          avatar: userData.avatar,
          profilePicture: userData.profilePicture
        });
        
        return {
          name: userData.displayName || userData.name || 'Unknown User',
          work: userData.work || 'Not specified',
          position: userData.position || '',
          linkedin: userData.linkedinUsername || '',
          email: userData.email || '',
          // Try multiple possible field names for profile image
          profileImage: userData.profileImage || userData.photoURL || userData.avatar || userData.profilePicture || null
        };
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
    }
    return null;
  };

  // Get connection partner data (the other user in the connection)
  const getConnectionPartner = (connection: Connection) => {
    if (!user) return null;
    
    // If current user is the "from" user, return the "to" user data
    if (connection.fromUid === user.uid) {
      console.log('🖼️ Connection partner (TO):', connection.toName, 'Profile image:', connection.toProfileImage);
      return {
        uid: connection.toUid,
        name: connection.toName || 'Unknown User',
        work: connection.toWork || 'Not specified',
        position: connection.toPosition || '',
        linkedin: connection.toLinkedin || '',
        email: connection.toEmail || '',
        profileImage: connection.toProfileImage || null
      };
    }
    
    // Otherwise return the "from" user data
    console.log('🖼️ Connection partner (FROM):', connection.fromName, 'Profile image:', connection.fromProfileImage);
    return {
      uid: connection.fromUid,
      name: connection.fromName || 'Unknown User',
      work: connection.fromWork || 'Not specified',
      position: connection.fromPosition || '',
      linkedin: connection.fromLinkedin || '',
      email: connection.fromEmail || '',
      profileImage: connection.fromProfileImage || null
    };
  };
  
  // Load connections based on selected event
  const loadConnections = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      let userConnections;
      if (selectedEventId === 'all') {
        // Load all connections
        userConnections = await ConnectionService.getUserConnections(user.uid);
      } else {
        // Load connections for specific event
        userConnections = await ConnectionService.getUserConnectionsByEvent(user.uid, selectedEventId);
      }
      
      console.log('🔄 Loaded connections:', userConnections);
      
      // Enrich connections with fresh user data if profile image is missing
      const enrichedConnections: EnrichedConnection[] = [];
      
      for (const connection of userConnections) {
        const partner = getConnectionPartner(connection);
        let enrichedConnection = { ...connection };
        
        if (partner && !partner.profileImage) {
          console.log('🔄 Profile image missing for', partner.name, '- fetching fresh user data');
          const freshUserData = await fetchUserData(partner.uid);
          if (freshUserData) {
            enrichedConnection.partnerData = {
              uid: partner.uid,
              ...freshUserData
            };
            console.log('✅ Enriched connection with fresh data:', freshUserData);
          }
        }
        
        enrichedConnections.push(enrichedConnection);
      }
      
      setConnections(enrichedConnections);
    } catch (error) {
      console.error('❌ Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Reload connections when event selection changes
  useEffect(() => {
    if (user?.uid) {
      loadConnections();
    }
  }, [selectedEventId, user]);
  
  // Handle scroll buttons
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
      setScrollPosition(scrollContainerRef.current.scrollLeft - 300);
    }
  };
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
      setScrollPosition(scrollContainerRef.current.scrollLeft + 300);
    }
  };
  
  // Update scroll position on scroll
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };
  
  // Add scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // Check if scroll buttons should be visible
  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollContainerRef.current 
    ? scrollPosition < scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth - 10
    : false;
  
  // Generate avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-red-500 to-red-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-yellow-500 to-yellow-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600'
    ];
    
    // Simple hash function to get consistent color for same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };
  
  // Handle event selection
  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventId(e.target.value);
  };
  
  // Get event name by ID
  const getEventName = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.name : 'Unknown Event';
  };

  // Get final partner data (prioritizing enriched data)
  const getFinalPartnerData = (connection: EnrichedConnection) => {
    const basePartner = getConnectionPartner(connection);
    if (!basePartner) return null;

    // Use enriched data if available, otherwise use base partner data
    if (connection.partnerData) {
      return connection.partnerData;
    }

    return basePartner;
  };
  
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">My Connections</h3>
        </div>
        
        {/* Event Filter Dropdown */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              value={selectedEventId}
              onChange={handleEventChange}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={loadingEvents || events.length === 0}
            >
              <option value="all">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          {connections.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                className={`p-2 rounded-full ${
                  canScrollLeft 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={scrollRight}
                disabled={!canScrollRight}
                className={`p-2 rounded-full ${
                  canScrollRight 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your connections...</p>
        </div>
      ) : loadingEvents ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-2xl">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Registered Events</h4>
          <p className="text-gray-600 mb-4">
            You haven't registered for any events yet. Register for an event to start making connections.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <span>View upcoming events</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-2xl">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Connections Yet</h4>
          <p className="text-gray-600 mb-4">
            {selectedEventId === 'all' 
              ? 'Scan QR codes from other attendees at events to build your network.'
              : `No connections found for this event. Try selecting a different event or "All Events".`}
          </p>
          <Link
            to="/events"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <span>View upcoming events</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="relative">
          {/* Gradient fade on left edge */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          )}
          
          {/* Scrollable container */}
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {connections.map((connection) => {
              const partner = getFinalPartnerData(connection);
              if (!partner) return null;
              
              const avatarColor = getAvatarColor(partner.name);
              const eventName = connection.eventId ? getEventName(connection.eventId) : 'Wine & Grind Event';
              
              console.log('🎨 Rendering partner:', partner.name, 'Profile image:', partner.profileImage);
              
              return (
                <div 
                  key={connection.id}
                  className="flex-shrink-0 w-64 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        {partner.profileImage ? (
                          <img 
                            src={partner.profileImage} 
                            alt={partner.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('❌ Image load error for:', partner.name, partner.profileImage);
                              // Hide the broken image and show fallback
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-full h-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-lg ${partner.profileImage ? 'hidden' : 'flex'}`}
                        >
                          {partner.name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{partner.name}</h4>
                        <p className="text-sm text-gray-600 line-clamp-1">{partner.work}</p>
                      </div>
                    </div>
                    
                    {partner.position && (
                      <div className="flex items-center text-xs text-gray-600 mb-2">
                        <Briefcase className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        <span className="line-clamp-1">{ConnectionService.formatPosition(partner.position)}</span>
                      </div>
                    )}
                    
                    {/* Event Name */}
                    <div className="flex items-center text-xs text-gray-600 mb-2">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      <span className="line-clamp-1">{eventName}</span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
                      {partner.linkedin && (
                        <a 
                          href={`https://linkedin.com/in/${ConnectionService.formatLinkedinUrl(partner.linkedin)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Linkedin className="h-3.5 w-3.5 mr-1.5" />
                          <span className="line-clamp-1">LinkedIn Profile</span>
                        </a>
                      )}
                      
                      {partner.email && (
                        <a 
                          href={`mailto:${partner.email}`}
                          className="flex items-center text-xs text-gray-600 hover:text-gray-800"
                        >
                          <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          <span className="line-clamp-1">{partner.email}</span>
                        </a>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-1">
                        Connected on {ConnectionService.formatTimestamp(connection.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Gradient fade on right edge */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionsCard;