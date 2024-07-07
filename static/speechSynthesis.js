

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
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();

                // Cria um MediaStreamSource a partir do fluxo de áudio do microfone
                const source = audioContext.createMediaStreamSource(stream);

                // Aqui você pode criar processadores de áudio conforme necessário
                // Por exemplo, um AnalyserNode para visualizar os dados de áudio
                const analyser = audioContext.createAnalyser();
                source.connect(analyser);
                

                // Configura o AnalyserNode (por exemplo, tamanho da FFT, suavização, etc.)
                analyser.fftSize = 2048;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                // Função para desenhar/visualizar os dados de áudio
                function draw() {
                    requestAnimationFrame(draw);
                    const { canvas, canvasCtx, isPlaying, color } = window.lex;
                    if (!isPlaying) {
                        // Copia os dados de frequência do AnalyserNode para o dataArray
                        analyser.getByteTimeDomainData(dataArray);

                        // Aqui você pode adicionar o código para visualizar os dados
                        // Por exemplo, desenhar em um canvas
                        // console.log(dataArray); // Apenas para exemplo

                        canvasCtx.fillStyle = "rgba(0, 0, 0, 0.2)";
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

                }

                draw(); // Inicia a visualização

            }).catch(function(err) {
                console.error('O seguinte erro ocorreu: ' + err);
            });
        } else {
            console.error('getUserMedia não é suportado no seu navegador!');
        }




    }

}
