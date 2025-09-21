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

// Enhanced Wine & Grind Branding Configuration
const BRAND_COLORS = {
  wine: [122/255, 30/255, 30/255],           // #7A1E1E
  charcoal: [17/255, 21/255, 26/255],        // #11151A
  lightBg: [247/255, 245/255, 243/255],      // #F7F5F3
  accentGray: [232/255, 229/255, 225/255],   // #E8E5E1
  white: [1, 1, 1],                          // #FFFFFF
  mutedText: [75/255, 85/255, 99/255],       // #4B5563
  qrForeground: [0, 0, 0],                   // Black for QR
  qrBackground: [1, 1, 1],                   // White for QR background
};

const TYPOGRAPHY = {
  name: { min: 26, ideal: 36, max: 44 },
  company: { min: 16, ideal: 20, max: 22 },
  linkedin: { size: 13 },
  header: { size: 16 },
  footer: { size: 10 },
};

const LAYOUT = {
  page: { width: 210, height: 297, margin: 10 },
  grid: { cols: 2, rows: 2, gutter: 10 },
  badge: { width: 90, height: 133.5, padding: 8 },
  header: { height: 20, logoSize: 14, textOffset: 3 },
  qr: { size: 35, padding: 4, tileSize: 43, margin: 6 },
  content: { nameTop: 32, companyGap: 6, linkedinGap: 4 },
  cropMarks: { length: 6, offset: 3, thickness: 0.5 },
};

const PRINT_SPECS = {
  mmToPoints: 2.83465,
  backgroundOpacity: 0.15,
  qrErrorCorrection: 'M',
};

// Convert millimeters to points
const mm = (millimeters) => millimeters * PRINT_SPECS.mmToPoints;

// Cache for loaded assets
let assetCache = {
  logo: null,
  background: null,
};

// Calculate badge positions on page
const calculateBadgePositions = () => {
  const positions = [];
  for (let row = 0; row < LAYOUT.grid.rows; row++) {
    for (let col = 0; col < LAYOUT.grid.cols; col++) {
      const x = LAYOUT.page.margin + col * (LAYOUT.badge.width + LAYOUT.grid.gutter);
      const y = LAYOUT.page.margin + row * (LAYOUT.badge.height + LAYOUT.grid.gutter);
      positions.push({ x, y, row, col });
    }
  }
  return positions;
};

// Calculate responsive font size
const calculateFontSize = (text, maxWidth, fontConfig, estimatedCharWidth = 0.6) => {
  const textLength = text.length;
  const estimatedWidth = textLength * estimatedCharWidth * fontConfig.ideal;
  
  if (estimatedWidth <= maxWidth) {
    return fontConfig.ideal;
  }
  
  const scaleFactor = maxWidth / estimatedWidth;
  const scaledSize = fontConfig.ideal * scaleFactor;
  return Math.max(fontConfig.min, Math.min(fontConfig.max, scaledSize));
};

// Generate high-quality QR code
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data, {
      width: 400, // High resolution for print
      margin: 1,
      errorCorrectionLevel: PRINT_SPECS.qrErrorCorrection,
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

// Load and cache logo asset
const loadLogo = async () => {
  if (assetCache.logo) return assetCache.logo;
  
  try {
    // Try PNG first, then SVG, then fallback
    const logoOptions = [
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'public', 'logo.svg'),
      path.join(process.cwd(), 'public', 'W&G Logo.svg')
    ];
    
    for (const logoPath of logoOptions) {
      try {
        const logoData = await fs.readFile(logoPath);
        assetCache.logo = logoData;
        console.log(`✅ Logo loaded: ${logoPath}`);
        return logoData;
      } catch (err) {
        continue; // Try next option
      }
    }
    
    console.log('⚠️ No logo found, proceeding without logo');
    return null;
  } catch (error) {
    console.error('❌ Error loading logo:', error);
    return null;
  }
};

