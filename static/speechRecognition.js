import { fetchResponse } from './chatgpt.js';
import { SILENCE_THRESHOLD, LANG } from './config.js';
import { getQueryParam } from './speechSynthesis.js';

let recognition;
let recognizing = false;
let silenceTimeout;
let recordingStoppedByUser = false;
let transcript = [];
const bc = new BroadcastChannel("activity");


export function setupRecognition() {

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANG;

    const grammar = '#JSGF V1.0; grammar lex; public <lex> = (Lex | lex | Lais | Alex) { Lex };';
    const speechRecognitionList = new webkitSpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;

    recognition.onstart = handleRecognitionStart;
    recognition.onend = handleRecognitionEnd;
    recognition.onresult = handleRecognitionResult;
    recognition.onerror = handleRecognitionError;

    recognition.onspeechstart = handleSpeechsStart;
    recognition.onspeechend = handleSpeechsEnd;

    if (getQueryParam("auto")) {
        recognition.start();
        window.lex.continuousConversation = true;
        // continuousConversation = true;
    }

    return recognition;
}


async function handleSpeechsStart(e) {
    document.body.classList.add('rec');
    console.log('handleSpeechsStart', e);
    recognizing = true;
    window.lex.isListening = true;
    await bc.postMessage({
        command: 'status_recognition',
        status: 'Ouvindo'
    });
}
async function handleSpeechsEnd(e) {
    console.log('handleSpeechsEnd', e);
    recognizing = false;
    window.lex.isListening = false;
    await bc.postMessage({
        command: 'status_recognition',
        status: 'Parado'
    });

}

async function handleRecognitionError() {
    recognizing = false;
    window.lex.isListening = false;

    await bc.postMessage({
        command: 'status_recognition',
        status: 'Parado'
    });
}
async function handleRecognitionStart() {
    document.body.classList.add('rec');
    recognizing = true;
    window.lex.isListening = true;
    console.log('Recognition started');
    await bc.postMessage({
        command: 'status_recognition',
        status: 'Ouvindo'
    });
}

async function handleRecognitionEnd() {
    recognizing = false;
    window.lex.isListening = false;
    console.log('* * * * Recognition ENDED!!! * * * *');

    // if (!recordingStoppedByUser) {
    //     recognition.start(); // Restart recognition if stopped by system
    // }
}

async function handleRecognitionResult(event) {
    clearTimeout(silenceTimeout);

    let results = Object.keys(event.results).map(i => event.results[i]);
    const partialTranscript = results.map(t => t[0].transcript).join(' ');
    transcript = results.filter(d => d.isFinal).map(t => t[0].transcript).join(' ');

    await (new BroadcastChannel("activity")).postMessage({
        command: 'transcript',
        transcript: partialTranscript
    });

    silenceTimeout = setTimeout(() => {
        console.log('Recognition stopped');
        recognition.stop(); // Stop recognition after silence
        console.log(`Acionando LLM... com prompt ${window.lex.currentPrompt}.`)
        fetchResponse(transcript);
        transcript = [];
    }, SILENCE_THRESHOLD);
}




