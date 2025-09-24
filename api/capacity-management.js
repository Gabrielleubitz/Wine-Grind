/**
 * Agenda & Capacity Management System
 * Session RSVPs with caps, waitlists, and live capacity tracking
 */
const { EventService } = require('../src/services/eventService');
const { db } = require('../src/firebase/config');
const { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  getDoc 
} = require('firebase/firestore');

/**
 * Create or update event session
 */
async function createSession(eventId, sessionData) {
  try {
    const session = {
      eventId,
      title: sessionData.title,
      description: sessionData.description || '',
      speaker: sessionData.speaker || '',
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      capacity: sessionData.capacity || 50,
      currentAttendees: 0,
      waitlistCount: 0,
      location: sessionData.location || '',
      type: sessionData.type || 'session', // session, workshop, networking
      status: 'open', // open, full, closed
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const sessionRef = await addDoc(collection(db, 'eventSessions'), session);
    
    console.log(`✅ Created session: ${sessionData.title}`);
    
    return {
      success: true,
      sessionId: sessionRef.id,
      session: { id: sessionRef.id, ...session }
    };
    
  } catch (error) {
    console.error('❌ Error creating session:', error);
    throw error;
  }
}

/**
 * Get sessions for an event
 */
async function getEventSessions(eventId) {
  try {
    const q = query(
      collection(db, 'eventSessions'),
      where('eventId', '==', eventId)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by start time
    sessions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    return {
      success: true,
      sessions
    };
    
  } catch (error) {
    console.error('❌ Error getting sessions:', error);
    throw error;
  }
}

/**
 * RSVP to a session
 */
async function rsvpToSession(sessionId, userId, userInfo) {
  try {
    // Get session details
    const sessionDoc = await getDoc(doc(db, 'eventSessions', sessionId));
    if (!sessionDoc.exists()) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    const session = sessionDoc.data();
    
    // Check if user is already registered
    const existingRSVPQuery = query(
      collection(db, 'sessionRSVPs'),
      where('sessionId', '==', sessionId),
      where('userId', '==', userId)
    );
    
    const existingRSVPs = await getDocs(existingRSVPQuery);
    if (!existingRSVPs.empty) {
      return {
        success: false,
        error: 'Already registered for this session',
        status: existingRSVPs.docs[0].data().status
      };
    }
    
    // Check capacity
    const currentRSVPsQuery = query(
      collection(db, 'sessionRSVPs'),
      where('sessionId', '==', sessionId),
      where('status', '==', 'confirmed')
    );
    
    const currentRSVPs = await getDocs(currentRSVPsQuery);
    const currentCount = currentRSVPs.size;
    
    const rsvpStatus = currentCount < session.capacity ? 'confirmed' : 'waitlisted';
    
    // Create RSVP
    const rsvp = {
      sessionId,
      userId,
      userName: userInfo.name,
      userEmail: userInfo.email,
      status: rsvpStatus,
      registeredAt: new Date(),
      position: rsvpStatus === 'waitlisted' ? (session.waitlistCount + 1) : null
    };
    
    const rsvpRef = await addDoc(collection(db, 'sessionRSVPs'), rsvp);
    
    // Update session counters
    const updateData = {
      updatedAt: new Date()
    };
    
    if (rsvpStatus === 'confirmed') {
      updateData.currentAttendees = currentCount + 1;
      
      // Check if session is now full
      if (currentCount + 1 >= session.capacity) {
        updateData.status = 'full';
      }
    } else {
      updateData.waitlistCount = (session.waitlistCount || 0) + 1;
    }
    
    await updateDoc(doc(db, 'eventSessions', sessionId), updateData);
    
    console.log(`✅ RSVP created for ${userInfo.name} - Status: ${rsvpStatus}`);
    
    return {
      success: true,
      rsvpId: rsvpRef.id,
      status: rsvpStatus,
      position: rsvp.position,
      message: rsvpStatus === 'confirmed' 
        ? 'Successfully registered for session!'
        : `Added to waitlist (position ${rsvp.position})`
    };
    
  } catch (error) {
    console.error('❌ Error creating RSVP:', error);
    throw error;
  }
}

/**
 * Cancel RSVP
 */
async function cancelRSVP(sessionId, userId) {
  try {
    // Find user's RSVP
    const rsvpQuery = query(
      collection(db, 'sessionRSVPs'),
      where('sessionId', '==', sessionId),
      where('userId', '==', userId)
    );
    
    const rsvpDocs = await getDocs(rsvpQuery);
    if (rsvpDocs.empty) {
      return {
        success: false,
        error: 'No RSVP found for this session'
      };
    }
    
    const rsvpDoc = rsvpDocs.docs[0];
    const rsvp = rsvpDoc.data();
    
    // Delete the RSVP
    await deleteDoc(doc(db, 'sessionRSVPs', rsvpDoc.id));
    
    // Get session details
    const sessionDoc = await getDoc(doc(db, 'eventSessions', sessionId));
    const session = sessionDoc.data();
    
    // If this was a confirmed RSVP, promote someone from waitlist
    if (rsvp.status === 'confirmed') {
      // Get waitlisted users
      const waitlistQuery = query(
        collection(db, 'sessionRSVPs'),
        where('sessionId', '==', sessionId),
        where('status', '==', 'waitlisted')
      );
      
      const waitlistDocs = await getDocs(waitlistQuery);
      
      if (!waitlistDocs.empty) {
        // Find the first person in waitlist (lowest position)
        let firstInLine = null;
        let firstPosition = Infinity;
        
        waitlistDocs.forEach(doc => {
          const data = doc.data();
          if (data.position && data.position < firstPosition) {
            firstPosition = data.position;
            firstInLine = { id: doc.id, ...data };
          }
        });
        
        if (firstInLine) {
          // Promote to confirmed
          await updateDoc(doc(db, 'sessionRSVPs', firstInLine.id), {
            status: 'confirmed',
            position: null,
            promotedAt: new Date()
          });
          
          // Update session waitlist count
          await updateDoc(doc(db, 'eventSessions', sessionId), {
            waitlistCount: Math.max(0, (session.waitlistCount || 0) - 1),
            status: 'open', // Reopen since there's now a spot
            updatedAt: new Date()
          });
          
          // TODO: Send notification to promoted user
          console.log(`✅ Promoted ${firstInLine.userName} from waitlist`);
          
          return {
            success: true,
            message: 'RSVP cancelled successfully',
            promoted: {
              userId: firstInLine.userId,
              userName: firstInLine.userName
            }
          };
        }
      }
      
      // No one to promote, just reduce current attendees
      await updateDoc(doc(db, 'eventSessions', sessionId), {
        currentAttendees: Math.max(0, session.currentAttendees - 1),
        status: 'open',
        updatedAt: new Date()
      });
    } else {
      // Waitlisted cancellation - just reduce waitlist count and update positions
      await updateDoc(doc(db, 'eventSessions', sessionId), {
        waitlistCount: Math.max(0, (session.waitlistCount || 0) - 1),
        updatedAt: new Date()
      });
      
      // Update positions of other waitlisted users
      const remainingWaitlistQuery = query(
        collection(db, 'sessionRSVPs'),
        where('sessionId', '==', sessionId),
        where('status', '==', 'waitlisted')
      );
      
      const remainingDocs = await getDocs(remainingWaitlistQuery);
      const updates = [];
      
      remainingDocs.forEach(doc => {
        const data = doc.data();
        if (data.position && data.position > rsvp.position) {
          updates.push(
            updateDoc(doc.ref, { position: data.position - 1 })
          );
        }
      });
      
      await Promise.all(updates);
    }
    
    console.log(`✅ RSVP cancelled for ${rsvp.userName}`);
    
    return {
      success: true,
      message: 'RSVP cancelled successfully'
    };
    
  } catch (error) {
    console.error('❌ Error cancelling RSVP:', error);
    throw error;
  }
}

/**
 * Get session attendees and waitlist
 */
async function getSessionAttendees(sessionId) {
  try {
    const rsvpQuery = query(
      collection(db, 'sessionRSVPs'),
      where('sessionId', '==', sessionId)
    );
    
    const rsvpDocs = await getDocs(rsvpQuery);
    
    const confirmed = [];
    const waitlisted = [];
    
    rsvpDocs.forEach(doc => {
      const rsvp = { id: doc.id, ...doc.data() };
      
      if (rsvp.status === 'confirmed') {
        confirmed.push(rsvp);
      } else if (rsvp.status === 'waitlisted') {
        waitlisted.push(rsvp);
      }
    });
    
    // Sort waitlisted by position
    waitlisted.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    return {
      success: true,
      confirmed,
      waitlisted,
      totalConfirmed: confirmed.length,
      totalWaitlisted: waitlisted.length
    };
    
  } catch (error) {
    console.error('❌ Error getting session attendees:', error);
    throw error;
  }
}

/**
 * Get live capacity data for all sessions
 */
async function getLiveCapacityData(eventId) {
  try {
    const sessionsResult = await getEventSessions(eventId);
    const sessions = sessionsResult.sessions;
    
    const capacityData = await Promise.all(
      sessions.map(async (session) => {
        const attendeesResult = await getSessionAttendees(session.id);
        
        return {
          sessionId: session.id,
          title: session.title,
          capacity: session.capacity,
          confirmed: attendeesResult.totalConfirmed,
          waitlisted: attendeesResult.totalWaitlisted,
          available: Math.max(0, session.capacity - attendeesResult.totalConfirmed),
          occupancyRate: Math.round((attendeesResult.totalConfirmed / session.capacity) * 100),
          status: session.status,
          startTime: session.startTime
        };
      })
    );
    
    return {
      success: true,
      capacityData,
      totalSessions: sessions.length
    };
    
  } catch (error) {
    console.error('❌ Error getting live capacity data:', error);
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
    const { action } = req.body || req.query;
    
    switch (action) {
      case 'create-session':
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        
        const { eventId, sessionData } = req.body;
        const sessionResult = await createSession(eventId, sessionData);
        return res.status(200).json(sessionResult);
        
      case 'get-sessions':
        const { eventId: getEventId } = req.query;
        const sessionsResult = await getEventSessions(getEventId);
        return res.status(200).json(sessionsResult);
        
      case 'rsvp':
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        
        const { sessionId, userId, userInfo } = req.body;
        const rsvpResult = await rsvpToSession(sessionId, userId, userInfo);
        return res.status(200).json(rsvpResult);
        
      case 'cancel-rsvp':
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        
        const { sessionId: cancelSessionId, userId: cancelUserId } = req.body;
        const cancelResult = await cancelRSVP(cancelSessionId, cancelUserId);
        return res.status(200).json(cancelResult);
        
      case 'get-attendees':
        const { sessionId: attendeesSessionId } = req.query;
        const attendeesResult = await getSessionAttendees(attendeesSessionId);
        return res.status(200).json(attendeesResult);
        
      case 'live-capacity':
        const { eventId: capacityEventId } = req.query;
        const capacityResult = await getLiveCapacityData(capacityEventId);
        return res.status(200).json(capacityResult);
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported: create-session, get-sessions, rsvp, cancel-rsvp, get-attendees, live-capacity'
        });
    }
    
  } catch (error) {
    console.error('❌ Capacity management API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export functions
module.exports.createSession = createSession;
module.exports.getEventSessions = getEventSessions;
module.exports.rsvpToSession = rsvpToSession;
module.exports.cancelRSVP = cancelRSVP;
module.exports.getSessionAttendees = getSessionAttendees;
module.exports.getLiveCapacityData = getLiveCapacityData;