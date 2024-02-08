const express = require("express");
const bodyParser = require('body-parser');
const { request } = require("urllib");
const { createProxyMiddleware } = require("http-proxy-middleware");
const getPort = require("get-port");

const creds = {
  login: process.env.USERNAME,
  password: process.env.PASSWORD,
};

const getServer = async () => {

  const app = express();
  app.use(bodyParser.raw({
    type: '*/*',
  }));
  const port = await getPort();

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

    console.log('DIGEST REQ', req.url, req.body, req.content);

    const { res: targetResult } = await request(
      `https://192.168.97.4${req.originalUrl}`,
      {
        method: req.method,
        headers: req.headers,
        content: req.body,
        digestAuth: `${creds.login}:${creds.password}`,
        timeout: 30000,
        streaming: true,
        rejectUnauthorized: false,
      }
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
    onProxyReq: (proxyReq, req, res) => {

      console.log(`[Incoming Proxy Request] [${req.method}] ${req.url}`);

      console.log('[BODY]', req.body);

    },
    onProxyRes: async (proxyRes, req, res) => {
      console.log("incoming proxyRes", req.url);

      const digestResponse = await await handleDigest({
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
