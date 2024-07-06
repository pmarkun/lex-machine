import { ELEVENLABS_VOICE_ID, ELEVENLABS_API_KEY, VOICE_ENGINE } from './config.js';

let VOICE_ID = ELEVENLABS_VOICE_ID;
let color = 'blue';



const bc = new BroadcastChannel("activity");
bc.onmessage = async (event) => {
    console.log('BRODCAST', event);
    switch(event.data.command) {
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
        case 'recognition_status':
            color = event.data.status === 'active' ? 'red' : 'lime'
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

export function fetchLocalSynthesisAudio(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    const audioContext = window.lex.audioContext;
    const analyser = createFakeAnalyser(audioContext);;
    const canvas = window.lex.canvas;
    const canvasCtx = window.lex.canvasCtx;

    setupOscilloscope(analyser, canvas, canvasCtx);

    // Inicia a síntese de fala
    utterance.onstart = async () => {
        console.log("Starting TTS with Web Speech Synthesis API");
        analyser.setSpeakingState = true;
        await bc.postMessage({
            command: 'audio_status',
            status: 'play'
        });
    };

    utterance.onend = async () => {
        console.log('Synthesis finished');
        analyser.setSpeakingState = false;
        await bc.postMessage({
            command: 'audio_status',
            status: 'stop'
        });

    };

    utterance.onerror = (error) => {
        console.error(`SpeechSynthesis Error: ${error}`);
        analyser.setSpeakingState = false;

    };

  
    synth.speak(utterance);
}

export function fetchElevenLabsAudio(text) {
    const voiceId = VOICE_ID;
    const model = 'eleven_multilingual_v2';
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
    const socket = new WebSocket(wsUrl);

    let audioQueue = window.lex.audioQueue;
    const audioContext = window.lex.audioContext;
    const analyser = window.lex.analyser;
    const canvas = window.lex.canvas;
    const canvasCtx = window.lex.canvasCtx;
    
    setupOscilloscope(analyser, canvas, canvasCtx);
    
    socket.onopen = () => {
        sendInitialMessages(socket);
        sendTextMessage(socket, text);
        sendEndMessage(socket);
    };
    socket.onmessage = (event) => handleSocketMessage(event, audioQueue, audioContext, analyser);
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

function sendTextMessage(socket, text) {
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

function handleSocketMessage(event, audioQueue, audioContext, analyser) {
    const response = JSON.parse(event.data);

    if (response.audio) {
        const audioChunk = Uint8Array.from(atob(response.audio), c => c.charCodeAt(0)).buffer;
        audioQueue.push(audioChunk);
        if (audioQueue.length === 1) {
            playAudioQueue(audioQueue, audioContext, analyser);
        }
    }

    if (response.isFinal) {
        event.target.close();
    }
}

function handleSocketClose(event) {
    if (event.wasClean) {
        console.info(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
    } else {
        console.warn('Connection died');
    }
}

async function playAudioQueue(audioQueue, audioContext, analyser) {
    if (audioQueue.length > 0) {
        await bc.postMessage({
            command: 'audio_status',
            status: 'play'
        });
        const audioChunk = audioQueue[0];
        await audioContext.decodeAudioData(audioChunk, decodedBuffer => {
            const source = audioContext.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            source.start();

            source.onended = async () => {
                audioQueue.shift();
                await playAudioQueue(audioQueue, audioContext, analyser);
            };
        });
    } else {
        console.log('FIM AUDIO');
        // recognition.start();
        await bc.postMessage({
            command: 'audio_status',
            status: 'stop'
        });
        // bc.postMessage({ 
        //     command: 'audiofinished'
        // })

    }
}

function createFakeAnalyser() {
    let phase = 0;
    let speaking = false;

    return {
        fftSize: 2048,
        getByteTimeDomainData: function (array) {
            if (speaking) {
                const frequency = 0.05; // Controla a velocidade da onda
                const amplitude = 128;  // Controla a amplitude da onda
                for (let i = 0; i < array.length; i++) {
                    array[i] = Math.sin((i + phase) * frequency) * amplitude + amplitude;
                }
                phase += 1; // Incrementa a fase para criar movimento
            } else {
                for (let i = 0; i < array.length; i++) {
                    array[i] = 128; // Valor médio para uma linha reta
                }
            }
        },
        connect: function() {},
        disconnect: function() {},
        setSpeakingState: function(state) {
            speaking = state;
        }
    };
}


function setupOscilloscope(analyser, canvas, canvasCtx) {
    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = 'black';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = color;

        canvasCtx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }

    draw();
}
