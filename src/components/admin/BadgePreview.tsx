import React from 'react';
import QRCode from 'qrcode.react';
import { 
  BRAND_COLORS, 
  LAYOUT, 
  TYPOGRAPHY,
  getRole, 
  getRoleColor, 
  formatText,
  mm 
} from '../../lib/branding';

interface AttendeeData {
  id: string;
  name: string;
  email: string;
  work: string;
  linkedinUsername: string;
  phone: string;
  status: string;
  userId: string;
  role?: string;
  ticket_type?: string;
  tags?: string[];
}

interface BadgePreviewProps {
  attendee: AttendeeData;
  className?: string;
  backgroundImageUrl?: string;
  logoUrl?: string;
  overlayOpacity?: number;
  headerColor?: string;
}

const BadgePreview: React.FC<BadgePreviewProps> = ({ 
  attendee, 
  className = '', 
  backgroundImageUrl,
  logoUrl,
  overlayOpacity = 25,
  headerColor = '#7A1E1E'
}) => {
  // Parse attendee name
  const nameParts = attendee.name.split(' ');
  const firstName = nameParts[0] || 'Guest';
  const lastName = nameParts.slice(1).join(' ') || '';
  const fullName = formatText.name(`${firstName} ${lastName}`.trim());
  
  // Get role and company
  const role = getRole({
    role: attendee.role,
    ticket_type: attendee.ticket_type,
    tags: attendee.tags
  });
  const roleColor = getRoleColor(role);
  const company = attendee.work ? formatText.company(attendee.work) : '';
  
  // Format LinkedIn
  let linkedinDisplay = '';
  if (attendee.linkedinUsername && attendee.linkedinUsername.trim()) {
    const linkedin = attendee.linkedinUsername.trim();
    if (linkedin.startsWith('http')) {
      linkedinDisplay = linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, '');
    } else if (linkedin.includes('linkedin.com')) {
      linkedinDisplay = linkedin.replace(/.*linkedin\.com\/(in\/)?/, '');
    } else {
      linkedinDisplay = linkedin;
    }
    linkedinDisplay = `linkedin.com/in/${linkedinDisplay}`;
  }
  
  // QR Code URL
  const qrCodeUrl = `https://winengrind.com/connect?to=${attendee.userId}&event=preview`;
  
  // Calculate responsive font sizes (approximation for preview) 
  const nameLength = fullName.length;
  const maxTextWidthPx = mm(LAYOUT.badge.width - (2 * LAYOUT.badge.padding) - LAYOUT.qr.tileSize - LAYOUT.qr.margin);
  const isLongName = nameLength > 15; // Adjust for better preview accuracy
  
  // More accurate font size calculation for preview
  let nameFontSize = 'text-4xl'; // Default to large (44px)
  if (nameLength > 25) nameFontSize = 'text-2xl'; // 26px minimum  
  else if (nameLength > 20) nameFontSize = 'text-3xl'; // ~36px
  else if (nameLength > 15) nameFontSize = 'text-4xl'; // ~44px
  
  const chipFontSize = isLongName ? 'text-xs' : 'text-sm';
  
  return (
    <div className={`relative bg-white shadow-lg rounded-lg overflow-hidden ${className}`}
         style={{
           width: `${mm(LAYOUT.badge.width)}px`,
           height: `${mm(LAYOUT.badge.height)}px`,
           aspectRatio: `${LAYOUT.badge.width}/${LAYOUT.badge.height}`,
         }}>
      
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        {backgroundImageUrl ? (
          <img 
            src={backgroundImageUrl} 
            alt="Event background"
            className="w-full h-full object-cover opacity-15"
            onError={(e) => {
              // Fallback to light background if image fails
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        {/* Dark overlay for contrast */}
        <div 
          className="absolute inset-0 bg-black" 
          style={{ opacity: overlayOpacity / 100 }}
        ></div>
        {/* Fallback light background */}
        <div 
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: BRAND_COLORS.light }}
        ></div>
      </div>
      
      {/* Header band */}
      <div 
        className="absolute top-0 left-0 w-full flex items-center px-2 py-1"
        style={{ 
          height: `${mm(LAYOUT.header.height)}px`,
          backgroundColor: headerColor 
        }}
      >
        {/* Logo */}
        <div className="flex items-center space-x-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="object-contain"
              style={{
                width: `${mm(LAYOUT.header.logoWidth)}px`,
                height: `${mm(LAYOUT.header.logoHeight)}px`
              }}
              onError={(e) => {
                // Fallback to placeholder if logo fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div 
            className={`${logoUrl ? 'hidden' : ''} bg-white bg-opacity-20 rounded flex items-center justify-center`}
            style={{
              width: `${mm(LAYOUT.header.logoWidth)}px`,
              height: `${mm(LAYOUT.header.logoHeight)}px`
            }}
          >
            <span className="text-white text-xs font-bold">W&G</span>
          </div>
          <span 
            className="text-white font-bold tracking-wide"
            style={{ 
              fontSize: `${TYPOGRAPHY.header.size}px`,
              letterSpacing: TYPOGRAPHY.letterSpacing.header + 'em'
            }}
          >
            WINE & GRIND
          </span>
        </div>
      </div>
      
      {/* Role chip - positioned in bottom-right above QR code */}
      <div 
        className={`absolute flex items-center justify-center text-white font-semibold uppercase tracking-tight ${chipFontSize}`}
        style={{
          backgroundColor: headerColor,
          bottom: `${mm(LAYOUT.qr.tileSize + LAYOUT.qr.margin + LAYOUT.roleChip.marginTop)}px`,
          right: `${mm(LAYOUT.roleChip.marginRight)}px`,
          height: `${mm(LAYOUT.roleChip.height)}px`,
          borderRadius: `${mm(LAYOUT.roleChip.radius)}px`,
          paddingLeft: `${mm(LAYOUT.roleChip.paddingH)}px`,
          paddingRight: `${mm(LAYOUT.roleChip.paddingH)}px`,
          letterSpacing: TYPOGRAPHY.letterSpacing.tight + 'em',
          fontSize: isLongName ? `${TYPOGRAPHY.roleChip.reduced}px` : `${TYPOGRAPHY.roleChip.normal}px`
        }}
      >
        {formatText.roleChip(role)}
      </div>
      
      {/* Content area */}
      <div 
        className="absolute left-0 text-gray-900"
        style={{
          top: `${mm(LAYOUT.content.nameTop)}px`,
          left: `${mm(LAYOUT.badge.padding)}px`,
          right: `${mm(LAYOUT.badge.padding + LAYOUT.qr.tileSize + LAYOUT.qr.margin)}px`,
        }}
      >
        {/* Name */}
        <div 
          className="font-bold leading-tight"
          style={{ 
            color: BRAND_COLORS.charcoal,
            fontSize: nameFontSize === 'text-2xl' ? '26px' : 
                     nameFontSize === 'text-3xl' ? '36px' : '44px'
          }}
        >
          {fullName}
        </div>
        
        {/* Company */}
        {company && (
          <div 
            className="leading-tight"
            style={{ 
              color: BRAND_COLORS.charcoal,
              marginTop: `${mm(LAYOUT.content.companyGap)}px`,
              fontSize: `${TYPOGRAPHY.company.size}px`
            }}
          >
            {company}
          </div>
        )}
        
        {/* LinkedIn */}
        {linkedinDisplay && (
          <div 
            className="leading-tight"
            style={{ 
              color: BRAND_COLORS.mutedText,
              marginTop: `${mm(LAYOUT.content.linkedinGap)}px`,
              fontSize: `${TYPOGRAPHY.linkedin.size}px`
            }}
          >
            {linkedinDisplay}
          </div>
        )}
      </div>
      
      {/* QR Code */}
      <div 
        className="absolute bottom-0 right-0 bg-white flex items-center justify-center"
        style={{
          width: `${mm(LAYOUT.qr.tileSize)}px`,
          height: `${mm(LAYOUT.qr.tileSize)}px`,
          marginBottom: `${mm(LAYOUT.qr.margin)}px`,
          marginRight: `${mm(LAYOUT.qr.margin)}px`,
          padding: `${mm(LAYOUT.qr.padding)}px`
        }}
      >
        <QRCode
          value={qrCodeUrl}
          size={mm(LAYOUT.qr.codeSize)}
          level="H"
          includeMargin={false}
          style={{
            width: `${mm(LAYOUT.qr.codeSize)}px`,
            height: `${mm(LAYOUT.qr.codeSize)}px`
          }}
        />
      </div>
      
      {/* Scale indicator */}
      <div className="absolute bottom-1 left-1 text-xs text-gray-500 bg-white bg-opacity-75 px-1 rounded">
        {LAYOUT.badge.width}×{LAYOUT.badge.height}mm
      </div>
    </div>
  );
};

export default BadgePreview;