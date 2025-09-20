const { OpenAI } = require('openai');

module.exports = async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { prompt } = req.body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: prompt' 
      });
    }

    // Get OpenAI API key from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Validate OpenAI API key
    if (!openaiApiKey) {
      console.error('❌ Missing OpenAI API key');
      return res.status(500).json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });

    console.log(`🤖 Sending prompt to OpenAI: "${prompt.substring(0, 50)}..."`);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant for Wine & Grind, an exclusive networking event for founders and investors." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500
    });

    console.log('✅ OpenAI response received');

    // Return success response
    return res.status(200).json({ 
      success: true,
      response: response.choices[0].message.content,
      usage: response.usage,
      model: response.model
    });

  } catch (error) {
    console.error('❌ OpenAI Function Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.response) {
      statusCode = error.response.status || 500;
      errorMessage = error.response.data?.error?.message || 'OpenAI API error';
    }

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
};