// UI.js - Controla a interface do usuário

// Elementos DOM
const elements = {
  sidebar: document.getElementById('sidebar'),
  mobileMenuButton: document.getElementById('mobileMenuButton'),
  conversationsList: document.getElementById('conversationsList'),
  projectsList: document.getElementById('projectsList'),
  sidebarTabs: document.querySelectorAll('.sidebar-tab'),
  modelButtons: document.querySelectorAll('.model-button'),
  mobileModelSelect: document.getElementById('mobileModelSelect'),
  currentModel: document.getElementById('currentModel'),
  advancedToggle: document.getElementById('advancedToggle'),
  modeAdvancedBtn: document.getElementById('modeAdvancedBtn'),
  messagesContainer: document.getElementById('messagesContainer'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  attachBtn: document.getElementById('attachBtn'),
  fileInput: document.getElementById('fileInput'),
  attachmentsArea: document.getElementById('attachmentsArea'),
  whisperBtn: document.getElementById('whisperBtn'),
  lousaButton: document.getElementById('lousaButton'),
  lousaModal: document.getElementById('lousaModal'),
  closeLousaModal: document.getElementById('closeLousaModal'),
  lousaEditor: document.getElementById('lousaEditor'),
  lousaSaveBtn: document.getElementById('lousaSaveBtn'),
  penseiraButton: document.getElementById('penseiraButton'),
  penseiraModal: document.getElementById('penseiraModal'),
  penseiraContent: document.getElementById('penseiraContent'),
  closeModal: document.getElementById('closeModal'),
  voiceSelector: document.getElementById('voiceSelector'),
  voiceBubble: document.getElementById('voiceBubble')
};

// Estado da UI
const uiState = {
  currentConversationId: 'new',
  activeModel: 'claude-3-7-sonnet', // Sempre usando Claude
  advancedMode: true, // Extended Thinking ativado por padrão
  attachments: [],
  recording: false,
  darkMode: false,
  currentStream: null, // Para rastrear a stream de áudio atual
  selectedVoice: 'nova' // Voz feminina suave por padrão
};

// Inicialização da UI
function initUI() {
  // Preencher mensagem de boas-vindas
  addAssistantMessage({
    id: 'welcome',
    content: "Olá! Sou o Verilo, seu assistente de IA integrado com Claude 3.7. Estou pronto para ajudar com pesquisas, escrita, análise de dados, programação e muito mais. Como posso ajudar você hoje?"
  });
  
  // Carregar conversas do localStorage
  loadConversations();
  
  // Inicializar a Penseira
  loadPenseiraMemories();

  // Inicializar seletor de vozes se existir
  if (elements.voiceSelector) {
    elements.voiceSelector.addEventListener('change', function() {
      uiState.selectedVoice = this.value;
    });
  }
}

// Função de sanitização para prevenir XSS
function sanitizeHTML(text) {
  const temp = document.createElement('div');
  temp.textContent = text;
  return temp.innerHTML;
}

// Toggle do menu mobile
elements.mobileMenuButton.addEventListener('click', (e) => {
  e.stopPropagation(); // Impede que o clique se propague ao document
  elements.sidebar.classList.toggle('open');
});

// Fechar o menu mobile ao clicar fora
document.addEventListener('click', (e) => {
  if (elements.sidebar.classList.contains('open') && 
      !e.target.closest('.sidebar') && 
      !e.target.closest('#mobileMenuButton')) {
    elements.sidebar.classList.remove('open');
  }
});

// Fechar o menu mobile ao clicar em qualquer item dentro dele
elements.sidebar.addEventListener('click', (e) => {
  if (e.target.closest('.conversation-item') || e.target.closest('.sidebar-tab')) {
    elements.sidebar.classList.remove('open');
  }
});

// Alternar entre abas
elements.sidebarTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabType = tab.getAttribute('data-tab');
    
    // Atualizar aba ativa
    elements.sidebarTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Mostrar conteúdo relevante
    if (tabType === 'conversations') {
      elements.conversationsList.classList.add('active');
      elements.projectsList.classList.remove('active');
    } else if (tabType === 'projects') {
      elements.conversationsList.classList.remove('active');
      elements.projectsList.classList.add('active');
    }
  });
});

// Seleção de modelo desktop
elements.modelButtons.forEach(button => {
  button.addEventListener('click', () => {
    elements.modelButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Atualizar modelo ativo
    uiState.activeModel = button.getAttribute('data-model');
    elements.currentModel.textContent = button.textContent;
    
    // Atualizar select mobile também
    if (elements.mobileModelSelect) {
      elements.mobileModelSelect.value = uiState.activeModel;
    }
    
    // Atualizar label do modo avançado
    updateAdvancedModeLabel();
  });
});

