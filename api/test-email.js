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

    // Send email via Mailjet with explicit sandbox mode disabled
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: recipient }],
          Subject: `[DEBUG] ${subject}`,
          TextPart: `${message}\n\n--- DEBUG INFO ---\nTimestamp: ${new Date().toISOString()}\nTest ID: ${Date.now()}\nSandbox Mode: Disabled`,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #C8102E;">Wine & Grind</h1>
  </div>
  
  <p>${message.replace(/\n/g, '<br>')}</p>
  
  <div style="margin-top: 30px; padding: 15px; background-color: #f0f8ff; border-radius: 8px;">
    <h3 style="color: #1976d2; margin-top: 0;">🔧 DEBUG INFO</h3>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Test ID:</strong> ${Date.now()}</p>
    <p><strong>From:</strong> info@winengrind.com</p>
    <p><strong>Sandbox Mode:</strong> Disabled</p>
    <p><strong>API Version:</strong> v3.1</p>
  </div>
</div>
          `
        }
      ],
      SandBoxMode: false  // Explicitly disable sandbox mode
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