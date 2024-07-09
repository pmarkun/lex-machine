import { setupVisual } from './sketch.js';
import { ELEVENLABS_VOICE_ID, ELEVENLABS_API_KEY, VOICE_ENGINE } from './config.js';

let VOICE_ID = ELEVENLABS_VOICE_ID;




const bc = new BroadcastChannel("activity");
bc.onmessage = async (event) => {
    console.log('BRODCAST EL', event.data.command);
    switch(event.data.command) {
        case 'get_status':
            // TODO: send VOICEID, 
            break;
        case 'context_reset':
            break;
        case 'change_prompt':
            break;
        case 'change_voice':
            VOICE_ID = event.data.voiceId;
            break;
        case 'play_audio':
            // url
            break;
        case 'play_text':
            await playText(event.data.text);
            break;
        case 'page_refresh':
            break;
        case 'audiofinished':
            break;
        case 'audio_status':
            console.log('AUDIO STATUS', event.data.status);
            break;
    
        case 'recognition_status':
            window.lex.color = event.data.status === 'active' ? 'red' : 'black'
            break;
        }
};


export async function playText(text) {
    switch(VOICE_ENGINE) {
        case 'local':
            await fetchLocalSynthesisAudio(text)
            break;
        case 'elevenlabs':
            await fetchElevenLabsAudio(text)
            break;
        default:
            console.log('erro!')
    }
}

function createWhiteNoise(audioCtx) {
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    return noiseBuffer;
}

function generateAlignment(text) {
    const chars = Array.from(text);
    const charStartTimesMs = [];
    const charDurationsMs = [];
    const duration = 100;  // Tempo fixo para cada caractere em milissegundos

    let currentTimeMs = 0;

    for (let i = 0; i < chars.length; i++) {
        charStartTimesMs.push(currentTimeMs);
        charDurationsMs.push(duration);
        currentTimeMs += duration;
    }

    return {
        chars,
        charStartTimesMs,
        charDurationsMs
    };
}


export async function fetchLocalSynthesisAudio(text) {
    const synth = window.speechSynthesis;
    const audioCtx = window.lex.audioContext;
    
    const source = audioCtx.createBufferSource();
    source.buffer = createWhiteNoise(audioCtx);
    let oscilloscope = setupVisual(audioCtx, source);
    
    // Dividir o texto em frases
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g).map(sentence => sentence.trim());
    let currentSentenceIndex = 0;

    const speakNextSentence = () => {
        if (currentSentenceIndex < sentences.length) {
            const utterance = new SpeechSynthesisUtterance(sentences[currentSentenceIndex]);

            utterance.onstart = async () => {
                console.log("Starting TTS with Web Speech Synthesis API");
                window.lex.isPlaying = true;
                let source = audioCtx.createBufferSource();
                source.buffer = createWhiteNoise(audioCtx);
                oscilloscope.connectSource(source, false) 
                source.start()

                await bc.postMessage({
                    command: 'audio_status',
                    status: 'play'
                });
            };

            utterance.onend = async () => {
                console.log('Synthesis finished');
                window.lex.isPlaying = false;
                await bc.postMessage({
                    command: 'audio_status',
                    status: 'stop'
                });

                // Fala a próxima frase
                currentSentenceIndex++;
                speakNextSentence();
            };

            utterance.onerror = (error) => {
                console.error(`SpeechSynthesis Error: ${error}`);
            };

            displayTextWhilePlaying(generateAlignment(sentences[currentSentenceIndex]));
            synth.speak(utterance);
        }
        else {
            setTimeout(() => {
                window.lex.display.innerHTML = '';
            },200)
        }
    };

    // Começa a falar a primeira frase
    source.start()
    speakNextSentence();
}


