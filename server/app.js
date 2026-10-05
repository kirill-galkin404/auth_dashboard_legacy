const config = require('./config');
const createApp = require('./createApp');

const app = createApp();

if (require.main === module) {
  app.listen(config.port, function () {
    console.log('listening on http://localhost:' + config.port);
  });
}

module.exports = app;
