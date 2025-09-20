module.exports = async function handler(req, res) {
  // Test basic function and environment variables
  const publicKey = process.env.MJ_APIKEY_PUBLIC;
  const privateKey = process.env.MJ_APIKEY_PRIVATE;
  
  return res.status(200).json({
    success: true,
    message: 'Hello from Vercel API!',
    timestamp: new Date().toISOString(),
    hasPublicKey: !!publicKey,
    hasPrivateKey: !!privateKey,
    publicKeyPreview: publicKey ? `${publicKey.substring(0, 8)}...` : 'missing'
  });
}