export function fetchElevenLabsAudio(text) {
    const voiceId = VOICE_ID;
    const model = 'eleven_multilingual_v2';
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}&optimize_streaming_latency
=3`;
    const socket = new WebSocket(wsUrl);

    let audioQueue = window.lex.audioQueue;
    const audioCtx = window.lex.audioContext;
    const source = audioCtx.createBufferSource();


    let oscilloscope = setupVisual(audioCtx, source);
    
    socket.onopen = () => {
        sendInitialMessages(socket);
        try {
            const sentences = text.match(/[^\.!\?]+[\.!\?]+/g).map(sentence => sentence);
            for (let sentence of sentences) {
                sendTextMessage(socket, sentence);
            }
            sendEndMessage(socket);
        } catch (error) {
            sendTextMessage(socket, text);
            sendEndMessage(socket);
        }
    };
    socket.onmessage = (event) => handleSocketMessage(event, audioQueue, audioCtx, oscilloscope);
    socket.onerror = (error) => console.error(`WebSocket Error: ${error}`);
    socket.onclose = (event) => handleSocketClose(event);
}

function sendInitialMessages(socket) {
    console.log("TTS with ElevenLabs");
    const bosMessage = {
        text: " ",
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
        },
        xi_api_key: ELEVENLABS_API_KEY
    };

    socket.send(JSON.stringify(bosMessage));
}

async function sendTextMessage(socket, text) {
    const textMessage = {
        text: text,
        try_trigger_generation: true,
    };
    socket.send(JSON.stringify(textMessage));
}

function sendEndMessage(socket) {
    console.log('END MESSAGE');
    const eosMessage = {
        text: ""
    };

    socket.send(JSON.stringify(eosMessage));
}

function handleSocketMessage(event, audioQueue, audioCtx, oscilloscope) {
    const response = JSON.parse(event.data);
    if (response.audio) {
        const audioChunk = Uint8Array.from(atob(response.audio), c => c.charCodeAt(0)).buffer;
        const textAlignment = response.alignment;
        audioQueue.push({"audio" : audioChunk, "alignment" : textAlignment});
        if (audioQueue.length === 1) {
            playAudioQueue(audioQueue, audioCtx, oscilloscope);
        }
    }

    if (response.isFinal) {
        //event.target.close();
    }
}

function handleSocketClose(event) {
    if (event.wasClean) {
        console.info(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
    } else {
        console.warn('Connection died');
    }
}

async function playAudioQueue(audioQueue, audioCtx, oscilloscope) {
    if (audioQueue.length > 0) {
        window.lex.isPlaying = true;
        await bc.postMessage({
            command: 'audio_status',
            status: 'play'
        });
        console.log(audioQueue);

        const audioChunk = audioQueue[0]["audio"];
        const textAlignment = audioQueue[0]["alignment"];
        await audioCtx.decodeAudioData(audioChunk, decodedBuffer => {
            let source = audioCtx.createBufferSource();
            source.buffer = decodedBuffer;
            source.start();
            oscilloscope.connectSource(source);
            
            if (textAlignment) {
                displayTextWhilePlaying(textAlignment);
            }

            

            source.onended = async () => {
                audioQueue.shift();
                await playAudioQueue(audioQueue, audioCtx, oscilloscope);
            };
        });
    } else {
        console.log('FIM AUDIO');
        // recognition.start();
        window.lex.isPlaying = false;
        window.lex.enableMic();
        setTimeout(() => {
            window.lex.display.innerHTML = '';
        },200)

        await bc.postMessage({
            command: 'audio_status',
            status: 'stop'
        });
    }
}

function displayTextWhilePlaying(alignment) {
    const displayDiv = window.lex.display;

    const { charStartTimesMs,  charDurationsMs, chars } = alignment;
    displayDiv.innerHTML = '';  // Clear previous text
    let startTime = performance.now();

    chars.forEach((char, index) => {
        setTimeout(() => {
            displayDiv.innerHTML += char;
        }, charStartTimesMs[index]/1.5);

        // Optionally clear the character after its duration
        setTimeout(() => {
            // Add any logic here to remove the character if needed
        }, charStartTimesMs[index] + charDurationsMs[index]);
    });
}