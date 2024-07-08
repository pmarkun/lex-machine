import { setupOscilloscope } from "./sketch.js";


export class Lex {

    constructor() {

        this.audioQueue = [];
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.canvas = document.getElementById('oscilloscope');
        this.canvasCtx = this.canvas.getContext('2d');
        this.color = 'black';
        console.log('Lex instance has been created');

        this.isPlaying = false;



        // Verifica se o navegador suporta a API getUserMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

            // Solicita permissão para acessar o microfone
            navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                // Cria um AudioContext
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaStreamSource(stream);

                // Configura o AnalyserNode (por exemplo, tamanho da FFT, suavização, etc.)
                const { canvas, canvasCtx, isPlaying, color } = window.lex;
                 // Inicia a visualização
        
                setupOscilloscope(audioCtx, source);
                
                
            }).catch(function(err) {
                console.error('O seguinte erro ocorreu: ' + err);
            });
        } else {
            console.error('getUserMedia não é suportado no seu navegador!');
        }
        




    }

}
