// api/tts.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { text, voice = 'nova' } = req.body;  //O 'voice' default é 'nova'

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // Modelo de alta qualidade.
        input: text,
        voice: voice,
        response_format: 'mp3', // Formato de saída.
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("TTS API Error:", errorData);
      throw new Error(`TTS API Error: ${response.status} - ${errorData.error.message || "Unknown error"}`);
    }

      // Stream the response directly.  (Para Vercel Edge Functions)
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    response.body.pipe(res);


  } catch (error) {
    console.error('Error in TTS API call:', error);
     res.status(500).json({ error: 'Failed to process TTS', details: error.message });
  }
}
