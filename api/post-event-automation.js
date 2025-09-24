/**
 * Post-Event Automation System
 * Thank you emails, surveys, NPS, certificates, and CRM integration
 */
const { EventService } = require('../src/services/eventService');
const { Resend } = require('resend');

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY);

// Survey and NPS templates
const EMAIL_TEMPLATES = {
  thankYou: {
    subject: "🍷 Thank You for Joining Wine & Grind!",
    content: `
      Hi {name},
      
      Thank you for attending "{event_name}" - it was incredible having you there!
      
      📂 **Event Resources:**
      {slides_links}
      
      📸 **Event Photos:** Coming soon to your dashboard
      
      💡 **What's Next:**
      - Connect with attendees on LinkedIn
      - Join our community Slack: {slack_link}
      - Mark your calendar for our next event
      
      🤝 **Made New Connections?**
      Don't forget to follow up with the amazing people you met!
      
      Looking forward to seeing you at the next Wine & Grind event.
      
      Cheers,
      The Wine & Grind Team
    `
  },
  
  survey: {
    subject: "📋 Quick Survey: How was Wine & Grind?",
    content: `
      Hi {name},
      
      Hope you enjoyed "{event_name}" yesterday!
      
      We'd love to get your feedback to make our next event even better.
      
      **📊 Quick 2-minute survey:** {survey_link}
      
      Your insights help us create better experiences for our community.
      
      Thanks for being part of Wine & Grind!
      
      Best,
      Wine & Grind Team
    `
  },
  
  nps: {
    subject: "⭐ Would you recommend Wine & Grind?",
    content: `
      Hi {name},
      
      Thanks again for joining us at "{event_name}"!
      
      **Quick question:** On a scale of 0-10, how likely are you to recommend Wine & Grind to a friend or colleague?
      
      {nps_buttons}
      
      Your feedback helps us improve and grow our community.
      
      Cheers,
      Wine & Grind Team
    `
  },
  
  certificate: {
    subject: "🏆 Your Wine & Grind Attendance Certificate",
    content: `
      Hi {name},
      
      Congratulations on attending "{event_name}"!
      
      As requested, please find your attendance certificate attached.
      
      **Event Details:**
      📅 Date: {event_date}
      📍 Location: {event_location}
      ⏰ Duration: 3 hours of networking and insights
      
      Feel free to add this to your professional development records or LinkedIn profile.
      
      Thank you for being part of our community!
      
      Best regards,
      Wine & Grind Team
    `
  }
};

/**
 * Generate NPS buttons HTML
 */
function generateNPSButtons(baseUrl, eventId, userId) {
  let buttonsHtml = '<div style="text-align: center; margin: 20px 0;">\n';
  
  for (let i = 0; i <= 10; i++) {
    const color = i <= 6 ? '#EF4444' : i <= 8 ? '#F59E0B' : '#10B981';
    buttonsHtml += `
      <a href="${baseUrl}/api/nps-response?eventId=${eventId}&userId=${userId}&score=${i}" 
         style="display: inline-block; margin: 2px; padding: 10px 15px; background: ${color}; 
                color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">${i}</a>
    `;
  }
  
  buttonsHtml += '\n</div>\n';
  buttonsHtml += '<div style="text-align: center; font-size: 12px; color: #666;">Click a number above (0 = Not likely, 10 = Very likely)</div>';
  
  return buttonsHtml;
}

/**
 * Generate certificate PDF
 */
async function generateCertificate(registration, event) {
  // This would integrate with a PDF generation service
  // For now, return a placeholder
  return {
    success: true,
    certificateUrl: `https://certificates.wineandgrind.com/${event.id}/${registration.userId}.pdf`,
    message: 'Certificate generation would be implemented here'
  };
}

/**
 * Send thank you emails to attendees
 */
