//import cmspAnalyzeProject from '../tools/cmsp.js';

export const toolsTODO = [
  {
    name: "cmspAnalyzeProject",
    description: "Analyze a legislative project from the São Paulo City Council and provide insights and voting recommendation",
    parameters: {
      type: "object",
      properties: {
        tipo: {
          type: "string",
          description: "The type of the project",
        },
        ano: {
          type: "string",
          description: "The year of the project",
        },
        numero: {
          type: "string",
          description: "The number of the project",
        }
      },
      required: ["tipo", "ano", "numero"],
    },
    handler: async ({ tipo, ano, numero }) => {
      return await cmspAnalyzeProject(tipo, ano, numero);
    }
  }
];

export const tools = [];

export const toolDefinitions = tools.map(tool => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }
}));

export const toolResponse = async (toolName, parameters) => {
  const tool = tools.find(t => t.name === toolName);
  if (tool) {
    return await tool.handler(parameters);
  }
  throw new Error(`No tool found with name ${toolName}`);
};


