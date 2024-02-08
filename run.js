(async () => {
  const { port } = await require('./server')();
  console.log('Server is running at:', `http://127.0.0.1:${port}`);
})();
