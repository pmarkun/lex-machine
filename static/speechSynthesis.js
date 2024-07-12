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
        this.currentPrompt = 'default';
        this.customPrompt = '';


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
                
                
            }).catch(function(err) {
                console.error('O seguinte erro ocorreu: ' + err);
            });
        } else {
            console.error('getUserMedia não é suportado no seu navegador!');
        }
    }

    this.enableMic();
    }

}
