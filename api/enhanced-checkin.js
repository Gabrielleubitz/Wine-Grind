/**
 * Enhanced Check-in System
 * QR scanning with role display, duplicate prevention, and VIP alerts
 */
const { EventService } = require('../src/services/eventService');
const { db } = require('../src/firebase/config');
const { doc, updateDoc, getDoc, addDoc, collection } = require('firebase/firestore');

// Webhook URLs for notifications (replace with actual webhook URLs)
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/**
 * Role detection and display
 */
function getUserRole(registration, eventSpeakers = []) {
  // Check badge role first (manual override)
  if (registration.badgeRole) {
    return {
      role: registration.badgeRole.toLowerCase(),
      display: registration.badgeRole,
      color: getRoleColor(registration.badgeRole.toLowerCase())
    };
  }
  
  // Check if user is a speaker
  if (eventSpeakers.some(speaker => speaker.userId === registration.userId)) {
    return {
      role: 'speaker',
      display: 'Speaker',
      color: '#7C3AED' // Purple
    };
  }
  
  // Check ticket type for VIP
  if (registration.ticket_type?.toLowerCase().includes('vip')) {
    return {
      role: 'vip',
      display: 'VIP',
      color: '#F59E0B' // Gold
    };
  }
  
  // Check role field
  if (registration.role) {
    const role = registration.role.toLowerCase();
    return {
      role: role,
      display: registration.role,
      color: getRoleColor(role)
    };
  }
  
  return {
    role: 'attendee',
    display: 'Attendee',
    color: '#6B7280' // Gray
  };
}

/**
 * Get role color
 */
function getRoleColor(role) {
  const colors = {
    'admin': '#DC2626',      // Red
    'speaker': '#7C3AED',    // Purple
    'vip': '#F59E0B',        // Gold
    'sponsor': '#059669',    // Green
    'investor': '#0EA5E9',   // Blue
    'founder': '#EA580C',    // Orange
    'attendee': '#6B7280'    // Gray
  };
  
  return colors[role.toLowerCase()] || '#6B7280';
}

/**
 * Send VIP/Speaker arrival notification
 */
async function sendVIPAlert(registration, event, roleInfo) {
  try {
    if (!['vip', 'speaker'].includes(roleInfo.role)) {
      return; // Only send alerts for VIPs and speakers
    }
    
    const message = `🌟 **${roleInfo.display} Arrived!**\n` +
                   `**Name:** ${registration.name}\n` +
                   `**Event:** ${event.name}\n` +
                   `**Time:** ${new Date().toLocaleTimeString()}\n` +
                   `**Company:** ${registration.work || 'Not specified'}`;
    
    // Send to Slack
    if (SLACK_WEBHOOK_URL) {
      try {
        await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            username: 'Wine & Grind Check-in',
            icon_emoji: ':wine_glass:'
          })
        });
      } catch (error) {
        console.error('❌ Error sending Slack notification:', error);
      }
    }
    
    // Send to Discord
    if (DISCORD_WEBHOOK_URL) {
      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: message,
            username: 'Wine & Grind Check-in'
          })
        });
      } catch (error) {
        console.error('❌ Error sending Discord notification:', error);
      }
    }
    
    console.log(`🔔 VIP alert sent for ${registration.name} (${roleInfo.display})`);
  } catch (error) {
    console.error('❌ Error sending VIP alert:', error);
  }
}

/**
 * Process QR code check-in
 */
async function processQRCheckIn(qrData, eventId, adminUserId) {
  try {
    console.log(`🔍 Processing QR check-in: ${qrData} for event ${eventId}`);
    
    // Parse QR code data
    let userData;
    try {
      // QR might be JSON or just a userId
      if (qrData.startsWith('{')) {
        userData = JSON.parse(qrData);
      } else {
        userData = { userId: qrData };
      }
    } catch (error) {
      return {
        success: false,
        type: 'invalid-qr',
        message: 'Invalid QR code format',
        error: error.message
      };
    }
    
    if (!userData.userId) {
      return {
        success: false,
        type: 'invalid-qr',
        message: 'QR code does not contain user ID'
      };
    }
    
    // Get event details
    const event = await EventService.getEventById(eventId);
    if (!event) {
      return {
        success: false,
        type: 'event-not-found',
        message: 'Event not found'
      };
    }
    
    // Get registrations for this event
    const registrations = await EventService.getEventRegistrations(eventId);
    const userRegistration = registrations.find(reg => 
      reg.userId === userData.userId || reg.email === userData.email
    );
    
    if (!userRegistration) {
      return {
        success: false,
        type: 'not-registered',
        message: `${userData.name || 'User'} is not registered for this event`,
        registration: userData
      };
    }
    
    // Check if already checked in
    if (userRegistration.checkedIn) {
      return {
        success: false,
        type: 'already-checked',
        message: `${userRegistration.name} is already checked in`,
        registration: userRegistration,
        checkedInAt: userRegistration.checkedInAt
      };
    }
    
    // Get role information
    const eventSpeakers = event.speakers || [];
    const roleInfo = getUserRole(userRegistration, eventSpeakers);
    
    // Perform check-in
    const checkInTime = new Date();
    const registrationRef = doc(db, 'eventRegistrations', userRegistration.id);
    
    await updateDoc(registrationRef, {
      checkedIn: true,
      checkedInAt: checkInTime,
      checkedInBy: adminUserId
    });
    
    // Log check-in activity
    await addDoc(collection(db, 'checkInLogs'), {
      eventId: eventId,
      userId: userRegistration.userId,
      registrationId: userRegistration.id,
      checkedInAt: checkInTime,
      checkedInBy: adminUserId,
      role: roleInfo.role,
      method: 'qr-scan'
    });
    
    // Send VIP/Speaker alerts
    await sendVIPAlert(userRegistration, event, roleInfo);
    
    console.log(`✅ Successfully checked in ${userRegistration.name} (${roleInfo.display})`);
    
    return {
      success: true,
      type: 'success',
      message: `${userRegistration.name} checked in successfully`,
      registration: {
        ...userRegistration,
        checkedIn: true,
        checkedInAt: checkInTime
      },
      role: roleInfo,
      event: {
        id: event.id,
        name: event.name,
        date: event.date
      }
    };
    
  } catch (error) {
    console.error('❌ Error processing QR check-in:', error);
    return {
      success: false,
      type: 'error',
      message: 'Check-in failed due to system error',
      error: error.message
    };
  }
}