async function sendThankYouEmails(eventId) {
  try {
    console.log(`📧 Sending thank you emails for event ${eventId}`);
    
    // Get event details
    const event = await EventService.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Get attendees who actually checked in
    const registrations = await EventService.getEventRegistrations(eventId);
    const checkedInAttendees = registrations.filter(reg => reg.checkedIn);
    
    console.log(`👥 Found ${checkedInAttendees.length} checked-in attendees`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const registration of checkedInAttendees) {
      try {
        const template = EMAIL_TEMPLATES.thankYou;
        
        // Replace template variables
        const content = template.content
          .replace(/{name}/g, registration.name)
          .replace(/{event_name}/g, event.name)
          .replace(/{slides_links}/g, event.slidesLinks || 'Available in your dashboard')
          .replace(/{slack_link}/g, process.env.SLACK_INVITE_URL || '#');
        
        const subject = template.subject
          .replace(/{event_name}/g, event.name);
        
        // Send email
        const result = await resend.emails.send({
          from: 'Wine & Grind <events@wineandgrind.com>',
          to: registration.email,
          subject: subject,
          html: content.replace(/\n/g, '<br>'),
          text: content,
          tags: [{
            name: 'type',
            value: 'thank-you'
          }, {
            name: 'event_id',
            value: eventId
          }]
        });
        
        successCount++;
        console.log(`✅ Thank you email sent to ${registration.name}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to send thank you email to ${registration.email}:`, error);
      }
    }
    
    return {
      success: true,
      sent: successCount,
      errors: errorCount,
      attendees: checkedInAttendees.length
    };
    
  } catch (error) {
    console.error('❌ Error sending thank you emails:', error);
    throw error;
  }
}

/**
 * Send survey requests
 */
