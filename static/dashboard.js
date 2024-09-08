import { PROMPTS } from './prompts.js';
import { ELEVENLABS_API_KEY } from './config.js';

const bc = new BroadcastChannel("activity");

bc.onmessage = async (event) => {
    console.log('BROADCAST', event.data.command, event.data);
    switch (event.data.command) {
        case 'chat_update':
            displayChatLog(event.data.interactionHistory);
            break;
        case 'recognition_status':
            handleRecognitionStatus(event.data.status);
            break;
        case 'audio_status':
            document.getElementById('audioStatus').innerText = `${event.data.status}`;
            break;
        case 'change_voice':
            document.getElementById('voiceSelect').value = event.data.voiceId;
            break;
    }
};

const handleRecognitionStatus = (status) => {
    document.getElementById('recognitionStatus').innerText = `${status}`;
    document.getElementById('recognitionButton').innerHTML = status === 'active' ? 'Parar Reconhecimento' : 'Iniciar Reconhecimento';
};

document.querySelectorAll('button[data-command]').forEach(button => {
    button.addEventListener('click', async (e) => {
        const command = e.target.getAttribute('data-command');
        const payload = { command };

        if (command === 'change_recognition') {
            payload.status = document.getElementById('recognitionButton').innerText.includes('Parar') ? 'stop' : 'start';
        } else if (command === 'play_text') {
            payload.text = document.getElementById('text').value;
        }

        await bc.postMessage(payload);
    });
});

document.getElementById('continuousCheckbox').addEventListener('change', async (e) => {
    await bc.postMessage({
        command: 'change_continuous',
        continuous: e.target.checked
    });
});

document.getElementById('voiceSelect').addEventListener('change', async (e) => {
    await bc.postMessage({
        command: 'change_voice',
        voiceId: e.target.value
    });
});

// Carregar prompts do arquivo
const promptSelect = document.getElementById('promptSelect');
Object.keys(PROMPTS).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `Prompt: ${key}`;
    promptSelect.appendChild(option);
});

promptSelect.addEventListener('change', async (e) => {
    const promptId = e.target.value;
    const customPrompt = document.getElementById('customPrompt');

    if (promptId === 'custom') {
        customPrompt.classList.remove('hide');
    } else {
        customPrompt.classList.add('hide');
        await bc.postMessage({
            command: 'change_prompt',
            promptId
        });
    }
});

document.getElementById('sendCustomPromptButton').addEventListener('click', async () => {
    await bc.postMessage({
        command: 'change_prompt',
        promptId: 'custom',
        prompt: document.getElementById('textPrompt').value
    });
});



// Função para exibir o log do chat de forma formatada
const displayChatLog = (interactionHistory) => {
    const chatLogElement = document.getElementById('chatLog');
    chatLogElement.innerHTML = ''; // Limpa o conteúdo atual

    interactionHistory.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        const roleElement = document.createElement('strong');
        roleElement.textContent = `${message.role === 'user' ? 'Usuário' : 'Lex'}: `;
        messageElement.appendChild(roleElement);

        const contentElement = document.createElement('span');
        contentElement.textContent = message.content;
        messageElement.appendChild(contentElement);

        // Aplica estilo diferente para o usuário e a assistente
        if (message.role === 'user') {
            messageElement.classList.add('user-message');
        } else {
            messageElement.classList.add('assistant-message');
        }

        chatLogElement.appendChild(messageElement);
    });
};


// Função para buscar vozes da Eleven Labs e popular o select
const loadVoices = async () => {
    try {
        // Chamada para o próprio servidor usando o caminho relativo
        const response = await fetch('/dashboard/voices');
        if (!response.ok) {
            throw new Error('Erro ao buscar vozes da API.');
        }
        const data = await response.json();
        console.log(data);
        const voiceSelect = document.getElementById('voiceSelect');

        // Limpar a lista de seleção antes de popular
        voiceSelect.innerHTML = ''; 

        data.voices.forEach(voice => {
            // Ignorar vozes premade
            if (voice.category == 'premade') {
                return;
            }

            const option = document.createElement('option');
            option.value = voice.voice_id;
            option.textContent = `Voz: ${voice.name}`;
            voiceSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Erro ao carregar vozes:', err);
    }
};

// Chamar a função para carregar vozes ao carregar o script
loadVoices();
