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

// Convert hex color to RGB array for pdf-lib
const hexToRgb = (hex) => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  return [r, g, b];
};

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

// Load image from URL
const loadImageFromUrl = async (url) => {
  try {
    console.log(`🔄 Loading image from URL: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ Image loaded successfully: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error(`❌ Error loading image from URL: ${url}`, error);
    throw error;
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
const drawRoleChip = (page, attendee, badgeX, badgeY, font, isLongName = false, customHeaderColor) => {
  const role = getRole(attendee);
  const roleText = formatText.roleChip(role);
  const chipFontSize = isLongName ? TYPOGRAPHY.roleChip.reduced : TYPOGRAPHY.roleChip.normal;
  
  // Calculate chip dimensions
  const textWidth = roleText.length * 0.6 * chipFontSize; // Estimated width
  const chipWidth = textWidth + (2 * LAYOUT.roleChip.paddingH);
  
  // Position chip in top-right corner (matching preview positioning exactly)
  const chipX = badgeX + mm(LAYOUT.badge.width - chipWidth - LAYOUT.roleChip.marginRight);
  // Position from TOP of badge: header height + margin top (same as preview)
  const chipTopOffset = LAYOUT.header.height + LAYOUT.roleChip.marginTop;
  const chipY = badgeY + mm(LAYOUT.badge.height - chipTopOffset - LAYOUT.roleChip.height);
  
  // Draw chip background with custom header color (rounded rectangle using multiple shapes)
  const radius = mm(LAYOUT.roleChip.radius);
  const chipHeight = mm(LAYOUT.roleChip.height);
  const chipWidthMm = mm(chipWidth);
  const chipColorRgb = customHeaderColor ? hexToRgb(customHeaderColor) : BRAND_COLORS.wine;
  
  // Main rectangle body
  page.drawRectangle({
    x: chipX + radius,
    y: chipY,
    width: chipWidthMm - (2 * radius),
    height: chipHeight,
    color: rgb(...chipColorRgb),
  });
  
  // Left cap
  page.drawRectangle({
    x: chipX,
    y: chipY,
    width: radius,
    height: chipHeight,
    color: rgb(...chipColorRgb),
  });
  
  // Right cap  
  page.drawRectangle({
    x: chipX + chipWidthMm - radius,
    y: chipY,
    width: radius,
    height: chipHeight,
    color: rgb(...chipColorRgb),
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

// Draw a single badge filling entire page (matching preview exactly)
const drawSingleBadge = async (page, attendee, x, y, font, boldFont, logoImage, backgroundImage, customOverlayOpacity, customHeaderColor) => {
  const { badge, header, qr, content } = LAYOUT;
  
  // Full page dimensions
  const badgeX = 0;
  const badgeY = 0;
  const badgeWidth = mm(badge.width);
  const badgeHeight = mm(badge.height);
  
  // 1. Draw base background (light color)
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    color: rgb(...BRAND_COLORS.lightBg),
  });
  
  // 2. Draw background image if available (maintaining aspect ratio, covering full badge)
  if (backgroundImage) {
    try {
      // Calculate scaling to cover entire badge area
      const imageAspect = backgroundImage.width / backgroundImage.height;
      const badgeAspect = badge.width / badge.height;
      
      let scaledWidth, scaledHeight, offsetX, offsetY;
      
      if (imageAspect > badgeAspect) {
        // Image is wider - scale to height and center horizontally  
        scaledHeight = badgeHeight;
        scaledWidth = scaledHeight * imageAspect;
        offsetX = (badgeWidth - scaledWidth) / 2;
        offsetY = 0;
      } else {
        // Image is taller - scale to width and center vertically
        scaledWidth = badgeWidth;
        scaledHeight = scaledWidth / imageAspect;
        offsetX = 0;
        offsetY = (badgeHeight - scaledHeight) / 2;
      }
      
      page.drawImage(backgroundImage, {
        x: badgeX + offsetX,
        y: badgeY + offsetY,
        width: scaledWidth,
        height: scaledHeight,
        opacity: 0.15,
      });
    } catch (error) {
      console.log('⚠️ Background image failed:', error.message);
    }
  }
  
  // 3. Draw dark overlay for contrast
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    color: rgb(...BRAND_COLORS.black),
    opacity: (customOverlayOpacity || 25) / 100,
  });
  
  // 4. Draw header band
  const headerColorRgb = customHeaderColor ? hexToRgb(customHeaderColor) : BRAND_COLORS.wine;
  page.drawRectangle({
    x: badgeX,
    y: badgeY + badgeHeight - mm(header.height),
    width: badgeWidth,
    height: mm(header.height),
    color: rgb(...headerColorRgb),
  });
  
  // 5. Draw logo in header
  if (logoImage) {
    try {
      const maxLogoWidth = mm(header.logoWidth);
      const maxLogoHeight = mm(header.logoHeight);
      
      const logoAspect = logoImage.width / logoImage.height;
      const maxAspect = header.logoWidth / header.logoHeight;
      
      let logoWidth, logoHeight;
      if (logoAspect > maxAspect) {
        logoWidth = maxLogoWidth;
        logoHeight = maxLogoWidth / logoAspect;
      } else {
        logoHeight = maxLogoHeight;
        logoWidth = maxLogoHeight * logoAspect;
      }
      
      const logoY = badgeY + badgeHeight - mm(header.height) + (mm(header.height) - logoHeight) / 2;
      
      page.drawImage(logoImage, {
        x: badgeX + mm(badge.padding),
        y: logoY,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (error) {
      console.log('⚠️ Logo failed:', error.message);
    }
  }
  
  // 6. Draw "WINE & GRIND" text
  const logoOffset = logoImage ? header.logoWidth + 2 : 0;
  page.drawText('WINE & GRIND', {
    x: badgeX + mm(badge.padding + logoOffset),
    y: badgeY + badgeHeight - mm(header.height) + mm(header.height) / 2 - TYPOGRAPHY.header.size / 4,
    size: TYPOGRAPHY.header.size,
    font: boldFont,
    color: rgb(...BRAND_COLORS.white),
  });
  
  // 7. Draw role chip in bottom-center (above QR code)
  const role = getRole(attendee);
  const roleText = formatText.roleChip(role);
  const chipWidth = roleText.length * 0.6 * TYPOGRAPHY.roleChip.normal + (2 * LAYOUT.roleChip.paddingH);
  const chipColorRgb = customHeaderColor ? hexToRgb(customHeaderColor) : BRAND_COLORS.wine;
  
  // Center horizontally on badge, position above QR code
  const chipX = (badgeWidth - mm(chipWidth)) / 2;
  const chipY = mm(qr.tileSize + qr.margin + LAYOUT.roleChip.marginTop);
  
  // Draw rounded chip with proper circular end caps
  const radius = mm(LAYOUT.roleChip.radius);
  const chipHeightMm = mm(LAYOUT.roleChip.height);
  const chipWidthMm = mm(chipWidth);
  
  // Main rectangle body (middle section)
  page.drawRectangle({
    x: chipX + radius,
    y: chipY,
    width: chipWidthMm - (2 * radius),
    height: chipHeightMm,
    color: rgb(...chipColorRgb),
  });
  
  // Left rounded end cap (circle)
  page.drawCircle({
    x: chipX + radius,
    y: chipY + chipHeightMm / 2,
    size: radius,
    color: rgb(...chipColorRgb),
  });
  
  // Right rounded end cap (circle)  
  page.drawCircle({
    x: chipX + chipWidthMm - radius,
    y: chipY + chipHeightMm / 2,
    size: radius,
    color: rgb(...chipColorRgb),
  });
  
  // Draw chip text - centered horizontally within chip
  const textWidth = roleText.length * 0.6 * TYPOGRAPHY.roleChip.normal; // Estimated text width
  const textX = chipX + (chipWidthMm - textWidth) / 2; // Center text horizontally
  
  page.drawText(roleText, {
    x: textX,
    y: chipY + chipHeightMm / 2 - TYPOGRAPHY.roleChip.normal / 4,
    size: TYPOGRAPHY.roleChip.normal,
    font: font,
    color: rgb(...BRAND_COLORS.white),
  });
  
  // 8. Draw name (large, bold, title case) - full width since QR is centered
  const fullName = formatText.name(`${attendee.first_name} ${attendee.last_name}`.trim() || 'Guest');
  const maxTextWidth = badge.width - (2 * badge.padding);
  const nameSize = fitText(fullName, mm(maxTextWidth), TYPOGRAPHY.name.max, TYPOGRAPHY.name.min);
  
  page.drawText(fullName, {
    x: badgeX + mm(badge.padding),
    y: badgeY + badgeHeight - mm(content.nameTop),
    size: nameSize,
    font: boldFont,
    color: rgb(...BRAND_COLORS.charcoal),
  });
  
  // 9. Draw company (position relative to name like in preview)
  let currentY = badgeHeight - mm(content.nameTop) - (nameSize * 0.6) - mm(content.companyGap);
  if (attendee.company && attendee.company.trim()) {
    const companyText = formatText.company(attendee.company.trim());
    
    page.drawText(companyText, {
      x: badgeX + mm(badge.padding),
      y: currentY,
      size: TYPOGRAPHY.company.size,
      font: font,
      color: rgb(...BRAND_COLORS.charcoal),
    });
    
    currentY -= mm(TYPOGRAPHY.company.size * 0.4 + content.linkedinGap);
  }
  
  // 10. Draw LinkedIn (position relative to company like in preview)
  if (attendee.linkedin && attendee.linkedin.trim()) {
    let linkedinText = attendee.linkedin.trim();
    if (linkedinText.startsWith('http')) {
      linkedinText = linkedinText.replace(/https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, '');
    }
    linkedinText = `linkedin.com/in/${linkedinText}`;
    
    page.drawText(linkedinText, {
      x: badgeX + mm(badge.padding),
      y: currentY,
      size: TYPOGRAPHY.linkedin.size,
      font: font,
      color: rgb(...BRAND_COLORS.mutedText),
    });
  }
  
  // 11. Draw QR code in bottom-center
  if (attendee.qr_code) {
    try {
      const qrDataUrl = await generateQRCode(attendee.qr_code);
      if (qrDataUrl) {
        // Center QR tile horizontally on badge
        const qrTileX = (badgeWidth - mm(qr.tileSize)) / 2;
        const qrTileY = mm(qr.margin);
        
        // White tile background
        page.drawRectangle({
          x: qrTileX,
          y: qrTileY,
          width: mm(qr.tileSize),
          height: mm(qr.tileSize),
          color: rgb(...BRAND_COLORS.white),
        });
        
        // QR code
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const qrImage = await page.doc.embedPng(qrBuffer);
        
        page.drawImage(qrImage, {
          x: qrTileX + mm(qr.padding),
          y: qrTileY + mm(qr.padding),
          width: mm(qr.codeSize),
          height: mm(qr.codeSize),
        });
      }
    } catch (error) {
      console.error('⚠️ QR code failed:', error.message);
    }
  }
};

// Legacy multi-badge function (kept for reference)
const drawBadge = async (page, attendee, x, y, font, boldFont, logoImage, backgroundImage, customOverlayOpacity, customHeaderColor) => {
  const { badge, header, qr, content, background } = LAYOUT;
  const pageHeight = LAYOUT.page.height;
  
  // Convert badge position to PDF coordinates (Y-axis flipped for PDF)
  const badgeX = mm(x);
  const badgeY = mm(pageHeight - y - badge.height);
  
  // 1. Draw background with proper clipping and overlay
  const badgeWidthPt = mm(badge.width);
  const badgeHeightPt = mm(badge.height);
  
  // First, ensure we have a base background
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidthPt,
    height: badgeHeightPt,
    color: rgb(...BRAND_COLORS.lightBg),
  });
  
  // Then draw background image if available, constrained to badge area
  if (backgroundImage) {
    try {
      // Get image dimensions
      const imageWidth = backgroundImage.width;
      const imageHeight = backgroundImage.height;
      
      // Calculate scaling to exactly fit badge area (maintaining aspect ratio)
      const scaleX = badgeWidthPt / imageWidth;
      const scaleY = badgeHeightPt / imageHeight;
      const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit within bounds
      
      const scaledWidth = imageWidth * scale;
      const scaledHeight = imageHeight * scale;
      
      // Center the image within badge bounds
      const offsetX = (badgeWidthPt - scaledWidth) / 2;
      const offsetY = (badgeHeightPt - scaledHeight) / 2;
      
      // Draw background image (guaranteed to fit within badge bounds)
      page.drawImage(backgroundImage, {
        x: badgeX + offsetX,
        y: badgeY + offsetY,
        width: scaledWidth,
        height: scaledHeight,
        opacity: 0.15, // 15% as specified
      });
      
    } catch (error) {
      console.log('⚠️ Background image render failed:', error.message);
    }
  }
  
  // Always add overlay to entire badge area (regardless of background image success)
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidthPt,
    height: badgeHeightPt,
    color: rgb(...BRAND_COLORS.black),
    opacity: (customOverlayOpacity || 25) / 100, // Use custom overlay opacity
  });
  
  // 2. Draw header band with custom color (13mm height)
  const headerColorRgb = customHeaderColor ? hexToRgb(customHeaderColor) : BRAND_COLORS.wine;
  page.drawRectangle({
    x: badgeX,
    y: badgeY + mm(badge.height - header.height),
    width: mm(badge.width),
    height: mm(header.height),
    color: rgb(...headerColorRgb),
  });
  
  // 3. Draw logo in header (maintaining aspect ratio)
  if (logoImage) {
    try {
      // Calculate logo scaling to fit within specified dimensions
      const maxLogoWidth = mm(header.logoWidth);
      const maxLogoHeight = mm(header.logoHeight);
      
      const logoAspectRatio = logoImage.width / logoImage.height;
      const maxAspectRatio = header.logoWidth / header.logoHeight;
      
      let logoWidth, logoHeight;
      if (logoAspectRatio > maxAspectRatio) {
        // Logo is wider relative to max dimensions
        logoWidth = maxLogoWidth;
        logoHeight = maxLogoWidth / logoAspectRatio;
      } else {
        // Logo is taller relative to max dimensions
        logoHeight = maxLogoHeight;
        logoWidth = maxLogoHeight * logoAspectRatio;
      }
      
      // Center logo vertically in header
      const logoY = badgeY + mm(badge.height - header.height) + (mm(header.height) - logoHeight) / 2;
      
      page.drawImage(logoImage, {
        x: badgeX + mm(badge.padding),
        y: logoY,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (error) {
      console.log('⚠️ Logo render failed:', error.message);
      
      // Draw fallback placeholder
      page.drawText('W&G', {
        x: badgeX + mm(badge.padding),
        y: badgeY + mm(badge.height - header.height + header.textOffset + 2),
        size: 12,
        font: boldFont,
        color: rgb(...BRAND_COLORS.white),
      });
    }
  } else {
    // Draw fallback placeholder when no logo provided
    page.drawText('W&G', {
      x: badgeX + mm(badge.padding),
      y: badgeY + mm(badge.height - header.height + header.textOffset + 2),
      size: 12,
      font: boldFont,
      color: rgb(...BRAND_COLORS.white),
    });
  }
  
  // 4. Draw "WINE & GRIND" text in header
  const logoTextOffset = logoImage ? header.logoWidth + 2 : 0;
  page.drawText('WINE & GRIND', {
    x: badgeX + mm(badge.padding + logoTextOffset),
    y: badgeY + mm(badge.height - header.height) + mm(header.height) / 2 - TYPOGRAPHY.header.size / 2,
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
  drawRoleChip(page, attendee, badgeX, badgeY, font, isLongName, customHeaderColor);
  
  // 10. Draw QR code with white tile background (38mm tile, 32mm QR)
  if (attendee.qr_code) {
    try {
      const qrDataUrl = await generateQRCode(attendee.qr_code);
      if (qrDataUrl) {
        // QR tile position (bottom-right corner)
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
    const { eventId, backgroundImageUrl, logoUrl, overlayOpacity, headerColor } = req.query;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Missing eventId parameter'
      });
    }
    
    if (!backgroundImageUrl || !logoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing backgroundImageUrl or logoUrl parameters'
      });
    }
    
    console.log(`🎫 Starting enhanced badge generation for event: ${eventId}`);
    console.log(`🖼️ Background URL: ${backgroundImageUrl}`);
    console.log(`🏷️ Logo URL: ${logoUrl}`);
    console.log(`🎨 Overlay Opacity: ${overlayOpacity}%`);
    console.log(`🎨 Header Color: ${headerColor}`);
    
    // Load assets and data in parallel
    const [event, attendees, logoData, backgroundData] = await Promise.all([
      getEventDetails(eventId),
      getEventAttendees(eventId),
      loadImageFromUrl(logoUrl),
      loadImageFromUrl(backgroundImageUrl),
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
    
    // Embed assets with better format detection
    let logoImage = null;
    let backgroundImage = null;
    
    // Embed logo with format detection
    if (logoData) {
      try {
        // Try PNG first (common for logos)
        logoImage = await pdfDoc.embedPng(logoData);
        console.log('✅ Logo embedded as PNG');
      } catch (pngErr) {
        try {
          // Try JPEG if PNG fails
          logoImage = await pdfDoc.embedJpg(logoData);
          console.log('✅ Logo embedded as JPEG');
        } catch (jpgErr) {
          console.error('❌ Logo embedding failed:', jpgErr.message);
          return res.status(400).json({
            success: false,
            error: 'Failed to embed logo image. Please ensure the logo URL points to a valid PNG or JPEG image.'
          });
        }
      }
    }
    
    // Embed background with format detection  
    if (backgroundData) {
      try {
        // Try JPEG first (common for photos)
        backgroundImage = await pdfDoc.embedJpg(backgroundData);
        console.log('✅ Background embedded as JPEG');
      } catch (jpgErr) {
        try {
          // Try PNG if JPEG fails
          backgroundImage = await pdfDoc.embedPng(backgroundData);
          console.log('✅ Background embedded as PNG');
        } catch (pngErr) {
          console.error('❌ Background embedding failed:', pngErr.message);
          return res.status(400).json({
            success: false,
            error: 'Failed to embed background image. Please ensure the background URL points to a valid JPEG or PNG image.'
          });
        }
      }
    }
    
    // Generate one badge per page for perfect template matching
    const totalPages = attendees.length;
    
    console.log(`📄 Generating ${totalPages} pages (1 badge per page) for ${attendees.length} attendees`);
    
    // Generate pages - one badge per page
    for (let pageIndex = 0; pageIndex < attendees.length; pageIndex++) {
      const attendee = attendees[pageIndex];
      
      // Create page with badge dimensions (90 × 133.5 mm)
      const page = pdfDoc.addPage([mm(LAYOUT.badge.width), mm(LAYOUT.badge.height)]);
      
      console.log(`📄 Page ${pageIndex + 1}: Badge for ${attendee.first_name} ${attendee.last_name}`);
      
      // Draw badge at origin (0,0) - full page
      await drawSingleBadge(page, attendee, 0, 0, font, boldFont, logoImage, backgroundImage, overlayOpacity, headerColor);
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
      timestamp: new Date().toISOString(),
      eventId,
      backgroundImageUrl,
      logoUrl,
      overlayOpacity,
      headerColor
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate enhanced badges PDF';
    if (error.message.includes('HTTP')) {
      errorMessage = 'Failed to load image from URL. Please check that the URLs are accessible and point to valid images.';
    } else if (error.message.includes('embed')) {
      errorMessage = 'Failed to embed image in PDF. Please ensure images are in JPEG or PNG format.';
    } else if (error.message.includes('attendees')) {
      errorMessage = 'No attendees found for this event.';
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};