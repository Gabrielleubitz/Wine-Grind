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
      active: 'bg-green-100 text-green-800 border-green-200',
      past: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    const labels = {
      active: 'Upcoming',
      past: 'Recent',
      completed: 'Completed'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold border rounded-full ${styles[status]}`}>
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8102E]"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">Discover upcoming events and explore our event history</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: 'all', label: 'All Events' },
              { key: 'active', label: 'Upcoming' },
              { key: 'past', label: 'Recent' },
              { key: 'completed', label: 'Completed' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as EventFilter)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === key
                    ? 'bg-white text-[#C8102E] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={loadEvents}
              className="mt-2 text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "No events are currently available." 
                : `No ${filter} events found.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => {
              const status = getEventStatus(event);
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Event Image */}
                  {event.imageUrl && (
                    <div className="aspect-video bg-gray-200">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    {/* Status and Date */}
                    <div className="flex justify-between items-start mb-3">
                      {getStatusBadge(status)}
                      <div className="text-right text-sm text-gray-600">
                        <div className="font-medium">{formatDate(event.date)}</div>
                        <div>{formatTime(event.date)}</div>
                      </div>
                    </div>

                    {/* Title and Description */}
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      
                      {event.maxAttendees && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Up to {event.maxAttendees} attendees</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link
                      to={`/events/${event.slug}`}
                      className="inline-flex items-center justify-center w-full px-4 py-2 bg-[#C8102E] text-white rounded-lg hover:bg-[#A00E26] transition-colors font-medium"
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default EventsPage;