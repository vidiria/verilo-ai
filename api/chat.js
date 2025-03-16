const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { model, messages, advanced } = req.body;
    
    // Verificar qual API usar baseado no nome do modelo
    if (model.includes('gpt')) {
      // API da OpenAI para modelos GPT
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
,
      });
      
      const requestOptions = {
        model: model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: 0.7,
        max_tokens: advanced ? 4096 : 2048
      };
      
      // Adicionar tool calling para "Investigar" quando modo avançado estiver ativo
      if (advanced) {
        requestOptions.tools = [
          {
            "type": "retrieval" // Ativa a funcionalidade Investigar
          }
        ];
        requestOptions.tool_choice = "auto";
      }
      
      const response = await openai.chat.completions.create(requestOptions);
      
      return res.status(200).json({
        id: response.id,
        content: response.choices[0].message.content
      });
      
    } else if (model.includes('claude')) {
      // API da Anthropic para modelos Claude
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      
      const requestOptions = {
        model: model,
        max_tokens: 4096,
        temperature: 0.7,
        system: "Você é o Verilo, um assistente pessoal avançado que combina diferentes modelos de IA.",
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      };
      
      // Adicionar Extended Thinking quando modo avançado estiver ativo
      if (advanced) {
        requestOptions.system += " Use o modo Extended Thinking para fornecer respostas mais detalhadas e analíticas.";
      }
      
      const response = await anthropic.messages.create(requestOptions);
      
      return res.status(200).json({
        id: response.id,
        content: response.content[0].text
      });
      
    } else {
      return res.status(400).json({ error: 'Modelo não suportado' });
    }
    
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return res.status(500).json({ error: error.message });
  }
};