// Seleção de modelo mobile
if (elements.mobileModelSelect) {
  elements.mobileModelSelect.addEventListener('change', function() {
    const selectedModel = this.value;
    uiState.activeModel = selectedModel;
    
    // Atualizar modelo visível
    elements.currentModel.textContent = this.options[this.selectedIndex].text;
    
    // Atualizar botões no desktop também
    elements.modelButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-model') === selectedModel);
    });
    
    // Atualizar label do modo avançado
    updateAdvancedModeLabel();
  });
}

// Toggle do modo avançado
elements.advancedToggle.addEventListener('click', toggleAdvancedMode);
elements.modeAdvancedBtn.addEventListener('click', toggleAdvancedMode);

function toggleAdvancedMode() {
  uiState.advancedMode = !uiState.advancedMode;
  elements.advancedToggle.classList.toggle('active', uiState.advancedMode);
  elements.modeAdvancedBtn.classList.toggle('active', uiState.advancedMode);
  
  updateAdvancedModeLabel();
}

function updateAdvancedModeLabel() {
  const label = 'Extended Thinking';
  
  if (uiState.advancedMode) {
    if (elements.advancedToggle.querySelector('span')) {
      elements.advancedToggle.querySelector('span').textContent = label;
    }
    if (elements.modeAdvancedBtn.querySelector('span')) {
      elements.modeAdvancedBtn.querySelector('span').textContent = label;
    }
  } else {
    if (elements.advancedToggle.querySelector('span')) {
      elements.advancedToggle.querySelector('span').textContent = 'Modo Avançado';
    }
    if (elements.modeAdvancedBtn.querySelector('span')) {
      elements.modeAdvancedBtn.querySelector('span').textContent = 'Modo Avançado';
    }
  }
}

// Lousa modal
elements.lousaButton.addEventListener('click', () => {
  elements.lousaModal.classList.add('open');
});

elements.closeLousaModal.addEventListener('click', () => {
  elements.lousaModal.classList.remove('open');
});

// Fechar lousa ao clicar fora
elements.lousaModal.addEventListener('click', (e) => {
  if (e.target === elements.lousaModal) {
    elements.lousaModal.classList.remove('open');
  }
});

// Penseira modal
elements.penseiraButton.addEventListener('click', () => {
  elements.penseiraModal.classList.add('open');
});

elements.closeModal.addEventListener('click', () => {
  elements.penseiraModal.classList.remove('open');
});

// Fechar penseira ao clicar fora
elements.penseiraModal.addEventListener('click', (e) => {
  if (e.target === elements.penseiraModal) {
    elements.penseiraModal.classList.remove('open');
  }
});

// Auto-resize textarea com limite de altura
elements.messageInput.addEventListener('input', function() {
  this.style.height = 'auto';
  const newHeight = Math.min(this.scrollHeight, 200); // Limite de 200px
  this.style.height = `${newHeight}px`;
});

// Exibir notificação ao usuário
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remover após 3 segundos
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Função para exibir progresso
function showProgress(percent, message) {
  let progressOverlay = document.querySelector('.progress-overlay');
  
  if (!progressOverlay) {
    progressOverlay = document.createElement('div');
    progressOverlay.className = 'progress-overlay';
    progressOverlay.innerHTML = `
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <span class="progress-text">${message || 'Processando...'}</span>
    `;
    document.body.appendChild(progressOverlay);
  } else {
    progressOverlay.querySelector('.progress-text').textContent = message || 'Processando...';
  }
  
  const progressFill = progressOverlay.querySelector('.progress-fill');
  progressFill.style.width = `${percent}%`;
  
  if (percent >= 100) {
    setTimeout(() => {
      progressOverlay.classList.add('fade-out');
      setTimeout(() => progressOverlay.remove(), 500);
    }, 1000);
  }
}

// Funções de manipulação da UI
function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message user';
  messageElement.innerHTML = `
    <div class="message-bubble">
      <div class="message-content">
        ${sanitizeHTML(message.content)}
      </div>
    </div>
    <div class="message-meta">
      <span>${getCurrentTime()}</span>
    </div>
  `;
  
  elements.messagesContainer.appendChild(messageElement);
  scrollToBottom();
}

function addAssistantMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message assistant';
  messageElement.innerHTML = `
    <div class="message-bubble">
      <div class="message-header">
        <div class="message-avatar">V</div>
        <strong>Verilo</strong>
      </div>
      <div class="message-content">
        ${sanitizeHTML(message.content)}
      </div>
    </div>
    <div class="message-actions">
      <button class="message-action-btn" data-action="listen" data-message-id="${message.id}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
        Ouvir
      </button>
      <button class="message-action-btn" data-action="copy" data-message-id="${message.id}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copiar
      </button>
    </div>
  `;
  
  elements.messagesContainer.appendChild(messageElement);
  scrollToBottom();
}

