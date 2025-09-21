const Mailjet = require('node-mailjet');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed - use GET' });
  }

  try {
    const recipient = req.query.email || 'gabrielleubitz@gmail.com';

    const mailjetPublicKey = process.env.MJ_APIKEY_PUBLIC;
    const mailjetPrivateKey = process.env.MJ_APIKEY_PRIVATE;
    
    const mailjet = Mailjet.apiConnect(mailjetPublicKey, mailjetPrivateKey);

    console.log('📧 Sending GET test email to:', recipient);
    
    const emailPayload = {
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind"
          },
          To: [{ Email: recipient }],
          Subject: "GET Test Email - " + new Date().toISOString(),
          TextPart: `GET Test Email Success!
          
Timestamp: ${new Date().toISOString()}
Test ID: ${Math.random().toString(36).substr(2, 9)}

This email was sent via GET request for easy browser testing.`,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #C8102E;">🌐 GET Test Email</h1>
  <div style="background: #e8f5e8; padding: 15px; border-radius: 5px;">
    <p><strong>✅ Success!</strong> This email was sent via GET request.</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  </div>
</div>`
        }
      ],
      SandBoxMode: false
    };

    const response = await mailjet.post('send', { version: 'v3.1' }).request(emailPayload);
    const messageInfo = response.response.data?.Messages?.[0];
    
    return res.status(200).json({
      success: true,
      message: 'GET test email sent',
      result: {
        httpStatus: response.response.status,
        messageId: messageInfo?.MessageID,
        status: messageInfo?.Status,
        errors: messageInfo?.Errors || 'None'
      },
      recipient,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || error.ErrorInfo
    });
  }
}