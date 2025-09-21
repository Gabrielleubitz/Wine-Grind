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

    const mailjet = Mailjet.apiConnect(mailjetPublicKey, mailjetPrivateKey);

    console.log(`📧 Testing with Gmail sender to ${recipient}`);

    // Try using your verified Gmail address as sender
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "gabrielleubitz@gmail.com",  // Using verified Gmail as sender
            Name: "Gabriel - Wine & Grind"
          },
          To: [{ Email: recipient }],
          Subject: `[GMAIL SENDER TEST] ${subject}`,
          TextPart: `${message}\n\n--- GMAIL SENDER TEST ---\nSender: gabrielleubitz@gmail.com\nTimestamp: ${new Date().toISOString()}`,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #4caf50; color: white; padding: 15px; text-align: center; border-radius: 8px;">
    <h1>🧪 GMAIL SENDER TEST</h1>
    <p>Testing with gabrielleubitz@gmail.com as sender</p>
  </div>
  
  <div style="padding: 20px;">
    <p>${message.replace(/\n/g, '<br>')}</p>
  </div>
  
  <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin-top: 20px;">
    <h3>🔧 Test Info:</h3>
    <p><strong>Sender:</strong> gabrielleubitz@gmail.com</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>SandboxMode:</strong> false</p>
  </div>
</div>
          `
        }
      ],
      SandBoxMode: false
    });

    const messageInfo = response.response.data?.Messages?.[0];
    
    return res.status(200).json({ 
      success: true,
      message: 'Gmail sender test completed',
      details: {
        recipient,
        subject,
        sender: "gabrielleubitz@gmail.com",
        timestamp: new Date().toISOString(),
        mailjetStatus: response.response.status,
        messageId: messageInfo?.MessageID,
        messageUUID: messageInfo?.MessageUUID,
        status: messageInfo?.Status
      }
    });

  } catch (error) {
    console.error('❌ Gmail Sender Test Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}