const Mailjet = require('node-mailjet');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const mailjetPublicKey = process.env.MJ_APIKEY_PUBLIC;
    const mailjetPrivateKey = process.env.MJ_APIKEY_PRIVATE;

    if (!mailjetPublicKey || !mailjetPrivateKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Mailjet credentials not configured' 
      });
    }

    const mailjet = Mailjet.apiConnect(mailjetPublicKey, mailjetPrivateKey);

    console.log('🔍 Checking Mailjet account status...');

    // Check account info
    const accountInfo = await mailjet.get('myprofile').request();
    
    // Check sender domains
    const senders = await mailjet.get('sender').request();

    return res.status(200).json({
      success: true,
      data: {
        account: {
          email: accountInfo.body.Data[0]?.Email,
          username: accountInfo.body.Data[0]?.Username,
          firstname: accountInfo.body.Data[0]?.Firstname,
          lastname: accountInfo.body.Data[0]?.Lastname
        },
        senders: senders.body.Data.map(sender => ({
          email: sender.Email,
          name: sender.Name,
          status: sender.Status,
          isDefaultSender: sender.IsDefaultSender
        })),
        apiKeys: {
          publicKey: mailjetPublicKey?.substring(0, 8) + '...',
          hasPrivateKey: !!mailjetPrivateKey
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Mailjet Check Error:', {
      message: error.message,
      statusCode: error.statusCode,
      errorInfo: error.ErrorInfo,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: error.message,
      mailjetError: {
        statusCode: error.statusCode,
        errorInfo: error.ErrorInfo
      }
    });
  }
}