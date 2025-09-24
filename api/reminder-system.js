/**
 * Automated Reminder System
 * Sends time-based reminders (7d/24h/3h/30min) before events
 * with role-specific content
 */
const { EventService } = require('../src/services/eventService');
const twilio = require('twilio');
const { Resend } = require('resend');

// Initialize services
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const resend = new Resend(process.env.RESEND_API_KEY);

// Reminder intervals in milliseconds
const REMINDER_INTERVALS = {
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  TWENTY_FOUR_HOURS: 24 * 60 * 60 * 1000, 
  THREE_HOURS: 3 * 60 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000
};

// Role-specific content templates
const REMINDER_TEMPLATES = {
  speaker: {
    email: {
      subject: "🎤 Speaker Reminder: Wine & Grind Event Tomorrow",
      content: `
        Hi {name},
        
        This is your speaker brief for tomorrow's Wine & Grind event:
        
        📍 Location: {location}
        🕒 Time: {time}
        🎯 Your Speaking Slot: Please arrive 30 minutes early for tech check
        
        What to bring:
        - Your slides (we'll have them ready)
        - Wireless presenter remote (we have backup)
        - Water will be provided
        
        VIP entrance: Use the speaker entrance on the right side.
        
        Looking forward to your talk!
        Wine & Grind Team
      `
    },
    sms: "🎤 Speaker reminder: Wine & Grind event {time} at {location}. Arrive 30min early for tech check. Use VIP entrance. See you there!"
  },
  
  attendee: {
    email: {
      subject: "🍷 Wine & Grind Event Tomorrow - You're All Set!",
      content: `
        Hi {name},
        
        Get ready for an incredible Wine & Grind event tomorrow!
        
        📍 Location: {location}
        🕒 Time: {time}
        🎫 Your ticket is attached (also available in your dashboard)
        
        What to expect:
        - Networking with 50+ founders and investors
        - Curated conversations over wine
        - Exclusive insights from industry leaders
        
        Show your QR code at the door for quick check-in.
        
        See you there!
        Wine & Grind Team
      `
    },
    sms: "🍷 Wine & Grind event tomorrow {time} at {location}. Show QR code for quick entry. Can't wait to see you!"
  },
  
  vip: {
    email: {
      subject: "🌟 VIP Access: Wine & Grind Event Tomorrow",
      content: `
        Hi {name},
        
        Your VIP experience at Wine & Grind starts tomorrow:
        
        📍 Location: {location}
        🕒 VIP Early Access: {vip_time} (30 minutes before general admission)
        🥂 Welcome reception with premium wine selection
        
        VIP Benefits:
        - Priority seating in the founder's lounge
        - Exclusive pre-event networking
        - Direct access to speakers during breaks
        
        Use the VIP entrance on the left side.
        
        Looking forward to hosting you!
        Wine & Grind Team
      `
    },
    sms: "🌟 VIP reminder: Wine & Grind event tomorrow. Early access {vip_time} via VIP entrance (left side). Premium experience awaits!"
  }
};

/**
 * Get user role for reminder content
 */
function getUserRole(registration, eventSpeakers = []) {
  // Check if user is a speaker
  if (eventSpeakers.some(speaker => speaker.userId === registration.userId)) {
    return 'speaker';
  }
  
  // Check if user has VIP access
  if (registration.ticket_type?.toLowerCase().includes('vip') || 
      registration.role?.toLowerCase().includes('vip')) {
    return 'vip';
  }
  
  return 'attendee';
}

/**
 * Generate personalized content
 */
function generateContent(template, registration, event, role) {
  const eventDate = new Date(event.date);
  const vipTime = new Date(eventDate.getTime() - (30 * 60 * 1000)); // 30 min earlier
  
  const replacements = {
    '{name}': registration.name || 'there',
    '{location}': event.location,
    '{time}': eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }),
    '{vip_time}': vipTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }),
    '{event_name}': event.name || event.title
  };
  
  let content = template;
  Object.entries(replacements).forEach(([key, value]) => {
    content = content.replace(new RegExp(key, 'g'), value);
  });
  
  return content;
}

/**
 * Send email reminder
 */
