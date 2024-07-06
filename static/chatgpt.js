import { OPENAI_API_KEY } from './config.js';
import { fetchElevenLabsAudio } from './elevenLabs.js';

let interactionHistory = [];

export async function fetchOpenAIResponse(transcript) {
    console.log("Fetching AI Response...");
    
    let searchData;
    try {
        const searchResponse = await fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: transcript, num: 1 })
        });

        searchData = await searchResponse.json();
    } catch (error) {
        console.error('Error performing search:', error);
    }

    let context = "";
    if (searchData.length > 0) {
        const relatedData = searchData[0].object;
        context = `Pergunta: ${relatedData.question}\nResposta: ${relatedData.answer}\n`;
    }

    transcript = context ? `${transcript}\n\nContexto relacionado:\n${context}` : transcript;
    console.log(transcript);

    interactionHistory.push({ role: 'user', content: transcript });

    const prompt = `Você é Lex, a primeira inteligência artificial legislativa do mundo e está em uma conversa no palco com Pedro Markun, portanto existem algumas regras:
1. As respostas devem ser em texto corrido, sem nenhuma marcação, tópicos ou formatação. Seja o mais breve possível!
2. Foque em respostas breves com um tom amigável e curioso.
3. Não use negrito, emojis ou outras marcações de texto.
4. Use as informações abaixo para contextualizar as respostas.
5. Mesmo que o usuário solicite itens que possam ser tópicos, você deve escrever literalmente, sem numerá-los.
6. Hoje é o seu evento de nascimento, você está falando em um teatro para um público de 100 pessoas que estão te ouvindo pela primeira vez.`;

    const systemMessage = context ? `${prompt}\n\nContexto relacionado:\n${context}` : prompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo-1106",
            messages: [
                { role: "system", content: systemMessage },
                ...interactionHistory
            ]
        })
    });

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    interactionHistory.push({ role: 'assistant', content: resultText });

    manageMemory();
    console.log("Inference:" + resultText);
    fetchElevenLabsAudio(resultText);
}

function manageMemory() {
    const memoryLimit = 10; // Define the limit for interaction history
    if (interactionHistory.length > memoryLimit) {
        summarizeInteractions(memoryLimit / 2);
    }
}

function summarizeInteractions(n) {
    const toSummarize = interactionHistory.slice(0, n);
    const summary = toSummarize.map(item => item.content).join(' ');

    interactionHistory = interactionHistory.slice(n);
    interactionHistory.unshift({ role: 'system', content: `Resumo das últimas interações: ${summary}` });
}
