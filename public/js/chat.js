const { Anthropic } = require('@anthropic-ai/sdk');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { model, messages, advanced } = req.body;
    
    // Configurar cliente da Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Obter memórias da Penseira (se estiverem no localStorage)
    let userProfile = '';
    
    try {
      // Aqui precisaríamos de um método para recuperar essas informações
      // Como o localStorage está no cliente, não é acessível diretamente no servidor
      // Uma solução seria enviar as memórias relevantes junto com o request
      
      // Esta é uma simulação - na implementação real, você enviaria as memórias
      // da Penseira junto com a requisição
      userProfile = `
Suas memórias incluem:
- [SEU NOME] é um profissional [SUA PROFISSÃO] com interesses em [SEUS INTERESSES].
- Prefere comunicação formal mas calorosa, com explicações detalhadas e exemplos concretos.
- Está trabalhando atualmente em [PROJETOS ATUAIS].
      `;
    } catch (err) {
      console.log('Não foi possível recuperar memórias da Penseira:', err);
    }
    
    const systemPrompt = `
Você é o assistente pessoal de [SEU NOME]. 

${userProfile}

Mantenha nossas conversas em um tom natural e conversacional. Você tem excelente memória e deve se referir a detalhes de nossas conversas anteriores quando relevante.

Quando eu falar sobre projetos ou interesses específicos, relacione-os com o que você já sabe sobre mim. Se eu mencionar algo novo sobre mim ou meus interesses, lembre-se disso para futuras conversas.
    `;
    
    const requestOptions = {
      model: model,
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    };
    
    // Adicionar Extended Thinking quando modo avançado estiver ativo
    if (advanced) {
      requestOptions.system += " Use o modo Extended Thinking para fornecer respostas mais detalhadas e analíticas.";
    }
    
    // Fazer a chamada à API do Claude
    const response = await anthropic.messages.create(requestOptions);
    
    return res.status(200).json({
      id: response.id,
      content: response.content[0].text
    });
    
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return res.status(500).json({ error: error.message });
  }
};
