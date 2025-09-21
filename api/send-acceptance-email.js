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

    console.log(`📧 Sending account approval email to ${email}`);

    // Send email via Mailjet
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: email }],
          Subject: "Welcome to Wine & Grind! Your Account is Approved 🍷",
          TextPart: `
Hi ${name},

Congratulations! Your Wine & Grind account has been approved and you're now part of our exclusive community!

🍷 WELCOME TO WINE & GRIND 🍷

You now have access to:
• Exclusive networking events with founders and investors
• Early access to event registrations
• Member-only content and updates
• Direct access to our community

WHAT'S NEXT:
• Watch for upcoming events in your email
• Join our Telegram community: https://t.me/winengrind
• Visit your dashboard: https://winengrind.com
• Follow us for updates and announcements

We're excited to have you in our community where bold ideas meet real conversations!

If you have any questions, feel free to reply to this email.

Cheers to new connections!

The Wine & Grind Team ✨
          `,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #C8102E; margin: 0;">🍷 Wine & Grind 🍷</h1>
    <p style="font-size: 18px; color: #666; margin: 10px 0;">Where Bold Ideas Meet Real Conversations</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #C8102E 0%, #8B0000 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px 0;">Welcome ${name}! 🎉</h2>
    <p style="margin: 0; font-size: 16px;">Your account has been approved!</p>
  </div>
  
  <h3 style="color: #C8102E;">You Now Have Access To:</h3>
  <ul style="line-height: 1.8;">
    <li>🚀 Exclusive networking events with founders and investors</li>
    <li>⚡ Early access to event registrations</li>
    <li>📫 Member-only content and updates</li>
    <li>💬 Direct access to our community</li>
  </ul>
  
  <h3 style="color: #C8102E;">What's Next:</h3>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 10px 0;">📧 <strong>Watch for upcoming events</strong> in your email</p>
    <p style="margin: 10px 0;">💬 <strong>Join our Telegram:</strong> <a href="https://t.me/winengrind" style="color: #C8102E;">https://t.me/winengrind</a></p>
    <p style="margin: 10px 0;">🌐 <strong>Visit your dashboard:</strong> <a href="https://winengrind.com" style="color: #C8102E;">https://winengrind.com</a></p>
    <p style="margin: 10px 0;">👥 <strong>Follow us</strong> for updates and announcements</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://winengrind.com" style="background-color: #C8102E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
      Visit Your Dashboard
    </a>
  </div>
  
  <p style="text-align: center; color: #666; font-style: italic;">
    We're excited to have you in our community where bold ideas meet real conversations!
  </p>
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666;">
    <p><strong>Cheers to new connections!</strong></p>
    <p>The Wine & Grind Team ✨</p>
  </div>
</div>
          `
        }
      ],
      SandBoxMode: false
    });

    console.log('✅ Account approval email sent successfully:', {
      to: email,
      status: response.response.status,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'Account approval email sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Account Approval Email Error:', {
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