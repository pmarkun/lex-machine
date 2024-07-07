const express = require('express');
const path = require('path');
const { loadData, searchQuery } = require('./tools/vectorSearch.js');
const { cmspAnalyzeProject } = require('./tools/cmsp.js'); // Importa a função de análise

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "static" directory
app.use('/static', express.static(path.join(__dirname, 'static')));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Endpoint for search queries
app.post('/tools/vectorSearch', async (req, res) => {
  const { query, num } = req.body;
  if (!query) {
    return res.status(400).send({ error: 'Query is required' });
  }

  try {
    const results = await searchQuery(query, num || 1);
    res.send(results);
  } catch (error) {
    res.status(500).send({ error: 'Error performing search' });
  }
});

// Endpoint para analisar projetos
app.post('/tools/cmspAnalyzeProject', async (req, res) => {
  const { tipo, ano, numero } = req.body;
  if (!tipo || !ano || !numero) {
    return res.status(400).send({ error: 'Tipo, ano e número são obrigatórios' });
  }

  try {
    const analysis = await cmspAnalyzeProject(tipo, ano, numero);
    if (analysis) {
      res.send({ "answer" : analysis});
    } else {
      res.status(404).send({ error: 'Projeto não encontrado' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'Erro ao analisar o projeto' });
  }
});

// Load data and start the server
loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to load data:', error);
});
