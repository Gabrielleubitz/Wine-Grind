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

    const publicKey = process.env.MJ_APIKEY_PUBLIC;
    const privateKey = process.env.MJ_APIKEY_PRIVATE;

    if (!publicKey || !privateKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API keys not configured' 
      });
    }

    console.log('🔧 Using API Keys:', {
      publicKey: publicKey.substring(0, 8) + '...',
      privateKey: privateKey.substring(0, 8) + '...'
    });

    // Use direct HTTP request with basic auth
    const auth = Buffer.from(`${publicKey}:${privateKey}`).toString('base64');
    
    const emailData = {
      Messages: [{
        From: {
          Email: "info@winengrind.com",
          Name: "Wine & Grind"
        },
        To: [{ Email: recipient }],
        Subject: `[BASIC AUTH TEST] ${subject}`,
        TextPart: `${message}\n\nBasic Auth Test - ${new Date().toISOString()}`,
        HTMLPart: `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h1 style="color: #C8102E;">Basic Auth Test</h1>
  <p>${message}</p>
  <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
</div>`
      }]
    };

    console.log('📤 Sending via direct HTTP...');

    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const responseText = await response.text();
    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Text:', responseText);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
        debug: {
          publicKeyPreview: publicKey.substring(0, 8) + '...',
          privateKeyPreview: privateKey.substring(0, 8) + '...'
        }
      });
    }

    const responseData = JSON.parse(responseText);

    return res.status(200).json({
      success: true,
      message: 'Basic auth test sent successfully',
      data: responseData,
      debug: {
        publicKeyPreview: publicKey.substring(0, 8) + '...',
        privateKeyPreview: privateKey.substring(0, 8) + '...'
      }
    });

  } catch (error) {
    console.error('❌ Basic Auth Test Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}