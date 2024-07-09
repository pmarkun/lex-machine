export function setupOscilloscope_linear(audioCtx, source) {
    //Configura canvas
    let canvas = document.getElementById("oscilloscope");
    const canvasCtx = canvas.getContext('2d');
    
    let smallerSide;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        smallerSide = Math.min(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', resize, false);
    resize();
    const analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    
    
    function connectSource(newSource) {
        if (source) {
            source.disconnect();
        }
        source = newSource;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }


    //Cria analisador(es)
    
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    
    
    //Visualização
    
    function draw() {
        requestAnimationFrame(draw);
    
        analyser.getByteTimeDomainData(dataArray); // antigo
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'lime'; // forçada cor aqui
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

    return {
        connectSource
    };
}

export function setupOscilloscope(audioCtx, source) {
     //Configura canvas
     let canvas = document.getElementById("oscilloscope");
     const canvasCtx = canvas.getContext('2d');
     
     let smallerSide;

     function resize() {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
         smallerSide = Math.min(window.innerWidth, window.innerHeight);
     }
 
    window.addEventListener('resize', resize, false);
    resize();
    const lowAnalyzer = audioCtx.createAnalyser();
    const highAnalyzer = audioCtx.createAnalyser();
    source.connect(lowAnalyzer);
    source.connect(highAnalyzer);
    
     
     function connectSource(newSource) {
         if (source) {
             source.disconnect();
         }
         source = newSource;
         source.connect(lowAnalyzer);
         source.connect(highAnalyzer);
         source.connect(audioCtx.destination);
     }

    lowAnalyzer.minDecibels = -80;
    lowAnalyzer.maxDecibels = -20;
    lowAnalyzer.fftSize = 32;
    lowAnalyzer.smoothingTimeConstant = 0.89;

    highAnalyzer.minDecibels = -80;
    highAnalyzer.maxDecibels = -20;
    highAnalyzer.fftSize = 32;
    highAnalyzer.smoothingTimeConstant = 0.87;

    const lowFrequencyData = new Uint8Array(lowAnalyzer.frequencyBinCount);
    const highFrequencyData = new Uint8Array(highAnalyzer.frequencyBinCount);

    const lowFilter = audioCtx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.setValueAtTime(200, 0);

    const highFilter = audioCtx.createBiquadFilter();
    highFilter.type = 'highpass';
    highFilter.frequency.setValueAtTime(200, 0);

    lowFilter.connect(lowAnalyzer);
    highFilter.connect(highAnalyzer);

    const MARGIN = 8;
    const rad15deg = Math.PI / 12;

 
    function draw() {
        let isPlaying = window.lex.isPlaying;
        requestAnimationFrame(draw);

        lowAnalyzer.getByteFrequencyData(lowFrequencyData);
        highAnalyzer.getByteFrequencyData(highFrequencyData);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 1.5;
        
        if (isPlaying) {
            canvasCtx.strokeStyle = 'cyan';
        }
        else {
            canvasCtx.strokeStyle = 'gray';
        }

        for (let i = 0; i < lowFrequencyData.length; i++) {
            if (lowFrequencyData[i] !== 0) {
                const R = (lowFrequencyData[i] * smallerSide) / 512;
                drawArcV1(R, 1, 5);
                drawArcV1(R, 7, 11);
                drawArcV1(R, 13, 17);
                drawArcV1(R, 19, 23);
            }
        }

        if (isPlaying) {
            canvasCtx.strokeStyle = 'lime';
        }
        else {
            canvasCtx.strokeStyle = 'dark gray';
        }

        for (let i = 0; i < highFrequencyData.length; i++) {
            if (highFrequencyData[i] !== 0) {
                const R = (highFrequencyData[i] * smallerSide) / 1024;
                drawArcV2(i, R, 1, 5);
                drawArcV2(i, R, 7, 11);
                drawArcV2(i, R, 13, 17);
                drawArcV2(i, R, 19, 23);
            }
        }
    }

    function drawArcV1(r, a, b) {
        const v = 0.75 - r / (smallerSide / 2 - MARGIN);
        const A = rad15deg * a + v;
        const B = rad15deg * b - v;
        if (B > A) {
            drawArc(r, A, B);
        }
    }

    function drawArcV2(i, r, a, b) {
        drawArc(r, rad15deg * (a + i), rad15deg * (b + i), true);
    }

    function drawArc(radius, startAngle, endAngle, spikes = false) {
        const X = window.innerWidth / 2;
        const Y = window.innerHeight / 2;
        const adjustedRadius = radius - MARGIN - (spikes ? 4 : 0);
        if (adjustedRadius > 0) {  // Verificação para garantir que o raio é positivo
            const startX = X + Math.cos(startAngle) * adjustedRadius;
            const startY = Y + Math.sin(startAngle) * adjustedRadius;
            canvasCtx.beginPath();
            canvasCtx.moveTo(startX, startY);
            canvasCtx.arc(X, Y, adjustedRadius, startAngle, endAngle);
            canvasCtx.stroke();
        }
    }

    draw();

    return {
        connectSource
    };
}


export function setupOscilloscope_balls(audioCtx, source) {
    // Configura canvas
    let canvas = document.getElementById("oscilloscope");
    const canvasCtx = canvas.getContext('2d');
    
    let spheres = [];
    let numSpheres = 50;
    let sensitivity = 10;
    let noiseThreshold = 3;
    let smallerSide;
    let baseSphereSize = 20; // Variável para o tamanho base das bolas

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        smallerSide = Math.min(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', resize, false);
    resize();
    const analyzer = audioCtx.createAnalyser();
    source.connect(analyzer);
    analyzer.fftSize = 2048;
    
    const frequencyData = new Uint8Array(analyzer.frequencyBinCount);

    class Sphere {
        constructor(x, y) {
            this.basePosition = { x, y };
            this.size = randomRange(10, baseSphereSize); // Uso da variável baseSphereSize
            this.color = 'rgba(0, 255, 0, 1)'; // Cor lime inicial
        }

        update(frequencyData, avgAmp) {
            let amp = avgAmp * sensitivity;
            this.size = map(amp, 0, 255, 10, baseSphereSize * 5); // Uso da variável baseSphereSize para o tamanho máximo

            let hue = map(amp, 0, 255, 75, 150); // Intervalo de cores em tons de lime (75 a 150 graus no círculo de cores HSL)
            this.color = `hsl(${hue}, 100%, 50%)`;

            // Move in a smaller orbital pattern
            let angle = performance.now() * 0.0003 + this.basePosition.x * 0.03;
            this.position = {
                x: this.basePosition.x + Math.cos(angle) * 50,
                y: this.basePosition.y + Math.sin(angle) * 50
            };
        }

        display() {
            canvasCtx.fillStyle = this.color;
            canvasCtx.beginPath();
            canvasCtx.arc(
                window.innerWidth / 2 + this.position.x,
                window.innerHeight / 2 + this.position.y,
                this.size,
                0,
                2 * Math.PI
            );
            canvasCtx.fill();
        }
    }

    for (let i = 0; i < numSpheres; i++) {
        spheres.push(new Sphere(randomRange(-100, 100), randomRange(-100, 100)));
    }

    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    function connectSource(newSource) {
        if (source) {
            source.disconnect();
        }
        source = newSource;
        source.connect(analyzer);
        source.connect(audioCtx.destination);
    }

    function map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    }

    function draw() {
        requestAnimationFrame(draw);

        analyzer.getByteFrequencyData(frequencyData);

        let avgAmp = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
        if (avgAmp < noiseThreshold) {
            avgAmp = noiseThreshold;
        }

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        for (let sphere of spheres) {
            sphere.update(frequencyData, avgAmp);
            sphere.display();
        }
    }

    draw();

    return {
        connectSource
    };
}

