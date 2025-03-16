const { ElevenLabsStream } = require('ai');

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
    
    // Mapeamento de vozes para o ElevenLabs
    const voiceMap = {
      'alloy': 'premade/Adam', 
      'echo': 'premade/Antoni',
      'fable': 'premade/Bella', 
      'onyx': 'premade/Josh', 
      'nova': 'premade/Rachel'
    };
    
    const elevenLabsVoice = voiceMap[voice] || 'premade/Adam';
    
    // Criar stream do ElevenLabs
    const stream = await ElevenLabsStream({
      text: text,
      voice: elevenLabsVoice,
      model: 'eleven_multilingual_v2',
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    // Configurar headers para streaming de áudio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Enviar stream de áudio para o cliente
    stream.pipe(res);
    
  } catch (error) {
    console.error('Erro ao gerar áudio:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar áudio',
        details: error.message
      });
    }
  }
};
