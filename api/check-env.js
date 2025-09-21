module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const mailjetPublicKey = process.env.MJ_APIKEY_PUBLIC;
  const mailjetPrivateKey = process.env.MJ_APIKEY_PRIVATE;

  return res.status(200).json({
    success: true,
    environment: {
      MJ_APIKEY_PUBLIC: {
        exists: !!mailjetPublicKey,
        length: mailjetPublicKey?.length || 0,
        preview: mailjetPublicKey?.substring(0, 8) + '...'
      },
      MJ_APIKEY_PRIVATE: {
        exists: !!mailjetPrivateKey,
        length: mailjetPrivateKey?.length || 0,
        preview: mailjetPrivateKey?.substring(0, 8) + '...'
      },
      TWILIO_SID: {
        exists: !!process.env.TWILIO_SID,
        length: process.env.TWILIO_SID?.length || 0
      },
      OPENAI_API_KEY: {
        exists: !!process.env.OPENAI_API_KEY,
        length: process.env.OPENAI_API_KEY?.length || 0
      },
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    }
  });
}