const express = require("express");
const bodyParser = require("body-parser");
const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");
const {
  handleDigestRequest,
  responseIsDigestChallenge,
} = require("./lib/digest");
const { device, ...settings } = require("./lib/settings");
const { convertStreamToBuffer, fixRequestBody } = require("./lib/util");

// This is a list of header keys that we never want to return back to the client from a proxied device.
const badResponseHeaders = ["authentication-info", "www-authenticate"];

const app = express();

app.use(
  bodyParser.raw({
    type: "*/*",
  })
);

app.use((req, res, next) => {
  req.xxx = 'derp';
  return next();
});

app.use(
  "/",
  createProxyMiddleware({
    target: `${device.protocol}://${device.ip}`,
    changeOrigin: true,
    secure: false,
    ws: true,
    logLevel: 'debug',
    selfHandleResponse: true,
    onProxyReq: (proxyReq, req) => {
      req.xxx = 'foo';
      console.log("incoming request", req.url);
      fixRequestBody(proxyReq, req);
      console.log('continuing with request:', req.url);
    },
    /**
     * Modify the headers that are received by the requester by modifying `proxyRes.headers`.
     *
     * NOTE: responseInterceptor disables streaming of target's response.
     */
    onProxyRes: async (proxyRes, req, res) => {

      if (responseIsDigestChallenge(proxyRes)) {
        // The response that we received from the proxied device is a digest authentication challenge.
        // We must respond to this ourselves rather than allowing the client to do it.

        console.log(
          "incoming digest auth challenge",
          JSON.stringify({
            url: req.url,
            headers: proxyRes.headers,
            statusCode: proxyRes.statusCode,
          })
        );

        const handledResponseStream = await handleDigestRequest({
          proxyRes,
          req,
        });

        if (res.writableEnded) {
          return;
        }

        for (const headerKey in handledResponseStream.headers) {
          res.setHeader(headerKey, handledResponseStream.headers[headerKey]);
        }

        for (const k of badResponseHeaders) {
          res.removeHeader(k);
        }

        res.status(handledResponseStream.statusCode);
        res.statusMessage = handledResponseStream.statusMessage;

        // return convertStreamToBuffer(handledResponseStream);
        handledResponseStream.pipe(res);
      } else {

        console.log(
          "incoming standard response",
          JSON.stringify({
            url: req.url,
            headers: proxyRes.headers,
            statusCode: proxyRes.statusCode,
          })
        );

        if (res.writableEnded) {
          return;
        }

        for (const headerKey in proxyRes.headers) {
          res.setHeader(headerKey, proxyRes.headers[headerKey]);
        }

        for (const k of badResponseHeaders) {
          res.removeHeader(k);
        }

        res.status(proxyRes.statusCode);
        res.statusMessage = proxyRes.statusMessage;

        proxyRes.pipe(res);

      }

    },
  })
);

app.listen(settings.port, () => {
  console.log(`App is running: http://127.0.0.1:${settings.port}`);
});
