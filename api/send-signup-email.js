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

    console.log(`📧 Sending signup confirmation email to ${email} for ${name}`);

    // Send email via Mailjet
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: email }],
          Subject: `Welcome to Wine & Grind, ${name}! 🍷`,
          TextPart: `
Hi ${name},

🎉 Welcome to Wine & Grind!

Thank you for joining our exclusive community of founders, investors, and innovators.

ACCOUNT STATUS:
Your account is currently under review for approval. This helps us maintain the quality and exclusivity of our community.

WHAT HAPPENS NEXT:
• Our team will review your profile within 24 hours
• You'll receive an approval notification via email and SMS
• Once approved, you can register for upcoming events
• Access to our exclusive Telegram community: https://t.me/winengrind

ABOUT WINE & GRIND:
We host intimate networking events where bold ideas meet real conversations. Our community includes:
• Startup founders and entrepreneurs
• Angel investors and VCs  
• Industry leaders and innovators
• AI and tech visionaries

Stay tuned for exciting events and networking opportunities!

Questions? Reply to this email anytime.

Welcome aboard! 🚀

– The Wine & Grind Team
          `,
          HTMLPart: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #C8102E 0%, #1976D2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Wine & Grind</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Where Bold Ideas Meet Real Conversations</p>
  </div>
  
  <!-- Welcome Message -->
  <div style="background: #4CAF50; color: white; text-align: center; padding: 15px;">
    <h2 style="margin: 0; font-size: 20px;">🎉 Welcome to Wine & Grind!</h2>
  </div>
  
  <!-- Content -->
  <div style="background: white; padding: 30px 20px;">
    
    <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 25px;">Thank you for joining our exclusive community of founders, investors, and innovators! We're thrilled to have you aboard.</p>
    
    <!-- Account Status Card -->
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="color: #856404; margin: 0 0 12px 0; font-size: 18px;">⏳ Account Under Review</h3>
      <p style="margin: 0; color: #856404; line-height: 1.6;">Your account is currently being reviewed for approval. This helps us maintain the quality and exclusivity of our community.</p>
    </div>
    
    <!-- What's Next -->
    <div style="margin: 30px 0;">
      <h3 style="color: #1976D2; margin: 0 0 15px 0; font-size: 18px;">🚀 What Happens Next</h3>
      <ul style="padding-left: 20px; line-height: 1.8; color: #333;">
        <li>Our team will review your profile within <strong>24 hours</strong></li>
        <li>You'll receive approval notification via <strong>email and SMS</strong></li>
        <li>Once approved, you can <strong>register for upcoming events</strong></li>
        <li>Access to our <strong>exclusive Telegram community</strong></li>
      </ul>
    </div>
    
    <!-- Community Highlights -->
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #1976D2; margin: 0 0 15px 0; font-size: 18px;">🌟 About Wine & Grind</h3>
      <p style="margin: 0 0 15px 0; line-height: 1.6; color: #333;">We host intimate networking events where bold ideas meet real conversations. Our community includes:</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
        <div style="padding: 10px; background: rgba(255,255,255,0.7); border-radius: 6px; font-size: 14px;">
          🚀 <strong>Startup Founders</strong><br>
          <span style="color: #666;">& Entrepreneurs</span>
        </div>
        <div style="padding: 10px; background: rgba(255,255,255,0.7); border-radius: 6px; font-size: 14px;">
          💰 <strong>Angel Investors</strong><br>
          <span style="color: #666;">& VCs</span>
        </div>
        <div style="padding: 10px; background: rgba(255,255,255,0.7); border-radius: 6px; font-size: 14px;">
          🏆 <strong>Industry Leaders</strong><br>
          <span style="color: #666;">& Innovators</span>
        </div>
        <div style="padding: 10px; background: rgba(255,255,255,0.7); border-radius: 6px; font-size: 14px;">
          🤖 <strong>AI Visionaries</strong><br>
          <span style="color: #666;">& Tech Leaders</span>
        </div>
      </div>
    </div>
    
    <!-- Telegram CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://t.me/winengrind" style="display: inline-block; background: #0088cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px;">📱 Join Our Telegram Community</a>
    </div>
    
    <div style="text-align: center; margin: 40px 0 20px 0; padding: 20px; background: linear-gradient(135deg, #C8102E 0%, #1976D2 100%); border-radius: 8px;">
      <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">Welcome aboard! We can't wait to meet you! 🚀</p>
    </div>
    
    <p style="text-align: center; color: #666; font-size: 14px;">Questions? Reply to this email anytime.</p>
    <p style="text-align: center; color: #333; font-weight: bold;">– The Wine & Grind Team</p>
    
  </div>
  
  <!-- Footer -->
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;">Wine & Grind</p>
    <p style="margin: 0; font-size: 12px; color: #999;">This email was sent because you created an account at winengrind.com</p>
  </div>
  
</div>
          `
        }
      ]
    });

    console.log('✅ Signup confirmation email sent successfully:', {
      to: email,
      status: response.response.status,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'Signup confirmation email sent successfully'
    });

  } catch (error) {
    console.error('❌ Signup Email Function Error:', {
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