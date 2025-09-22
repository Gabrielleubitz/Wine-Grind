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
  mutedText: [75/255, 85/255, 99/255],       // #4B5563
  white: [1, 1, 1],                          // #FFFFFF
  black: [0, 0, 0],                          // #000000
  
  // Role-based chip colors
  roles: {
    organizer: [122/255, 30/255, 30/255],    // Wine #7A1E1E
    speaker: [194/255, 120/255, 3/255],      // Amber #C27803
    sponsor: [14/255, 116/255, 144/255],     // Cyan #0E7490
    vip: [109/255, 40/255, 217/255],         // Purple #6D28D9
    staff: [55/255, 65/255, 81/255],         // Gray #374151
    attendee: [71/255, 85/255, 105/255],     // Slate #475569
  },
};

const TYPOGRAPHY = {
  name: { min: 26, ideal: 36, max: 44, step: 2 },
  company: { size: 18 },
  linkedin: { size: 13 },
  header: { size: 16 },
  roleChip: { normal: 14, reduced: 12 },
  letterSpacing: {
    normal: 0,
    tight: -0.025, // For role chips
    header: 0.02,
  },
};

const LAYOUT = {
  // Page specifications (exact A4 as specified)
  page: { width: 210, height: 297, margin: 10 },
  
  // Grid system (2x2 as specified)
  grid: { cols: 2, rows: 2, gutter: 10 },
  
  // Badge specifications (exact sizes)
  badge: { width: 90, height: 133.5, padding: 6 },
  
  // Exact badge positions as specified
  positions: [
    { x: 10, y: 10 },      // Top-left
    { x: 110, y: 10 },     // Top-right  
    { x: 10, y: 153.5 },   // Bottom-left
    { x: 110, y: 153.5 },  // Bottom-right
  ],
  
  // Header band (12-14 mm tall as specified)
  header: { height: 13, logoHeight: 9, logoWidth: 12, textOffset: 2 },
  
  // Role chip specifications
  roleChip: {
    height: 10,
    paddingH: 4,
    radius: 3,
    marginTop: 2,
    marginRight: 6,
  },
  
  // QR code specifications (exact 38mm tile, 32mm QR)
  qr: { tileSize: 38, codeSize: 32, padding: 3, margin: 8, quietZone: 4 },
  
  // Content spacing
  content: { nameTop: 28, companyGap: 4, linkedinGap: 3 },
  
  // Crop marks
  cropMarks: { length: 5, offset: 2, thickness: 0.5 },
  
  // Background specifications  
  background: { opacity: 0.15, overlayOpacity: 0.25 },
};

const PRINT_SPECS = {
  mmToPoints: 2.83465,
  dpi: 300,
  qrErrorCorrection: 'H', // High error correction as specified
};

// Convert millimeters to points
const mm = (millimeters) => millimeters * PRINT_SPECS.mmToPoints;

// Cache for loaded assets
let assetCache = {
  logo: null,
  background: null,
};

// Get role from attendee data with normalization
const getRole = (attendee) => {
  // Direct role mapping (highest priority)
  if (attendee.role) {
    const role = attendee.role.toLowerCase().trim();
    if (BRAND_COLORS.roles[role]) {
      return role;
    }
  }
  
  // Infer from ticket_type
  if (attendee.ticket_type) {
    const ticketType = attendee.ticket_type.toLowerCase();
    for (const roleKey of Object.keys(BRAND_COLORS.roles)) {
      if (ticketType.includes(roleKey)) {
        return roleKey;
      }
    }
  }
  
  // Infer from tags
  if (attendee.tags && Array.isArray(attendee.tags)) {
    for (const tag of attendee.tags) {
      const tagLower = tag.toLowerCase();
      for (const roleKey of Object.keys(BRAND_COLORS.roles)) {
        if (tagLower.includes(roleKey)) {
          return roleKey;
        }
      }
    }
  }
  
  // Default to attendee
  return 'attendee';
};

// Format text for display
const formatText = {
  name: (text) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },
  
  company: (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },
  
  roleChip: (text) => {
    return text.toUpperCase();
  },
};

// Get exact badge positions as specified
const getBadgePositions = () => {
  return LAYOUT.positions;
};

