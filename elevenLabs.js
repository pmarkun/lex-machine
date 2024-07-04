import { ELEVENLABS_VOICE_ID, ELEVENLABS_API_KEY } from './config.js';

export function fetchElevenLabsAudio(text) {
    const voiceId = ELEVENLABS_VOICE_ID;
    const model = 'eleven_multilingual_v2';
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
    console.log("aa")
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("abrindo soquete")
        sendInitialMessages(socket);
        sendTextMessage(socket, text);
        sendEndMessage(socket);
    };

    let audioQueue = [];
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const canvas = document.getElementById('oscilloscope');
    const canvasCtx = canvas.getContext('2d');

    setupOscilloscope(analyser, canvas, canvasCtx);

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

function playAudioQueue(audioQueue, audioContext, analyser) {
    if (audioQueue.length > 0) {
        const audioChunk = audioQueue[0];
        audioContext.decodeAudioData(audioChunk, decodedBuffer => {
            const source = audioContext.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            source.start();

            source.onended = () => {
                audioQueue.shift();
                playAudioQueue(audioQueue, audioContext, analyser);
            };
        });
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
