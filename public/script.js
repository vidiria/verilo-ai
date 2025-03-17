// State management
let currentModel = 'claude-3-opus';
let extendedThinkingEnabled = true;
let currentVoice = 'nova';
let currentConversation = []; // { role, content, id }
let attachments = []; // { name, type, url }

const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const modeAdvancedBtn = document.getElementById('modeAdvancedBtn');
const advancedToggle = document.getElementById('advancedToggle');
const modelButtons = document.querySelectorAll('.model-button');
const mobileModelSelect = document.getElementById('mobileModelSelect');
const currentModelDisplay = document.getElementById('currentModel');
const lousaModal = document.getElementById('lousaModal');
const lousaButton = document.getElementById('lousaButton');
const closeLousaModal = document.getElementById('closeLousaModal');
const lousaEditor = document.getElementById('lousaEditor');
const lousaSaveBtn = document.getElementById('lousaSaveBtn');
const penseiraModal = document.getElementById('penseiraModal');
const penseiraButton = document.getElementById('penseiraButton');
const closePenseiraModal = document.getElementById('closePenseiraModal');
const penseiraInput = document.getElementById('penseiraInput');
const penseiraSave = document.getElementById('penseiraSave');
const attachBtn = document.getElementById('attachBtn');
const attachmentsArea = document.getElementById('attachmentsArea');
const voiceSelector = document.getElementById('voiceSelector');
const notification = document.getElementById('notification');
const newChatBtn = document.getElementById("newChatBtn");
const mobileMenuButton = document.getElementById('mobileMenuButton');
const sidebar = document.getElementById('sidebar');
const lousaCodeBtn = document.getElementById('lousaCodeBtn');
const sidebarTabs = document.querySelectorAll('.sidebar-tab');
const conversationsList = document.getElementById('conversationsList');
const projectsList = document.getElementById('projectsList');


// === Event Listeners ===
// Send Message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000); // Hide after 3 seconds
}


// Model Selection (Desktop)
modelButtons.forEach(button => {
    button.addEventListener('click', () => {
        modelButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentModel = button.dataset.model;
        currentModelDisplay.textContent = button.textContent;
    });
});

// Model Selection (Mobile)
mobileModelSelect.addEventListener('change', () => {
    currentModel = mobileModelSelect.value;
    currentModelDisplay.textContent = mobileModelSelect.options[mobileModelSelect.selectedIndex].text;
});

// Extended Thinking Toggle
advancedToggle.addEventListener('click', () => {
    extendedThinkingEnabled = !extendedThinkingEnabled;
    advancedToggle.classList.toggle('active', extendedThinkingEnabled);
});

modeAdvancedBtn.addEventListener('click', () => {
    extendedThinkingEnabled = !extendedThinkingEnabled;
    modeAdvancedBtn.classList.toggle('active', extendedThinkingEnabled);
});

// Lousa Modal
lousaButton.addEventListener('click', () => {
    lousaModal.classList.add('open');
});
closeLousaModal.addEventListener('click', closeLousa);
lousaSaveBtn.addEventListener('click', saveToLousa);

// Penseira Modal
penseiraButton.addEventListener('click', () => {
    penseiraModal.classList.add('open');
});
closePenseiraModal.addEventListener('click', () => {
    penseiraModal.classList.remove('open');
});
penseiraSave.addEventListener('click', saveToPenseira);

// Attachments
attachBtn.addEventListener('click', () => {
    // Simulate a file input click
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true; // Allow multiple file selection
    fileInput.addEventListener('change', handleFileUpload);
    fileInput.click();
});

voiceSelector.addEventListener('change', () => {
    currentVoice = voiceSelector.value;
});

newChatBtn.addEventListener("click", startNewChat);

mobileMenuButton.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

lousaCodeBtn.addEventListener('click', () => {
    // Implemente a lógica para gerar/exibir código aqui, se necessário.
    showNotification("Funcionalidade de geração de código em desenvolvimento!");
});

sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        sidebarTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'conversations') {
            conversationsList.classList.add('active');
            projectsList.classList.remove('active');
        } else {
            projectsList.classList.add('active');
            conversationsList.classList.remove('active');
        }
    });
});



