const Mailjet = require('node-mailjet');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { email, resetUrl } = req.body;

    // Validate required fields
    if (!email || !resetUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email and resetUrl are required' 
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

    console.log(`📧 Sending password reset email to ${email}`);

    // Send password reset email via Mailjet
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: email }],
          Subject: "Password Reset - Wine & Grind",
          TextPart: `
Hi there,

We received a request to reset your password for your Wine & Grind account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 24 hours for security reasons.

If you didn't request this password reset, you can safely ignore this email.

– The Wine & Grind Team
          `,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #C8102E;">Wine & Grind</h1>
  </div>
  
  <h2>Password Reset Request</h2>
  
  <p>We received a request to reset your password for your Wine & Grind account.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" style="background-color: #C8102E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
      Reset Your Password
    </a>
  </div>
  
  <p><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
  
  <p>If you didn't request this password reset, you can safely ignore this email.</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
    <p>– The Wine & Grind Team</p>
    <p>If the button doesn't work, copy and paste this link into your browser:<br>
    <span style="word-break: break-all;">${resetUrl}</span></p>
  </div>
</div>
          `
        }
      ],
      SandBoxMode: false
    });

    console.log('✅ Password reset email sent successfully:', {
      to: email,
      status: response.response.status,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'Password reset email sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Password Reset Email Error:', {
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