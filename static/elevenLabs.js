import { ELEVENLABS_VOICE_ID, ELEVENLABS_API_KEY } from './config.js';

let VOICE_ID = ELEVENLABS_VOICE_ID;

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
            await fetchElevenLabsAudio(event.data.text);
            break;
        case 'page_refresh':
            break;
        case 'audiofinished':
            break;
    }
};


export function fetchElevenLabsAudio(text) {
    const voiceId = VOICE_ID;
    const model = 'eleven_multilingual_v2';
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        sendInitialMessages(socket);
        sendTextMessage(socket, text);
        sendEndMessage(socket);
    };
    socket.onmessage = (event) => handleSocketMessage(event, audioQueue, audioContext, analyser);
    socket.onerror = (error) => console.error(`WebSocket Error: ${error}`);
    socket.onclose = (event) => handleSocketClose(event);


    let audioQueue = [];
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const canvas = document.getElementById('oscilloscope');
    const canvasCtx = canvas.getContext('2d');

    setupOscilloscope(analyser, canvas, canvasCtx);
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
        canvasCtx.strokeStyle = 'lime';

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
