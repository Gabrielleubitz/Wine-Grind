const Mailjet = require('node-mailjet');

module.exports = async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { email, name, eventDetails } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email and name are required' 
      });
    }

    // Default event details if not provided
    const event = eventDetails || {
      name: "Wine & Grind 4.0",
      date: "June 28th, 2025", 
      time: "18:30 - 22:00",
      location: "Deli Vino, Netanya",
      address: "Natan Yonatan St 10, Netanya, Israel",
      description: "Join us for Wine & Grind 4.0 - where bold ideas meet real conversations. This exclusive event brings together founders, investors, and operators for meaningful networking and discussions."
    };

    // Get Mailjet credentials from environment variables
    const mailjetPublicKey = process.env.MJ_APIKEY_PUBLIC;
    const mailjetPrivateKey = process.env.MJ_APIKEY_PRIVATE;

    // Validate Mailjet credentials
    if (!mailjetPublicKey || !mailjetPrivateKey) {
      console.error('❌ Missing Mailjet credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Mailjet credentials not configured' 
      });
    }

    // Initialize Mailjet client
    const mailjet = Mailjet.apiConnect(
      mailjetPublicKey,
      mailjetPrivateKey
    );

    console.log(`📧 Sending registration confirmation email to ${email} for ${event.name}`);

    // Generate navigation and calendar links
    const encodedAddress = encodeURIComponent(event.address);
    const googleMapsUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
    const wazeUrl = `https://waze.com/ul?q=${encodedAddress}`;
    
    // Generate calendar links (Google Calendar format)
    const eventDateTime = new Date('2025-06-28T18:30:00+03:00'); // Israel timezone
    const endDateTime = new Date('2025-06-28T22:00:00+03:00');
    
    const formatCalendarDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };
    
    const calendarParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.name,
      dates: `${formatCalendarDate(eventDateTime)}/${formatCalendarDate(endDateTime)}`,
      details: event.description,
      location: event.address,
      trp: 'false'
    });
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;
    
    // Generate Outlook calendar URL
    const outlookParams = new URLSearchParams({
      rru: 'addevent',
      startdt: eventDateTime.toISOString(),
      enddt: endDateTime.toISOString(),
      subject: event.name,
      body: event.description,
      location: event.address
    });
    
    const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

    // Send email via Mailjet
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: email }],
          Subject: `✅ Registration Confirmed - ${event.name}`,
          TextPart: `
Hi ${name},

🎉 Great news! Your registration for ${event.name} has been confirmed!

EVENT DETAILS:
📅 Date: ${event.date}
⏰ Time: ${event.time}
📍 Location: ${event.location}
🏢 Address: ${event.address}

NAVIGATION:
• Google Maps: ${googleMapsUrl}
• Waze: ${wazeUrl}

ADD TO CALENDAR:
• Google Calendar: ${googleCalendarUrl}
• Outlook Calendar: ${outlookCalendarUrl}

WHAT TO EXPECT:
${event.description}

NEXT STEPS:
• Save the date and add to your calendar
• Bring your smartphone for QR code networking
• Arrive on time to make the most of networking opportunities
• Dress code: Business casual

We can't wait to see you there!

Questions? Reply to this email anytime.

– The Wine & Grind Team
          `,
          HTMLPart: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #C8102E 0%, #1976D2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Wine & Grind</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Where Bold Ideas Meet Real Conversations</p>
  </div>
  
  <!-- Success Message -->
  <div style="background: #4CAF50; color: white; text-align: center; padding: 15px;">
    <h2 style="margin: 0; font-size: 20px;">🎉 Registration Confirmed!</h2>
  </div>
  
  <!-- Content -->
  <div style="background: white; padding: 30px 20px;">
    
    <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 25px;">Great news! Your registration for <strong>${event.name}</strong> has been confirmed. We're excited to see you there!</p>
    
    <!-- Event Details Card -->
    <div style="background: #f8f9fa; border-left: 4px solid #C8102E; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="color: #C8102E; margin: 0 0 15px 0; font-size: 18px;">📅 Event Details</h3>
      
      <div style="margin-bottom: 12px;">
        <strong style="color: #333;">Event:</strong> ${event.name}
      </div>
      <div style="margin-bottom: 12px;">
        <strong style="color: #333;">Date:</strong> ${event.date}
      </div>
      <div style="margin-bottom: 12px;">
        <strong style="color: #333;">Time:</strong> ${event.time}
      </div>
      <div style="margin-bottom: 12px;">
        <strong style="color: #333;">Venue:</strong> ${event.location}
      </div>
      <div style="margin-bottom: 0;">
        <strong style="color: #333;">Address:</strong> ${event.address}
      </div>
    </div>
    
    <!-- Navigation Buttons -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1976D2; margin: 0 0 15px 0; font-size: 18px;">🗺️ Get Directions</h3>
      <div style="text-align: center;">
        <a href="${googleMapsUrl}" style="display: inline-block; background: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 5px 8px; font-weight: bold; font-size: 14px;">📍 Google Maps</a>
        <a href="${wazeUrl}" style="display: inline-block; background: #33CCFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 5px 8px; font-weight: bold; font-size: 14px;">🚗 Waze</a>
      </div>
    </div>
    
    <!-- Calendar Buttons -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1976D2; margin: 0 0 15px 0; font-size: 18px;">📅 Add to Calendar</h3>
      <div style="text-align: center;">
        <a href="${googleCalendarUrl}" style="display: inline-block; background: #34A853; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 5px 8px; font-weight: bold; font-size: 14px;">📅 Google Calendar</a>
        <a href="${outlookCalendarUrl}" style="display: inline-block; background: #0078D4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 5px 8px; font-weight: bold; font-size: 14px;">📅 Outlook</a>
      </div>
    </div>
    
    <!-- Event Description -->
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #1976D2; margin: 0 0 12px 0; font-size: 18px;">What to Expect</h3>
      <p style="margin: 0; line-height: 1.6; color: #333;">${event.description}</p>
    </div>
    
    <!-- Next Steps -->
    <div style="margin: 30px 0;">
      <h3 style="color: #C8102E; margin: 0 0 15px 0; font-size: 18px;">✅ Next Steps</h3>
      <ul style="padding-left: 20px; line-height: 1.8; color: #333;">
        <li><strong>Save the date</strong> - Click the calendar buttons above</li>
        <li><strong>Bring your smartphone</strong> - For QR code networking</li>
        <li><strong>Arrive on time</strong> - Make the most of networking opportunities</li>
        <li><strong>Dress code</strong> - Business casual</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0 20px 0; padding: 20px; background: linear-gradient(135deg, #C8102E 0%, #1976D2 100%); border-radius: 8px;">
      <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">We can't wait to see you there! 🥂</p>
    </div>
    
    <p style="text-align: center; color: #666; font-size: 14px;">Questions? Reply to this email anytime.</p>
    <p style="text-align: center; color: #333; font-weight: bold;">– The Wine & Grind Team</p>
    
  </div>
  
  <!-- Footer -->
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;">Wine & Grind</p>
    <p style="margin: 0; font-size: 12px; color: #999;">This email was sent because you registered for an event at winengrind.com</p>
  </div>
  
</div>
          `
        }
      ]
    });

    console.log('✅ Registration confirmation email sent successfully:', {
      to: email,
      status: response.response.status,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'Registration confirmation email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email Function Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle specific Mailjet errors
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.message || 'Email sending failed';
    }

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}