/**
 * Get door list based on role
 */
async function getDoorList(eventId, role = 'all') {
  try {
    const registrations = await EventService.getEventRegistrations(eventId);
    const event = await EventService.getEventById(eventId);
    const eventSpeakers = event?.speakers || [];
    
    const processedRegistrations = registrations
      .filter(reg => reg.status === 'confirmed')
      .map(reg => {
        const roleInfo = getUserRole(reg, eventSpeakers);
        return {
          ...reg,
          roleInfo
        };
      });
    
    // Filter by role if specified
    let filteredRegistrations = processedRegistrations;
    if (role !== 'all') {
      filteredRegistrations = processedRegistrations.filter(reg => 
        reg.roleInfo.role === role.toLowerCase()
      );
    }
    
    // Sort by role priority, then by name
    const rolePriority = { 'speaker': 1, 'vip': 2, 'sponsor': 3, 'attendee': 4 };
    filteredRegistrations.sort((a, b) => {
      const aPriority = rolePriority[a.roleInfo.role] || 5;
      const bPriority = rolePriority[b.roleInfo.role] || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.name.localeCompare(b.name);
    });
    
    return {
      success: true,
      registrations: filteredRegistrations,
      total: filteredRegistrations.length,
      checkedIn: filteredRegistrations.filter(r => r.checkedIn).length,
      remaining: filteredRegistrations.filter(r => !r.checkedIn).length
    };
    
  } catch (error) {
    console.error('❌ Error getting door list:', error);
    throw error;
  }
}

/**
 * Get live capacity information
 */
async function getLiveCapacity(eventId) {
  try {
    const event = await EventService.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    const registrations = await EventService.getEventRegistrations(eventId);
    const confirmedRegistrations = registrations.filter(reg => reg.status === 'confirmed');
    const checkedInCount = confirmedRegistrations.filter(reg => reg.checkedIn).length;
    
    const capacity = event.capacity || 100; // Default capacity
    const availableSpots = capacity - confirmedRegistrations.length;
    const remainingToCheckIn = confirmedRegistrations.length - checkedInCount;
    
    return {
      success: true,
      capacity: capacity,
      registered: confirmedRegistrations.length,
      checkedIn: checkedInCount,
      remainingToCheckIn: remainingToCheckIn,
      availableSpots: Math.max(0, availableSpots),
      occupancyRate: Math.round((checkedInCount / capacity) * 100)
    };
    
  } catch (error) {
    console.error('❌ Error getting live capacity:', error);
    throw error;
  }
}

// API handler
module.exports = async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    const { action, qrData, eventId, adminUserId, role } = req.body;
    
    switch (action) {
      case 'qr-checkin':
        if (!qrData || !eventId || !adminUserId) {
          return res.status(400).json({
            success: false,
            error: 'qrData, eventId, and adminUserId are required'
          });
        }
        
        const checkInResult = await processQRCheckIn(qrData, eventId, adminUserId);
        return res.status(200).json(checkInResult);
        
      case 'door-list':
        if (!eventId) {
          return res.status(400).json({
            success: false,
            error: 'eventId is required'
          });
        }
        
        const doorList = await getDoorList(eventId, role);
        return res.status(200).json(doorList);
        
      case 'live-capacity':
        if (!eventId) {
          return res.status(400).json({
            success: false,
            error: 'eventId is required'
          });
        }
        
        const capacity = await getLiveCapacity(eventId);
        return res.status(200).json(capacity);
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions: qr-checkin, door-list, live-capacity'
        });
    }
    
  } catch (error) {
    console.error('❌ Enhanced check-in API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export functions
module.exports.processQRCheckIn = processQRCheckIn;
module.exports.getDoorList = getDoorList;
module.exports.getLiveCapacity = getLiveCapacity;