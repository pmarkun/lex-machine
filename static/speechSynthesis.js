import { setupVisual } from "./sketch.js";


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
        console.log('Lex instance has been created');

        this.isPlaying = false;
        this.isListening = false;
        this.isMicActive = false;

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
                    this.isMicActive = true;
                    
                }).catch(function(err) {
                    console.error('O seguinte erro ocorreu: ' + err);
                    this.isMicActive = false;
                });
            } else {
                console.error('getUserMedia não é suportado no seu navegador!');
                this.isMicActive = false;
            }
    }
    this.enableMic();



    }

}
