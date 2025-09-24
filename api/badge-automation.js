/**
 * Automated Badge Generation System
 * Night-before cron creates badges for all registered users
 */
const { EventService } = require('../src/services/eventService');

/**
 * Generate badges for events happening tomorrow
 */
async function generateTomorrowBadges() {
  try {
    console.log('🎫 Starting automated badge generation...');
    
    // Get all events
    const events = await EventService.getAllEvents();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find events happening tomorrow
    const tomorrowEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === tomorrow.toDateString();
    });
    
    console.log(`📅 Found ${tomorrowEvents.length} events happening tomorrow`);
    
    let totalBadgesGenerated = 0;
    const results = [];
    
    for (const event of tomorrowEvents) {
      try {
        console.log(`🎯 Processing event: ${event.name}`);
        
        // Get all confirmed registrations that haven't checked in
        const registrations = await EventService.getEventRegistrations(event.id);
        const eligibleRegistrations = registrations.filter(reg => 
          reg.status === 'confirmed' && !reg.checkedIn
        );
        
        console.log(`👥 Found ${eligibleRegistrations.length} eligible attendees for badges`);
        
        if (eligibleRegistrations.length === 0) {
          results.push({
            eventId: event.id,
            eventName: event.name,
            success: true,
            badgesGenerated: 0,
            message: 'No eligible attendees found'
          });
          continue;
        }
        
        // Generate PDF badges
        const badgeParams = new URLSearchParams({
          eventId: event.id,
          backgroundImageUrl: event.backgroundImageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
          logoUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/react.svg',
          overlayOpacity: '25',
          headerColor: '#7A1E1E'
        });
        
        // Call the badge generation API
        const badgeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/event-badges-enhanced?${badgeParams}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf',
          }
        });
        
        if (badgeResponse.ok) {
          // Store the PDF or send to admin email
          const pdfBuffer = await badgeResponse.arrayBuffer();
          console.log(`✅ Generated ${eligibleRegistrations.length} badges for ${event.name}`);
          
          // TODO: Store PDF in cloud storage or email to admin
          // For now, just log success
          
          totalBadgesGenerated += eligibleRegistrations.length;
          
          results.push({
            eventId: event.id,
            eventName: event.name,
            success: true,
            badgesGenerated: eligibleRegistrations.length,
            pdfSize: pdfBuffer.byteLength
          });
          
        } else {
          throw new Error(`Badge generation failed: ${badgeResponse.statusText}`);
        }
        
      } catch (error) {
        console.error(`❌ Error generating badges for event ${event.id}:`, error);
        results.push({
          eventId: event.id,
          eventName: event.name,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`🎊 Badge automation complete: ${totalBadgesGenerated} total badges generated`);
    
    return {
      success: true,
      totalBadgesGenerated,
      eventsProcessed: tomorrowEvents.length,
      results
    };
    
  } catch (error) {
    console.error('❌ Error in badge automation:', error);
    throw error;
  }
}

/**
 * Generate on-demand badge for late signup or walk-in
 */
async function generateOnDemandBadge(eventId, userId) {
  try {
    console.log(`🆘 Generating on-demand badge for user ${userId} at event ${eventId}`);
    
    // Get event details
    const event = await EventService.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Get user registration
    const registrations = await EventService.getEventRegistrations(eventId);
    const userRegistration = registrations.find(reg => reg.userId === userId);
    
    if (!userRegistration) {
      throw new Error('User registration not found');
    }
    
    // Generate single badge
    const badgeParams = new URLSearchParams({
      eventId: eventId,
      userId: userId,
      backgroundImageUrl: event.backgroundImageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
      logoUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/react.svg',
      overlayOpacity: '25',
      headerColor: '#7A1E1E'
    });
    
    const badgeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/event-badges-enhanced?${badgeParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      }
    });
    
    if (!badgeResponse.ok) {
      throw new Error(`Badge generation failed: ${badgeResponse.statusText}`);
    }
    
    const pdfBuffer = await badgeResponse.arrayBuffer();
    
    console.log(`✅ Generated on-demand badge for ${userRegistration.name}`);
    
    return {
      success: true,
      pdfBuffer,
      userRegistration
    };
    
  } catch (error) {
    console.error('❌ Error generating on-demand badge:', error);
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
    if (req.method === 'POST') {
      // Handle on-demand badge generation
      const { eventId, userId } = req.body;
      
      if (!eventId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'eventId and userId are required'
        });
      }
      
      const result = await generateOnDemandBadge(eventId, userId);
      
      // Return the PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="badge-${userId}.pdf"`);
      return res.send(Buffer.from(result.pdfBuffer));
      
    } else if (req.method === 'GET') {
      // Handle automated badge generation (called by cron)
      const result = await generateTomorrowBadges();
      
      return res.status(200).json({
        success: true,
        message: 'Badge automation completed successfully',
        ...result
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('❌ Badge automation API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export functions
module.exports.generateTomorrowBadges = generateTomorrowBadges;
module.exports.generateOnDemandBadge = generateOnDemandBadge;