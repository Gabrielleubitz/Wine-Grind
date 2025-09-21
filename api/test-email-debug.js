const Mailjet = require('node-mailjet');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { recipient, subject, message } = req.body;

    if (!recipient || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    const mailjetPublicKey = process.env.MJ_APIKEY_PUBLIC;
    const mailjetPrivateKey = process.env.MJ_APIKEY_PRIVATE;

    if (!mailjetPublicKey || !mailjetPrivateKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Mailjet credentials not configured' 
      });
    }

    console.log('🔧 Debug Info:', {
      hasPublicKey: !!mailjetPublicKey,
      hasPrivateKey: !!mailjetPrivateKey,
      publicKeyPrefix: mailjetPublicKey?.substring(0, 8),
      recipient,
      subject
    });

    const mailjet = Mailjet.apiConnect(mailjetPublicKey, mailjetPrivateKey);

    console.log(`📧 Attempting to send email to ${recipient}`);

    // Try with multiple sender configurations to test domain verification
    const senderOptions = [
      { Email: "info@winengrind.com", Name: "Wine & Grind" },
      { Email: "gabriel@winengrind.com", Name: "Gabriel - Wine & Grind" },
      { Email: "noreply@winengrind.com", Name: "Wine & Grind" }
    ];

    let lastError = null;
    
    for (const sender of senderOptions) {
      try {
        console.log(`📤 Trying sender: ${sender.Email}`);
        
        const response = await mailjet.post('send', { version: 'v3.1' }).request({
          Messages: [
            {
              From: sender,
              To: [{ Email: recipient }],
              Subject: `[DEBUG] ${subject}`,
              TextPart: `${message}\n\n--- DEBUG INFO ---\nSender: ${sender.Email}\nTimestamp: ${new Date().toISOString()}\nTest: Domain verification check`,
              HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #C8102E;">Wine & Grind</h1>
  </div>
  
  <p>${message.replace(/\n/g, '<br>')}</p>
  
  <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
    <h3 style="color: #333; margin: 0 0 10px 0;">🔧 DEBUG INFORMATION</h3>
    <p style="margin: 5px 0;"><strong>Sender:</strong> ${sender.Email}</p>
    <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p style="margin: 5px 0;"><strong>Test:</strong> Domain verification check</p>
  </div>
</div>
              `
            }
          ]
        });

        console.log('✅ Email sent successfully with sender:', sender.Email, {
          status: response.response.status,
          messageId: response.response.data?.Messages?.[0]?.Status
        });

        return res.status(200).json({ 
          success: true,
          message: `Email sent successfully using sender: ${sender.Email}`,
          mailjetResponse: {
            status: response.response.status,
            messageId: response.response.data?.Messages?.[0]?.Status,
            to: response.response.data?.Messages?.[0]?.To,
            from: sender.Email,
            timestamp: new Date().toISOString()
          }
        });

      } catch (senderError) {
        console.log(`❌ Failed with sender ${sender.Email}:`, senderError.message);
        lastError = senderError;
        continue;
      }
    }

    // If all senders failed, return the last error
    throw lastError;

  } catch (error) {
    console.error('❌ Detailed Email Error:', {
      message: error.message,
      statusCode: error.statusCode,
      errorInfo: error.ErrorInfo,
      errorDetails: error.ErrorDetails,
      response: error.response?.data,
      stack: error.stack
    });

    return res.status(500).json({ 
      success: false, 
      error: error.message,
      mailjetError: {
        statusCode: error.statusCode,
        errorInfo: error.ErrorInfo,
        errorDetails: error.ErrorDetails,
        responseData: error.response?.data
      },
      timestamp: new Date().toISOString()
    });
  }
}