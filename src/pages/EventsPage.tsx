import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Clock, Users, RotateCcw, User, Mail, Phone, Briefcase, Ticket, Download, Edit, Save, X, Check, AlertCircle, ChevronDown, Linkedin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { EventService, EventData } from '../services/eventService';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnnouncementsSidebar from '../components/announcements/AnnouncementsSidebar';
import ConnectionsCard from '../components/dashboard/ConnectionsCard';
import ProfilePictureUploader from '../components/profile/ProfilePictureUploader';

// Country codes data for phone editing
const COUNTRY_CODES = [
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
];

// Position options
const POSITION_OPTIONS = [
  { value: 'investor', label: 'Investor' },
  { value: 'c_level', label: 'C-Level Executive (CEO, CTO, etc.)' },
  { value: 'vp_level', label: 'VP Level' },
  { value: 'director', label: 'Director' },
  { value: 'senior_manager', label: 'Senior Manager' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior_contributor', label: 'Senior Contributor' },
  { value: 'individual_contributor', label: 'Individual Contributor' },
  { value: 'junior_level', label: 'Junior Level' },
  { value: 'founder', label: 'Founder' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' }
];

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  
  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    work: '',
    linkedinUsername: '',
    position: ''
  });
  const [selectedCountryCode, setSelectedCountryCode] = useState('+972');
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user, isAdmin, isInUserView, switchToAdminView, updateProfile } = useAuth();

  useEffect(() => {
    loadPublicEvents();
    if (user?.uid) {
      loadUserRegistrations();
    }
  }, [user]);

  // Initialize edit form data when user data changes
  useEffect(() => {
    if (user && !isEditingProfile) {
      const { countryCode, phoneNumber } = parseExistingPhone(user.phone || '');
      setEditFormData({
        name: user.displayName || '',
        email: user.email || '',
        phoneNumber: phoneNumber,
        work: user.work || '',
        linkedinUsername: user.linkedinUsername || '',
        position: user.position || ''
      });
      setSelectedCountryCode(countryCode);
      setProfileImageUrl(user.profileImage || null);
    }
  }, [user, isEditingProfile]);

  // Parse existing phone number to extract country code and number
  const parseExistingPhone = (phone: string) => {
    if (!phone) return { countryCode: '+972', phoneNumber: '' };
    
    // Find matching country code
    const matchingCountry = COUNTRY_CODES.find(country => phone.startsWith(country.code));
    
    if (matchingCountry) {
      return {
        countryCode: matchingCountry.code,
        phoneNumber: phone.substring(matchingCountry.code.length)
      };
    }
    
    // Default fallback
    return { countryCode: '+972', phoneNumber: phone.replace(/^\+/, '') };
  };

  const formatPhoneNumber = (countryCode: string, phoneInput: string): string => {
    if (!phoneInput) return '';
    
    let cleanPhone = phoneInput.replace(/\D/g, '');
    
    // Remove leading zero if country code is included
    if (cleanPhone.startsWith('0') && countryCode) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Combine country code with phone number
    const fullNumber = `${countryCode}${cleanPhone}`;
    
    // Validate E.164 format (starts with + followed by digits only)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(fullNumber)) {
      throw new Error('Invalid phone number format');
    }
    
    return fullNumber;
  };

  const loadPublicEvents = async () => {
    try {
      const eventsData = await EventService.getPublicEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('❌ Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRegistrations = async () => {
    if (!user?.uid) return;
    
    try {
      setRegistrationsLoading(true);
      const registrations = [];
      
      // Check each event for user registration
      for (const event of events) {
        const registration = await EventService.getUserRegistration(event.id, user.uid);
        if (registration) {
          registrations.push({
            ...registration,
            eventId: event.id,
            eventName: event.name,
            eventDate: event.date,
            eventLocation: event.location,
            eventImage: event.imageUrl,
            eventSlug: event.slug // Add slug for navigation
          });
        }
      }
      
      setUserRegistrations(registrations);
    } catch (error) {
      console.error('❌ Error loading user registrations:', error);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  // Reload registrations when events are loaded
  useEffect(() => {
    if (events.length > 0 && user?.uid) {
      loadUserRegistrations();
    }
  }, [events, user?.uid]);

  // Handle edit profile form changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For phone number, only allow digits
    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/\D/g, '');
      setEditFormData(prev => ({
        ...prev,
        [name]: digitsOnly
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Start editing profile
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
  };

  // Cancel editing profile
  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
    // Reset form data to original values
    if (user) {
      const { countryCode, phoneNumber } = parseExistingPhone(user.phone || '');
      setEditFormData({
        name: user.displayName || '',
        email: user.email || '',
        phoneNumber: phoneNumber,
        work: user.work || '',
        linkedinUsername: user.linkedinUsername || '',
        position: user.position || ''
      });
      setSelectedCountryCode(countryCode);
      setProfileImageUrl(user.profileImage || null);
    }
  };

  // Handle profile picture upload success
  const handleProfilePictureSuccess = (imageUrl: string) => {
    setProfileImageUrl(imageUrl);
    setImageUploadError(null);
  };

  // Handle profile picture upload error
  const handleProfilePictureError = (errorMessage: string) => {
    setImageUploadError(errorMessage);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate required fields
    if (!editFormData.name.trim()) {
      setProfileUpdateError('Name is required');
      return;
    }
    if (!editFormData.email.trim()) {
      setProfileUpdateError('Email is required');
      return;
    }
    if (!editFormData.phoneNumber.trim()) {
      setProfileUpdateError('Phone is required');
      return;
    }
    if (!editFormData.work.trim()) {
      setProfileUpdateError('Work information is required');
      return;
    }
    if (!editFormData.linkedinUsername.trim()) {
      setProfileUpdateError('LinkedIn username is required');
      return;
    }
    if (!editFormData.position) {
      setProfileUpdateError('Position is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      setProfileUpdateError('Please enter a valid email address');
      return;
    }

    // Validate and format phone number
    try {
      const formattedPhone = formatPhoneNumber(selectedCountryCode, editFormData.phoneNumber);
      
      setProfileUpdateLoading(true);
      setProfileUpdateError(null);

      // Format LinkedIn username (remove any linkedin.com prefix)
      const formattedLinkedin = editFormData.linkedinUsername.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '');

      // Update profile using the auth hook
      await updateProfile({
        name: editFormData.name.trim(),
        phone: formattedPhone,
        work: editFormData.work.trim(),
        linkedinUsername: formattedLinkedin,
        position: editFormData.position,
        profileImage: profileImageUrl
      });

      setProfileUpdateSuccess('Profile updated successfully!');
      setIsEditingProfile(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setProfileUpdateSuccess(null);
      }, 3000);

    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      setProfileUpdateError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const downloadQRCode = (registration: any) => {
    const svg = document.getElementById(`qr-code-${registration.eventId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 200;
    canvas.height = 200;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 200);
        ctx.drawImage(img, 0, 0, 200, 200);
        
        const link = document.createElement('a');
        link.download = `${registration.eventName.replace(/\s+/g, '-').toLowerCase()}-ticket.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const getStatusBadge = (status: EventData['status']) => {
    const badges = {
      'active': { bg: 'bg-green-100', text: 'text-green-800', label: 'Register Now' },
      'sold-out': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Sold Out' },
      'completed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completed' }
    };
    
    const badge = badges[status as keyof typeof badges];
    if (!badge) return null;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  const handleEventClick = (e: React.MouseEvent, slug: string) => {
    // Prevent any default behavior and page jumping
    e.preventDefault();
    e.stopPropagation();
    navigate(`/events/${slug}`); // Use slug instead of eventId
  };

  const handleRegisterClick = (e: React.MouseEvent, slug: string, status: EventData['status']) => {
    // Prevent event bubbling and default behavior
    e.preventDefault();
    e.stopPropagation();

    if (status === 'active') {
      navigate(`/events/${slug}`); // Use slug instead of eventId
    }
  };

  // Format position for display
  const formatPosition = (position: string | undefined): string => {
    if (!position) return '';
    
    const positionOption = POSITION_OPTIONS.find(option => option.value === position);
    return positionOption ? positionOption.label : position;
  };

  // Format LinkedIn username for display
  const formatLinkedinUrl = (username: string | undefined) => {
    if (!username) return '';
    
    // Remove any linkedin.com prefix if present
    const cleanUsername = username.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '');
    
    // Remove trailing slash if present
    return cleanUsername.replace(/\/$/, '');
  };

  const upcomingEvents = events.filter(event => isUpcoming(event.date));
  const pastEvents = events.filter(event => !isUpcoming(event.date));

  const selectedCountry = COUNTRY_CODES.find(country => country.code === selectedCountryCode);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading events...</p>
            </div>
          </div>
        </div>
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
              {user ? (
                <>Welcome back, <span className="gradient-text">{user.displayName?.split(' ')[0] || 'Member'}</span></>
              ) : (
                <>Wine & Grind <span className="gradient-text">Events</span></>
              )}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed fade-in-delay">
              {user ? (
                "Your dashboard for exclusive Wine & Grind events and tickets."
              ) : (
                "Join our exclusive gatherings where founders, investors, and innovators come together to shape the future of business and technology."
              )}
            </p>

            {/* Admin Back to Admin Button - Prominent placement for user view */}
            {isAdmin && isInUserView && (
              <div className="mb-8">
                <button
                  onClick={switchToAdminView}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-full hover:shadow-lg transition-all duration-300 font-semibold text-lg flex items-center space-x-3 mx-auto"
                >
                  <RotateCcw className="h-6 w-6" />
                  <span>Back to Admin Panel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* User Profile Section - Only show if logged in */}
      {user && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Profile Section - Takes 2/3 of the space */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
                    {!isEditingProfile && (
                      <button
                        onClick={handleEditProfile}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-300 font-medium flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>

                  {/* Success Message */}
                  {profileUpdateSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className="text-green-600 text-sm font-medium">{profileUpdateSuccess}</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {profileUpdateError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <p className="text-red-600 text-sm font-medium">{profileUpdateError}</p>
                    </div>
                  )}

                  {isEditingProfile ? (
                    /* Edit Mode */
                    <div className="space-y-6">
                      {/* Profile Picture Section */}
                      <div className="flex flex-col items-center mb-6">
                        <ProfilePictureUploader
                          currentImageUrl={user?.profileImage || null}
                          onUploadSuccess={handleProfilePictureSuccess}
                          onUploadError={handleProfilePictureError}
                          size="lg"
                        />
                        
                        {imageUploadError && (
                          <p className="text-red-600 text-sm mt-2">{imageUploadError}</p>
                        )}
                        
                        <p className="text-sm text-gray-500 mt-2">
                          Click on the image to upload a new profile picture
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              id="name"
                              name="name"
                              type="text"
                              required
                              value={editFormData.name}
                              onChange={handleEditFormChange}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Enter your full name"
                              disabled={profileUpdateLoading}
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              id="email"
                              name="email"
                              type="email"
                              required
                              value={editFormData.email}
                              onChange={handleEditFormChange}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Enter your email"
                              disabled // Email typically shouldn't be editable after account creation
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed after account creation</p>
                        </div>

                        {/* Phone with Country Code */}
                        <div>
                          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number *
                          </label>
                          <div className="flex space-x-2">
                            {/* Country Code Dropdown */}
                            <div className="relative">
                              <select
                                value={selectedCountryCode}
                                onChange={(e) => setSelectedCountryCode(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 rounded-xl px-3 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                              >
                                {COUNTRY_CODES.map((country) => (
                                  <option key={country.code} value={country.code}>
                                    {country.flag} {country.code}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>

                            {/* Phone Number Input */}
                            <div className="relative flex-1">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                required
                                value={editFormData.phoneNumber}
                                onChange={handleEditFormChange}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder={selectedCountryCode === '+972' ? '0501234567' : 'Phone number'}
                              />
                            </div>
                          </div>
                          
                          {/* Phone Preview */}
                          {editFormData.phoneNumber && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Preview:</span> {selectedCountryCode}{editFormData.phoneNumber.replace(/^0/, '')}
                            </div>
                          )}
                          
                          {/* Country Info */}
                          {selectedCountry && (
                            <div className="mt-1 text-xs text-gray-500">
                              {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.code})
                            </div>
                          )}
                        </div>

                        {/* Work */}
                        <div>
                          <label htmlFor="work" className="block text-sm font-medium text-gray-700 mb-2">
                            Work / What do you do? *
                          </label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              id="work"
                              name="work"
                              type="text"
                              required
                              value={editFormData.work}
                              onChange={handleEditFormChange}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="e.g., CEO at TechCorp, Software Engineer, Investor"
                            />
                          </div>
                        </div>

                        {/* LinkedIn Username */}
                        <div>
                          <label htmlFor="linkedinUsername" className="block text-sm font-medium text-gray-700 mb-2">
                            LinkedIn Username *
                          </label>
                          <div className="relative">
                            <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              id="linkedinUsername"
                              name="linkedinUsername"
                              type="text"
                              required
                              value={editFormData.linkedinUsername}
                              onChange={handleEditFormChange}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="e.g., johndoe (without linkedin.com/in/)"
                            />
                          </div>
                          {editFormData.linkedinUsername && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Preview:</span> linkedin.com/in/{editFormData.linkedinUsername.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '')}
                            </div>
                          )}
                        </div>

                        {/* Position */}
                        <div>
                          <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                            Position *
                          </label>
                          <div className="relative">
                            <select
                              id="position"
                              name="position"
                              required
                              value={editFormData.position}
                              onChange={handleEditFormChange}
                              className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none"
                            >
                              <option value="" disabled>Select your position...</option>
                              {POSITION_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button
                          onClick={handleCancelEdit}
                          disabled={profileUpdateLoading}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
                        >
                          <div className="flex items-center space-x-2">
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </div>
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={profileUpdateLoading}
                          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all duration-300 font-medium flex items-center space-x-2 disabled:opacity-50"
                        >
                          {profileUpdateLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex flex-col md:flex-row md:items-start gap-8">
                      {/* Profile Picture */}
                      <div className="flex flex-col items-center">
                        <ProfilePictureUploader
                          currentImageUrl={user?.profileImage || null}
                          onUploadSuccess={handleProfilePictureSuccess}
                          onUploadError={handleProfilePictureError}
                          size="lg"
                        />
                        
                        {imageUploadError && (
                          <p className="text-red-600 text-sm mt-2">{imageUploadError}</p>
                        )}
                      </div>
                      
                      {/* Profile Details */}
                      <div className="flex-1">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <User className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-500">Name</div>
                                <div className="font-medium">{user?.displayName || 'Not provided'}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Mail className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-500">Email</div>
                                <div className="font-medium">{user?.email}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Linkedin className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-500">LinkedIn</div>
                                <div className="font-medium">
                                  {user?.linkedinUsername ? (
                                    <a 
                                      href={`https://linkedin.com/in/${formatLinkedinUrl(user.linkedinUsername)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {formatLinkedinUrl(user.linkedinUsername)}
                                    </a>
                                  ) : (
                                    'Not provided'
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-500">Phone</div>
                                <div className="font-medium">{user?.phone || 'Not provided'}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Briefcase className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-500">Work</div>
                                <div className="font-medium">{user?.work || 'Not provided'}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-500">Position</div>
                                <div className="font-medium">{formatPosition(user?.position) || 'Not provided'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Announcements Sidebar - Takes 1/3 of the space */}
              <div className="lg:col-span-1">
                <AnnouncementsSidebar />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Connections Section - Only show if logged in */}
      {user && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ConnectionsCard />
          </div>
        </section>
      )}

      {/* My Tickets Section - Only show if logged in and has registrations */}
      {user && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 slide-up">
                My <span className="gradient-text">Tickets</span>
              </h2>
            </div>

            {registrationsLoading ? (
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your tickets...</p>
              </div>
            ) : userRegistrations.length > 0 ? (
              <div className="grid lg:grid-cols-2 gap-8 mb-16">
                {userRegistrations.map((registration, index) => (
                  <div
                    key={registration.eventId}
                    className={`bg-gradient-to-br from-red-700 to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden slide-up`}
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                          <Ticket className="h-6 w-6" />
                          <span className="font-semibold">Digital Ticket</span>
                        </div>
                        <div className="text-sm opacity-90">
                          #{registration.qrCodeUrl?.slice(-8).toUpperCase() || 'TICKET'}
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="text-2xl font-bold">{registration.eventName}</div>
                        <div className="opacity-90">{formatDate(registration.eventDate).date} • {formatDate(registration.eventDate).time}</div>
                        <div className="opacity-90">{registration.eventLocation}</div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm opacity-90">Attendee</div>
                            <div className="font-semibold">{registration.name}</div>
                            <div className="text-sm opacity-75">{registration.email}</div>
                            <div className="text-sm opacity-75">{registration.phone}</div>
                            <div className="text-sm opacity-75">{registration.work}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm opacity-90">QR Code</div>
                            <div className="bg-white p-2 rounded-lg mt-1">
                              <QRCodeSVG
                                id={`qr-code-${registration.eventId}`}
                                value={`https://winengrind.com/connect?to=${user.uid}&event=${registration.eventId}`}
                                size={60}
                                bgColor="#ffffff"
                                fgColor="#000000"
                                level="M"
                                includeMargin={false}
                              />
                            </div>
                            <button
                              onClick={() => downloadQRCode(registration)}
                              className="mt-2 text-xs text-white/80 hover:text-white flex items-center space-x-1"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 text-center">
                        <p className="text-sm opacity-90">
                          Present this ticket at the event entrance
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center mb-16">
                <div className="bg-gray-50 rounded-2xl p-12">
                  <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets yet</h3>
                  <p className="text-gray-600">
                    No upcoming tickets yet. Explore events below to register!
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 slide-up">
                Upcoming <span className="gradient-text">Events</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto slide-up-delay">
                Don't miss out on these exclusive opportunities to connect and learn.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {upcomingEvents.map((event, index) => {
                const isRegistered = userRegistrations.some(reg => reg.eventId === event.id);
                
                return (
                  <div
                    key={event.id}
                    className={`bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover-lift cursor-pointer slide-up`}
                    style={{ animationDelay: `${index * 0.2}s` }}
                    onClick={(e) => handleEventClick(e, event.slug)} // Use slug
                  >
                    {/* Event Image */}
                    <div className="h-64 bg-gray-200 relative">
                      <img
                        src={event.imageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDYwMCAzMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMzIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMDAgMTYwQzMwNS41MjMgMTYwIDMxMCAxNTUuNTIzIDMxMCAxNTBTMzA1LjUyMyAxNDAgMzAwIDE0MFMyOTAgMTQ0LjQ3NyAyOTAgMTUwUzI5NC40NzcgMTYwIDMwMCAxNjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
                        }}
                      />
                      <div className="absolute top-4 right-4">
                        {isRegistered ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            Registered
                          </span>
                        ) : (
                          getStatusBadge(event.status)
                        )}
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="p-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">{event.name}</h3>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center space-x-3 text-gray-600">
                          <Calendar className="h-5 w-5 text-red-700" />
                          <span>{formatDate(event.date).date}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <span>{formatDate(event.date).time}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <MapPin className="h-5 w-5 text-red-700" />
                          <span>{event.location}</span>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">
                        {event.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>Exclusive Event</span>
                        </div>
                        
                        {isRegistered ? (
                          <span className="bg-green-100 text-green-800 px-6 py-3 rounded-full font-semibold">
                            Registered ✓
                          </span>
                        ) : event.status === 'active' ? (
                          <button 
                            onClick={(e) => handleRegisterClick(e, event.slug, event.status)} // Use slug
                            className="bg-gradient-to-r from-red-700 to-blue-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300 font-semibold flex items-center space-x-2"
                          >
                            <span>Register Now</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="bg-gray-300 text-gray-500 px-6 py-3 rounded-full font-semibold cursor-not-allowed"
                          >
                            {event.status === 'sold-out' ? 'Sold Out' : 'Registration Closed'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 slide-up">
                Past <span className="gradient-text">Events</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto slide-up-delay">
                Take a look at our previous successful gatherings.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pastEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover-lift cursor-pointer slide-up`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={(e) => handleEventClick(e, event.slug)} // Use slug
                >
                  {/* Event Image */}
                  <div className="h-48 bg-gray-200 relative">
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDQwMCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMTkyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgOTZDMjA1LjUyMyA5NiAyMTAgOTEuNTIzIDIxMCA4NlMyMDUuNTIzIDc2IDIwMCA3NlMxOTAgODAuNDc3IDE5MCA4NlMxOTQuNDc3IDk2IDIwMCA5NloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                      }}
                    />
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        Completed
                      </span>
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{event.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-gray-600 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.date).date}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* No Events State */}
      {events.length === 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              No Events Available
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              We're working on exciting new events. Check back soon or contact us for updates.
            </p>
            <Link
              to="/"
              className="bg-gradient-to-r from-red-700 to-blue-600 text-white px-8 py-4 rounded-full hover:shadow-lg transition-all duration-300 font-semibold inline-flex items-center space-x-2"
            >
              <span>Back to Home</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default EventsPage;