// Load and cache background image
const loadBackground = async () => {
  if (assetCache.background) return assetCache.background;
  
  try {
    const bgOptions = [
      path.join(process.cwd(), 'public', 'event-hero.jpg'),
      path.join(process.cwd(), 'public', 'default-event-bg.jpg')
    ];
    
    for (const bgPath of bgOptions) {
      try {
        const bgData = await fs.readFile(bgPath);
        assetCache.background = bgData;
        console.log(`✅ Background loaded: ${bgPath}`);
        return bgData;
      } catch (err) {
        continue;
      }
    }
    
    console.log('⚠️ No background image found');
    return null;
  } catch (error) {
    console.error('❌ Error loading background:', error);
    return null;
  }
};

// Draw crop marks around badge
const drawCropMarks = (page, badgeX, badgeY) => {
  const { cropMarks, badge } = LAYOUT;
  const pageHeight = LAYOUT.page.height;
  
  const corners = [
    { x: badgeX, y: badgeY }, // Top-left
    { x: badgeX + badge.width, y: badgeY }, // Top-right
    { x: badgeX, y: badgeY + badge.height }, // Bottom-left
    { x: badgeX + badge.width, y: badgeY + badge.height }, // Bottom-right
  ];
  
  corners.forEach((corner, index) => {
    const isLeft = index % 2 === 0;
    const isTop = index < 2;
    
    // Convert to PDF coordinates (flip Y)
    const pdfY = pageHeight - corner.y;
    
    // Horizontal crop mark
    page.drawLine({
      start: { 
        x: mm(corner.x + (isLeft ? -cropMarks.offset - cropMarks.length : cropMarks.offset)), 
        y: mm(pdfY + (isTop ? cropMarks.offset : -cropMarks.offset))
      },
      end: { 
        x: mm(corner.x + (isLeft ? -cropMarks.offset : cropMarks.offset + cropMarks.length)), 
        y: mm(pdfY + (isTop ? cropMarks.offset : -cropMarks.offset))
      },
      thickness: cropMarks.thickness,
      color: rgb(0, 0, 0),
    });
    
    // Vertical crop mark
    page.drawLine({
      start: { 
        x: mm(corner.x + (isLeft ? -cropMarks.offset : cropMarks.offset)), 
        y: mm(pdfY + (isTop ? cropMarks.offset + cropMarks.length : -cropMarks.offset))
      },
      end: { 
        x: mm(corner.x + (isLeft ? -cropMarks.offset : cropMarks.offset)), 
        y: mm(pdfY + (isTop ? cropMarks.offset : -cropMarks.offset - cropMarks.length))
      },
      thickness: cropMarks.thickness,
      color: rgb(0, 0, 0),
    });
  });
};