async function sendEmailReminder(registration, event, role, reminderType) {
  try {
    const template = REMINDER_TEMPLATES[role]?.email;
    if (!template) return { success: false, error: 'No template found' };
    
    const subject = generateContent(template.subject, registration, event, role);
    const content = generateContent(template.content, registration, event, role);
    
    const result = await resend.emails.send({
      from: 'Wine & Grind <events@wineandgrind.com>',
      to: registration.email,
      subject: subject,
      html: content.replace(/\n/g, '<br>'),
      text: content,
      tags: [{
        name: 'reminder_type',
        value: reminderType
      }, {
        name: 'role',
        value: role
      }]
    });
    
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('❌ Error sending email reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS reminder
 */
async function sendSMSReminder(registration, event, role, reminderType) {
  try {
    if (!registration.phone) {
      return { success: false, error: 'No phone number' };
    }
    
    const template = REMINDER_TEMPLATES[role]?.sms;
    if (!template) return { success: false, error: 'No SMS template found' };
    
    const content = generateContent(template, registration, event, role);
    
    const result = await twilioClient.messages.create({
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: registration.phone,
      body: content
    });
    
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ Error sending SMS reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process reminders for a specific interval
 */
async function processReminders(intervalMs, reminderType) {
  try {
    console.log(`🔔 Processing ${reminderType} reminders...`);
    
    // Get all upcoming events
    const events = await EventService.getAllEvents();
    const now = new Date();
    
    // Find events that need reminders
    const eventsNeedingReminders = events.filter(event => {
      const eventDate = new Date(event.date);
      const timeDiff = eventDate.getTime() - now.getTime();
      
      // For daily cron, check if event is within the reminder window (±12 hours)
      // This allows us to catch all reminders that should have been sent
      const windowSize = 12 * 60 * 60 * 1000; // 12 hours
      return Math.abs(timeDiff - intervalMs) <= windowSize;
    });
    
    console.log(`📅 Found ${eventsNeedingReminders.length} events needing ${reminderType} reminders`);
    
    let totalSent = 0;
    let totalErrors = 0;
    
    for (const event of eventsNeedingReminders) {
      try {
        // Get registrations for this event
        const registrations = await EventService.getEventRegistrations(event.id);
        const confirmedRegistrations = registrations.filter(reg => 
          reg.status === 'confirmed' && !reg.checkedIn
        );
        
        // Get event speakers for role detection
        const eventDetails = await EventService.getEventById(event.id);
        const eventSpeakers = eventDetails?.speakers || [];
        
        console.log(`📧 Sending ${reminderType} reminders for event "${event.name}" to ${confirmedRegistrations.length} attendees`);
        
        for (const registration of confirmedRegistrations) {
          const role = getUserRole(registration, eventSpeakers);
          
          // Send email reminder
          const emailResult = await sendEmailReminder(registration, event, role, reminderType);
          if (emailResult.success) {
            totalSent++;
          } else {
            totalErrors++;
            console.error(`❌ Email reminder failed for ${registration.email}:`, emailResult.error);
          }
          
          // Send SMS reminder for critical timing (24h, 3h, 30min)
          if (['24h', '3h', '30min'].includes(reminderType) && registration.phone) {
            const smsResult = await sendSMSReminder(registration, event, role, reminderType);
            if (smsResult.success) {
              totalSent++;
            } else {
              totalErrors++;
              console.error(`❌ SMS reminder failed for ${registration.phone}:`, smsResult.error);
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Error processing reminders for event ${event.id}:`, error);
        totalErrors++;
      }
    }
    
    console.log(`✅ ${reminderType} reminders complete: ${totalSent} sent, ${totalErrors} errors`);
    return { sent: totalSent, errors: totalErrors };
    
  } catch (error) {
    console.error(`❌ Error in processReminders for ${reminderType}:`, error);
    throw error;
  }
}

/**
 * Main reminder processor - called by cron/scheduler
 */
async function processAllReminders() {
  console.log('🚀 Starting automated reminder system...');
  
  const results = {};
  
  try {
    // Process all reminder intervals
    results['7d'] = await processReminders(REMINDER_INTERVALS.SEVEN_DAYS, '7d');
    results['24h'] = await processReminders(REMINDER_INTERVALS.TWENTY_FOUR_HOURS, '24h');
    results['3h'] = await processReminders(REMINDER_INTERVALS.THREE_HOURS, '3h');
    results['30min'] = await processReminders(REMINDER_INTERVALS.THIRTY_MINUTES, '30min');
    
    console.log('✅ All reminder processing complete:', results);
    return { success: true, results };
    
  } catch (error) {
    console.error('❌ Error in reminder system:', error);
    return { success: false, error: error.message };
  }
}

// API handler for manual testing and Vercel cron
module.exports = async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }
  
  // Only allow POST requests or cron
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    const result = await processAllReminders();
    
    return res.status(200).json({
      success: true,
      message: 'Reminder system executed successfully',
      ...result
    });
    
  } catch (error) {
    console.error('❌ Reminder system API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export for external use
module.exports.processAllReminders = processAllReminders;
module.exports.processReminders = processReminders;