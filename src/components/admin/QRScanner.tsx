import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  QrCode, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  X,
  RotateCcw,
  Video,
  VideoOff,
  Upload,
  Calendar
} from 'lucide-react';
import { EventService, EventData } from '../../services/eventService';

interface ScanResult {
  type: 'success' | 'already-checked' | 'not-found' | 'invalid-qr';
  message: string;
  registration?: any;
  eventInfo?: any;
}

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => Promise<void>;
  scanResult: ScanResult | null;
  onClearResult: () => void;
  autoCheckInEnabled: boolean;
  onToggleAutoCheckIn: (enabled: boolean) => void;
  scanning: boolean;
  selectedEventId: string;
  onEventSelect: (eventId: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  scanResult,
  onClearResult,
  autoCheckInEnabled,
  onToggleAutoCheckIn,
  scanning,
  selectedEventId,
  onEventSelect
}) => {
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [videoFeedActive, setVideoFeedActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scannerMode, setScannerMode] = useState<'auto' | 'manual'>('auto');
  const [events, setEvents] = useState<EventData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const videoMonitorRef = useRef<NodeJS.Timeout | null>(null);

  // Load events for selection
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await EventService.getAllEvents();
        setEvents(eventsData);
        
        // Auto-select the first active event if none selected
        if (!selectedEventId && eventsData.length > 0) {
          const activeEvent = eventsData.find(e => e.status === 'active') || eventsData[0];
          onEventSelect(activeEvent.id);
        }
      } catch (error) {
        console.error('❌ Error loading events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, [selectedEventId, onEventSelect]);

  // Check if DOM element exists and is ready
  const checkDOMReady = (): Promise<boolean> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkElement = () => {
        attempts++;
        const element = document.getElementById('qr-reader');
        
        if (element) {
          console.log('📱 DOM element found:', element);
          resolve(true);
        } else if (attempts < maxAttempts) {
          console.log(`📱 DOM element not found, retrying... (${attempts}/${maxAttempts})`);
          setTimeout(checkElement, 200);
        } else {
          console.error('❌ DOM element never found');
          resolve(false);
        }
      };
      
      checkElement();
    });
  };

  // Get available cameras
  const initializeCameras = async () => {
    try {
      console.log('📷 Getting available cameras...');
      const cameras = await Html5Qrcode.getCameras();
      console.log('📷 Available cameras:', cameras);
      
      if (cameras.length === 0) {
        throw new Error('No cameras found');
      }
      
      setAvailableCameras(cameras);
      
      // Select back camera if available
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );
      
      const selectedCamera = backCamera || cameras[0];
      setSelectedCameraId(selectedCamera.id);
      console.log('📷 Selected camera:', selectedCamera.label);
      
      return true;
    } catch (error) {
      console.error('❌ Error getting cameras:', error);
      setError('Unable to access cameras. Please ensure camera permissions are granted.');
      return false;
    }
  };

  // Enhanced video feed monitoring
  const startVideoMonitoring = () => {
    console.log('📹 Starting enhanced video feed monitoring...');
    
    if (videoMonitorRef.current) {
      clearInterval(videoMonitorRef.current);
    }

    let checkCount = 0;
    const maxChecks = 40; // Monitor for 20 seconds

    videoMonitorRef.current = setInterval(() => {
      checkCount++;
      
      const scannerContainer = document.getElementById('qr-reader');
      if (!scannerContainer) {
        console.log(`📹 Scanner container missing (attempt ${checkCount}/${maxChecks})`);
        return;
      }

      // Look for video element
      const videoElement = scannerContainer.querySelector('video') as HTMLVideoElement;
      
      if (videoElement) {
        console.log(`📹 Video element found!`, {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          readyState: videoElement.readyState,
          paused: videoElement.paused
        });

        // Check if video is ready
        const isVideoReady = 
          videoElement.videoWidth > 0 && 
          videoElement.videoHeight > 0 && 
          videoElement.readyState >= 2;

        if (isVideoReady) {
          console.log('✅ Video feed confirmed active!');
          setVideoFeedActive(true);
          setCameraInitializing(false);
          setError(null);
          clearInterval(videoMonitorRef.current!);
          return;
        }

        // Try to play if paused
        if (videoElement.paused && checkCount > 5) {
          console.log('🔄 Attempting to play paused video...');
          videoElement.play().catch(e => console.log('Play attempt failed:', e.message));
        }
      }

      // Timeout handling
      if (checkCount >= maxChecks) {
        console.log('❌ Video feed monitoring timeout');
        setVideoFeedActive(false);
        setCameraInitializing(false);
        setError('Camera video feed failed to start. Please try refreshing.');
        clearInterval(videoMonitorRef.current!);
      }
    }, 500);
  };

  // Initialize with Html5QrcodeScanner (auto mode)
  const initializeAutoScanner = async () => {
    console.log('🎥 Initializing Html5QrcodeScanner (auto mode)...');
    setCameraInitializing(true);
    setError(null);
    setVideoFeedActive(false);

    try {
      // Ensure DOM is ready
      const domReady = await checkDOMReady();
      if (!domReady) {
        throw new Error('DOM element not ready');
      }

      // Clear any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
          scannerRef.current = null;
        } catch (e) {
          console.log('Error clearing existing scanner:', e);
        }
      }

      // Initialize cameras
      const camerasReady = await initializeCameras();
      if (!camerasReady) {
        throw new Error('Cameras not available');
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: false,
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      console.log('📱 Creating Html5QrcodeScanner with config:', config);

      const qrScanner = new Html5QrcodeScanner("qr-reader", config, false);

      // Enhanced callbacks
      const onScanSuccess = (decodedText: string, decodedResult: any) => {
        console.log('📱 QR scan successful:', decodedText);
        setVideoFeedActive(true);
        setCameraInitializing(false);
        onScanSuccess(decodedText);
      };

      const onScanFailure = (error: string) => {
        if (!error.includes('No QR code found') && 
            !error.includes('QR code parse error') &&
            !error.includes('NotFoundException')) {
          console.log('📱 Scanner error:', error);
          
          if (error.includes('NotAllowedError')) {
            setCameraPermission('denied');
            setCameraInitializing(false);
            setError('Camera access denied. Please enable camera permissions.');
          }
        }
      };

      // Render with error handling
      console.log('📱 Calling scanner.render()...');
      qrScanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = qrScanner;
      
      console.log('✅ Html5QrcodeScanner render called successfully');
      
      // Start monitoring after brief delay
      setTimeout(() => {
        startVideoMonitoring();
      }, 1000);

    } catch (error) {
      console.error('❌ Auto scanner initialization failed:', error);
      setCameraInitializing(false);
      setError(`Auto scanner failed: ${error.message}. Switching to manual mode.`);
      
      // Auto-switch to manual mode
      setTimeout(() => {
        setScannerMode('manual');
        initializeManualScanner();
      }, 2000);
    }
  };

  // Initialize with Html5Qrcode (manual mode)
  const initializeManualScanner = async () => {
    console.log('🎥 Initializing Html5Qrcode (manual mode)...');
    setCameraInitializing(true);
    setError(null);
    setVideoFeedActive(false);

    try {
      // Ensure DOM is ready
      const domReady = await checkDOMReady();
      if (!domReady) {
        throw new Error('DOM element not ready');
      }

      // Clear any existing scanner
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        } catch (e) {
          console.log('Error clearing existing manual scanner:', e);
        }
      }

      // Initialize cameras if not done
      if (availableCameras.length === 0) {
        const camerasReady = await initializeCameras();
        if (!camerasReady) {
          throw new Error('Cameras not available');
        }
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      console.log('📱 Starting manual scanner with camera:', selectedCameraId);

      await html5QrCode.start(
        selectedCameraId,
        config,
        (decodedText) => {
          console.log('📱 Manual scan successful:', decodedText);
          setVideoFeedActive(true);
          setCameraInitializing(false);
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          if (!errorMessage.includes('No QR code found') && 
              !errorMessage.includes('QR code parse error')) {
            console.log('📱 Manual scanner message:', errorMessage);
          }
        }
      );

      console.log('✅ Manual scanner started successfully');
      
      // Start monitoring
      setTimeout(() => {
        startVideoMonitoring();
      }, 1000);

    } catch (error) {
      console.error('❌ Manual scanner initialization failed:', error);
      setCameraInitializing(false);
      setError(`Manual scanner failed: ${error.message}. Please try refreshing the page.`);
    }
  };

  // Handle scanner toggle
  const toggleScanner = async () => {
    if (scannerEnabled) {
      console.log('🛑 Stopping scanner...');
      
      // Clear monitoring
      if (videoMonitorRef.current) {
        clearInterval(videoMonitorRef.current);
      }
      
      // Clear scanners
      try {
        if (scannerRef.current) {
          await scannerRef.current.clear();
          scannerRef.current = null;
        }
        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }
      } catch (e) {
        console.error('Error stopping scanners:', e);
      }
      
      setScannerEnabled(false);
      setVideoFeedActive(false);
      setCameraInitializing(false);
      setError(null);
    } else {
      if (cameraPermission === 'denied') {
        setError('Camera access required. Please enable camera permissions and refresh the page.');
        return;
      }

      if (!selectedEventId) {
        setError('Please select an event first before scanning.');
        return;
      }

      setScannerEnabled(true);
      
      // Start with auto mode, fall back to manual if needed
      if (scannerMode === 'auto') {
        initializeAutoScanner();
      } else {
        initializeManualScanner();
      }
    }
  };

  // Switch scanner mode
  const switchScannerMode = () => {
    const newMode = scannerMode === 'auto' ? 'manual' : 'auto';
    console.log(`🔄 Switching scanner mode: ${scannerMode} → ${newMode}`);
    setScannerMode(newMode);
    
    if (scannerEnabled) {
      // Restart with new mode
      toggleScanner().then(() => {
        setTimeout(() => {
          toggleScanner();
        }, 500);
      });
    }
  };

  // Force refresh
  const refreshScanner = async () => {
    console.log('🔄 Force refreshing scanner...');
    
    if (videoMonitorRef.current) {
      clearInterval(videoMonitorRef.current);
    }
    
    try {
      if (scannerRef.current) {
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (e) {
      console.error('Error during refresh:', e);
    }
    
    setVideoFeedActive(false);
    setCameraInitializing(false);
    setError(null);
    
    // Reinitialize after delay
    setTimeout(() => {
      if (scannerEnabled) {
        if (scannerMode === 'auto') {
          initializeAutoScanner();
        } else {
          initializeManualScanner();
        }
      }
    }, 1000);
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📤 Processing uploaded image...');
    
    try {
      const html5QrCode = new Html5Qrcode("temp-scanner");
      const result = await html5QrCode.scanFile(file, true);
      console.log('📤 QR found in image:', result);
      await onScanSuccess(result);
    } catch (error) {
      console.error('❌ No QR in image:', error);
      setError('No QR code found in uploaded image.');
    }
    
    event.target.value = '';
  };

  // Check camera permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraPermission('denied');
          setError('Camera not supported on this device.');
          return;
        }

        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setCameraPermission(permission.state as any);
        } else {
          setCameraPermission('prompt');
        }
      } catch (error) {
        setCameraPermission('prompt');
      }
    };

    checkPermissions();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoMonitorRef.current) clearInterval(videoMonitorRef.current);
      if (scannerRef.current) scannerRef.current.clear().catch(console.error);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
        html5QrCodeRef.current.clear();
      }
    };
  }, []);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
        <QrCode className="h-6 w-6" />
        <span>Event QR Scanner</span>
      </h2>

      <div className="space-y-6">
        {/* Event Selection */}
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center space-x-3 mb-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Select Event for Check-in</span>
          </div>
          
          {loadingEvents ? (
            <div className="text-sm text-blue-700">Loading events...</div>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => onEventSelect(e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.date).toLocaleDateString()} ({event.status})
                </option>
              ))}
            </select>
          )}
          
          {selectedEvent && (
            <div className="mt-2 text-sm text-blue-700">
              <strong>Selected:</strong> {selectedEvent.name} - {new Date(selectedEvent.date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Scanner Mode Selection */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <div className="font-medium text-gray-900">Scanner Mode: {scannerMode === 'auto' ? 'Auto' : 'Manual'}</div>
            <div className="text-sm text-gray-700">
              {scannerMode === 'auto' ? 'Html5QrcodeScanner (full featured)' : 'Html5Qrcode (direct control)'}
            </div>
          </div>
          <button
            onClick={switchScannerMode}
            disabled={scannerEnabled}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Switch Mode
          </button>
        </div>

        {/* Camera Permission Status */}
        {cameraPermission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Camera access required</p>
              <p>Please enable camera permissions and refresh the page.</p>
            </div>
          </div>
        )}

        {/* Video Feed Status */}
        {scannerEnabled && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Video Feed:</span>
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                videoFeedActive ? 'text-green-600' : cameraInitializing ? 'text-blue-600' : 'text-red-600'
              }`}>
                {videoFeedActive ? (
                  <>
                    <Video className="h-4 w-4" />
                    <span>Active</span>
                  </>
                ) : cameraInitializing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <VideoOff className="h-4 w-4" />
                    <span>Inactive</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={refreshScanner}
                disabled={cameraInitializing}
                className="flex items-center space-x-1 bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="text-red-600 font-medium flex-1">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Auto Check-in Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <div className="font-medium text-gray-900">Auto Check-in</div>
            <div className="text-sm text-gray-600">Automatically check in users when QR is scanned</div>
          </div>
          <button
            onClick={() => onToggleAutoCheckIn(!autoCheckInEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoCheckInEnabled ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoCheckInEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Scanner Controls */}
        <div className="flex justify-center space-x-3">
          <button
            onClick={toggleScanner}
            disabled={cameraPermission === 'checking' || !selectedEventId}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              scannerEnabled
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                : cameraPermission === 'denied'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
            }`}
          >
            {cameraInitializing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : scannerEnabled ? (
              <CameraOff className="h-5 w-5" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            <span>
              {cameraInitializing 
                ? 'Starting Camera...' 
                : scannerEnabled 
                  ? 'Stop Scanner' 
                  : !selectedEventId
                    ? 'Select Event First'
                    : 'Start Scanner'
              }
            </span>
          </button>
        </div>

        {/* Image Upload Alternative */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload QR Image</span>
          </h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={!selectedEventId}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
        </div>

        {/* Scanner View */}
        {scannerEnabled && (
          <div className="relative">
            <div id="temp-scanner" className="hidden"></div>
            
            {/* Scan Result Overlay */}
            {scanResult && (
              <div className="absolute top-0 left-0 right-0 z-20 p-4">
                <div className={`flex items-center justify-between p-4 rounded-xl shadow-lg ${
                  scanResult.type === 'success' 
                    ? 'bg-green-50 border border-green-200' 
                    : scanResult.type === 'already-checked'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    {scanResult.type === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
                    {scanResult.type === 'already-checked' && <RotateCcw className="h-6 w-6 text-blue-600" />}
                    {(scanResult.type === 'not-found' || scanResult.type === 'invalid-qr') && <X className="h-6 w-6 text-red-600" />}
                    <div>
                      <div className={`font-semibold ${
                        scanResult.type === 'success' 
                          ? 'text-green-800' 
                          : scanResult.type === 'already-checked'
                          ? 'text-blue-800'
                          : 'text-red-800'
                      }`}>
                        {scanResult.message}
                      </div>
                      {scanResult.registration && (
                        <div className={`text-sm ${
                          scanResult.type === 'success' 
                            ? 'text-green-700' 
                            : scanResult.type === 'already-checked'
                            ? 'text-blue-700'
                            : 'text-red-700'
                        }`}>
                          {scanResult.registration.name}
                        </div>
                      )}
                      {scanResult.eventInfo && (
                        <div className={`text-xs ${
                          scanResult.type === 'success' 
                            ? 'text-green-600' 
                            : scanResult.type === 'already-checked'
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                          Event: {scanResult.eventInfo.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClearResult}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Scanner Container */}
            <div className="relative">
              <div id="qr-reader" className="w-full rounded-2xl overflow-hidden bg-black min-h-[350px] border-2 border-gray-200"></div>
              
              {/* Camera Initializing Overlay */}
              {cameraInitializing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-2xl z-10">
                  <div className="bg-white rounded-lg p-6 text-center max-w-sm">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <span className="text-gray-900 font-medium">Starting {scannerMode === 'auto' ? 'Auto' : 'Manual'} Scanner...</span>
                    <p className="text-sm text-gray-600 mt-2">
                      Scanning for: {selectedEvent?.name || 'Selected Event'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Scanning Overlay */}
              {scanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl z-10">
                  <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-900 font-medium">Verifying Registration...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Information */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Event-Specific QR Scanner:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Event Verification:</strong> Verifies registration for the selected event</li>
            <li>• <strong>QR Format:</strong> Supports "eventId-userId" format</li>
            <li>• <strong>Registration Check:</strong> Confirms user is registered for the specific event</li>
            <li>• <strong>Check-in Status:</strong> Prevents duplicate check-ins</li>
            <li>• <strong>Event Info:</strong> Shows event name and registration details</li>
            <li>• <strong>Auto Check-in:</strong> Optional automatic check-in on successful scan</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;