// Fit text to maximum width with stepwise font reduction
const fitText = (text, maxWidthPt, maxSizePt, minSizePt, estimatedCharWidth = 0.6) => {
  let fontSize = maxSizePt;
  const step = TYPOGRAPHY.name.step;
  
  while (fontSize >= minSizePt) {
    const estimatedWidth = text.length * estimatedCharWidth * fontSize;
    if (estimatedWidth <= maxWidthPt) {
      return fontSize;
    }
    fontSize -= step;
  }
  
  return minSizePt;
};

// Generate high-quality QR code with proper quiet zone
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data, {
      width: 400, // High resolution for 300 DPI print
      margin: LAYOUT.qr.quietZone, // 4 module quiet zone as specified
      errorCorrectionLevel: PRINT_SPECS.qrErrorCorrection, // H for high error correction
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

// Load and cache logo asset (prioritize white logo for dark header)
const loadLogo = async () => {
  if (assetCache.logo) return assetCache.logo;
  
  try {
    // Try white logo first for dark header, then regular logo options
    const logoOptions = [
      path.join(process.cwd(), 'public', 'logo-white.svg'),
      path.join(process.cwd(), 'public', 'logo.svg'), 
      path.join(process.cwd(), 'public', 'W&G Logo.svg'),
      path.join(process.cwd(), 'public', 'logo.png')
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

// Load and cache background image (event-hero.jpg as specified)
const loadBackground = async () => {
  if (assetCache.background) return assetCache.background;
  
  try {
    const bgPath = path.join(process.cwd(), 'public', 'event-hero.jpg');
    const bgData = await fs.readFile(bgPath);
    assetCache.background = bgData;
    console.log(`✅ Background loaded: ${bgPath}`);
    return bgData;
  } catch (error) {
    console.log('⚠️ Event hero background not found, proceeding with light background');
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

// Draw role chip with proper positioning
const drawRoleChip = (page, attendee, badgeX, badgeY, font, isLongName = false) => {
  const role = getRole(attendee);
  const roleText = formatText.roleChip(role);
  const chipFontSize = isLongName ? TYPOGRAPHY.roleChip.reduced : TYPOGRAPHY.roleChip.normal;
  
  // Calculate chip dimensions
  const textWidth = roleText.length * 0.6 * chipFontSize; // Estimated width
  const chipWidth = textWidth + (2 * LAYOUT.roleChip.paddingH);
  
  // Position chip in top-right, avoiding QR and header logo
  const chipX = badgeX + mm(LAYOUT.badge.width - chipWidth - LAYOUT.roleChip.marginRight);
  const chipY = badgeY + mm(LAYOUT.badge.height - LAYOUT.header.height - LAYOUT.roleChip.height - LAYOUT.roleChip.marginTop);
  
  // Draw chip background with role color (rounded rectangle using multiple shapes)
  const radius = mm(LAYOUT.roleChip.radius);
  const chipHeight = mm(LAYOUT.roleChip.height);
  const chipWidthMm = mm(chipWidth);
  
  // Main rectangle body
  page.drawRectangle({
    x: chipX + radius,
    y: chipY,
    width: chipWidthMm - (2 * radius),
    height: chipHeight,
    color: rgb(...BRAND_COLORS.roles[role]),
  });
  
  // Left cap
  page.drawRectangle({
    x: chipX,
    y: chipY,
    width: radius,
    height: chipHeight,
    color: rgb(...BRAND_COLORS.roles[role]),
  });
  
  // Right cap  
  page.drawRectangle({
    x: chipX + chipWidthMm - radius,
    y: chipY,
    width: radius,
    height: chipHeight,
    color: rgb(...BRAND_COLORS.roles[role]),
  });
  
  // Draw chip text
  page.drawText(roleText, {
    x: chipX + mm(LAYOUT.roleChip.paddingH),
    y: chipY + mm(LAYOUT.roleChip.height / 2 - chipFontSize / 3), // Center vertically
    size: chipFontSize,
    font: font,
    color: rgb(...BRAND_COLORS.white),
    characterSpacing: TYPOGRAPHY.letterSpacing.tight,
  });
};

// Draw a professional badge with exact specifications
const drawBadge = async (page, attendee, x, y, font, boldFont, logoImage, backgroundImage) => {
  const { badge, header, qr, content, background } = LAYOUT;
  const pageHeight = LAYOUT.page.height;
  
  // Convert badge position to PDF coordinates (Y-axis flipped for PDF)
  const badgeX = mm(x);
  const badgeY = mm(pageHeight - y - badge.height);
  
  // 1. Draw background image at 12-18% opacity with dark overlay for contrast
  if (backgroundImage) {
    try {
      page.drawImage(backgroundImage, {
        x: badgeX,
        y: badgeY,
        width: mm(badge.width),
        height: mm(badge.height),
        opacity: background.opacity, // 15% as specified
      });
      
      // Add dark overlay for contrast as specified
      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: mm(badge.width),
        height: mm(badge.height),
        color: rgb(...BRAND_COLORS.black),
        opacity: background.overlayOpacity, // 25% dark overlay
      });
    } catch (error) {
      console.log('⚠️ Background image render failed, using solid light background');
      
      // Fallback to light background
      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: mm(badge.width),
        height: mm(badge.height),
        color: rgb(...BRAND_COLORS.lightBg),
      });
    }
  } else {
    // Default light background if no event hero image
    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: mm(badge.width),
      height: mm(badge.height),
      color: rgb(...BRAND_COLORS.lightBg),
    });
  }
  
  // 2. Draw header band (Wine color, 13mm height)
  page.drawRectangle({
    x: badgeX,
    y: badgeY + mm(badge.height - header.height),
    width: mm(badge.width),
    height: mm(header.height),
    color: rgb(...BRAND_COLORS.wine),
  });
  
  // 3. Draw logo in header (white logo for dark header)
  if (logoImage) {
    try {
      page.drawImage(logoImage, {
        x: badgeX + mm(badge.padding),
        y: badgeY + mm(badge.height - header.height + header.textOffset),
        height: mm(header.logoHeight),
        width: mm(header.logoWidth),
      });
    } catch (error) {
      console.log('⚠️ Logo render failed');
    }
  }
  
  // 4. Draw "WINE & GRIND" text in header
  page.drawText('WINE & GRIND', {
    x: badgeX + mm(badge.padding + (logoImage ? header.logoWidth + 2 : 0)),
    y: badgeY + mm(badge.height - header.height + header.textOffset + 2),
    size: TYPOGRAPHY.header.size,
    font: boldFont,
    color: rgb(...BRAND_COLORS.white),
    characterSpacing: TYPOGRAPHY.letterSpacing.header,
  });
  
  // 5. Calculate content area (avoiding QR code)
  const contentX = badgeX + mm(badge.padding);
  const maxTextWidth = badge.width - (2 * badge.padding) - qr.tileSize - qr.margin;
  
  // 6. Draw attendee name (Title Case, large, auto-shrink to fit)
  const fullName = formatText.name(`${attendee.first_name} ${attendee.last_name}`.trim() || 'Guest');
  const nameSize = fitText(fullName, mm(maxTextWidth), TYPOGRAPHY.name.max, TYPOGRAPHY.name.min);
  const isLongName = nameSize < TYPOGRAPHY.name.ideal; // Flag for chip sizing
  
  page.drawText(fullName, {
    x: contentX,
    y: badgeY + mm(badge.height - content.nameTop),
    size: nameSize,
    font: boldFont,
    color: rgb(...BRAND_COLORS.charcoal),
  });
  
  // 7. Draw company (sentence case, one line)
  let currentY = badge.height - content.nameTop - content.companyGap - (nameSize * 0.6);
  if (attendee.company && attendee.company.trim()) {
    const companyText = formatText.company(attendee.company.trim());
    
    page.drawText(companyText, {
      x: contentX,
      y: badgeY + mm(currentY),
      size: TYPOGRAPHY.company.size,
      font: font,
      color: rgb(...BRAND_COLORS.charcoal),
    });
    
    currentY -= content.linkedinGap + (TYPOGRAPHY.company.size * 0.4);
  }
  
  // 8. Draw LinkedIn (small muted line, hide if missing)
  if (attendee.linkedin && attendee.linkedin.trim()) {
    let linkedinText;
    const linkedin = attendee.linkedin.trim();
    
    if (linkedin.startsWith('http')) {
      linkedinText = linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, '');
    } else if (linkedin.includes('linkedin.com')) {
      linkedinText = linkedin.replace(/.*linkedin\.com\/(in\/)?/, '');
    } else {
      linkedinText = linkedin;
    }
    
    page.drawText(`linkedin.com/in/${linkedinText}`, {
      x: contentX,
      y: badgeY + mm(currentY),
      size: TYPOGRAPHY.linkedin.size,
      font: font,
      color: rgb(...BRAND_COLORS.mutedText),
    });
  }
  
  // 9. Draw role chip (positioned to avoid overlaps)
  drawRoleChip(page, attendee, badgeX, badgeY, font, isLongName);
  
  // 10. Draw QR code with white tile background (38mm tile, 32mm QR)
  if (attendee.qr_code) {
    try {
      const qrDataUrl = await generateQRCode(attendee.qr_code);
      if (qrDataUrl) {
        // QR tile position (bottom-right)
        const qrTileX = badgeX + mm(badge.width - qr.tileSize - qr.margin);
        const qrTileY = badgeY + mm(qr.margin);
        
        // Draw white tile background (no shadow for print reliability)
        page.drawRectangle({
          x: qrTileX,
          y: qrTileY,
          width: mm(qr.tileSize),
          height: mm(qr.tileSize),
          color: rgb(...BRAND_COLORS.white),
        });
        
        // Draw QR code (32mm size, centered in 38mm tile)
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const qrImage = await page.doc.embedPng(qrBuffer);
        
        page.drawImage(qrImage, {
          x: qrTileX + mm(qr.padding),
          y: qrTileY + mm(qr.padding),
          width: mm(qr.codeSize),
          height: mm(qr.codeSize),
        });
      } else {
        // Draw "QR unavailable" tile if generation failed
        const qrTileX = badgeX + mm(badge.width - qr.tileSize - qr.margin);
        const qrTileY = badgeY + mm(qr.margin);
        
        page.drawRectangle({
          x: qrTileX,
          y: qrTileY,
          width: mm(qr.tileSize),
          height: mm(qr.tileSize),
          color: rgb(...BRAND_COLORS.white),
        });
        
        page.drawText('QR\nunavailable', {
          x: qrTileX + mm(qr.tileSize / 2 - 8),
          y: qrTileY + mm(qr.tileSize / 2 - 3),
          size: 8,
          font: font,
          color: rgb(...BRAND_COLORS.mutedText),
        });
      }
    } catch (error) {
      console.error('❌ QR code render failed:', error);
    }
  }
  
  // 11. Draw crop marks
  drawCropMarks(page, x, y);
};

