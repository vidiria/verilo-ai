import { Anthropic } from "@anthropic-ai/sdk";
import { HfInference } from '@huggingface/inference';  // Importe o Hugging Face
import { GoogleGenerativeAI } from "@google/generative-ai";
import { streamToResponse } from 'ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const hf = new HfInference(process.env.HF_API_TOKEN);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);



export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages, attachments, model, extended } = req.body;

    if (!messages) {
        return res.status(400).json({ error: 'Missing messages' });
    }


  // Escolha do modelo e preparação da mensagem
  try {
    let response;
      switch (model) {
        case 'claude-3-opus':
        case 'claude-3-sonnet':
        case 'claude-3-haiku':
              const claudeModel = model.startsWith('claude-3') ? model : 'claude-3-opus'; //Default
              response = await anthropic.messages.create({
                model: claudeModel,
                messages: buildClaudeMessages(messages, attachments, extended),
                max_tokens: extended ? 8192 : 4096,
                stream: true
              });
               return streamToResponse(response, res); //Para streaming da resposta


        case 'grok-1':
            // Preparando prompt para o Grok
            const grokPrompt = buildGrokPrompt(messages, attachments, extended);
            const grokResult = await hf.textGenerationStream({
                model: 'xai-org/grok-1',
                inputs: grokPrompt,
                parameters: {
                    max_new_tokens: extended ? 8192 : 4096, // ajuste conforme necessário
                    temperature: 0.7,
                    repetition_penalty: 1.0,
                    return_full_text: false,
                }
            });
             return streamToResponse(grokResult, res);


          case 'gemini-1.5-pro': // Gemini
              const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
              const geminiPrompt = buildGeminiPrompt(messages, attachments, extended);

              //Inicia o chat com o histórico de mensagens.
              const chat = geminiModel.startChat({
                history: geminiPrompt,
                generationConfig: {
                      maxOutputTokens: extended ? 8192 : 4096, // Controla o tamanho máximo da resposta
                }
              });

              //Envia a última mensagem do usuário (que já está no histórico).
              const userMessage = messages[messages.length - 1].content;
              const result = await chat.sendMessageStream(userMessage);
               return streamToResponse(result.stream, res);

        default:
          return res.status(400).json({ error: 'Invalid model' });
      }

  } catch (error) {
    console.error("Error in API:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

// Funções de formatação de mensagens para diferentes modelos

function buildClaudeMessages(messages, attachments, extended) {
    const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
    }));

    if (attachments && attachments.length > 0) {
      const attachmentContent = attachments.map(att => {
        if (att.type.startsWith('image/')) {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: att.type,
              data: att.url.split(',')[1], // Assume base64 URL
            },
          };
        } else {
            return {
              type: 'text',
              text: `Anexo: <span class="math-inline">\{att\.name\} \(</span>{att.type}) - URL: ${att.url}`
            }
        }

      });
      //Adiciona os anexos ao ÚLTIMO conteúdo do usuário.
        const lastUserMessage = formattedMessages.slice().reverse().find(msg => msg.role === 'user');
        if (lastUserMessage) {
            if(typeof lastUserMessage.content === 'string'){
                lastUserMessage.content = [{ type: 'text', text: lastUserMessage.content }]
            }
            lastUserMessage.content.push(...attachmentContent);
        }
    }
  return formattedMessages;
}



function buildGrokPrompt(messages, attachments, extended) {
  // Concatena mensagens em um único prompt.  O Grok não tem um conceito formal de "mensagens" como a API da OpenAI.
  let prompt = "";
  for (const msg of messages) {
    prompt += `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}\n`;
  }

  if (attachments && attachments.length > 0) {
    prompt += "Anexos:\n";
    for (const att of attachments) {
      prompt += `- <span class="math-inline">\{att\.name\} \(</span>{att.type}): ${att.url}\n`;
    }
  }

  // Adiciona instruções para o Grok (opcional, mas recomendado)
    prompt += "Assistente, responda de forma concisa e útil, considerando o contexto e os anexos fornecidos.";
    if(extended) {
        prompt += " Use pensamento extendido se necessário."
    }

  return prompt;
}

function buildGeminiPrompt(messages, attachments, extended) {
  const geminiMessages = [];

  for (const msg of messages) {
      if (msg.role === 'user') {
          // Adiciona o texto da mensagem do usuário
          let parts = [{text: msg.content}];

          // Se houver anexos na *mesma* mensagem, anexa-os
          if (attachments && attachments.length > 0) {
              for (const att of attachments) {
                  if (att.type.startsWith('image/') && msg.id === messages[messages.length -1].id ) { //Verifica anexos na última msg
                      parts.push({
                        inlineData: {
                          mimeType: att.type,
                          data: att.url.split(',')[1] // Assume Base64
                        }
                      });
                  } else if(msg.id === messages[messages.length -1].id){
                      // Para outros tipos de anexos (não imagens), inclua como texto, na ÚLTIMA mensagem
                      parts.push({ text: `Anexo: <span class="math-inline">\{att\.name\} \(</span>{att.type}) - URL: ${att.url}` });
                  }
              }
          }
          geminiMessages.push({ role: "user", parts: parts });
      } else if (msg.role === 'assistant'){
          // Mensagens do assistente (sem anexos, normalmente)
          geminiMessages.push({ role: "model", parts: [{ text: msg.content }] });
      }
  }

  return geminiMessages;
}
