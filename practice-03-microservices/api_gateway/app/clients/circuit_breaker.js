const axios = require('axios');
const CircuitBreaker = require('opossum');
const config = require('../config');

function createServiceCircuit(serviceName, baseUrl) {
  const request = async (path, options = {}) => {
    const response = await axios({
      url: `${baseUrl}${path}`,
      timeout: config.circuit.timeout,
      validateStatus: status => status < 500,
      ...options
    });
    if (response.status >= 500) {
      const error = new Error(`${serviceName} returned HTTP ${response.status}`);
      error.response = response;
      throw error;
    }
    return { status: response.status, data: response.data };
  };

  const breaker = new CircuitBreaker(request, config.circuit);
  breaker.fallback(() => ({
    status: 503,
    data: { error: `${serviceName} service temporarily unavailable` }
  }));
  return breaker;
}

function circuitHealth(breaker) {
  return { state: breaker.opened ? 'OPEN' : 'CLOSED', stats: breaker.stats };
}

module.exports = { createServiceCircuit, circuitHealth };
