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

    // bc.onmessage = async (event) => {
    //     console.log('BRODCAST SR', event.data.command, event.data);
    //     switch(event.data.command) {
    //         case 'get_status':
    //             // TODO: send VOICEID, continuousConversation e recognizing
    //             break;
    //         case 'context_reset':
    //             break;
    //         case 'change_prompt':
    //             break;
    //         case 'change_voice':
    //             break;
    
    //         case 'change_continuous':
    //             continuousConversation = event.data.continuous;
    //             break;
        
    //         case 'abort_audio':
    //             window.lex.abortAudio = true;
    //             break;
    
    //         case 'change_recognition':
    //             switch(event.data.status) {
    //                 case 'stop':
    //                     recognition.stop();
    //                     document.body.classList.remove('rec');
    //                     break;
    //                 case 'start':
    //                     recognition.start();
    //                     document.body.classList.add('rec');
    //                     break;
    //             }
    //             break;
            
    //         case 'recognition_status':
    //             console.log('CHANGING RECOGNITION STATUS...')
    //             // switch(event.data.status) {
    //             //     case 'active':
    //             //         // recognition.start();
    //             //         break;
    //             //     case 'disabled':
    //             //         if (continuousConversation) {
    //             //             recognition.start();
    //             //         }
    //             //         break;
    //             //     default:
    //             //         console.log(event.data);
    //             // }
    //             break;
    
    //         case 'audio_status':
    //             switch(event.data.status) {
    //                 case 'play':
    //                     recognition.stop();
    //                     break;
    //                 case 'stop':
    //                     if (continuousConversation && !recognizing) {
    //                         recognition.start();
    //                     }
    //                     break;
    //             }
    //             break;
    //         case 'play_audio':
    //             // url
    //             break;
    //         case 'play_text':
    //             break;
    //         case 'play_audio':
    //             // url
    //             break;
    //         case 'page_refresh':
    //             window.location.reload();
    //             break;
    //         case 'audiofinished':
    //             // TODO: verificar se vai reiniciar reconhecimento
    //             recognition.start();
    //             break;
    //     }
    // };
    
    return recognition;
}


async function handleSpeechsStart(e) {
    document.body.classList.add('rec');
    console.log('handleSpeechsStart', e);
    recognizing = true;
    window.lex.isListening = true;
}
async function handleSpeechsEnd(e) {
    document.body.classList.remove('rec');
    console.log('handleSpeechsEnd', e);
    recognizing = false;
    window.lex.isListening = false;
}

async function handleRecognitionError() {
    recognizing = false;
    window.lex.isListening = false;

    // await bc.postMessage({
    //     command: 'recognition_status',
    //     status: 'disabled'
    // });
}
async function handleRecognitionStart() {
    recognizing = true;
    window.lex.isListening = true;
    recordButton.textContent = 'Stop Monitoring';
    console.log('Recognition started');

    // await bc.postMessage({
    //     command: 'recognition_status',
    //     status: 'active'
    // });
}

async function handleRecognitionEnd() {
    recognizing = false;
    window.lex.isListening = false;
    recordButton.textContent = 'Start Monitoring';
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


    // event.results[event.results.length - 1][0].transcript);
    // const transcript = event.results[event.results.length - 1][0].transcript;
    // console.log(`Transcription: ${transcript}`);

    // xxx

    silenceTimeout = setTimeout(() => {
        console.log('Recognition stopped');
        recognition.stop(); // Stop recognition after silence
        console.log(`Acionando LLM... com prompt ${window.lex.currentPrompt}.`)
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
