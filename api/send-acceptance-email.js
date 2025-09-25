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
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #C8102E 0%, #1976D2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Wine & Grind</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Where Bold Ideas Meet Real Conversations</p>
  </div>
  
  <!-- Approval Message -->
  <div style="background: #4CAF50; color: white; text-align: center; padding: 15px;">
    <h2 style="margin: 0; font-size: 20px;">🎉 Account Approved!</h2>
  </div>
  
  <!-- Content -->
  <div style="background: white; padding: 30px 20px;">
    
    <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 25px;">Congratulations! Your Wine & Grind account has been approved and you're now part of our exclusive community! 🚀</p>
    
    <!-- Access Benefits Card -->
    <div style="background: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="color: #4CAF50; margin: 0 0 15px 0; font-size: 18px;">🌟 You Now Have Access To</h3>
      
      <div style="display: grid; gap: 12px;">
        <div style="display: flex; align-items: center; padding: 8px 0;">
          <span style="color: #4CAF50; font-size: 16px; margin-right: 10px;">🚀</span>
          <span style="color: #333; font-weight: 500;">Exclusive networking events with founders and investors</span>
        </div>
        <div style="display: flex; align-items: center; padding: 8px 0;">
          <span style="color: #4CAF50; font-size: 16px; margin-right: 10px;">⚡</span>
          <span style="color: #333; font-weight: 500;">Early access to event registrations</span>
        </div>
        <div style="display: flex; align-items: center; padding: 8px 0;">
          <span style="color: #4CAF50; font-size: 16px; margin-right: 10px;">📫</span>
          <span style="color: #333; font-weight: 500;">Member-only content and updates</span>
        </div>
        <div style="display: flex; align-items: center; padding: 8px 0;">
          <span style="color: #4CAF50; font-size: 16px; margin-right: 10px;">💬</span>
          <span style="color: #333; font-weight: 500;">Direct access to our exclusive Telegram community</span>
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1976D2; margin: 0 0 15px 0; font-size: 18px;">🚀 Get Started</h3>
      <div style="text-align: center;">
        <a href="https://winengrind.com" style="display: inline-block; background: linear-gradient(135deg, #C8102E 0%, #1976D2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 8px; font-weight: bold; font-size: 14px;">🌐 Visit Dashboard</a>
        <a href="https://t.me/winengrind" style="display: inline-block; background: #0088cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 8px; font-weight: bold; font-size: 14px;">💬 Join Telegram</a>
      </div>
    </div>
    
    <!-- Next Steps -->
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #1976D2; margin: 0 0 15px 0; font-size: 18px;">📋 What's Next</h3>
      <ul style="padding-left: 20px; line-height: 1.8; color: #333; margin: 0;">
        <li><strong>Complete your profile</strong> - Add your LinkedIn and professional details</li>
        <li><strong>Watch for events</strong> - Event notifications will arrive via email</li>
        <li><strong>Join Telegram</strong> - Get instant updates and connect with the community</li>
        <li><strong>Network actively</strong> - Engage with fellow founders and investors</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0 20px 0; padding: 20px; background: linear-gradient(135deg, #C8102E 0%, #1976D2 100%); border-radius: 8px;">
      <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">Welcome to the community! Let's build something amazing together! 🥂</p>
    </div>
    
    <p style="text-align: center; color: #666; font-size: 14px;">Questions? Reply to this email anytime.</p>
    <p style="text-align: center; color: #333; font-weight: bold;">– The Wine & Grind Team</p>
    
  </div>
  
  <!-- Footer -->
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;">Wine & Grind</p>
    <p style="margin: 0; font-size: 12px; color: #999;">This email was sent because your account was approved at winengrind.com</p>
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