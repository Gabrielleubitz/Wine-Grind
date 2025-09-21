// Simple test endpoint for badges
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
    console.log('🎫 Test badges endpoint hit');
    
    return res.status(200).json({
      success: true,
      message: 'Badges API endpoint is working',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test Badges Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Test endpoint failed',
      details: error.message
    });
  }
};