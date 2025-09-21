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
      const eventsData = await EventService.getAllEvents();
      // Sort events by date (newest first)
      const sortedEvents = eventsData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEvents(sortedEvents);
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: EventData): 'active' | 'past' | 'completed' => {
    const eventDate = new Date(event.date);
    const now = new Date();
    const eventEndTime = new Date(eventDate);
    eventEndTime.setHours(eventEndTime.getHours() + 4); // Assume 4-hour events
    
    if (now < eventDate) {
      return 'active'; // Future event
    } else if (now > eventEndTime) {
      return 'completed'; // Past event that's finished
    } else {
      return 'past'; // Event that's happening now or just finished
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return getEventStatus(event) === filter;
  });

  const getStatusBadge = (status: 'active' | 'past' | 'completed') => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      past: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    
    const labels = {
      active: 'Upcoming',
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
      <section className="pt-32 pb-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 fade-in">
              Wine & Grind <span className="gradient-text">Events</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed fade-in-delay">
              Discover upcoming events and explore our event history. Join exclusive gatherings where founders, investors, and innovators come together.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Tabs */}
          <div className="mb-12 flex justify-center">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-full">
              {[
                { key: 'all', label: 'All Events' },
                { key: 'active', label: 'Upcoming' },
                { key: 'past', label: 'Recent' },
                { key: 'completed', label: 'Completed' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as EventFilter)}
                  className={`px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
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
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover-lift cursor-pointer slide-up transition-all duration-300"
                  >
                    {/* Event Image */}
                    <div className="h-64 bg-gray-200 relative">
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
                        {getStatusBadge(status)}
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="p-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">{event.title}</h3>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center space-x-3 text-gray-600">
                          <Calendar className="h-5 w-5 text-red-700" />
                          <span className="font-medium">{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">{formatTime(event.date)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-3 text-gray-600">
                            <MapPin className="h-5 w-5 text-red-700" />
                            <span className="font-medium truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">{event.description}</p>

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