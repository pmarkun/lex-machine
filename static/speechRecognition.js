import { fetchOpenAIResponse } from './chatgpt.js';
import { SILENCE_THRESHOLD, LANG } from './config.js';
import { fetchElevenLabsAudio } from './elevenLabs.js';



const bc = new BroadcastChannel("activity");
bc.onmessage = async (event) => {
    console.log('BRODCAST', event);
    switch(event.data.command) {
        case 'context_reset':
            break;
        case 'inject_effect':
            break;
        case 'change_prompt':
            break;
        case 'change_voice':
            break;
        case 'play_audio':
            // url
            break;
        case 'page_refresh':
            break;
        case 'elevenlabs_audiofinished':
            // TODO: verificar se vai reiniciar reconhecimento
            recognition.start();
            break;
    }
};


let recognition;
let recognizing = false;
let silenceTimeout;
let recordingStoppedByUser = false;
let transcript = [];

export function setupRecognition() {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANG;

    recognition.onstart = handleRecognitionStart;
    recognition.onend = handleRecognitionEnd;
    recognition.onresult = handleRecognitionResult;
}

function handleRecognitionStart() {
    recognizing = true;
    recordButton.textContent = 'Stop Monitoring';
    console.log('Recognition started');
}

function handleRecognitionEnd() {
    recognizing = false;
    recordButton.textContent = 'Start Monitoring';
    console.log('Recognition ended');
    // if (!recordingStoppedByUser) {
    //     recognition.start(); // Restart recognition if stopped by system
    // }
}

function handleRecognitionResult(event) {
    clearTimeout(silenceTimeout);

    let results = Object.keys(event.results).map(i => event.results[i]);
    transcript = results.filter(d => d.isFinal).map(t => t[0].transcript).join(' ');
    console.log('ULTIMO TRANSCRIPT', transcript);
    // event.results[event.results.length - 1][0].transcript);
    // const transcript = event.results[event.results.length - 1][0].transcript;
    // console.log(`Transcription: ${transcript}`);

    silenceTimeout = setTimeout(() => {
        console.log('Recognition stopped');
        recognition.stop(); // Stop recognition after silence
        console.log('Acionando LLM...')
        fetchOpenAIResponse(transcript);
        transcript = [];
    }, SILENCE_THRESHOLD);
}






const recordButton = document.getElementById('recordButton');
const sendTextButton = document.getElementById('sendTextButton');

sendTextButton.addEventListener('click', async () => {
    console.log('sendTextButton');
    await (new BroadcastChannel("activity")).postMessage({
        command: 'play_text',
        text: document.getElementById('text').value
    });
});
recordButton.addEventListener('click', () => {
    if (recognizing) {
        recordingStoppedByUser = true;
        recognition.stop();
        console.log('Recognition stopped by user');
        return;
    }
    recordingStoppedByUser = false;
    recognition.start();
    console.log('Recognition started by user');
});
