const express = require("express");
const bodyParser = require('body-parser');
const HttpsProxy = require('https-proxy');
const { request } = require("urllib");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");
const getPort = require("get-port");

const creds = {
  login: process.env.USER,
  password: process.env.PASS,
};

console.log('creds:', creds);

const getServer = async () => {

  const app = express();
  const port = 7035;

  const handleDigest = async ({ proxyRes, req, res }) => {
    if (proxyRes.headers["www-authenticate"] && proxyRes.statusCode === 401) {
      // Continue
    } else {
      return false;
    }

    console.log(
      "sending digest request:",
      req.method,
      `https://192.168.97.4${req.originalUrl}`
    );

    console.log('DIGEST REQ', req.url, req.body, req.__body, req.content);

    const requestOptions = {
      method: req.method,
      headers: req.headers,
      digestAuth: `${creds.login}:${creds.password}`,
      timeout: 30000,
      streaming: true,
      rejectUnauthorized: false,
    };

    if (req.__body?.type === 'Buffer') {
      requestOptions.content = req.__body.data;
    }

    console.log('requestOptions', requestOptions);

    const { res: targetResult } = await request(
      `https://192.168.97.4${req.originalUrl}`,
      requestOptions,
    );

    return {
      headers: targetResult.headers,
      responseType: "stream",
      stream: targetResult,
    };
  };

  const middleware = createProxyMiddleware({
    target: "https://192.168.97.4",
    changeOrigin: true,
    secure: false,
    ws: true,
    ejectPlugins: true,
    selfHandleResponse: true,
    followRedirects: true,
    proxyTimeout: 60000,
    onProxyReq: (proxyReq, req, res) => {

      req.__body = req.body;

      fixRequestBody(proxyReq, req);

      console.log('[Incoming Proxy Request]', JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      }, null, 2));

    },
    onProxyRes: async (proxyRes, req, res) => {
      console.log("incoming proxyRes", req.url);

      const digestResponse = await handleDigest({
        proxyRes,
        req,
        res,
      });

      if (digestResponse) {
        console.log("processed digest request", req.url);
        const { stream, responseType, headers } = digestResponse;
        if (responseType === "stream") {
          res.set(headers);
          return stream.pipe(res, {
            end: true,
          });
        } else {
          throw new Error(`unkown responseType: ${responseType}`);
        }
      } else {
        console.log("piping result (no digest):", req.url);
        res.set(proxyRes.headers);
        res.status(proxyRes.statusCode);
        return proxyRes.pipe(res, {
          end: true,
        });
      }
    },
  });

  app.use(middleware);

  app.listen(port, () => {
    console.log("Server is listening on port:", port);
  });

  return {
    app,
    port,
  };
};

module.exports = getServer;