async function sendSurveyRequests(eventId) {
  try {
    console.log(`📋 Sending survey requests for event ${eventId}`);
    
    const event = await EventService.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    const registrations = await EventService.getEventRegistrations(eventId);
    const checkedInAttendees = registrations.filter(reg => reg.checkedIn);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const registration of checkedInAttendees) {
      try {
        const template = EMAIL_TEMPLATES.survey;
        const surveyUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/survey?eventId=${eventId}&userId=${registration.userId}`;
        
        const content = template.content
          .replace(/{name}/g, registration.name)
          .replace(/{event_name}/g, event.name)
          .replace(/{survey_link}/g, surveyUrl);
        
        const subject = template.subject
          .replace(/{event_name}/g, event.name);
        
        const result = await resend.emails.send({
          from: 'Wine & Grind <feedback@wineandgrind.com>',
          to: registration.email,
          subject: subject,
          html: content.replace(/\n/g, '<br>'),
          text: content,
          tags: [{
            name: 'type',
            value: 'survey'
          }, {
            name: 'event_id',
            value: eventId
          }]
        });
        
        successCount++;
        console.log(`✅ Survey email sent to ${registration.name}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to send survey email to ${registration.email}:`, error);
      }
    }
    
    return {
      success: true,
      sent: successCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Error sending survey requests:', error);
    throw error;
  }
}

/**
 * Send NPS requests
 */
async function sendNPSRequests(eventId) {
  try {
    console.log(`⭐ Sending NPS requests for event ${eventId}`);
    
    const event = await EventService.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    const registrations = await EventService.getEventRegistrations(eventId);
    const checkedInAttendees = registrations.filter(reg => reg.checkedIn);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const registration of checkedInAttendees) {
      try {
        const template = EMAIL_TEMPLATES.nps;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        const npsButtons = generateNPSButtons(baseUrl, eventId, registration.userId);
        
        const content = template.content
          .replace(/{name}/g, registration.name)
          .replace(/{event_name}/g, event.name)
          .replace(/{nps_buttons}/g, npsButtons);
        
        const subject = template.subject
          .replace(/{event_name}/g, event.name);
        
        const result = await resend.emails.send({
          from: 'Wine & Grind <feedback@wineandgrind.com>',
          to: registration.email,
          subject: subject,
          html: content.replace(/\n/g, '<br>'),
          tags: [{
            name: 'type',
            value: 'nps'
          }, {
            name: 'event_id',
            value: eventId
          }]
        });
        
        successCount++;
        console.log(`✅ NPS email sent to ${registration.name}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to send NPS email to ${registration.email}:`, error);
      }
    }
    
    return {
      success: true,
      sent: successCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Error sending NPS requests:', error);
    throw error;
  }
}

/**
 * Generate attendance CSV for CRM integration
 */
async function generateAttendanceCSV(eventId) {
  try {
    const event = await EventService.getEventById(eventId);
    const registrations = await EventService.getEventRegistrations(eventId);
    const checkedInAttendees = registrations.filter(reg => reg.checkedIn);
    
    // CSV headers
    const headers = [
      'Name', 'Email', 'Phone', 'Company', 'LinkedIn', 'Role', 
      'Ticket Type', 'Checked In', 'Check-in Time', 'Event', 'Event Date'
    ];
    
    // CSV data
    const csvData = checkedInAttendees.map(reg => [
      reg.name || '',
      reg.email || '',
      reg.phone || '',
      reg.work || '',
      reg.linkedinUsername || '',
      reg.role || 'attendee',
      reg.ticket_type || '',
      reg.checkedIn ? 'Yes' : 'No',
      reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleString() : '',
      event.name || '',
      event.date ? new Date(event.date).toLocaleDateString() : ''
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');
    
    return {
      success: true,
      csvContent,
      attendeeCount: checkedInAttendees.length,
      filename: `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_attendance_${new Date().toISOString().split('T')[0]}.csv`
    };
    
  } catch (error) {
    console.error('❌ Error generating attendance CSV:', error);
    throw error;
  }
}

/**
 * Main post-event automation processor
 */
async function processPostEventAutomation() {
  try {
    console.log('🚀 Starting post-event automation...');
    
    // Get events that ended in the last 24 hours
    const events = await EventService.getAllEvents();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentlyEndedEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      const eventEndTime = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // Assume 4-hour events
      
      return eventEndTime > yesterday && eventEndTime <= now;
    });
    
    console.log(`📅 Found ${recentlyEndedEvents.length} recently ended events`);
    
    const results = {};
    
    for (const event of recentlyEndedEvents) {
      try {
        console.log(`🎯 Processing post-event automation for: ${event.name}`);
        
        // Send thank you emails immediately
        const thankYouResult = await sendThankYouEmails(event.id);
        
        // Send survey requests (24h after event)
        const surveyResult = await sendSurveyRequests(event.id);
        
        // Generate CSV for admin
        const csvResult = await generateAttendanceCSV(event.id);
        
        results[event.id] = {
          eventName: event.name,
          thankYou: thankYouResult,
          survey: surveyResult,
          csv: csvResult,
          success: true
        };
        
        // Schedule NPS requests for 24h later (would need separate cron)
        console.log(`📋 NPS requests scheduled for ${event.name}`);
        
      } catch (error) {
        console.error(`❌ Error processing post-event for ${event.id}:`, error);
        results[event.id] = {
          eventName: event.name,
          success: false,
          error: error.message
        };
      }
    }
    
    console.log('✅ Post-event automation complete');
    return {
      success: true,
      eventsProcessed: recentlyEndedEvents.length,
      results
    };
    
  } catch (error) {
    console.error('❌ Error in post-event automation:', error);
    throw error;
  }
}

// API handler
module.exports = async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }
  
  try {
    if (req.method === 'GET') {
      // Automated processing (called by cron)
      const result = await processPostEventAutomation();
      return res.status(200).json(result);
      
    } else if (req.method === 'POST') {
      // Manual actions
      const { action, eventId } = req.body;
      
      switch (action) {
        case 'send-thank-you':
          const thankYouResult = await sendThankYouEmails(eventId);
          return res.status(200).json(thankYouResult);
          
        case 'send-survey':
          const surveyResult = await sendSurveyRequests(eventId);
          return res.status(200).json(surveyResult);
          
        case 'send-nps':
          const npsResult = await sendNPSRequests(eventId);
          return res.status(200).json(npsResult);
          
        case 'generate-csv':
          const csvResult = await generateAttendanceCSV(eventId);
          
          // Return CSV as download
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${csvResult.filename}"`);
          return res.send(csvResult.csvContent);
          
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('❌ Post-event automation API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export functions
module.exports.processPostEventAutomation = processPostEventAutomation;
module.exports.sendThankYouEmails = sendThankYouEmails;
module.exports.sendSurveyRequests = sendSurveyRequests;
module.exports.sendNPSRequests = sendNPSRequests;
module.exports.generateAttendanceCSV = generateAttendanceCSV;