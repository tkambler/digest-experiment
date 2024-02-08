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
    const requestBody = req.body;
    if (!requestBody) {
        return;
    }
    if (isPlainObject(requestBody)) {
      return;
    }
    const contentType = proxyReq.getHeader('Content-Type');
    const byteLength = Buffer.byteLength(requestBody);
    proxyReq.setHeader('Content-Length', byteLength);
    proxyReq.write(requestBody);
}

const proxy = new HttpProxy();

proxy.on("proxyReq", (proxyReq, req) => {
  fixRequestBody(proxyReq, req);
});

proxy.on("proxyRes", async (proxyRes, req, res) => {
  // console.log(
  //   "[Incoming Proxy Response]",
  //   JSON.stringify(
  //     {
  //       method: req.method,
  //       url: req.url,
  //       headers: req.headers,
  //       body: req.body,
  //     },
  //     null,
  //     2
  //   )
  // );

  if (isDigestRequest(proxyRes)) {
    const handledResponseStream = await handleDigestRequest({
      proxyRes,
      req,
    });
    res.set(handledResponseStream.headers);
    res.status(handledResponseStream.statusCode);
    handledResponseStream.pipe(res);
  } else {
    res.set(proxyRes.headers);
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  }
});

const proxyMiddleware = (req, res, next) => {

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
