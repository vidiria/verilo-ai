// chat.js - Lida com a comunicação com as APIs de IA

// Estado do chat
const chatState = {
  messages: [],
  streaming: false,
  conversationId: null
};

// Enviar mensagem
async function sendMessage(userInput) {
  // Evitar enviar mensagem vazia
  if (!userInput.trim()) return;
  
  // Adicionar mensagem do usuário à UI
  const userMessage = {
    id: generateId(),
    role: 'user',
    content: userInput
  };
  
  window.ui.addUserMessage(userMessage);
  
  // Adicionar mensagem à lista
  chatState.messages.push(userMessage);
  
  // Limpar input
  document.getElementById('messageInput').value = '';
  document.getElementById('messageInput').style.height = 'auto';
  
  // Indicar que está digitando
  chatState.streaming = true;
  const loadingIndicator = addTypingIndicator();
  
  try {
    // Chamar API de acordo com o modelo selecionado
    const model = window.uiState.activeModel;
    const advanced = window.uiState.advancedMode;
    
    // Configurar parâmetros para a chamada
    const requestData = {
      model,
      messages: chatState.messages,
      advanced
    };
    
    // Adicionar anexos se houver
    if (window.uiState.attachments.length > 0) {
      requestData.attachments = window.uiState.attachments;
    }
    
    // Chamar a API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error('Erro ao comunicar com a API');
    }
    
    const data = await response.json();
    
    // Remover indicador de digitação
    loadingIndicator.remove();
    chatState.streaming = false;
    
    // Adicionar resposta do assistente
    const assistantMessage = {
      id: data.id || generateId(),
      role: 'assistant',
      content: data.content
    };
    
    chatState.messages.push(assistantMessage);
    window.ui.addAssistantMessage(assistantMessage);
    
    // Salvar conversa
    saveConversation();
    
  } catch (error) {
    // Remover indicador de digitação
    loadingIndicator.remove();
    chatState.streaming = false;
    
    // Exibir erro
    const errorMessage = {
      id: generateId(),
      role: 'assistant',
      content: `Desculpe, ocorreu um erro ao processar sua mensagem: ${error.message}`
    };
    
    chatState.messages.push(errorMessage);
    window.ui.addAssistantMessage(errorMessage);
  }
}

// Função para transcrever áudio
async function transcribeAudio(audioBlob) {
  try {
    // Criar FormData para enviar o arquivo
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    
    // Chamar API Whisper
    const response = await fetch('/api/whisper', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Erro ao transcrever áudio');
    }
    
    const data = await response.json();
    return data.text;
    
  } catch (error) {
    console.error('Erro na transcrição:', error);
    return null;
  }
}

// Função para sintetizar voz
async function textToSpeech(text, messageId) {
  try {
    // Chamar API TTS
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error('Erro ao sintetizar voz');
    }
    
    // Reproduzir áudio
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
    
  } catch (error) {
    console.error('Erro na síntese de voz:', error);
    alert('Não foi possível reproduzir o áudio.');
  }
}

// Funções auxiliares
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function addTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = `
    <div class="message assistant">
      <div class="message-bubble">
        <div class="message-header">
          <div class="message-avatar">V</div>
          <strong>Verilo</strong>
        </div>
        <div class="message-content">
          <div style="display: flex; gap: 6px; align-items: center;">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('messagesContainer').appendChild(indicator);
  scrollToBottom();
  return indicator;
}

function scrollToBottom() {
  const container = document.getElementById('messagesContainer');
  container.scrollTop = container.scrollHeight;
}

function saveConversation() {
  if (chatState.messages.length < 2) return; // Não salvar conversa vazia
  
  // Determinar ID da conversa
  const conversationId = chatState.conversationId || generateId();
  chatState.conversationId = conversationId;
  
  // Obter conversas existentes
  const conversations = JSON.parse(localStorage.getItem('verilo_conversations')) || [];
  
  // Encontrar conversa existente ou criar nova
  const existingIndex = conversations.findIndex(c => c.id === conversationId);
  
  // Determinar título da conversa (primeiros 30 caracteres da primeira mensagem)
  const title = chatState.messages[0].content.substring(0, 30) + (chatState.messages[0].content.length > 30 ? '...' : '');
  
  const conversation = {
    id: conversationId,
    title: title,
    date: window.ui.getCurrentTime(),
    model: document.getElementById('currentModel').textContent,
    modelId: window.uiState.activeModel,
    messages: chatState.messages
  };
  
  if (existingIndex >= 0) {
    conversations[existingIndex] = conversation;
  } else {
    conversations.unshift(conversation);
  }
  
  // Limitar a 20 conversas
  if (conversations.length > 20) {
    conversations.pop();
  }
  
  // Salvar conversas no localStorage
  localStorage.setItem('verilo_conversations', JSON.stringify(conversations));
  
  // Atualizar lista de conversas na UI
  window.ui.loadConversations();
}

// Adicionar memória à Penseira
function addToPenseira(memory) {
  // Obter memórias existentes
  const memories = JSON.parse(localStorage.getItem('verilo_penseira')) || [];
  
  // Verificar se já existe uma memória com o mesmo título
  const existingIndex = memories.findIndex(m => m.title === memory.title);
  
  if (existingIndex >= 0) {
    memories[existingIndex] = memory;
  } else {
    memories.push(memory);
  }
  
  // Salvar no localStorage
  localStorage.setItem('verilo_penseira', JSON.stringify(memories));
}

// Exportar funções
window.chat = {
  sendMessage,
  transcribeAudio,
  textToSpeech,
  addToPenseira
};