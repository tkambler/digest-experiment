const open = require('open');

(async () => {
  const { port } = await require('./server')();
  open(`http://127.0.0.1:${port}`);
})();
