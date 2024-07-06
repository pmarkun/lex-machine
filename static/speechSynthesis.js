export class Lex {
    constructor() {
      this.audioQueue = [];
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.canvas = document.getElementById('oscilloscope');
      this.canvasCtx = this.canvas.getContext('2d');
      console.log('Lex instance has been created');

    }
  }