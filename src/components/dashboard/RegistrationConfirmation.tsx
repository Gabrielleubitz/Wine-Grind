import React from 'react';
import { Check, User, Mail, Phone, Briefcase, Calendar, MapPin, Clock, Download, CalendarPlus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../hooks/useAuth';

interface RegistrationConfirmationProps {
  data: {
    name: string;
    email: string;
    phone: string;
    work: string;
  };
}

const RegistrationConfirmation: React.FC<RegistrationConfirmationProps> = ({ data }) => {
  const { user } = useAuth();
  
  // Generate QR code value using user UID (document ID)
  const qrCodeValue = `https://winengrind.com/connect?to=${user?.uid}`;

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
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
        link.download = `wine-grind-qr-${data.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Format event date and time for Google Calendar
  const formatGoogleCalendarDate = () => {
    // Use a fixed date for the event (June 28th, 2025 at 18:30)
    const startDate = new Date(2025, 5, 28, 18, 30, 0);
    
    // Format to YYYYMMDDTHHmmssZ
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    // Start time is the event time
    const startTime = formatDate(startDate);
    
    // End time is 3.5 hours after start
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 3);
    endDate.setMinutes(endDate.getMinutes() + 30);
    const endTime = formatDate(endDate);
    
    return { startTime, endTime };
  };

  // Create Google Calendar URL
  const createGoogleCalendarUrl = () => {
    const { startTime, endTime } = formatGoogleCalendarDate();
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Wine & Grind 4.0',
      dates: `${startTime}/${endTime}`,
      details: 'Join us for Wine & Grind 4.0 - where bold ideas meet real conversations. This exclusive event brings together founders, investors, and operators for meaningful networking and discussions.',
      location: 'Deli Vino, Natan Yonatan St 10, Netanya'
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
          <Check className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-gray-900 mb-3">
          ✅ You're registered for Wine & Grind 4.0!
        </h2>
        <p className="text-xl text-gray-600">
          Your spot is confirmed. We can't wait to see you there!
        </p>
      </div>

      {/* Registration Details */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Your Registration Details</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - User Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={data.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMTQwIiByeD0iNDAiIHJ5PSIyMCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {data.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{data.name}</div>
                <div className="text-sm text-gray-600">{data.work}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-semibold text-gray-900">{data.email}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="font-semibold text-gray-900">{data.phone}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Briefcase className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Work</div>
                <div className="font-semibold text-gray-900">{data.work}</div>
              </div>
            </div>
          </div>

          {/* Right Column - QR Code */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-sm text-gray-500 mb-3">Your Connection QR Code</div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <QRCodeSVG
                id="qr-code-svg"
                value={qrCodeValue}
                size={120}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center mb-3">
              Scan to connect with other attendees
            </div>
            <button
              onClick={downloadQRCode}
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              <span>Download QR Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="bg-gradient-to-br from-red-50 to-blue-50 rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Event Details</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-red-700" />
            <div>
              <div className="text-sm text-gray-500">Date</div>
              <div className="font-semibold text-gray-900">June 28th, 2025</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">Time</div>
              <div className="font-semibold text-gray-900">18:30 - 22:00</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-red-700" />
            <div>
              <div className="text-sm text-gray-500">Location</div>
              <div className="font-semibold text-gray-900">Deli Vino, Netanya</div>
            </div>
          </div>
        </div>
        
        {/* Add to Calendar Button */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center">
          <a
            href={createGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-white text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 px-6 py-3 rounded-xl transition-colors duration-200 font-medium"
          >
            <CalendarPlus className="h-5 w-5" />
            <span>Add to Google Calendar</span>
          </a>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium text-gray-900">Check your email</div>
              <div className="text-gray-600 text-sm">You'll receive a confirmation email with event details</div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium text-gray-900">Save the date</div>
              <div className="text-gray-600 text-sm">Add June 28th, 2025 to your calendar</div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium text-gray-900">Bring your QR code</div>
              <div className="text-gray-600 text-sm">Download or screenshot your QR code to connect with other attendees</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 mb-4">
          Questions about the event? We're here to help!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:info@winengrind.com"
            className="inline-flex items-center justify-center bg-gradient-to-r from-red-700 to-blue-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300 font-semibold"
          >
            Contact Us
          </a>
          <a
            href="tel:+972-584-447-7757"
            className="inline-flex items-center justify-center bg-white text-gray-700 px-6 py-3 rounded-full hover:bg-gray-50 transition-all duration-300 font-semibold border border-gray-200"
          >
            Call Us
          </a>
        </div>
      </div>
    </div>
  );
};

export default RegistrationConfirmation;