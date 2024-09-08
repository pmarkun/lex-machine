import { PROMPTS } from './prompts.js';
import { ELEVENLABS_API_KEY } from './config.js';

let frases = []; // Banco de frases

const bc = new BroadcastChannel("activity");
bc.onmessage = async (event) => {

    // if (event.data.command != 'status') {
    console.log('BROADCAST DASH', event.data.command, event.data);
    // }

    switch (event.data.command) {
        case 'chat_update':
            displayChatLog(event.data.interactionHistory);
            break;
        case 'status_recognition':
            handleRecognitionStatus(event.data.status);
            break;
        case 'change_recognition':
            break;
        case 'audio_status':
            document.getElementById('audioStatus').innerText = `${event.data.status}`;
            break;
        case 'change_voice':
            document.getElementById('voiceSelect').value = event.data.voiceId;
            break;
        case 'transcript':
            updateTranscript(event.data.transcript);
            break;
        case 'status':
            break;
    }
};

const handleRecognitionStatus = (status) => {
    console.log('RECOG', status);
    document.getElementById('recognitionStatus').innerText = `${status}`;
    document.getElementById('recognitionButton').innerHTML = status === 'Ouvindo' ? 'Parar Reconhecimento' : 'Iniciar Reconhecimento';
};

// Lidar com os eventos de botão usando data-command
document.querySelectorAll('button[data-command]').forEach(button => {
    button.addEventListener('click', async (e) => {
        const command = e.target.getAttribute('data-command');
        const payload = { command };

        if (command === 'change_recognition') {
            payload.status = document.getElementById('recognitionButton').innerText.includes('Parar') ? 'stop' : 'start';
        } else if (command === 'play_text') {
            payload.text = document.getElementById('text').value;
        } else if (command === 'save_text') {
            const text = document.getElementById('text').value;
            if (text) {
                addFrase(text);
                document.getElementById('text').value = ''; // Limpa o input após adicionar
            }
            return; // Não é necessário enviar uma mensagem ao BroadcastChannel para este comando
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

// Função para adicionar uma frase ao banco de frases
const addFrase = (frase) => {
    frases.push(frase);
    renderFraseList();
};

// Função para remover uma frase do banco de frases
const removeFrase = (index) => {
    frases.splice(index, 1);
    renderFraseList();
};

// Função para renderizar o banco de frases
const renderFraseList = () => {
    const fraseList = document.getElementById('fraseList');
    fraseList.innerHTML = ''; // Limpa a lista antes de renderizar novamente

    frases.forEach((frase, index) => {
        const fraseElement = document.createElement('div');
        fraseElement.className = 'frase-item';

        const fraseText = document.createElement('span');
        fraseText.textContent = `${frase.substring(0, 140)}...`; // Mostra o começo da frase
        fraseElement.appendChild(fraseText);

        const playButton = document.createElement('button');
        playButton.textContent = 'Play';
        playButton.setAttribute('data-command', 'play_text');
        playButton.onclick = async () => {
            await bc.postMessage({ command: 'play_text', text: frase });
        };
        fraseElement.appendChild(playButton);

        const removeButton = document.createElement('button');
        removeButton.textContent = '-';
        removeButton.onclick = () => removeFrase(index);
        fraseElement.appendChild(removeButton);

        fraseList.appendChild(fraseElement);
    });
};

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

// Função para buscar vozes da Eleven Labs e popular o select
const loadVoices = async () => {
    try {
        const response = await fetch('/dashboard/voices');
        if (!response.ok) {
            throw new Error('Erro ao buscar vozes da API.');
        }
        const data = await response.json();
        console.log(data);
        const voiceSelect = document.getElementById('voiceSelect');

        voiceSelect.innerHTML = ''; 

        data.voices.forEach(voice => {
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

        if (message.role === 'user') {
            messageElement.classList.add('user-message');
        } else {
            messageElement.classList.add('assistant-message');
        }

        chatLogElement.appendChild(messageElement);
    });
};

// Função para atualizar o texto transcrito em tempo real
const updateTranscript = (transcript) => {
    const transcriptBox = document.getElementById('transcriptBox');
    transcriptBox.textContent = transcript;
};
