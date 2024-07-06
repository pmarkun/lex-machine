const express = require('express');
const path = require('path');
const { loadData, searchQuery } = require('./vectorSearch.js');

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

// Endpoint for search queries
app.post('/search', async (req, res) => {
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

// Load data and start the server
loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to load data:', error);
});
