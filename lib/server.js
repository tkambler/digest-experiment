const express = require("express");
const bodyParser = require('body-parser');
const { proxyMiddleware, proxy } = require('./middleware/proxy');

const app = express();

app.use((req, res, next) => {
  req.digest_auth_status = null;
  return next();
});

app.use(bodyParser.raw({
  type: '*/*',
}));

app.use('/', (req, res, next) => {
  // console.log('xxx url', req.url, req.method);
  next();
});

app.use((req, res, next) => {
  // console.log('incoming request', JSON.stringify({
  //   url: req.url,
  //   headers: req.headers,
  //   method: req.method,
  // }));
  return next();  
});

app.use(proxyMiddleware);

module.exports = {
  app,
  proxy,
};
