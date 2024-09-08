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

                    console.log('AUDIO TRACKS', stream.getAudioTracks())
                    const audioTrack = stream.getAudioTracks()[0];

                    // function toggleMute() {
                    //     // console.log('toggleMute', !audioTrack.enabled)
                    //     audioTrack.enabled = !audioTrack.enabled;
                    //     console.log(audioTrack);
                    //     // this.isMuted = !audioTrack.enabled;
                    // }
                    // document.addEventListener('keydown', function(e) {
                    //     // e.preventDefault();
                    //     console.log('keydown', e.key)
                    //     switch(e.key) {
                    //         case 'ArrowRight':
                    //             toggleMute();
                    //             break;
                    //         case 'ArrowLeft':
                    //             break;
                    //     }
                    // });

                    const bc = new BroadcastChannel("activity")
                    bc.onmessage = async (event) => {
                        console.log('BRODCAST', event.data.command, event.data);
                        switch(event.data.command) {
                            case 'toggleMute':
                                console.log('TOGGLE MUTE', event.data.enabled);
                                audioTrack.enabled = event.data.enabled;
                                break;
                        }
                    }            
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
            // console.log('BRODCAST SR', event.data.command, event.data);
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
                    // window.lex.abortAudio = true;
                    this.audioQueue = [];
                    break;
        
                case 'change_recognition':
                    switch(event.data.status) {
                        case 'stop':
                            window.recognition.stop();
                            break;
                        case 'start':
                            window.recognition.start();
                            // document.body.classList.add('rec');
                            break;
                    }
                    break;
                
                case 'recognition_status':
                    console.log('CHANGING RECOGNITION STATUS...');
                    // switch(event.data.status) {
                    //     case 'active':
                    //         // recognition.start();
                    //         break;
                    //     case 'disabled':
                    //         if (continuousConversation) {
                    //             recognition.start();
                    //         }
                    //         break;
                    //     default:
                    //         console.log(event.data);
                    // }
                    break;
        
                case 'audio_status':
                    switch(event.data.status) {
                        case 'play':
                            recognition.stop();
                            break;
                        case 'stop':
                            console.log('\n\n\n')
                            console.log('window.lex.continuousConversation', window.lex.continuousConversation);
                            console.log('\n\n\n')
                            if (window.lex.continuousConversation) {
                                console.log('CONTINUOUS CONVERSATION LEX...');
                                // TODO: verificar aqui se e o melhor lugar para retomar reconhecimento
                                // await bc.postMessage({
                                //     command: 'change_recognition',
                                //     status: 'start'
                                // });

                                if (this.continuousConversation && !this.isListening) {
                                    recognition.start();
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
                case 'audiofinished':
                    // TODO: verificar se vai reiniciar reconhecimento
                    recognition.start();
                    break;
            }
        };
        


        this.enableMic();

    }


    

}
