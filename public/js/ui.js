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
  closeModal: document.getElementById('closeModal')
};

// Estado da UI
const uiState = {
  currentConversationId: 'new',
  activeModel: 'gpt-4o',
  advancedMode: false,
  attachments: [],
  recording: false,
  darkMode: false
};

// Inicialização da UI
function initUI() {
  // Preencher mensagem de boas-vindas
  addAssistantMessage({
    id: 'welcome',
    content: "Olá! Sou o Verilo, seu assistente de IA integrado. Posso ajudar com pesquisas, escrita, análise de dados, programação e muito mais. Como posso ajudar você hoje?"
  });
  
  // Carregar conversas do localStorage
  loadConversations();
  
  // Inicializar a Penseira
  loadPenseiraMemories();
}

// Toggle do menu mobile
elements.mobileMenuButton.addEventListener('click', () => {
  elements.sidebar.classList.toggle('open');
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
  const isClaudeModel = uiState.activeModel.includes('claude');
  const label = isClaudeModel ? 'Extended Thinking' : 'Investigar';
  
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

// Auto-resize textarea
elements.messageInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

// Funções de manipulação da UI
function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message user';
  messageElement.innerHTML = `
    <div class="message-bubble">
      <div class="message-content">
        ${message.content}
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
        ${message.content}
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
        <div class="conversation-title">${conversation.title}</div>
        <div class="conversation-details">
          <div class="model-tag">${conversation.model}</div>
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
      content: "Olá! Sou o Verilo, seu assistente de IA integrado. Posso ajudar com pesquisas, escrita, análise de dados, programação e muito mais. Como posso ajudar você hoje?"
    });
  } else {
    // Carregar conversa existente
    const conversations = JSON.parse(localStorage.getItem('verilo_conversations')) || [];
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      elements.messagesContainer.innerHTML = '';
      uiState.currentConversationId = conversationId;
      
      // Definir modelo ativo
      const modelBtn = Array.from(elements.modelButtons).find(btn => 
        btn.getAttribute('data-model') === conversation.modelId
      );
      
      if (modelBtn) {
        elements.modelButtons.forEach(btn => btn.classList.remove('active'));
        modelBtn.classList.add('active');
        elements.currentModel.textContent = modelBtn.textContent;
        uiState.activeModel = conversation.modelId;
        
        // Atualizar select mobile também
        if (elements.mobileModelSelect) {
          elements.mobileModelSelect.value = conversation.modelId;
        }
      }
      
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
        id: 'interface',
        title: 'Preferências de Interface',
        content: 'Você demonstrou preferência por interfaces minimalistas com design monocromático e toques de cor laranja para destaque. Suas escolhas de interface se alinham com o estilo xAI/Tesla UI.'
      },
      {
        id: 'models',
        title: 'Modelos Favoritos',
        content: 'Seus modelos mais utilizados são GPT-O1, GPT-4o, GPT-4.5 e Claude 3.7 Sonnet com Extended Thinking. Você tende a preferir o GPT-4o para tarefas criativas e o Claude 3.7 para análises mais detalhadas.'
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
      <div class="memory-title">${memory.title}</div>
      <div class="memory-content">${memory.content}</div>
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
  initUI
};