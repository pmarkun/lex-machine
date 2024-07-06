import { fetchResponse } from './chatgpt.js';
import { SILENCE_THRESHOLD, LANG } from './config.js';

const recordButton = document.getElementById('recordButton');
let recognition;
let recognizing = false;
let silenceTimeout;
let recordingStoppedByUser = false;

export function setupRecognition() {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
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
    if (!recordingStoppedByUser) {
        recognition.start(); // Restart recognition if stopped by system
    }
}

function handleRecognitionResult(event) {
    clearTimeout(silenceTimeout);
    const transcript = event.results[event.results.length - 1][0].transcript;
    console.log(`Transcription: ${transcript}`);
    fetchResponse(transcript);

    silenceTimeout = setTimeout(() => {
        recognition.stop(); // Stop recognition after silence
        console.log('Recognition stopped due to silence');
    }, SILENCE_THRESHOLD);
}

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
