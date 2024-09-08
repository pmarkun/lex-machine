import { setupVisual } from "./sketch.js";
import { VOICE_ENGINE } from "./config.js";

export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

export class Lex {

    constructor() {

        this.audioQueue = [];
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.canvas = document.getElementById('oscilloscope');
        this.canvasCtx = this.canvas.getContext('2d');
        this.color = 'black';
        this.display = document.getElementById('text-display');
        this.engine = VOICE_ENGINE;
        this.auto = false;
        this.tool_choice = "none";
        
        if (getQueryParam("engine")) {
            this.engine = getQueryParam("engine");
        }
        else {
            this.engine = VOICE_ENGINE;
        }

        console.log('Lex instance has been created');

        this.isPlaying = false;
        this.isListening = false;
        this.isMicActive = false;
        this.abortAudio = false;
        this.continuousConversation = false;

        this.currentPrompt = 'default';
        this.customPrompt = '';




        // TODO: setInterval enviando status acima para navegador

        // this.timerStatus = setInterval(async ()=>{
        //     await (new BroadcastChannel("activity")).postMessage({
        //         command: 'status',
        //         isPlaying: this.isPlaying,
        //         isListening: this.isListening,
        //         isMicActive: this.isMicActive,
        //         abortAudio: this.abortAudio,
        //         continuousConversation: this.continuousConversation
        //     });
        // }, 500);


        this.enableMic = function() {
            // Verifica se o navegador suporta a API getUserMedia
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

                // Solicita permissão para acessar o microfone
                navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(stream) {

                    // Cria um AudioContext
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioCtx.createMediaStreamSource(stream);

                    // Inicia a visualização
                    setupVisual(audioCtx, source);
                    // this.isMicActive = true;

                    // console.log('AUDIO TRACKS', stream.getAudioTracks())
                    // const audioTrack = stream.getAudioTracks()[0];

                    // const bc = new BroadcastChannel("activity")
                    // bc.onmessage = async (event) => {
                    //     // console.log('BRODCAST', event.data.command, event.data);
                    //     switch(event.data.command) {
                    //         case 'toggleMute':
                    //             console.log('TOGGLE MUTE', event.data.enabled);
                    //             audioTrack.enabled = event.data.enabled;
                    //             break;
                    //     }
                    // }
                    // await (new BroadcastChannel("activity")).postMessage({
                    //     command: 'toggle_mic',
                    //     status: recognitionStatus === 'active' ? 'stop' : 'start'
                    // });
            
                }).catch(function(err) {
                    console.error('O seguinte erro ocorreu: ' + err);
                    this.isMicActive = false;
                });
            } else {
                console.error('getUserMedia não é suportado no seu navegador!');
                this.isMicActive = false;
            }
        }


        const bc = new BroadcastChannel("activity");
        bc.onmessage = async (event) => {
            console.log('BROAD', event.data);
            switch(event.data.command) {
                case 'transcript':
                    // console.log('transcript data', event.data.transcript);
                    break;
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
                    this.continuousConversation = event.data.continuous;
                    break;
            
                case 'abort_audio':
                    window.lex.abortAudio = true;
                    this.audioQueue = [];
                    break;
        
                case 'change_recognition':
                    console.log('FORCED change_recognition', event.data.status)
                    switch(event.data.status) {
                        case 'stop':
                            window.recognition.stop();
                            await bc.postMessage({
                                command: 'status_recognition',
                                status: 'Parado'
                            });
                            document.body.classList.remove('rec');
                            break;
                        case 'start':
                            window.recognition.start();
                            break;
                    }
                    break;
                
                case 'audio_status':
                    switch(event.data.status) {
                        case 'play':
                            recognition.stop();
                            break;

                        case 'stop':
                            console.log('\n\n\n')
                            console.log('AUDIO_STATUS STOP: window.lex.continuousConversation', window.lex.continuousConversation);
                            console.log('\n\n\n')
                            if (window.lex.continuousConversation) {
                                console.log('CONTINUOUS CONVERSATION LEX...');
                                // TODO: verificar aqui se e o melhor lugar para retomar reconhecimento
                                // await bc.postMessage({
                                //     command: 'change_recognition',
                                //     status: 'start'
                                // });

                                if (this.continuousConversation && !this.isListening) {
                                    window.recognition.start();
                                }
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
            }
        };
        


        this.enableMic();

    }


    

}
