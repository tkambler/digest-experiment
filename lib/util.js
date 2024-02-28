const { isPlainObject } = require('lodash');

const getFullUrl = req => req.protocol + '://' + req.get('host') + req.originalUrl;

const getRequestBody = (req) => {

  return new Promise((resolve, reject) => {
    req.setEncoding('utf8');
    req.rawBody = '';
    req.on('data', function(chunk) {
      req.rawBody += chunk;
    });
    req.on('end', function(){
      return resolve(req.rawBody);
    });
  });

};

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
  proxyReq.write(requestBody);
  console.log('fixed request body', {
    url: req.url,
    method: req.method,
    body: requestBody,
  });
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

module.exports = {
  convertStreamToBuffer,
  fixRequestBody,
  getFullUrl,
  getRequestBody,
};
