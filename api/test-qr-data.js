// Simple API to test what QR code data is being generated for PDF badges
const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse existing instance if available)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

module.exports = async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ error: 'Missing eventId parameter' });
    }

    console.log(`🔍 Testing QR code data for event: ${eventId}`);
    
    // Fetch attendees (same logic as badge API)
    const registrationsSnapshot = await db.collection('events').doc(eventId).collection('registrations').get();
    
    const qrTestData = [];
    registrationsSnapshot.forEach(doc => {
      const registration = doc.data();
      const userId = doc.id;
      
      // Same logic as in the badge API
      const qrCodeUrl = registration.qrCodeUrl || registration.ticket_url || `https://winengrind.com/connect?to=${userId}&event=${eventId}`;
      
      qrTestData.push({
        userId: userId,
        userName: registration.name || 'Unknown',
        hasExistingQrUrl: !!registration.qrCodeUrl,
        hasTicketUrl: !!registration.ticket_url,
        generatedQrUrl: qrCodeUrl,
        isTemplateGenerated: !registration.qrCodeUrl && !registration.ticket_url
      });
    });

    console.log(`📊 QR Code test results:`, qrTestData);

    return res.status(200).json({
      success: true,
      eventId: eventId,
      totalAttendees: qrTestData.length,
      qrData: qrTestData,
      analysis: {
        withExistingQrUrl: qrTestData.filter(item => item.hasExistingQrUrl).length,
        withTicketUrl: qrTestData.filter(item => item.hasTicketUrl).length,
        generatedFromTemplate: qrTestData.filter(item => item.isTemplateGenerated).length
      }
    });

  } catch (error) {
    console.error('❌ QR Test Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
};