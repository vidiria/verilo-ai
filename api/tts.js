const { ElevenLabsVoiceService } = require('@vercel/ai');

// Configurar cliente ElevenLabs
const elevenLabsClient = new ElevenLabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Mapeamento de vozes para o ElevenLabs
const voiceMap = {
  'alloy': 'premade/Adam', // Voz masculina neutra
  'echo': 'premade/Antoni', // Voz masculina
  'fable': 'premade/Bella', // Voz feminina
  'onyx': 'premade/Josh', // Voz masculina grave
  'nova': 'premade/Rachel', // Voz feminina suave
  // Você pode adicionar mais opções conforme necessário
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Extrair parâmetros do corpo da requisição
    const { text, voice = 'alloy' } = req.body;
    
    // Validar entrada
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Texto não fornecido' });
    }
    
    // Determinar a voz a ser usada (mapear do formato OpenAI para ElevenLabs)
    const elevenLabsVoice = voiceMap[voice] || 'premade/Adam';
    
    // Modelo a ser usado (Multilingual é melhor para português)
    const model = 'eleven_multilingual_v2';
    
    // Gerar áudio com ElevenLabs
    const audioResponse = await elevenLabsClient.textToSpeech({
      text: text,
      voice: elevenLabsVoice,
      model: model,
      output_format: 'mp3',
    });
    
    // Configurar headers para streaming de áudio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Enviar stream de áudio para o cliente
    audioResponse.pipe(res);
    
  } catch (error) {
    console.error('Erro ao gerar áudio:', error);
    
    // Verificar se a resposta já foi enviada
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar áudio',
        details: error.message
      });
    }
  }
};