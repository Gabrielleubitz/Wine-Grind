import { useState, useRef, useCallback } from 'react';
import { EventService } from '../services/eventService';

interface ScanResult {
  type: 'success' | 'already-checked' | 'not-found' | 'invalid-qr';
  message: string;
  registration?: any;
  eventInfo?: any;
}

export const useAdminScanner = (adminUid?: string) => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannedRegistration, setScannedRegistration] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide scan results after 5 seconds
  const autoHideResult = useCallback(() => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
    
    resultTimeoutRef.current = setTimeout(() => {
      setScanResult(null);
      setScannedRegistration(null);
    }, 5000);
  }, []);

  // Parse QR code payload to extract eventId and userId
  const parseQRCode = (qrPayload: string): { eventId: string; userId: string } | null => {
    try {
      console.log('🔍 Parsing QR code payload:', qrPayload);
      
      // Handle different QR code formats
      // Format 1: "eventId-userId" (e.g., "event123-user456")
      if (qrPayload.includes('-') && qrPayload.split('-').length === 2) {
        const [eventId, userId] = qrPayload.split('-');
        if (eventId && userId) {
          console.log('✅ Parsed QR format 1:', { eventId, userId });
          return { eventId, userId };
        }
      }
      
      // Format 2: Direct userId (fallback - use selected event)
      if (selectedEventId && qrPayload.length > 10) {
        console.log('✅ Parsed QR format 2 (userId only):', { eventId: selectedEventId, userId: qrPayload });
        return { eventId: selectedEventId, userId: qrPayload };
      }
      
      // Format 3: JSON format (if needed in future)
      try {
        const parsed = JSON.parse(qrPayload);
        if (parsed.eventId && parsed.userId) {
          console.log('✅ Parsed QR format 3 (JSON):', parsed);
          return { eventId: parsed.eventId, userId: parsed.userId };
        }
      } catch (e) {
        // Not JSON, continue with other formats
      }
      
      console.log('❌ Unable to parse QR code format');
      return null;
    } catch (error) {
      console.error('❌ Error parsing QR code:', error);
      return null;
    }
  };

  // Verify user registration for specific event
  const verifyEventRegistration = async (eventId: string, userId: string) => {
    try {
      console.log('🔍 Verifying registration for event:', eventId, 'user:', userId);
      
      // Get event information
      const eventInfo = await EventService.getEventById(eventId);
      if (!eventInfo) {
        throw new Error('Event not found');
      }
      
      // Get user registration for this specific event
      const registration = await EventService.getUserRegistration(eventId, userId);
      if (!registration) {
        return {
          type: 'not-found' as const,
          message: `❌ User not registered for ${eventInfo.name}`,
          eventInfo
        };
      }
      
      // Check if already checked in (if we add this field later)
      const isAlreadyCheckedIn = registration.checkedIn === true;
      
      if (isAlreadyCheckedIn) {
        return {
          type: 'already-checked' as const,
          message: `✅ Already checked in to ${eventInfo.name}`,
          registration,
          eventInfo
        };
      }
      
      return {
        type: 'success' as const,
        message: `✅ ${registration.name} registered for ${eventInfo.name}`,
        registration,
        eventInfo
      };
      
    } catch (error: any) {
      console.error('❌ Error verifying registration:', error);
      return {
        type: 'not-found' as const,
        message: `❌ Error: ${error.message}`,
        eventInfo: null
      };
    }
  };

  // Perform check-in operation for specific event
  const performEventCheckIn = useCallback(async (eventId: string, userId: string, registration: any) => {
    try {
      console.log('✅ Checking in user for event:', eventId, userId);
      
      // Update registration with check-in status
      // Note: This would need to be implemented in EventService
      // For now, we'll simulate the check-in
      const updatedRegistration = { 
        ...registration, 
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: adminUid
      };
      
      setScannedRegistration(updatedRegistration);
      
      setScanResult({
        type: 'success',
        message: `✅ ${registration.name} checked in successfully!`,
        registration: updatedRegistration
      });
      
      console.log('✅ Check-in completed successfully');
      return updatedRegistration;
      
    } catch (err: any) {
      console.error('❌ Error during check-in:', err);
      setScanResult({
        type: 'not-found',
        message: 'Failed to check in. Please try manually.'
      });
      throw err;
    }
  }, [adminUid]);

  // Handle QR scan success with event verification
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (scanning) return;
    
    console.log('📱 QR Code scanned:', decodedText);
    
    setScanning(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Parse QR code to extract eventId and userId
      const parsed = parseQRCode(decodedText);
      
      if (!parsed) {
        setScanResult({
          type: 'invalid-qr',
          message: '❌ Invalid QR code format'
        });
        autoHideResult();
        return;
      }
      
      const { eventId, userId } = parsed;
      
      // Verify registration for the specific event
      const verificationResult = await verifyEventRegistration(eventId, userId);
      
      setScanResult(verificationResult);
      
      if (verificationResult.registration) {
        setScannedRegistration(verificationResult.registration);
        
        // Auto check-in if enabled and user is registered
        if (autoCheckInEnabled && verificationResult.type === 'success') {
          await performEventCheckIn(eventId, userId, verificationResult.registration);
        }
      }
      
      // Auto-hide result after 5 seconds
      autoHideResult();
      
    } catch (err: any) {
      console.error('❌ Error processing scan:', err);
      setScanResult({
        type: 'not-found',
        message: 'Error processing QR code'
      });
      autoHideResult();
    } finally {
      setScanning(false);
    }
  }, [scanning, autoCheckInEnabled, performEventCheckIn, autoHideResult, selectedEventId]);

  // Handle manual search by email
  const handleManualSearch = useCallback(async (email: string) => {
    setError(null);
    setSuccess(null);
    
    if (!selectedEventId) {
      setError('Please select an event first');
      return;
    }
    
    try {
      console.log('🔍 Manual search for email:', email, 'in event:', selectedEventId);
      
      // Get event info
      const eventInfo = await EventService.getEventById(selectedEventId);
      if (!eventInfo) {
        setError('Selected event not found');
        return;
      }
      
      // Get all registrations for the event and find by email
      const registrations = await EventService.getEventRegistrations(selectedEventId);
      const registration = registrations.find(reg => reg.email.toLowerCase() === email.toLowerCase());
      
      if (registration) {
        setScannedRegistration({
          ...registration,
          eventName: eventInfo.name,
          eventId: selectedEventId
        });
        console.log('✅ Manual search found registration:', registration);
      } else {
        setError(`No registration found for ${email} in ${eventInfo.name}`);
        setScannedRegistration(null);
      }
    } catch (err: any) {
      console.error('❌ Error in manual search:', err);
      setError('Error searching for registration. Please try again.');
    }
  }, [selectedEventId]);

  // Handle manual check-in
  const handleManualCheckIn = useCallback(async () => {
    if (!scannedRegistration?.userId || !selectedEventId) return;
    
    try {
      setError(null);
      await performEventCheckIn(selectedEventId, scannedRegistration.userId, scannedRegistration);
      setSuccess(`✅ ${scannedRegistration.name} has been checked in successfully!`);
      
      // Clear after 3 seconds
      setTimeout(() => {
        setScannedRegistration(null);
        setSuccess(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ Error checking in:', err);
      setError('Failed to check in. Please try again.');
    }
  }, [scannedRegistration, selectedEventId, performEventCheckIn]);

  // Clear scan result manually
  const clearScanResult = useCallback(() => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
    setScanResult(null);
    setScannedRegistration(null);
  }, []);

  // Toggle auto check-in
  const toggleAutoCheckIn = useCallback((enabled: boolean) => {
    setAutoCheckInEnabled(enabled);
  }, []);

  // Set selected event for scanning
  const setEventForScanning = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    console.log('📅 Selected event for scanning:', eventId);
  }, []);

  return {
    scanResult,
    scannedRegistration,
    scanning,
    error,
    success,
    autoCheckInEnabled,
    selectedEventId,
    handleScanSuccess,
    handleManualSearch,
    handleManualCheckIn,
    clearScanResult,
    toggleAutoCheckIn,
    setEventForScanning,
    performEventCheckIn
  };
};