// Draw a professional badge with enhanced design
const drawBadge = async (page, attendee, x, y, font, boldFont, logoImage, backgroundImage) => {
  const { badge, header, qr, content } = LAYOUT;
  const pageHeight = LAYOUT.page.height;
  
  // Convert badge position to PDF coordinates
  const badgeX = mm(x);
  const badgeY = mm(pageHeight - y - badge.height);
  
  // 1. Draw background image with overlay
  if (backgroundImage) {
    try {
      page.drawImage(backgroundImage, {
        x: badgeX,
        y: badgeY,
        width: mm(badge.width),
        height: mm(badge.height),
        opacity: PRINT_SPECS.backgroundOpacity,
      });
      
      // Add dark overlay for better text contrast
      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: mm(badge.width),
        height: mm(badge.height),
        color: rgb(0, 0, 0),
        opacity: 0.25,
      });
    } catch (error) {
      console.log('⚠️ Background image render failed, using solid color');
    }
  }
  
  // 2. Draw header band (wine color)
  page.drawRectangle({
    x: badgeX,
    y: badgeY + mm(badge.height - header.height),
    width: mm(badge.width),
    height: mm(header.height),
    color: rgb(...BRAND_COLORS.wine),
  });
  
  // 3. Draw logo in header (if available)
  if (logoImage) {
    try {
      page.drawImage(logoImage, {
        x: badgeX + mm(badge.padding),
        y: badgeY + mm(badge.height - header.height + 3),
        height: mm(header.logoSize),
        width: mm(header.logoSize * 1.5), // Assume logo is wider than tall
      });
    } catch (error) {
      console.log('⚠️ Logo render failed');
    }
  }
  
  // 4. Draw "WINE & GRIND" text in header
  page.drawText('WINE & GRIND', {
    x: badgeX + mm(badge.padding + (logoImage ? 25 : 0)),
    y: badgeY + mm(badge.height - header.height + header.textOffset + 4),
    size: TYPOGRAPHY.header.size,
    font: boldFont,
    color: rgb(...BRAND_COLORS.white),
  });
  
  // 5. Calculate content area (avoiding QR code)
  const contentX = badgeX + mm(badge.padding);
  const contentWidth = mm(badge.width - (2 * badge.padding) - qr.tileSize - qr.margin);
  const maxTextWidth = badge.width - (2 * badge.padding) - qr.tileSize - qr.margin;
  
  // 6. Draw attendee name (large, auto-sizing)
  const fullName = `${attendee.first_name} ${attendee.last_name}`.trim() || 'Guest';
  const nameSize = calculateFontSize(fullName, maxTextWidth, TYPOGRAPHY.name);
  
  page.drawText(fullName, {
    x: contentX,
    y: badgeY + mm(badge.height - content.nameTop),
    size: nameSize,
    font: boldFont,
    color: rgb(...BRAND_COLORS.charcoal),
  });
  
  // 7. Draw company (medium weight)
  let currentY = badge.height - content.nameTop - content.companyGap - (nameSize * 0.5);
  if (attendee.company) {
    const companySize = calculateFontSize(attendee.company, maxTextWidth, TYPOGRAPHY.company);
    
    page.drawText(attendee.company, {
      x: contentX,
      y: badgeY + mm(currentY),
      size: companySize,
      font: font,
      color: rgb(...BRAND_COLORS.charcoal),
    });
    
    currentY -= content.linkedinGap + (companySize * 0.4);
  }
  
  // 8. Draw LinkedIn (small, muted)
  if (attendee.linkedin) {
    const linkedinText = attendee.linkedin.startsWith('http') 
      ? attendee.linkedin.replace(/https?:\/\/(www\.)?/, '')
      : `linkedin.com/in/${attendee.linkedin}`;
    
    page.drawText(linkedinText, {
      x: contentX,
      y: badgeY + mm(currentY),
      size: TYPOGRAPHY.linkedin.size,
      font: font,
      color: rgb(...BRAND_COLORS.mutedText),
    });
  }
  
  // 9. Draw QR code with white tile background
  if (attendee.qr_code) {
    try {
      const qrDataUrl = await generateQRCode(attendee.qr_code);
      if (qrDataUrl) {
        // QR tile position (white background)
        const qrTileX = badgeX + mm(badge.width - qr.tileSize - qr.margin);
        const qrTileY = badgeY + mm(qr.margin);
        
        // Draw white tile background
        page.drawRectangle({
          x: qrTileX,
          y: qrTileY,
          width: mm(qr.tileSize),
          height: mm(qr.tileSize),
          color: rgb(...BRAND_COLORS.white),
        });
        
        // Add subtle shadow for depth (optional - may not print well)
        page.drawRectangle({
          x: qrTileX + 1,
          y: qrTileY - 1,
          width: mm(qr.tileSize),
          height: mm(qr.tileSize),
          color: rgb(0.9, 0.9, 0.9),
          opacity: 0.3,
        });
        
        // Draw QR code
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const qrImage = await page.doc.embedPng(qrBuffer);
        
        page.drawImage(qrImage, {
          x: qrTileX + mm(qr.padding),
          y: qrTileY + mm(qr.padding),
          width: mm(qr.size),
          height: mm(qr.size),
        });
      }
    } catch (error) {
      console.error('❌ QR code render failed:', error);
      
      // Fallback: draw "QR unavailable" text
      page.drawText('QR unavailable', {
        x: badgeX + mm(badge.width - 40),
        y: badgeY + mm(15),
        size: 8,
        font: font,
        color: rgb(...BRAND_COLORS.mutedText),
      });
    }
  }
  
  // 10. Draw crop marks
  drawCropMarks(page, x, y);
};

