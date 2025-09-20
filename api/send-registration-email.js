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
    const { email, name } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email and name are required' 
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

    console.log(`📧 Sending registration confirmation email to ${email}`);

    // Send email via Mailjet
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: email }],
          Subject: "Registration Received - Wine & Grind",
          TextPart: `
Hi ${name},

Thank you for registering for Wine & Grind!

Your registration has been received and is currently under review. We'll notify you once your spot is confirmed.

What to expect next:
• We'll review your registration within 24 hours
• You'll receive an email confirmation once approved
• Further event details will be sent closer to the event date

If you have any questions, feel free to reply to this email.

Looking forward to seeing you soon!

– The Wine & Grind Team
          `,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #C8102E;">Wine & Grind</h1>
  </div>
  
  <p>Hi ${name},</p>
  
  <p><strong>Thank you for registering for Wine & Grind!</strong></p>
  
  <p>Your registration has been received and is currently under review. We'll notify you once your spot is confirmed.</p>
  
  <h3 style="color: #C8102E;">What to expect next:</h3>
  <ul>
    <li>We'll review your registration within 24 hours</li>
    <li>You'll receive an email confirmation once approved</li>
    <li>Further event details will be sent closer to the event date</li>
  </ul>
  
  <p>If you have any questions, feel free to reply to this email.</p>
  
  <p>Looking forward to seeing you soon!</p>
  
  <p>– The Wine & Grind Team</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
    <p>Wine & Grind - Where Bold Ideas Meet Real Conversations</p>
    <p>This email was sent because you registered for an event at winengrind.com</p>
  </div>
</div>
          `
        }
      ]
    });

    console.log('✅ Registration confirmation email sent successfully:', {
      to: email,
      status: response.response.status,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'Registration confirmation email sent successfully'
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