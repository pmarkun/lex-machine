const crypto = require('crypto');
const NodeCache = require('node-cache');

// Configuração do cache com TTL de 1 hora (3600 segundos)
const cache = new NodeCache({ stdTTL: 3600 });

const hashText = (text) => {
  return crypto.createHash('sha256').update(JSON.stringify(text)).digest('hex');
};

const cachedResponse = {
  get: (text) => {
    const hashKey = hashText(text);
    return cache.get(hashKey);
  },
  set: (text, response) => {  // A função set agora aceita o texto e a resposta
    const hashKey = hashText(text);
    cache.set(hashKey, response);  // Armazena a resposta no cache
  }
};

module.exports = cachedResponse;