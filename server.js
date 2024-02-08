const express = require("express");
const ReadableStreamClone = require("readable-stream-clone");
const { request } = require("urllib");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");
const getPort = require("get-port");

const creds = {
  login: process.env.USER,
  password: process.env.PASS,
};

console.log('creds:', creds);

const isDigestRequest = (proxyRes) => {
  console.log('xxxxxxx', proxyRes.headers, proxyRes.statusCode);
  return proxyRes.headers["www-authenticate"] && proxyRes.statusCode === 401;
};

const getServer = async () => {

  const app = express();

  app.use((req, res, next) => {
    req._proxyReq = new ReadableStreamClone(req);
    return next();
  });

  // app.use(bodyParser.json({
  //   type: 'application/json',
  // }));
  // app.use(bodyParser.text({
  //   type: 'text/plain',
  // }));
  // app.use(bodyParser.raw({
  //   type: 'text/plain',
  // }));
  // const port = await getPort();
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

    console.log('xxx req._proxyReq', req._proxyReq);

    return new Promise(async (resolve) => {

      console.log('reading...');

      for await (const chunk of req._proxyReq) {
        console.log('chunk', chunk);
      }

    });

    console.log('DIGEST REQ', req.originalUrl, req.body);

    async function streamToString(stream) {
      // lets have a ReadableStream as a stream variable
      const chunks = [];
  
      for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
      }
  
      return Buffer.concat(chunks).toString("utf-8");
  }

  console.log('here we go');
  const x = await streamToString(req.proxyReq);
  console.log('x123', x);

    const requestOptions = {
      method: req.method,
      headers: req.headers,
      digestAuth: `${creds.login}:${creds.password}`,
      timeout: 60000,
      streaming: true,
      stream: req.proxyReq,
      rejectUnauthorized: false,
    };

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
    // ejectPlugins: true,
    selfHandleResponse: true,
    onProxyReq: (proxyReq, req, res) => {

      // req.proxyReq = new ReadableStreamClone(proxyReq);

      // req.__body = req.body;

      // fixRequestBody(proxyReq, req);

      console.log('[Incoming Proxy Request]', JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      }, null, 2));

    },
    onProxyRes: async (proxyRes, req, res) => {

      console.log("incoming proxyRes", req.url);

      if (isDigestRequest(proxyRes)) {
        console.log('digest request');
        return;
      }

      res.set(proxyRes.headers);
      res.status(proxyRes.statusCode);
      return proxyRes.pipe(res);
      // return proxyRes.pipe(res, {
      //   end: true,
      // });

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
