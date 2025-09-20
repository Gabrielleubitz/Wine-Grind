import React from 'react';
import { Users, User, ExternalLink, Briefcase, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EventSpeakersProps {
  speakers: Array<{
    userId: string;
    name: string;
    email: string;
    bio?: string;
    company?: string;
    role?: string;
    position?: string;
    linkedinUsername?: string;
    profileImage?: string | null;
  }>;
  className?: string;
  showViewAll?: boolean;
}

const EventSpeakers: React.FC<EventSpeakersProps> = ({ 
  speakers, 
  className = '',
  showViewAll = true
}) => {
  if (!speakers || speakers.length === 0) {
    return null;
  }

  // Generate a color based on speaker name for avatar background
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

  // Format position for display
  const formatPosition = (position: string | undefined): string => {
    if (!position) return '';
    
    const positionMap: Record<string, string> = {
      'investor': 'Investor',
      'c_level': 'C-Level Executive',
      'vp_level': 'VP Level',
      'director': 'Director',
      'senior_manager': 'Senior Manager',
      'manager': 'Manager',
      'senior_contributor': 'Senior Contributor',
      'individual_contributor': 'Individual Contributor',
      'junior_level': 'Junior Level',
      'founder': 'Founder',
      'consultant': 'Consultant',
      'student': 'Student',
      'other': 'Other'
    };
    
    return positionMap[position] || position;
  };

  // Format LinkedIn username for display
  const formatLinkedinUrl = (username: string | undefined) => {
    if (!username) return '';
    
    // Remove any linkedin.com prefix if present
    const cleanUsername = username.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '');
    
    // Remove trailing slash if present
    return cleanUsername.replace(/\/$/, '');
  };

  return (
    <div className={`rounded-2xl p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <Users className="h-5 w-5 text-red-700" />
        <h3 className="text-xl font-bold text-gray-900">Event Speakers</h3>
      </div>

      <div className="space-y-4">
        {speakers.slice(0, 4).map((speaker) => (
          <div 
            key={speaker.userId}
            className="flex flex-col p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center space-x-4 mb-2">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                {speaker.profileImage ? (
                  <img 
                    src={speaker.profileImage} 
                    alt={speaker.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMTQwIiByeD0iNDAiIHJ5PSIyMCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                    }}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getAvatarColor(speaker.name)} flex items-center justify-center text-white font-bold text-lg`}>
                    {speaker.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{speaker.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {speaker.role || speaker.company || 'Speaker'}
                </p>
              </div>
            </div>
            
            {/* Position and LinkedIn - New section */}
            <div className="mt-2 pl-16">
              {speaker.position && (
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                  <span>{formatPosition(speaker.position)}</span>
                </div>
              )}
              
              {speaker.linkedinUsername && (
                <div className="flex items-center text-sm">
                  <Linkedin className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                  <a 
                    href={`https://linkedin.com/in/${formatLinkedinUrl(speaker.linkedinUsername)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {formatLinkedinUrl(speaker.linkedinUsername)}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Show "View All" link if there are more than 4 speakers */}
        {showViewAll && speakers.length > 4 && (
          <div className="text-center mt-4">
            <Link
              to="/speakers"
              className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium text-sm"
            >
              <span>View all {speakers.length} speakers</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Interested in speaking at a future event?
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium text-sm mt-2"
        >
          <User className="h-4 w-4" />
          <span>Apply to be a speaker</span>
        </Link>
      </div>
    </div>
  );
};

export default EventSpeakers;