// === Functions ===
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    const userMessage = { role: 'user', content: message, id: Date.now() };
    currentConversation.push(userMessage);
    displayMessage(userMessage);
    messageInput.value = '';

    // Loading indicator
    const loadingMessage = { role: 'assistant', content: '', id: 'loading', isLoading: true };
    displayMessage(loadingMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch(`/api/chat?model=<span class="math-inline">\{currentModel\}&extended\=</span>{extendedThinkingEnabled}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: currentConversation, attachments: attachments }),
        });

        if (!response.ok) {
          const errorData = await response.json(); // Tenta obter detalhes do erro
          throw new Error(`API Error: ${response.status} - ${errorData.error || "Unknown error"}`);
        }

        const data = await response.json();

          // Processamento e exibição da resposta completa, ou streaming (dependendo da sua API)
        removeMessage('loading'); // Remove the loading indicator

        if (data.stream) {
          // Se o seu backend suporta streaming
            displayStreamedMessage(data.stream); //Função que será definida a seguir.
        } else {
          // Se for uma resposta completa (sem streaming)
          const assistantMessage = { role: 'assistant', content: data.content, id: Date.now() };
          currentConversation.push(assistantMessage);
          displayMessage(assistantMessage);

          // Text-to-Speech
           speakText(data.content);

          // Atualiza a UI após a resposta.
           updateUIAfterResponse();
        }



    } catch (error) {
        console.error('Error sending message:', error);
        removeMessage('loading');
        const errorMessage = { role: 'assistant', content: `Erro ao processar a mensagem: ${error.message}`, id: Date.now() };
        displayMessage(errorMessage);
    }
     finally{
        messageInput.value = ''; // Limpa o input, mesmo em caso de erro
        messageInput.focus();
     }
}

function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(message.role === 'user' ? 'user-message' : 'assistant-message');
    messageElement.id = message.id;

    if (message.isLoading) {
        messageElement.innerHTML = `
            <div class="message-loading">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>`;
    } else {
        messageElement.textContent = message.content;
    }
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
}

function removeMessage(id) {
    const messageElement = document.getElementById(id);
    if (messageElement) {
        messageElement.remove();
    }
}

//Função auxiliar para lidar com a resposta em streaming
async function displayStreamedMessage(stream) {
    const assistantMessage = { role: 'assistant', content: '', id: Date.now() };
    const messageElement = document.createElement('div');
    messageElement.classList.add('assistant-message');
    messageElement.id = assistantMessage.id;
    messagesContainer.appendChild(messageElement);

    let fullContent = '';

    // Usando ReadableStream diretamente (compatibilidade com Vercel e browsers modernos)
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        messageElement.textContent = fullContent; // Atualiza o conteúdo da mensagem
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (error) {
      console.error("Erro no streaming:", error);
      messageElement.textContent = "Erro ao receber a resposta completa.";
    } finally {
      reader.releaseLock(); // Importante: Libera o reader.
       // Adiciona a mensagem completa à conversa
      assistantMessage.content = fullContent;
      currentConversation.push(assistantMessage);
      // Text-to-Speech - após receber a resposta completa
      speakText(fullContent);

      updateUIAfterResponse();
    }
}


async function speakText(text) {
    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, voice: currentVoice }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`TTS API Error: ${response.status} - ${errorData.error || "Unknown error"}`);
        }


      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();


    } catch (error) {
        console.error('Error in TTS:', error);
    }
}

function closeLousa() {
    lousaModal.classList.remove('open');
}

function saveToLousa() {
    const content = lousaEditor.value;
    // Salvar em algum lugar (localStorage, API, etc.)
    console.log("Conteúdo salvo da Lousa:", content);
    closeLousa();
    showNotification("Conteúdo da Lousa salvo com sucesso!");

}

function saveToPenseira() {
    const thought = penseiraInput.value;
    // Salvar em algum lugar (localStorage, API, etc.)
    console.log("Pensamento salvo na Penseira:", thought);
    penseiraModal.classList.remove('open');
    showNotification("Pensamento salvo na Penseira com sucesso!");
    penseiraInput.value = "";
}


function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            processFile(file);
        }
    }
}

async function processFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Upload API Error: ${response.status} - ${errorData.error || "Unknown Error"}`);
        }


        const data = await response.json(); // Espera os dados da resposta
        attachments.push({ name: file.name, type: file.type, url: data.url }); //Usa a URL retornada pela API.
        displayAttachment(file.name);



    } catch (error) {
        console.error('Error uploading file:', error);
         showNotification(`Erro ao fazer upload do arquivo: ${error.message}`);
    }
}

function displayAttachment(filename) {
    const attachmentElement = document.createElement('div');
    attachmentElement.classList.add('attachment');
    attachmentElement.innerHTML = `
        <span><span class="math-inline">\{filename\}</span\>
<span class\="attachment\-remove" data\-filename\="</span>{filename}">&times;</span>
    `;
    attachmentsArea.appendChild(attachmentElement);

    // Event listener for removing attachments
    attachmentElement.querySelector('.attachment-remove').addEventListener('click', removeAttachment);
}

function removeAttachment(event) {
    const filename = event.target.dataset.filename;
    attachments = attachments.filter(att => att.name !== filename);
    event.target.parentElement.remove();
}

function startNewChat() {
    // Limpa a conversa atual
    currentConversation = [];
    messagesContainer.innerHTML = ''; // Limpa as mensagens exibidas
    attachments = [];  //limpa os anexos
    attachmentsArea.innerHTML = ''; // Limpa a área de anexos.
    messageInput.value = ''; // Limpa o campo de entrada
    messageInput.focus();


    // Reset other UI elements if needed (e.g., model selection, extended thinking)
    // Exemplo:  Se você quiser resetar para um modelo padrão:
    // currentModel = 'claude-3-opus';
    // modelButtons.forEach(btn => btn.classList.remove('active'));
    // document.querySelector(`[data-model="${currentModel}"]`).classList.add('active');
    // currentModelDisplay.textContent = 'Claude 3 Opus';
    // mobileModelSelect.value = 'claude-3-opus';

    showNotification("Nova conversa iniciada!");
}

function updateUIAfterResponse(){
  //Aqui você pode colocar qualquer lógica para atualizar a UI
  //depois de receber uma resposta, como atualizar a lista de conversas
  //no menu lateral, etc.  Por enquanto, está vazio, mas você pode expandir
}
