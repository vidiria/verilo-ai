// Estado do chat
const chatState = {
  messages: [],
  streaming: false,
  conversationId: null,
  audioPlaying: false
};

async function sendMessage(userInput) {
  if (!userInput.trim()) return;

  const userMessage = { id: generateId(), role: 'user', content: userInput };
  window.ui.addUserMessage(userMessage);
  chatState.messages.push(userMessage);

  window.ui.showProgress(10, 'Enviando mensagem...');
  document.getElementById('messageInput').value = '';
  document.getElementById('messageInput').style.height = 'auto';
  document.getElementById('attachmentsArea').innerHTML = '';

  chatState.streaming = true;
  const loadingIndicator = addTypingIndicator();

  try {
    const model = window.uiState.activeModel;
    const advanced = window.uiState.advancedMode;
    const requestData = { model, messages: chatState.messages, advanced };

    if (window.uiState.attachments.length > 0) {
      requestData.attachments = window.uiState.attachments;
      window.uiState.attachments = [];
    }

    window.ui.showProgress(30, 'Processando...');
    let response;

    if (model === 'grok-3') {
      response = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
    } else {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
    }

    if (!response.ok) throw new Error(`Erro ${response.status}`);
    window.ui.showProgress(90, 'Finalizando...');
    const data = await response.json();

    loadingIndicator.remove();
    chatState.streaming = false;

    const assistantMessage = { id: data.id || generateId(), role: 'assistant', content: data.content };
    chatState.messages.push(assistantMessage);
    window.ui.addAssistantMessage(assistantMessage);

    saveConversation();
    window.ui.showProgress(100, 'Concluído!');
  } catch (error) {
    loadingIndicator.remove();
    chatState.streaming = false;
    console.error('Erro:', error);
    window.ui.showNotification(`Erro: ${error.message}`, 'error');
    const errorMessage = { id: generateId(), role: 'assistant', content: `Erro: ${error.message}` };
    chatState.messages.push(errorMessage);
    window.ui.addAssistantMessage(errorMessage);
  }
}

async function transcribeAudio(audioBlob) {
  try {
    window.ui.showProgress(10, 'Preparando áudio...');
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    let transcription;
    const model = window.uiState.activeModel;

    if (model === 'grok-3') {
      window.ui.showProgress(30, 'Enviando para Grok...');
      const response = await fetch('/api/grok/transcribe', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Erro na transcrição com Grok');
      const data = await response.json();
      transcription = data.text;
    } else {
      window.ui.showProgress(30, 'Enviando para Replicate...');
      const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Erro na transcrição com Replicate');
      const data = await response.json();
      transcription = data.text;
    }

    window.ui.showProgress(60, 'Formatando VINTRA...');
    const formattedTranscription = formatToVINTRA(transcription);

    window.ui.showProgress(80, 'Processando com Grok...');
    const processedText = await sendToGrok3(formattedTranscription);

    window.ui.showProgress(100, 'Concluído!');
    return processedText;
  } catch (error) {
    console.error('Erro na transcrição:', error);
    window.ui.showNotification('Erro na transcrição: ' + error.message, 'error');
    return null;
  }
}

function formatToVINTRA(transcription) {
  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}] VINTRA: ${transcription}`; // Ajuste conforme o framework VINTRA real
}

async function sendToGrok3(formattedTranscription) {
  const response = await fetch('/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: formattedTranscription }] })
  });
  if (!response.ok) throw new Error('Erro ao processar com Grok');
  const data = await response.json();
  return data.content;
}

async function textToSpeech(text, voice = 'nova') {
  try {
    if (chatState.audioPlaying) {
      window.ui.showNotification('Já existe um áudio em reprodução', 'warning');
      return;
    }
    chatState.audioPlaying = true;

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    });

    if (!response.ok) throw new Error('Erro na síntese de voz');

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
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
  if (chatState.messages.length < 2) return;

  const conversationId = chatState.conversationId || generateId();
  chatState.conversationId = conversationId;

  const conversations = JSON.parse(localStorage.getItem('verilo_conversations')) || [];
  const existingIndex = conversations.findIndex(c => c.id === conversationId);

  const title = chatState.messages[0].content.substring(0, 30) + (chatState.messages[0].content.length > 30 ? '...' : '');
  const conversation = {
    id: conversationId,
    title,
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

  if (conversations.length > 100) conversations.pop();

  try {
    localStorage.setItem('verilo_conversations', JSON.stringify(conversations));
  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
    window.ui.showNotification('Não foi possível salvar a conversa: armazenamento cheio', 'warning');
  }

  window.ui.loadConversations();
}

function addToPenseira(memory) {
  const memories = JSON.parse(localStorage.getItem('verilo_penseira')) || [];
  const existingIndex = memories.findIndex(m => m.title === memory.title);

  if (existingIndex >= 0) {
    memories[existingIndex] = memory;
  } else {
    memories.push(memory);
  }

  try {
    localStorage.setItem('verilo_penseira', JSON.stringify(memories));
    return true;
  } catch (error) {
    console.error('Erro ao salvar na Penseira:', error);
    window.ui.showNotification('Não foi possível salvar na Penseira: armazenamento cheio', 'warning');
    return false;
  }
}

window.chat = {
  sendMessage,
  transcribeAudio,
  textToSpeech,
  addToPenseira
};
