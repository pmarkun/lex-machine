const { cmspAnalyzeProject } = require('./cmsp');

const runCrawl = async () => {
  try {
    // Parâmetros do projeto de lei a ser analisado
    const tipo = 'PL';  // Por exemplo, 'PL' para Projeto de Lei
    const ano = '2024';
    const numero = '435';

    console.log(`Fetching and analyzing project of type: ${tipo}, year: ${ano}, number: ${numero}`);

    const analysis = await cmspAnalyzeProject(tipo, ano, numero);
    if (analysis) {
      console.log('Project Analysis:', analysis);
    } else {
      console.log('No analysis returned for the given project.');
    }
  } catch (error) {
    console.error('Error during project analysis:', error);
  }
};

runCrawl();
