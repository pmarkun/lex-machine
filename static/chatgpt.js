import { OPENAI_API_KEY } from './config.js';
import { PROMPTS } from './prompts.js';

import { toolDefinitions, toolResponse } from "./tools.js";

let interactionHistory = [];
let systemMessage = PROMPTS.default.prompt;

const bc = new BroadcastChannel("activity");
bc.onmessage = async (event) => {
    // console.log('BRODCAST', event);
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
                    systemMessage = event.data.prompt;
                    break;
                default:
                    const prompt = PROMPTS[event.data.promptId];
                    systemMessage = prompt.prompt;
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
            ],
            tools: toolDefinitions,
            tool_choice: "auto"
        })
    });
    const data = await response.json();
    if (data.choices[0].message.tool_calls) {
        const tool_name = data.choices[0].message.tool_calls[0].function.name;
        const parameters = data.choices[0].message.tool_calls[0].function.arguments;
        const toolResult = await toolResponse(tool_name, parameters);
        const resultText = await toolResult.json()
        return resultText.answer;
    } else {
        const resultText = data.choices[0].message.content;
        console.log(resultText);
        return resultText;
    }
}

export async function fetchVectorResponse(input) {
    let searchData;
    try {
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
