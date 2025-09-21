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

    console.log('📧 Sending verbose test email...');
    console.log('Recipients:', recipient);
    console.log('Subject:', subject);

    // Send email with maximum verbosity
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "info@winengrind.com",
            Name: "Wine & Grind Test"
          },
          To: [{ Email: recipient }],
          Subject: `[VERBOSE TEST] ${subject}`,
          TextPart: `${message}\n\nVerbose Test Email\nTimestamp: ${new Date().toISOString()}\nTest ID: ${Date.now()}`,
          HTMLPart: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 20px; background-color: #ffeb3b; padding: 15px; border-radius: 8px;">
    <h1 style="color: #d32f2f; margin: 0;">🔬 VERBOSE TEST EMAIL</h1>
    <p style="margin: 5px 0; font-weight: bold;">This is a detailed test to debug email delivery</p>
  </div>
  
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #C8102E; margin-top: 0;">Original Message:</h2>
    <p>${message.replace(/\n/g, '<br>')}</p>
  </div>
  
  <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px;">
    <h3 style="color: #1976d2; margin-top: 0;">🔧 DEBUG INFO</h3>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Test ID:</strong> ${Date.now()}</p>
    <p><strong>From:</strong> info@winengrind.com</p>
    <p><strong>To:</strong> ${recipient}</p>
    <p><strong>API Version:</strong> v3.1</p>
    <p><strong>Environment:</strong> Vercel Production</p>
  </div>
</div>
          `
        }
      ]
    });

    console.log('📨 FULL MAILJET RESPONSE:', JSON.stringify(response.response, null, 2));
    console.log('📊 Response Status:', response.response.status);
    console.log('📋 Response Headers:', response.response.headers);
    console.log('💌 Message Data:', JSON.stringify(response.response.data, null, 2));

    const messageData = response.response.data?.Messages?.[0];

    return res.status(200).json({
      success: true,
      message: 'Verbose test email sent - check console logs',
      details: {
        recipient,
        subject,
        timestamp: new Date().toISOString(),
        mailjet: {
          httpStatus: response.response.status,
          messageId: messageData?.MessageID,
          messageUUID: messageData?.MessageUUID,
          status: messageData?.Status,
          customID: messageData?.CustomID,
          to: messageData?.To,
          cc: messageData?.Cc,
          bcc: messageData?.Bcc
        },
        fullResponse: response.response.data
      }
    });

  } catch (error) {
    console.error('❌ VERBOSE EMAIL ERROR:', {
      message: error.message,
      statusCode: error.statusCode,
      errorInfo: error.ErrorInfo,
      errorDetails: error.ErrorDetails,
      errorIdentifier: error.ErrorIdentifier,
      errorRelatedTo: error.ErrorRelatedTo,
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
        errorIdentifier: error.ErrorIdentifier,
        errorRelatedTo: error.ErrorRelatedTo,
        responseData: error.response?.data
      },
      timestamp: new Date().toISOString()
    });
  }
}