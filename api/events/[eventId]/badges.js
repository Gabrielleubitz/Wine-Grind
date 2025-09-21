const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    databaseURL: `https://${serviceAccountKey.project_id}-default-rtdb.firebaseio.com`
  });
}

const db = admin.firestore();

// Badge branding configuration
const BADGE_BRANDING = {
  colors: {
    primary: [139/255, 0/255, 0/255], // Wine red
    textPrimary: [31/255, 41/255, 55/255], // Dark gray
    textSecondary: [107/255, 114/255, 128/255], // Medium gray
    background: [1, 1, 1], // White
    qrBackground: [249/255, 250/255, 251/255], // Light gray
  },
  fonts: {
    nameSize: 18,
    companySize: 12,
    linkedinSize: 10,
  },
  layout: {
    pageWidth: 210,
    pageHeight: 297,
    margin: 10,
    gutter: 10,
    badgeWidth: 90,
    badgeHeight: 133.5,
    badgePadding: 5,
    logoWidth: 30,
    logoHeight: 12,
    qrSize: 35,
  },
  cropMarks: {
    length: 5,
    offset: 2,
    strokeWidth: 0.5,
  }
};

// Convert millimeters to points
const mm = (millimeters) => millimeters * 2.83465;

// Calculate badge positions
const calculateBadgePositions = () => {
  const { layout } = BADGE_BRANDING;
  const positions = [];
  
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = layout.margin + col * (layout.badgeWidth + layout.gutter);
      const y = layout.margin + row * (layout.badgeHeight + layout.gutter);
      positions.push({ x, y });
    }
  }
  
  return positions;
};

// Generate QR code as data URL
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    return null;
  }
};

// Fetch attendees for an event
const getEventAttendees = async (eventId) => {
  try {
    console.log(`🎫 Fetching attendees for event: ${eventId}`);
    
    const registrationsSnapshot = await db.collection('registrations')
      .where('eventId', '==', eventId)
      .where('status', '==', 'confirmed')
      .get();

    const attendees = [];
    registrationsSnapshot.forEach(doc => {
      const registration = doc.data();
      attendees.push({
        id: doc.id,
        first_name: registration.name?.split(' ')[0] || 'Guest',
        last_name: registration.name?.split(' ').slice(1).join(' ') || '',
        company: registration.work || '',
        linkedin: registration.linkedinUsername ? `linkedin.com/in/${registration.linkedinUsername}` : '',
        qr_code: `https://winengrind.com/connect?to=${registration.userId}&event=${eventId}`,
        email: registration.email || ''
      });
    });

    console.log(`✅ Found ${attendees.length} confirmed attendees`);
    return attendees;
  } catch (error) {
    console.error('❌ Error fetching attendees:', error);
    return [];
  }
};

// Get event details
const getEventDetails = async (eventId) => {
  try {
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return null;
    }
    
    const eventData = eventDoc.data();
    return {
      id: eventId,
      name: eventData.name || eventData.title || 'Wine & Grind Event',
      date: eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date)
    };
  } catch (error) {
    console.error('❌ Error fetching event details:', error);
    return null;
  }
};

// Draw crop marks
const drawCropMarks = (page, badgeX, badgeY) => {
  const { layout, cropMarks } = BADGE_BRANDING;
  
  const marks = [
    // Top-left
    { x1: badgeX - cropMarks.offset - cropMarks.length, y1: badgeY - cropMarks.offset, x2: badgeX - cropMarks.offset, y2: badgeY - cropMarks.offset },
    { x1: badgeX - cropMarks.offset, y1: badgeY - cropMarks.offset - cropMarks.length, x2: badgeX - cropMarks.offset, y2: badgeY - cropMarks.offset },
    // Top-right
    { x1: badgeX + layout.badgeWidth + cropMarks.offset, y1: badgeY - cropMarks.offset, x2: badgeX + layout.badgeWidth + cropMarks.offset + cropMarks.length, y2: badgeY - cropMarks.offset },
    { x1: badgeX + layout.badgeWidth + cropMarks.offset, y1: badgeY - cropMarks.offset - cropMarks.length, x2: badgeX + layout.badgeWidth + cropMarks.offset, y2: badgeY - cropMarks.offset },
    // Bottom-left
    { x1: badgeX - cropMarks.offset - cropMarks.length, y1: badgeY + layout.badgeHeight + cropMarks.offset, x2: badgeX - cropMarks.offset, y2: badgeY + layout.badgeHeight + cropMarks.offset },
    { x1: badgeX - cropMarks.offset, y1: badgeY + layout.badgeHeight + cropMarks.offset, x2: badgeX - cropMarks.offset, y2: badgeY + layout.badgeHeight + cropMarks.offset + cropMarks.length },
    // Bottom-right
    { x1: badgeX + layout.badgeWidth + cropMarks.offset, y1: badgeY + layout.badgeHeight + cropMarks.offset, x2: badgeX + layout.badgeWidth + cropMarks.offset + cropMarks.length, y2: badgeY + layout.badgeHeight + cropMarks.offset },
    { x1: badgeX + layout.badgeWidth + cropMarks.offset, y1: badgeY + layout.badgeHeight + cropMarks.offset, x2: badgeX + layout.badgeWidth + cropMarks.offset, y2: badgeY + layout.badgeHeight + cropMarks.offset + cropMarks.length }
  ];

  marks.forEach(mark => {
    page.drawLine({
      start: { x: mm(mark.x1), y: mm(layout.pageHeight - mark.y1) },
      end: { x: mm(mark.x2), y: mm(layout.pageHeight - mark.y2) },
      thickness: cropMarks.strokeWidth,
      color: rgb(0, 0, 0)
    });
  });
};

