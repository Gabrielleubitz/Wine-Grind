export interface QRCodeData {
  userId: string;
  eventId: string;
  timestamp?: string;
  type: 'connection' | 'checkin';
}

export class QRCodeService {
  /**
   * Generate a connection URL for user-to-user QR scanning
   * This will be used on registration confirmations and badges
   */
  static generateConnectionUrl(userId: string, eventId: string): string {
    if (!userId || !eventId) {
      throw new Error('Both userId and eventId are required for QR code generation');
    }
    
    // Format: https://winengrind.com/connect?to=userId&event=eventId
    return `https://winengrind.com/connect?to=${userId}&event=${eventId}`;
  }

  /**
   * Generate a check-in QR code value for admin scanning
   * This format is specifically for admin check-in purposes
   */
  static generateCheckInCode(userId: string, eventId: string): string {
    if (!userId || !eventId) {
      throw new Error('Both userId and eventId are required for check-in code generation');
    }
    
    // Format: eventId-userId (as expected by admin scanner)
    return `${eventId}-${userId}`;
  }

  /**
   * Parse a check-in QR code value
   */
  static parseCheckInCode(qrValue: string): { eventId: string; userId: string } | null {
    try {
      // Handle both formats:
      // 1. eventId-userId (direct format)
      // 2. https://winengrind.com/connect?to=userId&event=eventId (connection URL format)
      
      if (qrValue.includes('winengrind.com/connect')) {
        // Parse URL format
        const url = new URL(qrValue);
        const userId = url.searchParams.get('to');
        const eventId = url.searchParams.get('event');
        
        if (userId && eventId && eventId !== 'preview') {
          return { eventId, userId };
        }
        return null;
      } else if (qrValue.includes('-')) {
        // Parse direct format
        const parts = qrValue.split('-');
        if (parts.length === 2) {
          const [eventId, userId] = parts;
          return { eventId, userId };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing QR code:', error);
      return null;
    }
  }

  /**
   * Parse a connection URL
   */
  static parseConnectionUrl(url: string): { userId: string; eventId?: string } | null {
    try {
      const urlObj = new URL(url);
      const userId = urlObj.searchParams.get('to');
      const eventId = urlObj.searchParams.get('event');
      
      if (userId) {
        return {
          userId,
          eventId: eventId && eventId !== 'preview' ? eventId : undefined
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing connection URL:', error);
      return null;
    }
  }

  /**
   * Validate QR code format
   */
  static validateQRCode(qrValue: string): {
    isValid: boolean;
    type: 'connection' | 'checkin' | 'unknown';
    data?: { userId: string; eventId?: string };
    error?: string;
  } {
    if (!qrValue || typeof qrValue !== 'string') {
      return {
        isValid: false,
        type: 'unknown',
        error: 'Invalid QR code value'
      };
    }

    // Check if it's a connection URL
    if (qrValue.includes('winengrind.com/connect')) {
      const parsed = this.parseConnectionUrl(qrValue);
      if (parsed) {
        return {
          isValid: true,
          type: 'connection',
          data: parsed
        };
      } else {
        return {
          isValid: false,
          type: 'connection',
          error: 'Invalid connection URL format'
        };
      }
    }

    // Check if it's a check-in code
    if (qrValue.includes('-')) {
      const parsed = this.parseCheckInCode(qrValue);
      if (parsed) {
        return {
          isValid: true,
          type: 'checkin',
          data: parsed
        };
      } else {
        return {
          isValid: false,
          type: 'checkin',
          error: 'Invalid check-in code format'
        };
      }
    }

    return {
      isValid: false,
      type: 'unknown',
      error: 'Unknown QR code format'
    };
  }

  /**
   * Generate QR code for event registration confirmation
   * This should include the specific event the user registered for
   */
  static generateRegistrationQRUrl(userId: string, eventId: string): string {
    console.log('🎫 Generating registration QR for user:', userId, 'event:', eventId);
    return this.generateConnectionUrl(userId, eventId);
  }

  /**
   * Generate QR code for event badges
   * This should also be event-specific
   */
  static generateBadgeQRUrl(userId: string, eventId: string): string {
    console.log('🏷️ Generating badge QR for user:', userId, 'event:', eventId);
    return this.generateConnectionUrl(userId, eventId);
  }

  /**
   * Get QR code display info for debugging
   */
  static getQRInfo(qrValue: string): string {
    const validation = this.validateQRCode(qrValue);
    
    if (!validation.isValid) {
      return `❌ Invalid QR: ${validation.error}`;
    }

    if (validation.type === 'connection' && validation.data) {
      return `🔗 Connection QR: User ${validation.data.userId}${validation.data.eventId ? ` @ Event ${validation.data.eventId}` : ' (no event)'}`;
    }

    if (validation.type === 'checkin' && validation.data) {
      return `✅ Check-in QR: User ${validation.data.userId} @ Event ${validation.data.eventId}`;
    }

    return `❓ Unknown QR type: ${validation.type}`;
  }
}

export default QRCodeService;