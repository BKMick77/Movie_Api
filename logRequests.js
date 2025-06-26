const logger = require('./logger');

const logRequest = (req, res, next) => {
  if (req.method !== 'GET') {
    //will not log GET
    logger.info(`&{req.method} ${req.originalURL}`);
  }
  next();
};

module.exports = logRequest;
