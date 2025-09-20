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

    console.log(`📧 Attempting to send email to ${recipient}`);

    // Try with the Mailjet default verified sender first
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "gabriel@winengrind.com", // Try your personal email as sender
            Name: "Wine & Grind (Gabriel)"
          },
          To: [{ Email: recipient }],
          Subject: subject,
          TextPart: message,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #C8102E;">Wine & Grind</h1>
  </div>
  
  <p>${message.replace(/\n/g, '<br>')}</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
    <p>Debug test from Wine & Grind email system</p>
    <p>Timestamp: ${new Date().toISOString()}</p>
    <p><strong>Note:</strong> This is a test email to debug sender verification</p>
  </div>
</div>
          `
        }
      ]
    });

    console.log('✅ Email API call succeeded:', {
      status: response.response.status,
      data: response.response.data
    });

    return res.status(200).json({ 
      success: true,
      message: 'Email sent successfully via debug function',
      mailjetResponse: {
        status: response.response.status,
        messageId: response.response.data?.Messages?.[0]?.Status,
        to: response.response.data?.Messages?.[0]?.To,
        timestamp: new Date().toISOString()
      }
    });

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
        errorDetails: error.ErrorDetails
      },
      timestamp: new Date().toISOString()
    });
  }
}