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
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetSecretKey = process.env.MAILJET_SECRET_KEY;

    // Validate Mailjet credentials
    if (!mailjetApiKey || !mailjetSecretKey) {
      console.error('❌ Missing Mailjet credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Email service credentials not configured' 
      });
    }

    // Initialize Mailjet client
    const mailjet = Mailjet.apiConnect(mailjetApiKey, mailjetSecretKey);

    console.log(`📧 Sending test email to ${recipient}`);

    // Send email via Mailjet
    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'noreply@winengrind.com',
            Name: 'Wine & Grind'
          },
          To: [
            {
              Email: recipient,
              Name: recipient.split('@')[0]
            }
          ],
          Subject: subject,
          TextPart: message,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #7C3AED; margin: 0;">Wine & Grind</h1>
                <p style="color: #6B7280; margin: 5px 0;">System Test Email</p>
              </div>
              
              <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #374151; line-height: 1.6; margin: 0;">${message}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
                  This is a test email from the Wine & Grind admin system.
                </p>
                <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0 0 0;">
                  Sent at ${new Date().toLocaleString()}
                </p>
              </div>
            </div>
          `
        }
      ]
    });

    console.log('✅ Test email sent successfully:', {
      messageId: result.body.Messages[0].To[0].MessageID,
      recipient: recipient,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return res.status(200).json({ 
      success: true, 
      messageId: result.body.Messages[0].To[0].MessageID,
      recipient: recipient,
      subject: subject,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test Email Function Error:', {
      message: error.message,
      statusCode: error.statusCode,
      errorMessage: error.ErrorMessage,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle specific Mailjet errors
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.ErrorMessage || error.message || 'Email service error';
      
      // Handle common Mailjet errors
      if (error.statusCode === 400) {
        errorMessage = 'Invalid email format or request';
      } else if (error.statusCode === 401) {
        errorMessage = 'Email service authentication failed';
      } else if (error.statusCode === 429) {
        errorMessage = 'Email rate limit exceeded';
      }
    }

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
};