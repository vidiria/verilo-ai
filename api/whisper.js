const formidable = require('formidable');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Processar o upload do arquivo
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    if (!files || !files.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
    }

    const audioFile = files.file;
    
    // Ler o arquivo de áudio
    const audioData = await fs.promises.readFile(audioFile.filepath);
    const audioBase64 = audioData.toString('base64');
    
    // Chamar API do Replicate para o SeamlessM4T
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "lucataco/seamless-m4t:ff797efae84c438a945eeace66854a5691472f83c3d59d96bc47ee1c212de2fa",
        input: {
          task: "s2tt",
          audio: `data:audio/webm;base64,${audioBase64}`,
          target_language: "portuguese"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API de transcrição retornou código ${response.status}`);
    }

    const prediction = await response.json();
    const predictionId = prediction.id;

    // Verificar status até concluir
    let transcriptionResult;
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos de timeout
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error('Erro ao verificar status da transcrição');
      }
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'succeeded') {
        transcriptionResult = statusData.output;
        break;
      } else if (statusData.status === 'failed') {
        throw new Error('Falha na transcrição de áudio');
      }
    }
    
    if (!transcriptionResult) {
      throw new Error('Timeout: A transcrição levou muito tempo');
    }

    // Limpar arquivo temporário
    if (audioFile.filepath) {
      await unlinkAsync(audioFile.filepath).catch(err => 
        console.error('Erro ao remover arquivo temporário:', err)
      );
    }

    // Retornar resultado da transcrição
    return res.status(200).json({ 
      text: transcriptionResult.text || transcriptionResult,
      language: "pt"
    });
    
  } catch (error) {
    console.error('Erro na transcrição:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar a transcrição do áudio',
      details: error.message 
    });
  }
};