// Fetch attendees from subcollection
const getEventAttendees = async (eventId) => {
  try {
    console.log(`🎫 Fetching attendees for event: ${eventId}`);
    
    const registrationsSnapshot = await db.collection('events').doc(eventId).collection('registrations').get();
    console.log(`📊 Found ${registrationsSnapshot.size} registrations`);
    
    const attendees = [];
    registrationsSnapshot.forEach(doc => {
      const registration = doc.data();
      const userId = doc.id;
      
      attendees.push({
        id: userId,
        first_name: registration.name?.split(' ')[0] || 'Guest',
        last_name: registration.name?.split(' ').slice(1).join(' ') || '',
        company: registration.work || '',
        linkedin: registration.linkedinUsername || '',
        qr_code: registration.qrCodeUrl || registration.ticket_url || `https://winengrind.com/connect?to=${userId}&event=${eventId}`,
        email: registration.email || ''
      });
    });
    
    console.log(`🎫 Processed ${attendees.length} attendees`);
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
    if (!eventDoc.exists) return null;
    
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

// Main handler
module.exports = async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }
  
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
    
    console.log(`🎫 Starting enhanced badge generation for event: ${eventId}`);
    
    // Load assets and data in parallel
    const [event, attendees, logoData, backgroundData] = await Promise.all([
      getEventDetails(eventId),
      getEventAttendees(eventId),
      loadLogo(),
      loadBackground(),
    ]);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
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
    
    // Embed assets
    let logoImage = null;
    let backgroundImage = null;
    
    if (logoData) {
      try {
        logoImage = await pdfDoc.embedPng(logoData);
      } catch (err) {
        console.log('⚠️ Logo embed failed, trying as JPEG');
        try {
          logoImage = await pdfDoc.embedJpg(logoData);
        } catch (err2) {
          console.log('⚠️ Logo embed failed completely');
        }
      }
    }
    
    if (backgroundData) {
      try {
        backgroundImage = await pdfDoc.embedJpg(backgroundData);
      } catch (err) {
        console.log('⚠️ Background embed failed');
      }
    }
    
    // Calculate pages needed
    const badgesPerPage = 4;
    const totalPages = Math.ceil(attendees.length / badgesPerPage);
    const badgePositions = calculateBadgePositions();
    
    console.log(`📄 Generating ${totalPages} pages for ${attendees.length} attendees`);
    
    // Generate pages
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const page = pdfDoc.addPage([mm(LAYOUT.page.width), mm(LAYOUT.page.height)]);
      
      const startIndex = pageIndex * badgesPerPage;
      const pageAttendees = attendees.slice(startIndex, startIndex + badgesPerPage);
      
      // Draw badges for this page
      for (let i = 0; i < pageAttendees.length; i++) {
        const attendee = pageAttendees[i];
        const position = badgePositions[i];
        
        await drawBadge(page, attendee, position.x, position.y, font, boldFont, logoImage, backgroundImage);
      }
    }
    
    // Generate PDF
    const pdfBytes = await pdfDoc.save();
    
    console.log(`✅ Enhanced badge PDF generated: ${pdfBytes.length} bytes`);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="winegrind-badges-${eventId}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    
    // Send PDF
    res.status(200).send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('❌ Enhanced Badge Generation Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate enhanced badges PDF',
      details: error.message
    });
  }
};