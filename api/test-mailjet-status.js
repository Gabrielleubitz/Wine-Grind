const Mailjet = require('node-mailjet');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { recipient } = req.body || { recipient: 'gabrielleubitz@gmail.com' };

    const mailjetPublicKey = process.env.MJ_APIKEY_PUBLIC;
    const mailjetPrivateKey = process.env.MJ_APIKEY_PRIVATE;
    
    const mailjet = Mailjet.apiConnect(mailjetPublicKey, mailjetPrivateKey);

    // Check account limits and status first
    console.log('🔍 Checking Mailjet account status...');
    
    let accountStatus = null;
    try {
      const profile = await mailjet.get('myprofile').request();
      accountStatus = profile.body.Data[0];
    } catch (profileError) {
      console.log('⚠️ Could not get profile:', profileError.message);
    }

    // Send a test email with sandbox mode explicitly set
    console.log('📧 Sending test email...');
    
    const emailPayload = {
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: recipient }],
          Subject: "Mailjet Status Test - " + new Date().toISOString(),
          TextPart: `This is a Mailjet status test email.
          
Account Status Test
Timestamp: ${new Date().toISOString()}
Test ID: ${Math.random().toString(36).substr(2, 9)}

If you receive this email, Mailjet is working correctly.`,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #C8102E; text-align: center;">🧪 Mailjet Status Test</h1>
  
  <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h2>✅ SUCCESS!</h2>
    <p>If you're reading this email, your Mailjet integration is working correctly.</p>
  </div>
  
  <div style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
    <h3>Test Details:</h3>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Test ID:</strong> ${Math.random().toString(36).substr(2, 9)}</p>
    <p><strong>From:</strong> info@winengrind.com</p>
    <p><strong>API Version:</strong> v3.1</p>
  </div>
</div>`
        }
      ],
      SandBoxMode: false  // Explicitly disable sandbox mode
    };

    console.log('📤 Sending email with SandBoxMode:', emailPayload.SandBoxMode);

    const response = await mailjet.post('send', { version: 'v3.1' }).request(emailPayload);

    console.log('📨 Response Status:', response.response.status);
    console.log('📨 Response Data:', response.response.data);

    const messageInfo = response.response.data?.Messages?.[0];
    
    return res.status(200).json({
      success: true,
      message: 'Mailjet status test completed',
      accountStatus,
      emailResult: {
        httpStatus: response.response.status,
        messageId: messageInfo?.MessageID,
        messageUUID: messageInfo?.MessageUUID,
        status: messageInfo?.Status,
        errors: messageInfo?.Errors,
        to: messageInfo?.To,
        sandboxMode: emailPayload.SandBoxMode
      },
      // rawResponse removed to avoid circular JSON
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Mailjet Status Test Error:', {
      message: error.message,
      statusCode: error.statusCode,
      errorInfo: error.ErrorInfo,
      errorDetails: error.ErrorDetails,
      responseData: error.response?.data
    });

    return res.status(500).json({
      success: false,
      error: error.message,
      details: {
        statusCode: error.statusCode,
        errorInfo: error.ErrorInfo,
        errorDetails: error.ErrorDetails,
        responseData: error.response?.data
      }
    });
  }
}