// Draw a single badge
const drawBadge = async (page, attendee, x, y, font, boldFont) => {
  const { layout, colors, fonts } = BADGE_BRANDING;
  const pageHeight = layout.pageHeight;
  
  // Convert position to PDF coordinates (flip Y axis)
  const badgeX = mm(x);
  const badgeY = mm(pageHeight - y - layout.badgeHeight);
  
  // Draw badge background
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: mm(layout.badgeWidth),
    height: mm(layout.badgeHeight),
    color: rgb(...colors.background),
    borderColor: rgb(...colors.textSecondary),
    borderWidth: 0.5,
  });

  // Draw Wine & Grind branding area (top)
  page.drawRectangle({
    x: badgeX,
    y: badgeY + mm(layout.badgeHeight - 25),
    width: mm(layout.badgeWidth),
    height: mm(25),
    color: rgb(...colors.primary),
  });

  // Wine & Grind logo text (white on wine background)
  page.drawText('WINE & GRIND', {
    x: badgeX + mm(layout.badgePadding),
    y: badgeY + mm(layout.badgeHeight - 15),
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // Attendee name (large, bold)
  const fullName = `${attendee.first_name} ${attendee.last_name}`.trim();
  let nameSize = fonts.nameSize;
  
  // Adjust font size if name is too long
  const maxNameWidth = mm(layout.badgeWidth - 2 * layout.badgePadding);
  let nameWidth = boldFont.widthOfTextAtSize(fullName, nameSize);
  while (nameWidth > maxNameWidth && nameSize > 12) {
    nameSize -= 1;
    nameWidth = boldFont.widthOfTextAtSize(fullName, nameSize);
  }

  page.drawText(fullName, {
    x: badgeX + mm(layout.badgePadding),
    y: badgeY + mm(layout.badgeHeight - 45),
    size: nameSize,
    font: boldFont,
    color: rgb(...colors.textPrimary),
  });

  // Company
  if (attendee.company) {
    page.drawText(attendee.company, {
      x: badgeX + mm(layout.badgePadding),
      y: badgeY + mm(layout.badgeHeight - 62),
      size: fonts.companySize,
      font: font,
      color: rgb(...colors.textSecondary),
    });
  }

  // LinkedIn
  if (attendee.linkedin) {
    page.drawText(attendee.linkedin, {
      x: badgeX + mm(layout.badgePadding),
      y: badgeY + mm(layout.badgeHeight - 78),
      size: fonts.linkedinSize,
      font: font,
      color: rgb(...colors.textSecondary),
    });
  }

  // QR Code area
  if (attendee.qr_code) {
    try {
      // Generate QR code
      const qrDataUrl = await generateQRCode(attendee.qr_code);
      if (qrDataUrl) {
        // Convert data URL to buffer
        const base64Data = qrDataUrl.split(',')[1];
        const qrBuffer = Buffer.from(base64Data, 'base64');
        
        // Embed QR image
        const qrImage = await page.doc.embedPng(qrBuffer);
        
        // Draw QR background
        const qrX = badgeX + mm(layout.badgeWidth - layout.qrSize - layout.badgePadding);
        const qrY = badgeY + mm(layout.badgePadding);
        
        page.drawRectangle({
          x: qrX - mm(2),
          y: qrY - mm(2),
          width: mm(layout.qrSize + 4),
          height: mm(layout.qrSize + 4),
          color: rgb(...colors.qrBackground),
        });
        
        // Draw QR code
        page.drawImage(qrImage, {
          x: qrX,
          y: qrY,
          width: mm(layout.qrSize),
          height: mm(layout.qrSize),
        });
      }
    } catch (error) {
      console.error('❌ Error embedding QR code:', error);
    }
  }

  // Draw crop marks
  drawCropMarks(page, x, y);
};

// Main handler
module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Missing eventId parameter'
      });
    }

    console.log(`🎫 Starting badge generation for event: ${eventId}`);

    // Get event details
    const event = await getEventDetails(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Get attendees
    const attendees = await getEventAttendees(eventId);
    if (attendees.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No attendees found for this event'
      });
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Calculate pages needed
    const badgesPerPage = 4;
    const totalPages = Math.ceil(attendees.length / badgesPerPage);
    
    console.log(`📄 Generating ${totalPages} pages for ${attendees.length} attendees`);

    // Generate pages
    const badgePositions = calculateBadgePositions();
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const page = pdfDoc.addPage([mm(BADGE_BRANDING.layout.pageWidth), mm(BADGE_BRANDING.layout.pageHeight)]);
      
      // Get attendees for this page
      const startIndex = pageIndex * badgesPerPage;
      const pageAttendees = attendees.slice(startIndex, startIndex + badgesPerPage);
      
      // Draw badges for this page
      for (let i = 0; i < pageAttendees.length; i++) {
        const attendee = pageAttendees[i];
        const position = badgePositions[i];
        
        await drawBadge(page, attendee, position.x, position.y, font, boldFont);
      }
    }

    // Generate PDF buffer
    const pdfBytes = await pdfDoc.save();

    console.log(`✅ Badge PDF generated successfully: ${pdfBytes.length} bytes`);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="winegrind-badges-${eventId}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // Send PDF
    res.status(200).send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('❌ Badge Generation Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to generate badges PDF',
      details: error.message
    });
  }
};