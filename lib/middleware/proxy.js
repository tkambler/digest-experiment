const HttpProxy = require("http-proxy");
// const { fixRequestBody } = require('http-proxy-middleware');
const { isPlainObject } = require('lodash');
const { handleDigestRequest, isDigestRequest } = require("../digest");
const { device } = require("../settings");

const querystring = require("querystring");
/**
 * Fix proxied body if bodyParser is involved.
 */
function fixRequestBody(proxyReq, req) {

  console.log('fixing...', req.url);
    const requestBody = req.body;
    if (!requestBody) {
      console.log('did not fix', req.url);
        return;
    }

    if (isPlainObject(requestBody)) {
      return;
    }

    console.log('=======');
    console.log(req.url, requestBody.toString('utf-8'));
    console.log('=======');

    console.log('requestBody', requestBody);
    
    const contentType = proxyReq.getHeader('Content-Type');
    console.log('ct', contentType, requestBody);

    const byteLength = Buffer.byteLength(requestBody);
    console.log('body byteLength', byteLength);

    proxyReq.setHeader('Content-Length', byteLength);
    proxyReq.write(requestBody);

    // const writeBody = (bodyData) => {
    //     // deepcode ignore ContentLengthInCode: bodyParser fix
    //     proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    //     console.log('fix write', req.url);
    //     proxyReq.write(bodyData);
    // };
    // if (contentType && contentType.includes('text/plain')) {
    //   console.log('fix write', req.url);
    //   // writeBody(requestBody);
    // }
    // if (contentType && contentType.includes('application/json')) {
    //   console.log('fix write json', req.url);
    //     writeBody(JSON.stringify(requestBody));
    // }
    // if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
    //   console.log('fix write www form', req.url);
    //     writeBody(querystring.stringify(requestBody));
    // }
}

const proxy = new HttpProxy();

proxy.on("proxyReq", (proxyReq, req) => {
  fixRequestBody(proxyReq, req);
});

proxy.on("proxyRes", async (proxyRes, req, res) => {
  console.log(
    "[Incoming Proxy Response]",
    JSON.stringify(
      {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      },
      null,
      2
    )
  );

  if (isDigestRequest(proxyRes)) {
    console.log('is digest request:', req.url);
    const handledResponseStream = await handleDigestRequest({
      proxyRes,
      req,
    });
    console.log('received digest response stream', req.url);
    res.set(handledResponseStream.headers);
    res.status(handledResponseStream.statusCode);
    handledResponseStream.pipe(res);
  } else {
    console.log('is NOT digest request:', req.url);
    res.set(proxyRes.headers);
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  }
});

const proxyMiddleware = (req, res, next) => {
  console.log("proxying request:", req.originalUrl);

  const target = `${device.protocol}://${device.ip}/`;

  return proxy.web(
    req,
    res,
    {
      target,
      secure: false,
      ws: true,
      changeOrigin: true,
      followRedirects: true,
      selfHandleResponse: true,
      ejectPlugins: true,
      // proxyTimeout: 60000,
    },
    next
  );
};

module.exports = proxyMiddleware;
