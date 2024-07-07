// vectorSearch.js
const fs = require('fs/promises');
const path = require('path');

let db;

const loadData = async () => {
  try {
    // Importar VectorDB dinamicamente
    const { default: VectorDB } = await import('@themaximalist/vectordb.js');
    db = new VectorDB({});

    const data = await fs.readFile(path.join(__dirname, '../data', 'data.json'), 'utf8');
    const questions = JSON.parse(data);
    for (const item of questions) {
      await db.add(item.question, item);
    }
    console.log('Data loaded successfully.');
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const searchQuery = async (query, num = 1, threshold = 0.25) => {
  if (!db) {
    throw new Error('Database is not initialized');
  }
  return await db.search(query, num, threshold);
};

module.exports = {
  loadData,
  searchQuery,
};
