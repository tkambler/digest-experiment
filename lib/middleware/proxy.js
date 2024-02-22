const HttpProxy = require("http-proxy");
const { isPlainObject } = require("lodash");
const { handleDigestRequest, isDigestRequest } = require("../digest");
const { getDevice } = require("../settings");

const device = getDevice();

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
  const byteLength = Buffer.byteLength(requestBody);
  proxyReq.setHeader("Content-Length", byteLength);
  console.log("requestBody", req.url, requestBody);
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

  // console.log('proxyRes', proxyRes.headers, proxyRes.statusCode);

  if (isDigestRequest(proxyRes)) {
    const handledResponseStream = await handleDigestRequest({
      proxyRes,
      req,
    });
    // console.log('handledResponseStream', handledResponseStream.headers, handledResponseStream.statusCode);
    if (handledResponseStream.statusCode !== 200) {
      console.log(
        "HANDLED RESPONSE STREAM FAILED",
        handledResponseStream.statusCode
      );
    }
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
    },
    next
  );
};

module.exports = {
  proxyMiddleware,
  proxy,
};
