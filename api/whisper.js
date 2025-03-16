const { OpenAI } = require('openai');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar se há um arquivo
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const file = req.files.file;
  const tempFilePath = `/tmp/${Date.now()}_${file.name}`;

  try {
    // Salvar o arquivo temporariamente
    await writeFileAsync(tempFilePath, file.data);

    // Inicializar a API da OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
,
    });

    // Transcrever o áudio
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'pt'
    });

    // Limpar o arquivo temporário
    await unlinkAsync(tempFilePath);

    return res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);

    // Tentar limpar o arquivo temporário
    try {
      await unlinkAsync(tempFilePath);
    } catch (e) {
      console.error('Erro ao remover arquivo temporário:', e);
    }

    return res.status(500).json({ error: error.message });
  }
};