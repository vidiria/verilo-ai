const { OpenAIWhisperAudio } = require('@vercel/ai');
const formidable = require('formidable');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Configurar o cliente OpenAI Whisper da Vercel
const whisperClient = new OpenAIWhisperAudio({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'whisper-large-v3', // Modelo otimizado para velocidade e precisão
});

module.exports = async (req, res) => {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Configurar formidable para processamento de arquivos
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;
    
    // Processar o upload do arquivo
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // Verificar se há um arquivo de áudio
    if (!files || !files.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
    }

    const audioFile = files.file;
    const language = fields.language || 'pt';

    // Ler o arquivo de áudio
    const audioData = await fs.promises.readFile(audioFile.filepath);
    
    try {
      // Transcrever o áudio usando Incredibly Fast Whisper
      const transcription = await whisperClient.transcribe({
        audio: audioData,
        language: language,
        response_format: 'json',
      });

      // Limpar arquivo temporário
      if (audioFile.filepath) {
        await unlinkAsync(audioFile.filepath).catch(err => 
          console.error('Erro ao remover arquivo temporário:', err)
        );
      }

      // Retornar resultado da transcrição
      return res.status(200).json({ 
        text: transcription.text,
        language: transcription.language || language
      });
      
    } catch (error) {
      console.error('Erro na transcrição:', error);
      
      // Limpar arquivo temporário em caso de erro
      if (audioFile.filepath) {
        await unlinkAsync(audioFile.filepath).catch(err => 
          console.error('Erro ao remover arquivo temporário:', err)
        );
      }
      
      return res.status(500).json({ 
        error: 'Erro ao processar a transcrição do áudio',
        details: error.message 
      });
    }
    
  } catch (error) {
    console.error('Erro no processamento do upload:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar o arquivo de áudio',
      details: error.message 
    });
  }
};