// Fetch attendees from subcollection with role mapping
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
        role: registration.role || '', // Direct role if provided
        ticket_type: registration.ticket_type || '', // For role inference
        tags: registration.tags || [], // For role inference
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
    
    // Calculate pages needed (4 badges per page in 2x2 grid)
    const badgesPerPage = 4;
    const totalPages = Math.ceil(attendees.length / badgesPerPage);
    const badgePositions = getBadgePositions(); // Use exact positions
    
    console.log(`📄 Generating ${totalPages} pages for ${attendees.length} attendees`);
    console.log(`📍 Badge positions:`, badgePositions);
    
    // Generate pages
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const page = pdfDoc.addPage([mm(LAYOUT.page.width), mm(LAYOUT.page.height)]);
      
      const startIndex = pageIndex * badgesPerPage;
      const pageAttendees = attendees.slice(startIndex, startIndex + badgesPerPage);
      
      console.log(`📄 Page ${pageIndex + 1}: ${pageAttendees.length} badges`);
      
      // Draw badges for this page using exact positions
      for (let i = 0; i < pageAttendees.length; i++) {
        const attendee = pageAttendees[i];
        const position = badgePositions[i];
        
        console.log(`🎫 Drawing badge for ${attendee.first_name} ${attendee.last_name} at (${position.x}, ${position.y})`);
        
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