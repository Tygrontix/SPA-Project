const bunyan = require('bunyan');
const logger = bunyan.createLogger({
    name: 'patient-api',
    level: 'info'
});
module.exports = logger;