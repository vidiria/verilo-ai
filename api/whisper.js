const { OpenAI } = require('openai');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const formidable = require('formidable');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Processamento do upload usando formidable
    const form = new formidable.IncomingForm();
    
    // Processar a solicitação de upload
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // Verificar se há um arquivo
    if (!files || !files.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const file = files.file;
    const tempFilePath = `/tmp/${Date.now()}_${file.originalFilename || 'audio.webm'}`;

    // Determinar o idioma (padrão pt)
    const language = fields.language || 'pt';

    try {
      // Salvar o arquivo temporariamente
      await writeFileAsync(tempFilePath, await fs.promises.readFile(file.filepath));

      // Inicializar a API da OpenAI (Corrigir a chave da API)
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // Chave API corrigida
      });

      // Transcrever o áudio
      const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: language
      });

      // Limpar os arquivos temporários
      await unlinkAsync(tempFilePath);
      
      if (file.filepath) {
        try {
          await unlinkAsync(file.filepath);
        } catch (e) {
          console.error('Erro ao remover arquivo temporário originário:', e);
        }
      }

      return res.status(200).json({ text: response.text });
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);

      // Tentar limpar os arquivos temporários
      try {
        await unlinkAsync(tempFilePath);
        if (file.filepath) {
          await unlinkAsync(file.filepath);
        }
      } catch (e) {
        console.error('Erro ao remover arquivos temporários:', e);
      }

      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error('Erro ao processar upload:', error);
    return res.status(500).json({ error: 'Erro ao processar o upload do arquivo' });
  }
};