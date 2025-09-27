import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, ArrowRight, Filter } from 'lucide-react';
import { EventService, EventData } from '../services/eventService';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';

type EventFilter = 'all' | 'active' | 'past' | 'completed';

const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>('all');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use getPublicEvents to only get active, sold-out, and completed events
      const eventsData = await EventService.getPublicEvents();
      
      // DEBUG: Log what events we actually got
      console.log('🔍 EventsPage - Raw events from getPublicEvents:', eventsData.length);
      eventsData.forEach(event => {
        console.log(`📅 Event: "${event.name}" - Status: "${event.status}" - Date: ${event.date}`);
      });
      
      // Sort by date (newest first) - getPublicEvents already filters out non-active events
      const sortedEvents = eventsData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      console.log('✅ EventsPage - Final sorted events:', sortedEvents.length);
      setEvents(sortedEvents);
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: EventData): 'active' | 'past' | 'completed' => {
    // DEBUG: Log the event status processing
    console.log(`🔍 Processing event "${event.name}" with database status: "${event.status}"`);
    
    // First check the database status - respect it completely
    if (event.status === 'completed') {
      console.log(`✅ Event "${event.name}" marked as completed in database`);
      return 'completed';
    }
    
    // Non-active events should not appear here, but if they do, don't process them
    if (event.status === 'non-active') {
      console.warn(`⚠️ Non-active event "${event.name}" unexpectedly appeared in public events`);
      return 'completed'; // Hide it by marking as completed
    }
    
    if (event.status === 'sold-out') {
      const eventDate = new Date(event.date);
      const now = new Date();
      const eventEndTime = new Date(eventDate);
      eventEndTime.setHours(eventEndTime.getHours() + 4); // Assume 4-hour events
      
      if (now > eventEndTime) {
        console.log(`✅ Event "${event.name}" is past sold-out event, marking as completed`);
        return 'completed'; // Past sold-out event
      } else {
        console.log(`✅ Event "${event.name}" is future sold-out event, marking as active`);
        return 'active'; // Future sold-out event
      }
    }
    
    // For 'active' status, determine based on date
    if (event.status === 'active') {
      const eventDate = new Date(event.date);
      const now = new Date();
      const eventEndTime = new Date(eventDate);
      eventEndTime.setHours(eventEndTime.getHours() + 4); // Assume 4-hour events
      
      if (now < eventDate) {
        console.log(`✅ Event "${event.name}" is future active event`);
        return 'active'; // Future event
      } else if (now > eventEndTime) {
        console.log(`✅ Event "${event.name}" is past active event, marking as completed`);
        return 'completed'; // Past event that's finished
      } else {
        console.log(`✅ Event "${event.name}" is currently happening`);
        return 'past'; // Event that's happening now or just finished
      }
    }
    
    // Fallback for unknown statuses
    console.warn(`⚠️ Unknown event status "${event.status}" for event "${event.name}"`);
    return 'completed';
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return getEventStatus(event) === filter;
  });

  const getStatusBadge = (event: EventData, status: 'active' | 'past' | 'completed') => {
    const styles = {
      active: event.status === 'sold-out' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800',
      past: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    
    const labels = {
      active: event.status === 'sold-out' ? 'Sold Out' : 'Upcoming',
      past: 'Recent',
      completed: 'Completed'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <section className="pt-32 pb-16 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading events...</p>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 fade-in px-2">
              Wine & Grind <span className="gradient-text">Events</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed fade-in-delay px-4">
              Discover upcoming events and explore our event history. Join exclusive gatherings where founders, investors, and innovators come together.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 sm:py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Tabs */}
          <div className="mb-8 sm:mb-12 flex justify-center overflow-x-hidden">
            <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:space-x-1 bg-gray-100 p-1 rounded-full max-w-full">
              {[
                { key: 'all', label: 'All Events' },
                { key: 'active', label: 'Upcoming' },
                { key: 'past', label: 'Recent' },
                { key: 'completed', label: 'Completed' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as EventFilter)}
                  className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                    filter === key
                      ? 'bg-gradient-to-r from-red-700 to-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
              <p className="text-red-800 text-center">{error}</p>
              <button 
                onClick={loadEvents}
                className="mt-4 bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition-colors font-medium mx-auto block"
              >
                Try again
              </button>
            </div>
          )}

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No events found</h3>
              <p className="text-xl text-gray-600">
                {filter === 'all' 
                  ? "No events are currently available." 
                  : `No ${filter} events found.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover-lift cursor-pointer slide-up transition-all duration-300"
                  >
                    {/* Event Image */}
                    <div className="h-48 sm:h-56 md:h-64 bg-gray-200 relative">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDYwMCAzMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMzIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMDAgMTYwQzMwNS41MjMgMTYwIDMxMCAxNTUuNTIzIDMxMCAxNTBTMzA1LjUyMyAxNDAgMzAwIDE0MFMyOTAgMTQ0LjQ3NyAyOTAgMTUwUzI5NC40NzcgMTYwIDMwMCAxNjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
                        }}
                      />
                      <div className="absolute top-4 right-4">
                        {getStatusBadge(event, status)}
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="p-4 sm:p-6 md:p-8">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">{event.title}</h3>
                      
                      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                        <div className="flex items-center space-x-2 sm:space-x-3 text-gray-600">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-red-700 flex-shrink-0" />
                          <span className="font-medium text-sm sm:text-base">{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 text-gray-600">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-sm sm:text-base">{formatTime(event.date)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-2 sm:space-x-3 text-gray-600">
                            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-red-700 flex-shrink-0" />
                            <span className="font-medium text-sm sm:text-base truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-4 sm:mb-6 leading-relaxed line-clamp-3 text-sm sm:text-base">{event.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>Exclusive Event</span>
                        </div>
                        
                        <Link
                          to={`/events/${event.slug}`}
                          className="bg-gradient-to-r from-red-700 to-blue-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300 font-semibold inline-flex items-center space-x-2"
                        >
                          <span>View Details</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default EventsPage;