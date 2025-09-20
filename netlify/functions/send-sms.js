const twilio = require('twilio');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ success: true })
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      })
    };
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        })
      };
    }

    const { to, body } = requestBody;

    // Validate required fields
    if (!to || !body) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to and body are required' 
        })
      };
    }

    // Get Twilio credentials from environment variables
    const twilioSid = process.env.TWILIO_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    // Validate Twilio credentials
    if (!twilioSid || !twilioAuthToken || !messagingServiceSid) {
      console.error('❌ Missing Twilio credentials');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Twilio credentials not configured' 
        })
      };
    }

    // Initialize Twilio client
    const client = twilio(twilioSid, twilioAuthToken);

    // Normalize phone number for Israeli format
    const normalizedPhone = normalizePhoneNumber(to);
    console.log(`📤 Sending SMS to ${normalizedPhone} via Twilio`);

    // Send SMS via Twilio
    const message = await client.messages.create({
      to: normalizedPhone,
      messagingServiceSid: messagingServiceSid,
      body: body
    });

    console.log('✅ SMS sent successfully:', {
      sid: message.sid,
      to: normalizedPhone,
      status: message.status,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true, 
        sid: message.sid,
        status: message.status,
        to: normalizedPhone,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ SMS Function Error:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle specific Twilio errors
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.code) {
      // Twilio-specific errors
      switch (error.code) {
        case 21211:
          statusCode = 400;
          errorMessage = 'Invalid phone number format';
          break;
        case 21408:
          statusCode = 400;
          errorMessage = 'Permission to send SMS has not been enabled for the region';
          break;
        case 21614:
          statusCode = 400;
          errorMessage = 'Phone number is not a valid mobile number';
          break;
        case 20003:
          statusCode = 401;
          errorMessage = 'Authentication failed - check Twilio credentials';
          break;
        case 20404:
          statusCode = 404;
          errorMessage = 'Messaging Service SID not found';
          break;
        default:
          errorMessage = error.message || 'Twilio API error';
      }
    }

    return {
      statusCode: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: false, 
        error: errorMessage,
        code: error.code,
        details: error.moreInfo,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Helper function to normalize phone numbers
function normalizePhoneNumber(phone) {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with 0 (Israeli format), replace with +972
  if (digits.startsWith('0')) {
    return `+972${digits.substring(1)}`;
  }
  
  // If it doesn't start with +, assume it needs +972
  if (!phone.startsWith('+')) {
    return `+972${digits}`;
  }
  
  return phone;
}