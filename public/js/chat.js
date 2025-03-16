// chat.js - Lida com a comunicação com as APIs de IA

// Estado do chat
const chatState = {
  messages: [],
  streaming: false,
  conversationId: null,
  audioPlaying: false
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
  
  // Limpar anexos após envio
  if (window.uiState.attachments.length > 0) {
    document.getElementById('attachmentsArea').innerHTML = '';
  }
  
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
      // Aqui você deve implementar a lógica para enviar os anexos
      // Para a API Vercel, isso geralmente envolve upload para um serviço como S3 ou similar
      requestData.attachments = window.uiState.attachments;
      
      // Limpar anexos depois de usá-los
      window.uiState.attachments = [];
    }
    
    window.ui.showNotification('Enviando mensagem...', 'info');
    
    // Chamar a API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}: Falha na comunicação com a API`);
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
    
    console.error('Erro na comunicação com a API:', error);
    window.ui.showNotification(`Erro: ${error.message}`, 'error');
    
    // Exibir erro como mensagem do assistente
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
    
    // Opcionalmente, especificar o idioma (padrão é pt)
    formData.append('language', 'pt');
    
    // Chamar API Whisper
    const response = await fetch('/api/whisper', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}: Falha na transcrição`);
    }
    
    const data = await response.json();
    return data.text;
    
  } catch (error) {
    console.error('Erro na transcrição:', error);
    window.ui.showNotification('Erro na transcrição: ' + error.message, 'error');
    return null;
  }
}

// Função para sintetizar voz
async function textToSpeech(text, voice = 'alloy') {
  try {
    // Evitar múltiplas reproduções simultâneas
    if (chatState.audioPlaying) {
      window.ui.showNotification('Já existe um áudio em reprodução', 'warning');
      return;
    }
    
    chatState.audioPlaying = true;
    
    // Chamar API TTS
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        text,
        voice  // Passar a voz selecionada
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}: Falha na síntese de voz`);
    }
    
    // Reproduzir áudio
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl); // Liberar memória
      chatState.audioPlaying = false;
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audioUrl);
      chatState.audioPlaying = false;
      window.ui.showNotification('Erro ao reproduzir o áudio', 'error');
    });
    
    await audio.play();
    return true;
    
  } catch (error) {
    console.error('Erro na síntese de voz:', error);
    window.ui.showNotification('Erro na síntese de voz: ' + error.message, 'error');
    chatState.audioPlaying = false;
    return false;
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
  try {
    localStorage.setItem('verilo_conversations', JSON.stringify(conversations));
  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
    window.ui.showNotification('Não foi possível salvar a conversa: armazenamento cheio', 'warning');
  }
  
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
  try {
    localStorage.setItem('verilo_penseira', JSON.stringify(memories));
    return true;
  } catch (error) {
    console.error('Erro ao salvar na Penseira:', error);
    window.ui.showNotification('Não foi possível salvar na Penseira: armazenamento cheio', 'warning');
    return false;
  }
}

// Exportar funções
window.chat = {
  sendMessage,
  transcribeAudio,
  textToSpeech,
  addToPenseira
};