function scrollToBottom() {
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function getCurrentTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// Funções de armazenamento local
function loadConversations() {
  const conversations = JSON.parse(localStorage.getItem('verilo_conversations')) || [];
  
  // Limpar lista de conversas
  elements.conversationsList.innerHTML = '';
  
  // Adicionar conversa atual
  const newConversationElement = document.createElement('div');
  newConversationElement.className = 'conversation-item active';
  newConversationElement.setAttribute('data-id', 'new');
  newConversationElement.innerHTML = `
    <div class="conversation-icon">N</div>
    <div class="conversation-content">
      <div class="conversation-title">Nova conversa</div>
      <div class="conversation-details">
        <div class="model-tag">${elements.currentModel.textContent}</div>
        <span>Agora</span>
      </div>
    </div>
  `;
  elements.conversationsList.appendChild(newConversationElement);
  
  // Adicionar conversas salvas
  conversations.forEach(conversation => {
    const conversationElement = document.createElement('div');
    conversationElement.className = 'conversation-item';
    conversationElement.setAttribute('data-id', conversation.id);
    
    const firstChars = conversation.title.substring(0, 1).toUpperCase();
    
    conversationElement.innerHTML = `
      <div class="conversation-icon">${firstChars}</div>
      <div class="conversation-content">
        <div class="conversation-title">${sanitizeHTML(conversation.title)}</div>
        <div class="conversation-details">
          <div class="model-tag">${sanitizeHTML(conversation.model)}</div>
          <span>${conversation.date}</span>
        </div>
      </div>
    `;
    
    elements.conversationsList.appendChild(conversationElement);
  });
  
  // Adicionar event listeners para as conversas
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const conversationId = item.getAttribute('data-id');
      loadConversation(conversationId);
    });
  });
}

function loadConversation(conversationId) {
  if (conversationId === 'new') {
    // Nova conversa
    elements.messagesContainer.innerHTML = '';
    uiState.currentConversationId = 'new';
    
    // Adicionar mensagem de boas-vindas
    addAssistantMessage({
      id: 'welcome',
      content: "Olá! Sou o Verilo, seu assistente de IA integrado com Claude 3.7. Estou pronto para ajudar com pesquisas, escrita, análise de dados, programação e muito mais. Como posso ajudar você hoje?"
    });
  } else {
    // Carregar conversa existente
    const conversations = JSON.parse(localStorage.getItem('verilo_conversations')) || [];
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      elements.messagesContainer.innerHTML = '';
      uiState.currentConversationId = conversationId;
      
      // Carregar mensagens
      conversation.messages.forEach(message => {
        if (message.role === 'user') {
          addUserMessage(message);
        } else {
          addAssistantMessage(message);
        }
      });
    }
  }
}

function loadPenseiraMemories() {
  const memories = JSON.parse(localStorage.getItem('verilo_penseira')) || [];
  
  // Limpar conteúdo da Penseira
  elements.penseiraContent.innerHTML = '';
  
  // Se não houver memórias, adicionar algumas padrão
  if (memories.length === 0) {
    const defaultMemories = [
      {
        id: 'profile',
        title: 'Perfil do Usuário',
        content: '[SEU NOME] é um profissional [SUA PROFISSÃO] com interesses em [SEUS INTERESSES]. Prefere comunicação direta e detalhada, especialmente em tópicos sobre [SEUS TÓPICOS PREFERIDOS].'
      },
      {
        id: 'preferences',
        title: 'Preferências de Conversação',
        content: 'Prefere comunicação formal mas calorosa. Aprecia explicações detalhadas seguidas de exemplos concretos, especialmente ao discutir conceitos técnicos.'
      },
      {
        id: 'projects',
        title: 'Projetos Atuais',
        content: 'Trabalhando em: [LISTA DE SEUS PROJETOS ATUAIS]'
      }
    ];
    
    localStorage.setItem('verilo_penseira', JSON.stringify(defaultMemories));
    memories.push(...defaultMemories);
  }
  
  // Adicionar memórias à Penseira
  memories.forEach(memory => {
    const memoryElement = document.createElement('div');
    memoryElement.className = 'memory-card';
    memoryElement.innerHTML = `
      <div class="memory-title">${sanitizeHTML(memory.title)}</div>
      <div class="memory-content">${sanitizeHTML(memory.content)}</div>
    `;
    
    elements.penseiraContent.appendChild(memoryElement);
  });
}

// Exportar funções/variáveis para uso em outros arquivos
window.uiState = uiState;
window.ui = {
  addUserMessage,
  addAssistantMessage,
  getCurrentTime,
  loadConversations,
  loadConversation,
  initUI,
  showNotification,
  showProgress
};
