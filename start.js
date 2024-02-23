// THIS WORKS

const express = require('express');
const bodyParser = require('body-parser');
const { createProxyMiddleware, responseInterceptor, fixRequestBody: fixRequestBody2 } = require('http-proxy-middleware');
const { isPlainObject } = require('lodash');
const { handleDigestRequest, isDigestRequest } = require('./lib/digest');
const { device, ...settings } = require('./lib/settings');

const badResponseHeaders = ['authentication-info', 'www-authenticate'];

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
  // console.log("requestBody", req.url, requestBody);
  proxyReq.write(requestBody);
}

const convertStreamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const bufs = [];
    stream.on("data", (d) => {
      bufs.push(d);
    });
    stream.on("end", () => {
      const buf = Buffer.concat(bufs);
      return resolve(buf);
    });
  });
};

const app = express();

app.use(bodyParser.raw({
  type: '*/*',
}));

app.use('/', createProxyMiddleware({
  target: `${device.protocol}://${device.ip}`,
  changeOrigin: true,
  secure: false,
  ws: true,
  selfHandleResponse: true,
  onProxyReq: (proxyReq, req) => {
    fixRequestBody(proxyReq, req);
  },
  /**
   * Modify the headers that are received by the requester by modifying `proxyRes.headers`.
   */
  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {

    console.log('is digest auth response?', req.url, isDigestRequest(proxyRes));

    if (isDigestRequest(proxyRes)) {
      const handledResponseStream = await handleDigestRequest({
        proxyRes,
        req,
      });

      console.log('digest', JSON.stringify({
        'proxyRes.originalStatusMessage': proxyRes.originalStatusMessage,
        'proxyRes.statusMessage': proxyRes.statusMessage,
        'newStatusMessage': handledResponseStream.statusMessage,
      }, null, 2));


      // for (const bh of badResponseHeaders) {
      //   delete handledResponseStream.headers[bh];
      // }

      // for (const k of handledResponseStream.headers) {
      //   proxyRes.headers[k] = handledResponseStream.headers[k];
      // }

      const modifiedHeaders = (() => {
        const result = {};
        for ( const k in proxyRes.headers ) {
          result[k] = proxyRes.headers[k];
        }
        for ( const k in handledResponseStream.headers ) {
          result[k] = handledResponseStream.headers[k];
        }
        return result;
      })();

      // console.log('augmenting response headers with the following headers received from digest auth response:', JSON.stringify({
      //   url: req.url,
      //   originalResponseHeaders: proxyRes.headers,
      //   digestResponseHeaders: handledResponseStream.headers,
      //   newHeaders: modifiedHeaders,
      // }, null, 2));

      // proxyRes.headers = modifiedHeaders;
      // for (const k in proxyRes.headers) {
      //   delete proxyRes.headers[k];
      // }

      // for (const k in handledResponseStream.headers) {
      //   proxyRes.headers[k] = handledResponseStream.headers[k];
      // }

      // console.log('proxyRes.headers', req.url, proxyRes.headers);

      for (const k in modifiedHeaders) {
        res.setHeader(k, modifiedHeaders[k]);
      }

      for (const k of badResponseHeaders) {
        // res.setHeader(k, '');
        res.removeHeader(k);
      }

      // console.log('handledResponseStream.statusCode', handledResponseStream.statusCode);
      // console.log('handledResponseStream.headers', handledResponseStream.headers);
      // console.log('proxyRes.headers', proxyRes.headers);
      // console.log('proxyRes.headers', proxyRes.headers);

      // delete handledResponseStream.headers['authentication-info'];

      // delete proxyRes.headers["authentication-info"];
      // delete proxyRes.headers["www-authenticate"];
      // delete handledResponseStream.headers["authentication-info"];

      // proxyRes.headers = {
      //   ...proxyRes.headers,
      //   ...handledResponseStream.headers,
      //   foobar: 'baz',
      // };



      // res.set({
      //   // ...handledResponseStream.headers,
      //   foo: 'barbeep',
      // });

      res.status(handledResponseStream.statusCode);
      res.statusMessage = handledResponseStream.statusMessage;
      // res.statusMessage(handledResponseStream.statusMessage);

      // console.log('res.headers', res.getHeaders());

      const converted = await convertStreamToBuffer(handledResponseStream);

      if (req.url.includes('list')) {
        console.log('url', req.url);
        console.log('res.headers', res.getHeaders());
        console.log('handledResponseStream.statusCode', handledResponseStream.statusCode);
        console.log('converted', converted.toString('utf-8'));
      }

      return converted;
    }

    // console.log('PROXYRES.HEADERS', proxyRes.headers);

    // proxyRes.headers.beep = 'boopabc';

    // for (const bh of proxyRes.headers) {
    //   delete proxyRes.headers[bh];
    // }

    // console.log('proxyRes.headers', proxyRes.headers);
    return responseBuffer;
    // const response = responseBuffer.toString('utf-8'); // convert buffer to string
    // return response.replace('Hello', 'Goodbye'); // manipulate response and return the result
  }),
}));

app.listen(settings.port, () => {
  console.log(`App is running: http://127.0.0.1:${settings.port}`);
});
