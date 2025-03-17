const express = require('express');
const fetch = require('node-fetch');
const formidable = require('formidable');
const fs = require('fs');
const app = express();

require('dotenv').config();
const XAI_API_KEY = process.env.XAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json());

// Endpoint para Claude (chat)
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: req.body.model || 'claude-3-7-sonnet',
        messages: req.body.messages,
        max_tokens: 4096,
        temperature: req.body.advanced ? 0.7 : 0.9
      })
    });
    const data = await response.json();
    res.json({ id: data.id, content: data.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para Grok (chat)
app.post('/api/grok', async (req, res) => {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: req.body.messages,
        max_tokens: 4096,
        temperature: req.body.advanced ? 0.7 : 0.9
      })
    });
    const data = await response.json();
    res.json({ id: data.id, content: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para Grok (transcrição)
app.post('/api/grok/transcribe', (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const audioFile = files.file;
    const audioBuffer = fs.readFileSync(audioFile.path);
    try {
      const response = await fetch('https://api.x.ai/v1/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'audio/webm'
        },
        body: audioBuffer
      });
      const data = await response.json();
      res.json({ text: data.text });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// Endpoint para Replicate (transcrição existente)
app.post('/api/whisper', async (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const audioFile = files.file;
    const audioBuffer = fs.readFileSync(audioFile.path);
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer YOUR_REPLICATE_API_KEY`, // Adicione sua chave
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: 'your-whisper-model-version', // Ajuste o modelo
          input: { audio: audioBuffer.toString('base64') }
        })
      });
      const data = await response.json();
      res.json({ text: data.output.transcription });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// Endpoint para TTS (simplificado)
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;
  // Lógica de TTS (ex.: ElevenLabs) aqui
  res.sendStatus(200); // Placeholder
});

app.listen(3000, () => console.log('Server running on port 3000'));
