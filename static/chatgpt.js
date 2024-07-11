import { OPENAI_API_KEY } from './config.js';
import { PROMPTS } from './prompts.js';

import { toolDefinitions, toolResponse } from "./tools.js";

let interactionHistory = [];

const bc = new BroadcastChannel("activity");
bc.onmessage = async (event) => {
    console.log('BRODCAST GPT', event.data.command);
    switch(event.data.command) {
        case 'context_reset':
            console.log('CONTEXT RESETED!')
            interactionHistory = [];

            await (new BroadcastChannel("activity")).postMessage({
                command: 'chat_update',
                interactionHistory
            });
            break;

        case 'change_prompt':
            console.log('CHANGE PROMPT', event.data);
            switch(event.data.promptId) {
                case 'custom':
                    window.lex.currentPrompt = 'custom';
                    window.lex.customPrompt = event.data.prompt;
                    break;
                default:
                    window.lex.currentPrompt = event.data.promptId;
                    const prompt = PROMPTS[window.lex.currentPrompt];

                    if (prompt.presend) {
                        await (new BroadcastChannel("activity")).postMessage({
                            command: 'play_text',
                            text: prompt.presend
                        });
                    }
                    if (prompt.continuous) {
                        await (new BroadcastChannel("activity")).postMessage({
                            command: 'change_continuous',
                            continuous: prompt.continuous
                        });
                    }
                    if (prompt.resetContext) {
                        await (new BroadcastChannel("activity")).postMessage({
                            command: 'context_reset'
                        });
                    }

                    if (prompt.voiceId) {
                        console.log('CHANGING VOICE to', prompt.voiceId);
                        await (new BroadcastChannel("activity")).postMessage({
                            command: 'change_voice',
                            voiceId: prompt.voiceId
                        });
                    }
            }
            break;
    }
};


export async function fetchOpenAIResponse() {

// 
    let messages = [];

    switch(window.lex.currentPrompt) {
        case 'custom':
            messages.push({ role: "system", content: window.lex.customPrompt });
            break;
        default:
            const prompt = PROMPTS[window.lex.currentPrompt];
            messages.push({ role: "system", content: [prompt.context ?? '', prompt.prompt].join('\n') });
            break;
    }

   
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo-1106",
            messages: [
                ...messages,
                ...interactionHistory
            ],
            tools: toolDefinitions,
            tool_choice: "auto"
        })
    });
    const data = await response.json();
    
    //Checa se tem uma tool
    if (data.choices[0].message.tool_calls) {
        const tool = data.choices[0].message.tool_calls[0].function;
        try {
            await (new BroadcastChannel("activity")).postMessage({
                command: 'play_text',
                text: "Claro. Isso pode demorar um pouco...",
            });
            const toolResult = await toolResponse(tool.name, tool.arguments);
            const resultText = await toolResult.json()
            return resultText.answer;
        }
        catch (error) {
            console.error(`Error running ${tool.name}:`, error);
            return "Ihhhh... parece que tive um problema aqui. Podemos tentar de novo?"
        }
    } else {
        const resultText = data.choices[0].message.content;
        console.log(resultText);
        return resultText;
    }
}

export async function fetchVectorResponse(input) {
    let searchData;
    try {
        console.log('VECTOR SEARCH INPUT: ', input);
        if (!input || input.length == 0) {
            console.log('NO INPUT FOR VECTOR SEARCH');
            return;
        }
        const searchResponse = await fetch('tools/vectorSearch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: input, num: 1 })
        });

        searchData = await searchResponse.json();
    } catch (error) {
        console.error('Error performing search:', error);
    }
    
    if (searchData.length > 0) {
        const relatedData = searchData[0].object;
        return relatedData.answer;
    }
    else {
        console.log("Can't find quick answer...")
        return null;
    }
}

export async function fetchResponse(transcript) {
    //Adiciona texto do usuário no interactionHistory
    if (!transcript.trim()) {
        return null;
    }
    interactionHistory.push({ role: 'user', content: transcript });

    console.log("Fetching Response..."); 
    let answer = await fetchVectorResponse(transcript);
    if (answer) {
        console.log("Vector:" + answer);
    }
    else {
        answer = await fetchOpenAIResponse();
        console.log("Inference:" + answer);
    }
    
    interactionHistory.push({ role: 'assistant', content: answer });

    await (new BroadcastChannel("activity")).postMessage({
        command: 'chat_update',
        interactionHistory
    });


    manageMemory();
    
    await (new BroadcastChannel("activity")).postMessage({
        command: 'play_text',
        text: answer
    });
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
