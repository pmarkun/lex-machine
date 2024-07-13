async function readNFC() {
    if ('NDEFReader' in window) {
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            console.log("NFC scanning started");

            ndef.onreading = async event => {
                const message = event.message;
                for (const record of message.records) {
                    if (record.recordType === "url") {
                        const url = new TextDecoder().decode(record.data);
                        await processURL(url);
                    } else {
                        console.log("Unsupported record type: ", record.recordType);
                    }
                }
            };

            ndef.onreadingerror = () => {
                console.log("Error reading NFC tag");
                document.getElementById("urlDisplay").textContent = "Error reading NFC tag";
            };
        } catch (error) {
            console.error("NFC reading error: ", error);
            document.getElementById("urlDisplay").textContent = `NFC reading error: ${error}`;
        }
    } else {
        console.log("Web NFC is not supported in this browser.");
        document.getElementById("urlDisplay").textContent = "Web NFC is not supported in this browser.";
    }
}

async function processURL(url) {
    document.getElementById("urlDisplay").textContent = `URL: ${url}`;
    const NFC = await extractNFCFromURL(url);
    if (NFC) {
        
        let user = await checkFirebaseForNFC(NFC);
        speak(`Bem Vindo, ${user.firstName}!`);
    } else {
        console.log("Não foi possível extrair o NFC da URL.");
    }
}

function extractNFCFromURL(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get("id");
    } catch (error) {
        console.error("Error extracting NFC from URL: ", error);
        return null;
    }
}

async function checkFirebaseForNFC(NFC) {
    const url = FIREBASE_URL;
    
    const data = { id: NFC };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        console.log(response);
        const result = await response.json();
        console.log(result);
        return result;
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
}

function speak(text) {
    if (VOICE_ENGINE === 'LOCAL') {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.speak(utterance);
        } else {
            console.log("Web Speech API is not supported in this browser.");
        }
    } else if (VOICE_ENGINE === 'ELEVENLABS') {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                    style: 0.5,
                    use_speaker_boost: true
                }
            })
        };

        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, options)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            }).then(audioData => {
                    const audioUrl = URL.createObjectURL(audioData);
                    const audioElement = document.getElementById('audio');
                    audioElement.src = audioUrl;

                    audioElement.play();
                })
            .catch(err => console.error(err));
    }
}


async function testNFC() {
    const url = "https://lex.tec.br/nfc?id=5774cad333ef1d34067749756219d0bd";
    await processURL(url);
}
