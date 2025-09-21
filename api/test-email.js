const Mailjet = require('node-mailjet');

module.exports = async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { recipient, subject, message } = req.body;

    // Validate required fields
    if (!recipient || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: recipient, subject, and message are required' 
      });
    }

    // Get Mailjet credentials from environment variables
    const mailjetPublicKey = process.env.MJ_APIKEY_PUBLIC;
    const mailjetPrivateKey = process.env.MJ_APIKEY_PRIVATE;

    // Validate Mailjet credentials
    if (!mailjetPublicKey || !mailjetPrivateKey) {
      console.error('❌ Missing Mailjet credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Mailjet credentials not configured' 
      });
    }

    // Initialize Mailjet client
    const mailjet = Mailjet.apiConnect(
      mailjetPublicKey,
      mailjetPrivateKey
    );

    console.log(`📧 Sending test email to ${recipient}`);

    // Send email via Mailjet
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: recipient }],
          Subject: subject,
          TextPart: message,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #C8102E;">Wine & Grind</h1>
  </div>
  
  <p>${message.replace(/\n/g, '<br>')}</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
    <p>This is a test email from the Wine & Grind admin panel.</p>
    <p>Timestamp: ${new Date().toISOString()}</p>
  </div>
</div>
          `
        }
      ]
    });

    console.log('✅ Test email sent successfully:', {
      to: recipient,
      status: response.response.status,
      mailjetResponse: response.response.data,
      timestamp: new Date().toISOString()
    });

    // Return success response with detailed Mailjet info
    return res.status(200).json({ 
      success: true,
      message: 'Test email sent successfully',
      details: {
        recipient,
        subject,
        timestamp: new Date().toISOString(),
        mailjetStatus: response.response.status,
        mailjetResponse: response.response.data?.Messages?.[0],
        messageId: response.response.data?.Messages?.[0]?.MessageID,
        status: response.response.data?.Messages?.[0]?.Status
      }
    });

  } catch (error) {
    console.error('❌ Email Function Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle specific Mailjet errors
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.message || 'Email sending failed';
    }

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}