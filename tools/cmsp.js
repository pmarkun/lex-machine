const axios = require('axios');
const { text } = require('express');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const cachedResponse = require('../cache');

require('dotenv').config();

const headers = {
  "accept": "application/json, text/javascript, */*; q=0.01",
  "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  "cookie": "ASP.NET_SessionId=tdmptfqxlwk2ivsscace0ixt",
  "dnt": "1",
  "pragma": "no-cache",
  "priority": "u=1, i",
  "referer": "https://splegisconsulta.saopaulo.sp.leg.br/Pesquisa/IndexProjeto",
  "sec-ch-ua": "\"Google Chrome\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Linux\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "x-requested-with": "XMLHttpRequest"
};

// Função para baixar o PDF
const downloadPDF = async (pdfUrl, outputPath) => {
  try {
    const response = await axios.get(pdfUrl, {
      headers: headers,
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

// Função para extrair texto do PDF
const extractTextFromPDF = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
};

// Função principal que realiza todas as etapas
const fetchProjectData = async (tipo, ano, numero) => {
  console.log({ano : ano, numero : numero, tipo: tipo})
  const url = new URL("https://splegisconsulta.saopaulo.sp.leg.br/Pesquisa/PageDataProjeto");

  const params = {
    draw: '13',
    'columns[0][data]': '',
    'columns[0][name]': '',
    'columns[0][searchable]': 'false',
    'columns[0][orderable]': 'false',
    'columns[0][search][value]': '',
    'columns[0][search][regex]': 'false',
    'columns[1][data]': '1',
    'columns[1][name]': 'PROJETO',
    'columns[1][searchable]': 'true',
    'columns[1][orderable]': 'true',
    'columns[1][search][value]': '',
    'columns[1][search][regex]': 'false',
    'columns[2][data]': 'ementa',
    'columns[2][name]': 'EMENTA',
    'columns[2][searchable]': 'true',
    'columns[2][orderable]': 'true',
    'columns[2][search][value]': '',
    'columns[2][search][regex]': 'false',
    'columns[3][data]': 'norma',
    'columns[3][name]': 'NORMA',
    'columns[3][searchable]': 'true',
    'columns[3][orderable]': 'true',
    'columns[3][search][value]': '',
    'columns[3][search][regex]': 'false',
    'columns[4][data]': 'assuntos',
    'columns[4][name]': 'PALAVRA',
    'columns[4][searchable]': 'true',
    'columns[4][orderable]': 'true',
    'columns[4][search][value]': '',
    'columns[4][search][regex]': 'false',
    'columns[5][data]': 'promoventes',
    'columns[5][name]': 'PROMOVENTE',
    'columns[5][searchable]': 'true',
    'columns[5][orderable]': 'true',
    'columns[5][search][value]': '',
    'columns[5][search][regex]': 'false',
    'order[0][column]': '1',
    'order[0][dir]': 'desc',
    start: '0',
    length: '20',
    'search[value]': '',
    'search[regex]': 'false',
    assuntos: '',
    naoAssuntos: '',
    promoventes: '',
    naoPromoventes: '',
    tipo: tipo,
    tipoPromovente: '0',
    tipoVeto: '0',
    promulgadoTipo: '0',
    votacao: '',
    somenteEmTramitacao: 'false',
    leituraInicio: '',
    leituraFim: '',
    autuacaoI: '',
    autuacaoF: '',
    tipoMotivoTramitacao: '',
    localTramitacao: '',
    motivoTramitacao: '',
    leiOperador: '=',
    leiNumero: '',
    leiAno: '',
    numeroInicio: numero,
    numeroFim: '',
    anoInicio: ano,
    anoFim: '',
    _: '1720312032313'
  };

  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    console.log(url.toString());
    const response = await axios.get(url.toString(), { headers });
    const data = response.data;
    if (data.data && data.data.length > 0) {
      const projeto = data.data[0];
      const codigo = projeto.codigo;
      const pdfUrl = `https://splegisconsulta.saopaulo.sp.leg.br/ArquivoProcesso/GerarArquivoProcessoPorID/${codigo}?referidas=true`;
      console.log(`PDF URL: ${pdfUrl}`);

      const pdfPath = 'downloaded.pdf';

      // Baixar o PDF
      await downloadPDF(pdfUrl, pdfPath);
      console.log('PDF downloaded successfully.');

      // Extrair texto do PDF
      const pdfText = await extractTextFromPDF(pdfPath);
      console.log('Extracted Text:', pdfText);
      
      return pdfText;
    } else {
      console.log('No data found for the given parameters.');
      throw error;
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};


const sendToChatGPT = async (text) => {

let config = {
  "systemPrompt" : `Você é uma inteligência artificial legislativa. Quando solicitado, você vai analisar um projeto de lei e explicar de forma simples e direta. Sua explicação deve incluir:
- O objetivo geral do projeto
- Pontos positivos
- Pontos de atenção
- Sugestões de melhoria (com base em dados e evidências)
- E, por fim, sua orientação de voto (Favorável ou Contrária) com uma breve justificativa.

Lembre-se que isso será falado em voz alta, então faça a explicação como se estivesse conversando com um amigo inteligente, de maneira clara e fácil de entender.`,
  "userPrompt": `Leia o projeto abaixo e forneça a análise conforme especificado:\n\n${text}`,
  "mode" : "text"
}

 // Verifica se a resposta já está em cache
 const cached = cachedResponse.get(text);
 if (cached) {
   console.log("Serving cached response...");
   return cached;
 }


  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: config['systemPrompt'] },
        { role: 'user', content: config['userPrompt'] }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const message = response.data.choices[0].message.content;
    const result = config.mode === 'json' ? JSON.parse(message) : message;

    cachedResponse.set(text, result);
    return result;
  } catch (error) {
    console.error('Error communicating with OpenAI API:', error);
    throw error;
  }
};


const cmspAnalyzeProject = async (tipo, ano, numero) => {
  try {
    const pdfText = await fetchProjectData('0', ano, numero);
    if (pdfText) {
      console.log('PDF Text Extracted Successfully.');
      console.log('Analysing...');
      const result = await sendToChatGPT(pdfText);
      return result;
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { cmspAnalyzeProject };
