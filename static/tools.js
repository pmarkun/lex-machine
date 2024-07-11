


//Tool que análise projetos
export async function cmspAnalyzeProject(tipo, ano, numero) {
  const response = await fetch('tools/cmspAnalyzeProject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        "tipo" : "0", //tipo hardcoded
        "ano" : ano,
        "numero" : numero
    })
});
  if (response.status == 200) {
    return response;
  }
  else {
    console.error(response);
    return "Ihhh... parece que tive um problema. Podemos tentar novamente?"
  }
}

const cmspAnalyzeProjectTool = {
  name: "cmspAnalyzeProject",
  description: "Analise um projeto de lei que tenha número e ano específicos da Câmara Municipal de São Paulo e traz reflexões e orientação de voto.",
  parameters: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["PL","PR"],
        description: "O formato do projeto de lei, pode ser PL se for um projeto de lei ou PR se for projeto de resolução."
      },
      ano: {
        type: "number",
        description: "O ano do projeto de lei com quatro digitos.",
      },
      numero: {
        type: "number",
        description: "O número de projeto de lei.",
      }
    },
    required: ["tipo", "ano", "numero"],
  },
  handler: async ({ tipo, ano, numero }) => {
    return await cmspAnalyzeProject(tipo, ano, numero);
  },
}


//Lista de tools
export const tools = [
  cmspAnalyzeProjectTool
];

//Mapeia definições das Tools para o dicionario do chatgpt
export const toolDefinitions = tools.map(tool => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }
}));

//Função que constrói resposta da tool
export const toolResponse = async (toolName, parameters) => {
  const tool = tools.find(t => t.name === toolName);
  if (tool) {
    return await tool.handler(JSON.parse(parameters));
  }
  throw new Error(`No tool found with name ${toolName}`);
};


