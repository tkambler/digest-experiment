const app = require('./lib/server');
const { port } = require('./lib/settings');

app.listen(port, () => {
  console.log(`server is running: http://127.0.0.1:${port}`);
});
