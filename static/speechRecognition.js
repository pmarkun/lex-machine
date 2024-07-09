import { fetchResponse } from './chatgpt.js';
import { setupVisual } from './sketch.js';
import { SILENCE_THRESHOLD, LANG } from './config.js';


let continuousConversation = false;

const bc = new BroadcastChannel("activity");
bc.onmessage = async (event) => {
    console.log('BRODCAST SR', event.data.command);
    switch(event.data.command) {
        case 'get_status':
            // TODO: send VOICEID, continuousConversation e recognizing
            break;
        case 'context_reset':
            break;
        case 'change_prompt':
            break;
        case 'change_voice':
            break;

        case 'change_continuous':
            continuousConversation = event.data.continuous;
            break;
    
        case 'change_recognition':
            switch(event.data.status) {
                case 'stop':
                    recognition.stop();
                    break;
                case 'start':
                    recognition.start();
                    break;
            }
        
        case 'recognition_status':
            switch(event.data.status) {
                case 'stop':
                    // recognition.stop();
                    break;
                case 'start':
                    // recognition.start();
                    break;
            }
            break;

        case 'audio_status':
            switch(event.data.status) {
                case 'play':
                    recognition.stop();
                    break;
                case 'stop':
                    if (continuousConversation && !recognizing) {
                        recognition.start();
                    }
                    break;
            }
            break;
        case 'play_audio':
            // url
            break;
        case 'play_text':
            break;
        case 'play_audio':
            // url
            break;
        case 'page_refresh':
            window.location.reload();
            break;
        case 'audiofinished':
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
    recognition.onerror = handleRecognitionError;

}


async function handleRecognitionError() {
    recognizing = false;
    window.lex.isListening = false;
    await bc.postMessage({
        command: 'recognition_status',
        status: 'disabled'
    });
}
async function handleRecognitionStart() {
    recognizing = true;
    window.lex.isListening = true;
    recordButton.textContent = 'Stop Monitoring';
    console.log('Recognition started');
    await bc.postMessage({
        command: 'recognition_status',
        status: 'active'
    });
}

async function handleRecognitionEnd() {
    recognizing = false;
    window.lex.isListening = false;
    recordButton.textContent = 'Start Monitoring';
    console.log('Recognition ended');
    await bc.postMessage({
        command: 'recognition_status',
        status: 'disabled'
    });
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
        fetchResponse(transcript);
        transcript = [];
    }, SILENCE_THRESHOLD);
}






const recordButton = document.getElementById('recordButton');

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
